import { calcBullsCows } from "../game/logic";

export interface GuessResult {
  guess: string;
  bulls: number;
  cows: number;
}

export type RoomPhase = "waiting" | "setting" | "playing" | "finished";

export interface Room {
  code: string;
  hostWsId: string;
  guestWsId?: string;
  hostClientId: string;
  guestClientId?: string;
  hostName: string;
  guestName?: string;
  hostSecret?: string;
  guestSecret?: string;
  hostGuesses: GuessResult[];
  guestGuesses: GuessResult[];
  winner?: "host" | "guest";
  phase: RoomPhase;
  createdAt: number;
  hostDisconnectedAt?: number;
  guestDisconnectedAt?: number;
}

const rooms = new Map<string, Room>();

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(wsId: string, clientId: string, hostName: string): Room {
  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room: Room = {
    code,
    hostWsId: wsId,
    hostClientId: clientId,
    hostName,
    hostGuesses: [],
    guestGuesses: [],
    phase: "waiting",
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function joinRoom(
  code: string,
  wsId: string,
  clientId: string,
  guestName: string
): Room | null {
  const room = rooms.get(code);
  if (!room || room.guestClientId) return null;
  room.guestWsId = wsId;
  room.guestClientId = clientId;
  room.guestName = guestName;
  room.phase = "setting";
  return room;
}

export function setSecret(
  code: string,
  clientId: string,
  secret: string
): { room: Room; bothReady: boolean } | null {
  const room = rooms.get(code);
  if (!room || room.phase !== "setting") return null;

  if (room.hostClientId === clientId) {
    room.hostSecret = secret;
  } else if (room.guestClientId === clientId) {
    room.guestSecret = secret;
  } else {
    return null;
  }

  const bothReady = !!(room.hostSecret && room.guestSecret);
  if (bothReady) {
    room.phase = "playing";
  }

  return { room, bothReady };
}

export function makeGuess(
  code: string,
  clientId: string,
  guess: string
): { result: GuessResult; isWin: boolean; room: Room; isHost: boolean } | null {
  const room = rooms.get(code);
  if (!room || room.phase !== "playing") return null;

  const isHost = room.hostClientId === clientId;
  const isGuest = room.guestClientId === clientId;
  if (!isHost && !isGuest) return null;

  const secret = isHost ? room.guestSecret! : room.hostSecret!;
  const guesses = isHost ? room.hostGuesses : room.guestGuesses;

  const result = calcBullsCows(secret, guess);
  guesses.push({ guess, bulls: result.bulls, cows: result.cows });

  const isWin = result.bulls === secret.length;
  if (isWin && !room.winner) {
    room.winner = isHost ? "host" : "guest";
    room.phase = "finished";
  }

  return { result, isWin, room, isHost };
}

export function rejoinRoom(
  code: string,
  clientId: string,
  newWsId: string
): { room: Room; isHost: boolean } | null {
  const room = rooms.get(code);
  if (!room) return null;

  if (room.hostClientId === clientId) {
    room.hostWsId = newWsId;
    room.hostDisconnectedAt = undefined;
    return { room, isHost: true };
  } else if (room.guestClientId === clientId) {
    room.guestWsId = newWsId;
    room.guestDisconnectedAt = undefined;
    return { room, isHost: false };
  }

  return null;
}

export function markPlayerDisconnected(wsId: string): { room: Room; isHost: boolean } | undefined {
  for (const room of rooms.values()) {
    if (room.hostWsId === wsId) {
      room.hostDisconnectedAt = Date.now();
      return { room, isHost: true };
    }
    if (room.guestWsId === wsId) {
      room.guestDisconnectedAt = Date.now();
      return { room, isHost: false };
    }
  }
  return undefined;
}

export function cleanupExpiredRooms(ttlMs: number): number {
  const now = Date.now();
  let removed = 0;

  for (const [code, room] of rooms.entries()) {
    const hostGone =
      room.hostDisconnectedAt !== undefined &&
      now - room.hostDisconnectedAt > ttlMs;

    const guestGone =
      !room.guestClientId ||
      (room.guestDisconnectedAt !== undefined &&
        now - room.guestDisconnectedAt > ttlMs);

    // Waiting rooms abandoned by the host
    const abandonedWaiting =
      room.phase === "waiting" && now - room.createdAt > ttlMs;

    if ((hostGone && guestGone) || abandonedWaiting) {
      rooms.delete(code);
      removed++;
    }
  }

  return removed;
}

export function findRoomByWsId(wsId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hostWsId === wsId || room.guestWsId === wsId) {
      return room;
    }
  }
  return undefined;
}

export function removeRoom(code: string): void {
  rooms.delete(code);
}

export function getRoomCount(): number {
  return rooms.size;
}
