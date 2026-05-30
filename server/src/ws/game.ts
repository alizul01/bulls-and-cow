import { Elysia, t } from "elysia";
import { isValidNumber } from "../game/logic";
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
  setRoomClosedCallback,
} from "../store/rooms";
import {
  isValidUUID,
  isValidRoomCode,
  isValidPlayerName,
  sanitizeName,
  sanitizeCode,
  isDuplicateMessage,
  clearRoomMessageDedup,
  checkRateLimit,
} from "../validation";

const HEARTBEAT_INTERVAL_MS = 90_000;
const PING_INTERVAL_MS = 15_000;

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// Track last activity per ws.id for heartbeat
const wsActivity = new Map<string, number>();

function updateActivity(wsId: string): void {
  wsActivity.set(wsId, Date.now());
}

setInterval(() => {
  const now = Date.now();
  for (const [wsId, lastActivity] of wsActivity.entries()) {
    if (now - lastActivity > HEARTBEAT_INTERVAL_MS) {
      wsActivity.delete(wsId);
    }
  }
}, 30_000);

// onRoomClosed publishes to all subscribers before the room is removed
setRoomClosedCallback((code, room) => {
  if (!globalThis._elysiaApp?.server) return;
  globalThis._elysiaApp.server.publish(
    `room:${code}`,
    JSON.stringify({ type: "room_closed", payload: { code } })
  );
  clearRoomMessageDedup(code);
});

export const gameWS = {
  body: t.Object({
    type: t.String(),
    payload: t.Optional(t.Record(t.String(), t.Any())),
  }),

  open(ws) {
    updateActivity(String(ws.id));
    console.log(`[WS] Connected: ${ws.id}`);
  },

  message(ws, msg: WSMessage) {
    const { type, payload = {} } = msg;
    const wsId = String(ws.id);

    updateActivity(wsId);

    switch (type) {
      case "ping": {
        ws.send({ type: "pong", payload: {} });
        return;
      }

      case "create_room": {
        const clientId = String(payload.clientId || "");
        const rawName = String(payload.name || "");
        const gameMode = payload.gameMode === "turns" ? "turns" : "free";
        const digitLength = Number(payload.digitLength) || 4;
        const allowDuplicates = payload.allowDuplicates === true;
        const maxAttempts = Number(payload.maxAttempts) || 0;
        const isPublic = payload.isPublic !== false;

        if (!clientId || !isValidUUID(clientId)) {
          ws.send({ type: "error", payload: { message: "Invalid client identity" } });
          return;
        }

        const name = sanitizeName(rawName);
        if (!isValidPlayerName(name)) {
          ws.send({ type: "error", payload: { message: "Name must be 1-20 characters" } });
          return;
        }

        // P0-5: prevent duplicate player in multiple rooms
        const existing = findRoomByClientId(clientId);
        if (existing) {
          ws.send({
            type: "error",
            payload: {
              message: `Already in room ${existing.code}. Leave it first.`,
              errorType: "already_in_room",
              roomCode: existing.code,
            },
          });
          return;
        }

        // Rate limit create/join
        const rate = checkRateLimit(clientId, "create_join");
        if (!rate.allowed) {
          ws.send({ type: "error", payload: { message: "You're doing that too fast. Wait a moment.", errorType: "rate_limited", retryAfterMs: rate.retryAfterMs } });
          return;
        }

        const room = createRoom(wsId, clientId, name, { gameMode, digitLength, allowDuplicates, maxAttempts, isPublic });
        ws.subscribe(`room:${room.code}`);

        ws.send({
          type: "room_created",
          payload: {
            code: room.code,
            hostName: room.hostName,
            isHost: true,
            ttlMs: 600_000,
            settings: room.settings,
            currentTurn: room.currentTurn ?? null,
            digitLength: room.settings.digitLength,
          },
        });
        console.log(`[WS] Room created: ${room.code} by ${name}`);
        break;
      }

      case "join_room": {
        const clientId = String(payload.clientId || "");
        const rawCode = String(payload.code || "");
        const rawName = String(payload.name || "");

        if (!clientId || !isValidUUID(clientId)) {
          ws.send({ type: "join_error", payload: { message: "Invalid client identity" } });
          return;
        }

        const code = sanitizeCode(rawCode);
        if (!isValidRoomCode(code)) {
          ws.send({ type: "join_error", payload: { message: "Invalid room code format (5 alphanumeric characters)" } });
          return;
        }

        const name = sanitizeName(rawName);
        if (!isValidPlayerName(name)) {
          ws.send({ type: "join_error", payload: { message: "Name must be 1-20 characters" } });
          return;
        }

        // P0-5: prevent joining if already in another room
        const existing = findRoomByClientId(clientId);
        if (existing) {
          ws.send({
            type: "join_error",
            payload: { message: `Already in room ${existing.code}. Leave it first.` },
          });
          return;
        }

        // Rate limit
        const rate = checkRateLimit(clientId, "create_join");
        if (!rate.allowed) {
          ws.send({ type: "join_error", payload: { message: "You're doing that too fast. Wait a moment." } });
          return;
        }

        const room = getRoom(code);
        if (!room) {
          ws.send({ type: "error", payload: { message: "Room not found", errorType: "room_not_found" } });
          return;
        }

        if (!isValidNumber(guess, room.settings.digitLength, room.settings.allowDuplicates)) {
          ws.send({
            type: "invalid_guess",
            payload: {
              message: room.settings.allowDuplicates
                ? `Must be ${room.settings.digitLength} digits`
                : `Must be ${room.settings.digitLength} unique digits`,
            },
          });
          return;
        }
        if (room.phase === "finished") {
          ws.send({ type: "join_error", payload: { message: "This game has already finished" } });
          return;
        }

        const joined = joinRoom(code, wsId, clientId, name);
        if (!joined) {
          ws.send({ type: "join_error", payload: { message: "Room is full or you're already in it" } });
          return;
        }

        ws.subscribe(`room:${code}`);
        ws.send({
          type: "join_success",
          payload: {
            code: joined.code,
            hostName: joined.hostName,
            guestName: joined.guestName,
            isHost: false,
            ttlMs: 600_000,
            settings: joined.settings,
            currentTurn: joined.currentTurn ?? null,
          },
        });

        ws.publish(`room:${code}`, {
          type: "opponent_joined",
          payload: { guestName: name, settings: joined.settings, digitLength: joined.settings.digitLength, currentTurn: joined.currentTurn ?? null },
        });

        console.log(`[WS] ${name} joined room ${code}`);
        break;
      }

      case "rejoin_room": {
        const clientId = String(payload.clientId || "");
        const rawCode = String(payload.code || "");

        if (!clientId || !isValidUUID(clientId)) {
          ws.send({ type: "rejoin_error", payload: { message: "Invalid client identity" } });
          return;
        }

        const code = sanitizeCode(rawCode);
        if (!isValidRoomCode(code)) {
          ws.send({ type: "rejoin_error", payload: { message: "Invalid room code" } });
          return;
        }

        const result = rejoinRoom(code, clientId, wsId);
        if (!result) {
          ws.send({ type: "rejoin_error", payload: { message: "Room not found or expired" } });
          return;
        }

        const { room, isHost } = result;
        ws.subscribe(`room:${code}`);

        const myGuesses = isHost ? room.hostGuesses : room.guestGuesses;
        const opponentGuesses = isHost ? room.guestGuesses : room.hostGuesses;
        const mySecretSet = isHost ? !!room.hostSecret : !!room.guestSecret;
        const opponentSecretSet = isHost ? !!room.guestSecret : !!room.hostSecret;
        const mySecret = isHost ? room.hostSecret : room.guestSecret;

        ws.send({
          type: "rejoined",
          payload: {
            code: room.code,
            phase: room.phase,
            hostName: room.hostName,
            guestName: room.guestName,
            isHost,
            myGuesses,
            opponentGuesses,
            mySecretSet,
            opponentSecretSet,
            mySecret: mySecret ?? null,
            settings: room.settings,
            currentTurn: room.currentTurn ?? null,
            winner: room.winner,
            opponentSecret:
              room.phase === "finished"
                ? isHost ? room.guestSecret : room.hostSecret
                : undefined,
          },
        });

        // P0-4: notify opponent this player is back online
        ws.publish(`room:${code}`, {
          type: "opponent_rejoined",
          payload: { name: isHost ? room.hostName : room.guestName },
        });

        console.log(`[WS] Player rejoined room ${code} (isHost: ${isHost})`);
        break;
      }

      case "set_secret": {
        const clientId = String(payload.clientId || "");
        const rawCode = String(payload.code || "");
        const secret = String(payload.secret || "");
        const messageId = String(payload.messageId || "");

        if (!clientId || !isValidUUID(clientId)) {
          ws.send({ type: "error", payload: { message: "Invalid client identity", errorType: "invalid_client" } });
          return;
        }

        const code = sanitizeCode(rawCode);
        if (!isValidRoomCode(code)) {
          ws.send({ type: "error", payload: { message: "Invalid room code", errorType: "invalid_code" } });
          return;
        }

        if (messageId && isDuplicateMessage(code, messageId)) {
          return;
        }

        if (!isValidNumber(secret)) {
          ws.send({ type: "invalid_secret", payload: { message: "Must be 4 unique digits" } });
          return;
        }

        // Rate limit
        const rate = checkRateLimit(clientId, "secret");
        if (!rate.allowed) {
          ws.send({ type: "error", payload: { message: "Too fast. Wait before setting secret again.", errorType: "rate_limited", retryAfterMs: rate.retryAfterMs } });
          return;
        }

        const room = getRoom(code);
        if (!room) {
          ws.send({ type: "error", payload: { message: "Room not found", errorType: "room_not_found" } });
          return;
        }

        if (room.phase !== "setting") {
          ws.send({ type: "error", payload: { message: "Cannot set secret at this stage", errorType: "wrong_phase" } });
          return;
        }

        if (!isValidNumber(secret, room.settings.digitLength, room.settings.allowDuplicates)) {
          ws.send({
            type: "invalid_secret",
            payload: {
              message: room.settings.allowDuplicates
                ? `Must be ${room.settings.digitLength} digits`
                : `Must be ${room.settings.digitLength} unique digits`,
            },
          });
          return;
        }

        const result = setSecret(code, clientId, secret);
        if (!result) {
          ws.send({ type: "error", payload: { message: "Secret already set or invalid player", errorType: "already_set" } });
          return;
        }

        const { bothReady } = result;

        ws.send({ type: "secret_set", payload: { bothReady } });
        ws.publish(`room:${code}`, { type: "opponent_secret_set", payload: {} });

        if (bothReady) {
          const gameStarted = {
            type: "game_started",
            payload: {
            settings: room.settings,
            digitLength: room.settings.digitLength,
            currentTurn: room.currentTurn ?? null,
            },
          };
          ws.publish(`room:${code}`, gameStarted);
          ws.send(gameStarted);
        }

        console.log(`[WS] Secret set in room ${code}, bothReady: ${bothReady}`);
        break;
      }

      case "make_guess": {
        const clientId = String(payload.clientId || "");
        const rawCode = String(payload.code || "");
        const guess = String(payload.guess || "");
        const messageId = String(payload.messageId || "");

        if (!clientId || !isValidUUID(clientId)) {
          ws.send({ type: "error", payload: { message: "Invalid client identity", errorType: "invalid_client" } });
          return;
        }

        const code = sanitizeCode(rawCode);
        if (!isValidRoomCode(code)) {
          ws.send({ type: "error", payload: { message: "Invalid room code", errorType: "invalid_code" } });
          return;
        }

        if (messageId && isDuplicateMessage(code, messageId)) {
          return;
        }

        if (!isValidNumber(guess)) {
          ws.send({ type: "invalid_guess", payload: { message: "Must be 4 unique digits" } });
          return;
        }

        // Rate limit
        const rate = checkRateLimit(clientId, "guess");
        if (!rate.allowed) {
          ws.send({ type: "error", payload: { message: "Too fast. Wait before guessing again.", errorType: "rate_limited", retryAfterMs: rate.retryAfterMs } });
          return;
        }

        const room = getRoom(code);
        if (!room) {
          ws.send({ type: "error", payload: { message: "Room not found", errorType: "room_not_found" } });
          return;
        }
        if (room.phase === "setting") {
          ws.send({ type: "error", payload: { message: "Waiting for both players to set their secrets", errorType: "wrong_phase" } });
          return;
        }
        if (room.phase === "finished") {
          ws.send({ type: "error", payload: { message: "Game is already over", errorType: "game_over" } });
          return;
        }
        if (room.phase !== "playing") {
          ws.send({ type: "error", payload: { message: "Game has not started yet", errorType: "wrong_phase" } });
          return;
        }

        // P0-5: validate bulls+cows <= 4 on server
        const isHostGuess = room.hostClientId === clientId;
        if (room.settings.gameMode === "turns") {
          const player = isHostGuess ? "host" : "guest";
          if (room.currentTurn !== player) {
            ws.send({ type: "error", payload: { message: "It's not your turn yet.", errorType: "not_your_turn" } });
            return;
          }
        }

        const opponentSecret = isHostGuess ? room.guestSecret : room.hostSecret;
        if (!opponentSecret) {
          ws.send({ type: "error", payload: { message: "Cannot make that guess", errorType: "invalid_secret" } });
          return;
        }

        const result = makeGuess(code, clientId, guess);
        if (!result) {
          ws.send({ type: "error", payload: { message: "Cannot make that guess — duplicate or invalid", errorType: "invalid_guess" } });
          return;
        }

        const { result: guessResult, isWin, room: updatedRoom, isHost } = result;

        const resultPayload = {
          guess,
          bulls: guessResult.bulls,
          cows: guessResult.cows,
          guessCount: isHost ? updatedRoom.hostGuesses.length : updatedRoom.guestGuesses.length,
          isWin,
          isHost,
          winner: updatedRoom.winner,
          settings: updatedRoom.settings,
          currentTurn: updatedRoom.currentTurn ?? null,
          opponentSecret: isWin ? (isHost ? updatedRoom.guestSecret : updatedRoom.hostSecret) : undefined,
        };

        ws.publish(`room:${code}`, { type: "guess_result", payload: resultPayload });
        ws.send({ type: "guess_result", payload: resultPayload });
        break;
      }

      case "leave_room": {
        const rawCode = String(payload.code || "");
        const code = sanitizeCode(rawCode);
        const room = getRoom(code);
        if (room) {
          ws.publish(`room:${code}`, { type: "opponent_left", payload: {} });
          removeRoom(code);
        }
        ws.send({ type: "room_left", payload: {} });
        break;
      }

      default:
        ws.send({ type: "error", payload: { message: `Unknown message type: ${type}`, errorType: "unknown_type" } });
    }
  },

  close(ws) {
    wsActivity.delete(String(ws.id));

    const disconnected = markPlayerDisconnected(String(ws.id));
    if (disconnected) {
      ws.publish(`room:${disconnected.room.code}`, {
        type: "opponent_disconnected",
        payload: {},
      });
      console.log(`[WS] Player disconnected from room ${disconnected.room.code}`);
    }
    console.log(`[WS] Disconnected: ${ws.id}`);
  },
};
