import { Elysia, t } from "elysia";
import { isValidNumber } from "../game/logic";
import {
  createRoom,
  getRoom,
  joinRoom,
  setSecret,
  makeGuess,
  rejoinRoom,
  markPlayerDisconnected,
  removeRoom,
} from "../store/rooms";

interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export const gameWS = {
  body: t.Object({
    type: t.String(),
    payload: t.Optional(t.Record(t.String(), t.Any())),
  }),

  open(ws) {
    console.log(`[WS] Connected: ${ws.id}`);
  },

  message(ws, msg: WSMessage) {
    const { type, payload = {} } = msg;

    switch (type) {
      case "create_room": {
        const clientId = String(payload.clientId || "");
        const hostName = String(payload.name || "Player 1");
        if (!clientId) {
          ws.send({ type: "error", payload: { message: "Missing clientId" } });
          return;
        }

        const room = createRoom(String(ws.id), clientId, hostName);
        ws.subscribe(`room:${room.code}`);

        ws.send({
          type: "room_created",
          payload: { code: room.code, hostName: room.hostName, isHost: true },
        });
        console.log(`[WS] Room created: ${room.code} by ${hostName}`);
        break;
      }

      case "join_room": {
        const clientId = String(payload.clientId || "");
        const code = String(payload.code || "").toUpperCase();
        const guestName = String(payload.name || "Player 2");

        if (!clientId) {
          ws.send({ type: "error", payload: { message: "Missing clientId" } });
          return;
        }

        const room = joinRoom(code, String(ws.id), clientId, guestName);
        if (!room) {
          ws.send({ type: "join_error", payload: { message: "Room not found or already full" } });
          return;
        }

        ws.subscribe(`room:${code}`);
        ws.send({
          type: "join_success",
          payload: { code: room.code, hostName: room.hostName, guestName: room.guestName, isHost: false },
        });

        ws.publish(`room:${code}`, {
          type: "opponent_joined",
          payload: { guestName },
        });

        console.log(`[WS] ${guestName} joined room ${code}`);
        break;
      }

      case "rejoin_room": {
        const clientId = String(payload.clientId || "");
        const code = String(payload.code || "").toUpperCase();

        const result = rejoinRoom(code, clientId, String(ws.id));
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
        const code = String(payload.code || "").toUpperCase();
        const secret = String(payload.secret || "");

        if (!isValidNumber(secret)) {
          ws.send({ type: "invalid_secret", payload: { message: "Must be 4 unique digits" } });
          return;
        }

        const result = setSecret(code, clientId, secret);
        if (!result) {
          ws.send({ type: "error", payload: { message: "Cannot set secret at this stage" } });
          return;
        }

        const { room, bothReady } = result;

        ws.send({ type: "secret_set", payload: { bothReady } });
        ws.publish(`room:${code}`, { type: "opponent_secret_set", payload: {} });

        if (bothReady) {
          const gameStarted = { type: "game_started", payload: {} };
          ws.publish(`room:${code}`, gameStarted);
          ws.send(gameStarted);
        }

        console.log(`[WS] Secret set in room ${code}, bothReady: ${bothReady}`);
        break;
      }

      case "make_guess": {
        const clientId = String(payload.clientId || "");
        const code = String(payload.code || "").toUpperCase();
        const guess = String(payload.guess || "");

        if (!isValidNumber(guess)) {
          ws.send({ type: "invalid_guess", payload: { message: "Must be 4 unique digits" } });
          return;
        }

        // P0-3: specific error messages per phase
        const room = getRoom(code);
        if (!room) {
          ws.send({ type: "error", payload: { message: "Room not found" } });
          return;
        }
        if (room.phase === "setting") {
          ws.send({ type: "error", payload: { message: "Waiting for both players to set their secrets" } });
          return;
        }
        if (room.phase === "finished") {
          ws.send({ type: "error", payload: { message: "Game is already over" } });
          return;
        }
        if (room.phase !== "playing") {
          ws.send({ type: "error", payload: { message: "Game has not started yet" } });
          return;
        }

        const result = makeGuess(code, clientId, guess);
        if (!result) {
          ws.send({ type: "error", payload: { message: "Cannot make that guess" } });
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
          opponentSecret: isWin ? (isHost ? updatedRoom.guestSecret : updatedRoom.hostSecret) : undefined,
        };

        ws.publish(`room:${code}`, { type: "guess_result", payload: resultPayload });
        ws.send({ type: "guess_result", payload: resultPayload });
        break;
      }

      case "leave_room": {
        const code = String(payload.code || "").toUpperCase();
        const room = getRoom(code);
        if (room) {
          ws.publish(`room:${code}`, { type: "opponent_left", payload: {} });
          removeRoom(code);
        }
        ws.send({ type: "room_left", payload: {} });
        break;
      }

      default:
        ws.send({ type: "error", payload: { message: `Unknown message type: ${type}` } });
    }
  },

  close(ws) {
    // P0-1: mark disconnect time instead of deleting room
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
