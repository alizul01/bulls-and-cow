import { calcBullsCows } from "../game/logic";

export interface GuessResult {
  guess: string;
  bulls: number;
  cows: number;
}

export type RoomPhase = "waiting" | "setting" | "playing" | "finished";
export type GameMode = "free" | "turns";
export type TurnPlayer = "host" | "guest";

export interface RoomSettings {
  gameMode: GameMode;
  digitLength: number;
  allowDuplicates: boolean;
  maxAttempts: number;
  isPublic: boolean;
}

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
  settings: RoomSettings;
  currentTurn?: TurnPlayer;
  phase: RoomPhase;
  createdAt: number;
  hostDisconnectedAt?: number;
  guestDisconnectedAt?: number;
}

const rooms = new Map<string, Room>();

export type RoomClosedCallback = (code: string, room: Room) => void;
let onRoomClosed: RoomClosedCallback | null = null;

export function setRoomClosedCallback(cb: RoomClosedCallback): void {
  onRoomClosed = cb;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(
  wsId: string,
  clientId: string,
  hostName: string,
  settings: Partial<RoomSettings> = {}
): Room {
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
    settings: {
      gameMode: settings.gameMode === "turns" ? "turns" : "free",
      digitLength: clamp(settings.digitLength ?? 4, 3, 7),
      allowDuplicates: settings.allowDuplicates ?? false,
      maxAttempts: clamp(settings.maxAttempts ?? 0, 0, 100),
      isPublic: settings.isPublic ?? true,
    },
    phase: "waiting",
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function findRoomByClientId(clientId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hostClientId === clientId || room.guestClientId === clientId) {
      return room;
    }
  }
  return undefined;
}

export function joinRoom(
  code: string,
  wsId: string,
  clientId: string,
  guestName: string
): Room | null {
  const room = rooms.get(code);
  if (!room || room.guestClientId) return null;

  // P0-5: prevent joining own room or already in another room
  if (room.hostClientId === clientId) return null;
  const existingRoom = findRoomByClientId(clientId);
  if (existingRoom && existingRoom.code !== code) return null;

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
    if (room.hostSecret) return null;
    room.hostSecret = secret;
  } else if (room.guestClientId === clientId) {
    if (room.guestSecret) return null;
    room.guestSecret = secret;
  } else {
    return null;
  }

  const bothReady = !!(room.hostSecret && room.guestSecret);
  if (bothReady) {
    room.phase = "playing";
    if (room.settings.gameMode === "turns") {
      room.currentTurn = "host";
    }
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

  if (room.settings.gameMode === "turns") {
    const player: TurnPlayer = isHost ? "host" : "guest";
    if (room.currentTurn !== player) return null;
  }

  // Check maxAttempts
  if (room.settings.maxAttempts > 0 && guesses.length >= room.settings.maxAttempts) return null;

  if (guesses.length > 0 && guesses[guesses.length - 1].guess === guess) return null;

  const result = calcBullsCows(secret, guess);
  guesses.push({ guess, bulls: result.bulls, cows: result.cows });

  const isWin = result.bulls === secret.length;
  if (isWin && !room.winner) {
    room.winner = isHost ? "host" : "guest";
    room.phase = "finished";
  } else if (room.settings.gameMode === "turns") {
    room.currentTurn = isHost ? "guest" : "host";
  }

  // Check if both players exhausted all attempts
  if (!isWin && room.settings.maxAttempts > 0) {
    const hostDone = room.hostGuesses.length >= room.settings.maxAttempts;
    const guestDone = room.guestGuesses.length >= room.settings.maxAttempts;
    if (hostDone && guestDone) {
      room.phase = "finished";
    }
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

export function cleanupExpiredRooms(ttlMs: number): string[] {
  const now = Date.now();
  const removedCodes: string[] = [];

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
      if (onRoomClosed) onRoomClosed(code, room);
      rooms.delete(code);
      removedCodes.push(code);
    }
  }

  return removedCodes;
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
  const room = rooms.get(code);
  if (room && onRoomClosed) onRoomClosed(code, room);
  rooms.delete(code);
}

export function getRoomCount(): number {
  return rooms.size;
}

export function clearAllRooms(): void {
  rooms.clear();
}

export function listPublicRooms(): Pick<Room, "code" | "hostName" | "settings" | "createdAt" | "phase">[] {
  const result: Pick<Room, "code" | "hostName" | "settings" | "createdAt" | "phase">[] = [];
  for (const room of rooms.values()) {
    if (room.settings.isPublic && room.phase === "waiting" && !room.guestClientId) {
      result.push({
        code: room.code,
        hostName: room.hostName,
        settings: room.settings,
        createdAt: room.createdAt,
        phase: room.phase,
      });
    }
  }
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}
