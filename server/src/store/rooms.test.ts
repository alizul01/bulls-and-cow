import { describe, test, expect, beforeEach } from "bun:test";
import {
  createRoom,
  getRoom,
  joinRoom,
  setSecret,
  makeGuess,
  rejoinRoom,
  findRoomByClientId,
  markPlayerDisconnected,
  removeRoom,
  cleanupExpiredRooms,
  getRoomCount,
  clearAllRooms,
  setRoomClosedCallback,
} from "./rooms";
import type { Room } from "./rooms";

function makeClientId() {
  return crypto.randomUUID();
}

beforeEach(() => {
  clearAllRooms();
});

describe("createRoom", () => {
  test("creates room with valid state", () => {
    const room = createRoom("ws1", makeClientId(), "Alice");
    expect(room.code).toHaveLength(5);
    expect(room.hostWsId).toBe("ws1");
    expect(room.hostName).toBe("Alice");
    expect(room.phase).toBe("waiting");
    expect(room.hostGuesses).toEqual([]);
    expect(room.guestGuesses).toEqual([]);
    expect(room.guestClientId).toBeUndefined();
    expect(room.winner).toBeUndefined();
    expect(getRoomCount()).toBe(1);
  });

  test("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const room = createRoom(`ws${i}`, makeClientId(), `Player${i}`);
      codes.add(room.code);
    }
    expect(codes.size).toBe(10);
  });
});

describe("joinRoom", () => {
  test("guest joins successfully", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    const guestClient = makeClientId();
    const joined = joinRoom(room.code, "ws2", guestClient, "Bob");

    expect(joined).not.toBeNull();
    expect(joined!.guestClientId).toBe(guestClient);
    expect(joined!.guestName).toBe("Bob");
    expect(joined!.phase).toBe("setting");
  });

  test("cannot join non-existent room", () => {
    const result = joinRoom("XXXXX", "ws1", makeClientId(), "Bob");
    expect(result).toBeNull();
  });

  test("cannot join full room", () => {
    const room = createRoom("ws1", makeClientId(), "Alice");
    joinRoom(room.code, "ws2", makeClientId(), "Bob");
    const result = joinRoom(room.code, "ws3", makeClientId(), "Charlie");
    expect(result).toBeNull();
  });

  test("cannot join own room", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    const result = joinRoom(room.code, "ws2", hostClient, "AliceAgain");
    expect(result).toBeNull();
  });
});

describe("setSecret", () => {
  test("host sets secret", () => {
    const hostClient = makeClientId();
    const guestClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");

    const result = setSecret(room.code, hostClient, "1234");
    expect(result).not.toBeNull();
    expect(result!.room.hostSecret).toBe("1234");
    expect(result!.bothReady).toBe(false);
  });

  test("both players set secret triggers playing phase", () => {
    const hostClient = makeClientId();
    const guestClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");

    setSecret(room.code, hostClient, "1234");
    const result = setSecret(room.code, guestClient, "5678");
    expect(result!.bothReady).toBe(true);
    expect(result!.room.phase).toBe("playing");
  });

  test("cannot set secret twice (idempotent)", () => {
    const hostClient = makeClientId();
    const guestClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");

    setSecret(room.code, hostClient, "1234");
    const second = setSecret(room.code, hostClient, "9876");
    expect(second).toBeNull();
  });

  test("cannot set secret outside setting phase", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", makeClientId(), "Bob");
    setSecret(room.code, hostClient, "1234");
    setSecret(room.code, room.guestClientId!, "5678");

    const lateSecret = setSecret(room.code, hostClient, "9876");
    expect(lateSecret).toBeNull();
  });

  test("unknown client returns null", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", makeClientId(), "Bob");

    const result = setSecret(room.code, makeClientId(), "1234");
    expect(result).toBeNull();
  });
});

describe("makeGuess", () => {
  function setupGame(): { room: Room; hostClient: string; guestClient: string } {
    const hostClient = makeClientId();
    const guestClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");
    setSecret(room.code, hostClient, "1234");
    setSecret(room.code, guestClient, "5678");
    return { room, hostClient, guestClient };
  }

  test("correct guess triggers win", () => {
    const { room, hostClient } = setupGame();
    const result = makeGuess(room.code, hostClient, "5678");
    expect(result).not.toBeNull();
    expect(result!.isWin).toBe(true);
    expect(result!.room.phase).toBe("finished");
    expect(result!.room.winner).toBe("host");
  });

  test("partial guess returns bulls/cows", () => {
    const { room, hostClient } = setupGame();
    // guest secret = "5678", guess "5123" -> 5 is bull, others no match
    const result = makeGuess(room.code, hostClient, "5123");
    expect(result).not.toBeNull();
    expect(result!.result.bulls).toBe(1);
    expect(result!.result.cows).toBe(0);
  });

  test("duplicate guess is rejected", () => {
    const { room, hostClient } = setupGame();
    makeGuess(room.code, hostClient, "9876");
    const dup = makeGuess(room.code, hostClient, "9876");
    expect(dup).toBeNull();
  });

  test("cannot guess outside playing phase", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    const result = makeGuess(room.code, hostClient, "1234");
    expect(result).toBeNull();
  });

  test("unknown client returns null", () => {
    const { room } = setupGame();
    const result = makeGuess(room.code, makeClientId(), "1234");
    expect(result).toBeNull();
  });
});

describe("rejoinRoom", () => {
  test("host rejoins and clears disconnect timestamp", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");

    markPlayerDisconnected("ws1");
    const roomAfter = getRoom(room.code)!;
    expect(roomAfter.hostDisconnectedAt).toBeDefined();

    const result = rejoinRoom(room.code, hostClient, "ws99");
    expect(result).not.toBeNull();
    expect(result!.isHost).toBe(true);

    const roomAfterRejoin = getRoom(room.code)!;
    expect(roomAfterRejoin.hostWsId).toBe("ws99");
    expect(roomAfterRejoin.hostDisconnectedAt).toBeUndefined();
  });

  test("guest rejoins successfully", () => {
    const hostClient = makeClientId();
    const guestClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");

    markPlayerDisconnected("ws2");
    const result = rejoinRoom(room.code, guestClient, "ws99");
    expect(result).not.toBeNull();
    expect(result!.isHost).toBe(false);
    expect(room.guestWsId).toBe("ws99");
  });

  test("unkown client returns null", () => {
    createRoom("ws1", makeClientId(), "Alice");
    const result = rejoinRoom("XXXXX", makeClientId(), "ws99");
    expect(result).toBeNull();
  });
});

describe("findRoomByClientId", () => {
  test("finds room by host clientId", () => {
    const hostClient = makeClientId();
    const room = createRoom("ws1", hostClient, "Alice");
    const found = findRoomByClientId(hostClient);
    expect(found).toBeDefined();
    expect(found!.code).toBe(room.code);
  });

  test("finds room by guest clientId", () => {
    const guestClient = makeClientId();
    const room = createRoom("ws1", makeClientId(), "Alice");
    joinRoom(room.code, "ws2", guestClient, "Bob");
    const found = findRoomByClientId(guestClient);
    expect(found).toBeDefined();
  });

  test("returns undefined for unknown client", () => {
    const found = findRoomByClientId(makeClientId());
    expect(found).toBeUndefined();
  });
});

describe("cleanupExpiredRooms", () => {
  test("removes waiting room past TTL", () => {
    const room = createRoom("ws1", makeClientId(), "Alice");
    Object.defineProperty(room, "createdAt", { value: Date.now() - 700_000 });

    const removed = cleanupExpiredRooms(600_000);
    expect(removed).toContain(room.code);
    expect(getRoom(room.code)).toBeUndefined();
  });

  test("keeps active waiting room", () => {
    createRoom("ws1", makeClientId(), "Alice");
    expect(getRoomCount()).toBe(1);
    const removed = cleanupExpiredRooms(600_000);
    expect(removed).toHaveLength(0);
    expect(getRoomCount()).toBe(1);
  });

  test("calls room closed callback", () => {
    const closedCodes: string[] = [];
    setRoomClosedCallback((code) => closedCodes.push(code));

    const room = createRoom("ws1", makeClientId(), "Alice");
    Object.defineProperty(room, "createdAt", { value: Date.now() - 700_000 });

    cleanupExpiredRooms(600_000);
    expect(closedCodes).toContain(room.code);
  });
});

describe("removeRoom", () => {
  test("removes room from store", () => {
    const room = createRoom("ws1", makeClientId(), "Alice");
    expect(getRoomCount()).toBe(1);
    removeRoom(room.code);
    expect(getRoom(room.code)).toBeUndefined();
    expect(getRoomCount()).toBe(0);
  });
});
