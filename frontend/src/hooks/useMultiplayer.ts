"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { GuessEntry } from "@/lib/game-logic";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";
const STORAGE_CLIENT_ID = "mp_client_id";
const STORAGE_ROOM_CODE = "mp_room_code";
const STORAGE_MY_SECRET = "mp_my_secret";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type GamePhase =
  | "idle"
  | "creating"
  | "joining"
  | "waiting"
  | "setting_secret"
  | "playing"
  | "finished";

interface MultiplayerState {
  status: ConnectionStatus;
  phase: GamePhase;
  roomCode: string | null;
  playerName: string;
  isHost: boolean;
  hostName: string | null;
  guestName: string | null;
  myGuesses: GuessEntry[];
  opponentGuesses: GuessEntry[];
  mySecretSet: boolean;
  opponentSecretSet: boolean;
  winner: "me" | "opponent" | null;
  isComplete: boolean;
  mySecret: string | null;
  opponentSecret: string | null;
  opponentOnline: boolean;
  error: string | null;
  lastResult: { guess: string; bulls: number; cows: number } | null;
}

function getClientId(): string {
  if (typeof localStorage === "undefined") return crypto.randomUUID();
  let id = localStorage.getItem(STORAGE_CLIENT_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_CLIENT_ID, id);
  }
  return id;
}

const initialState: MultiplayerState = {
  status: "disconnected",
  phase: "idle",
  roomCode: null,
  playerName: "",
  isHost: false,
  hostName: null,
  guestName: null,
  myGuesses: [],
  opponentGuesses: [],
  mySecretSet: false,
  opponentSecretSet: false,
  winner: null,
  isComplete: false,
  mySecret: null,
  opponentSecret: null,
  opponentOnline: true,
  error: null,
  lastResult: null,
};

type GuessList = { guess: string; bulls: number; cows: number }[];

export function useMultiplayer() {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<MultiplayerState>(initialState);
  const clientId = useRef<string>("");

  useEffect(() => {
    clientId.current = getClientId();
  }, []);

  const sendMsg = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type, payload: { ...payload, clientId: clientId.current } }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState((prev) => ({ ...prev, status: "connecting", error: null }));

    const ws = new WebSocket(SERVER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, status: "connected" }));
      const savedCode = localStorage.getItem(STORAGE_ROOM_CODE);
      if (savedCode) {
        ws.send(JSON.stringify({
          type: "rejoin_room",
          payload: { code: savedCode, clientId: clientId.current },
        }));
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      setState((prev) => {
        switch (msg.type) {
          case "room_created":
            localStorage.setItem(STORAGE_ROOM_CODE, msg.payload.code);
            return {
              ...prev,
              phase: "waiting",
              roomCode: msg.payload.code,
              hostName: msg.payload.hostName,
              isHost: true,
              error: null,
            };

          case "join_success":
            localStorage.setItem(STORAGE_ROOM_CODE, msg.payload.code);
            return {
              ...prev,
              phase: "setting_secret",
              roomCode: msg.payload.code,
              hostName: msg.payload.hostName,
              guestName: msg.payload.guestName,
              isHost: false,
              opponentOnline: true,
              error: null,
            };

          case "join_error":
            return { ...prev, error: msg.payload.message, phase: "idle" };

          case "opponent_joined":
            return {
              ...prev,
              phase: "setting_secret",
              guestName: msg.payload.guestName,
              opponentOnline: true,
            };

          case "rejoined": {
            const p = msg.payload;
            const phaseMap: Record<string, GamePhase> = {
              waiting: "waiting",
              setting: "setting_secret",
              playing: "playing",
              finished: "finished",
            };
            const myGuesses: GuessEntry[] = (p.myGuesses as GuessList).map(
              (g, i) => ({ id: i + 1, guess: g.guess, bulls: g.bulls, cows: g.cows })
            );
            const opponentGuesses: GuessEntry[] = (p.opponentGuesses as GuessList).map(
              (g, i) => ({ id: i + 1, guess: g.guess, bulls: g.bulls, cows: g.cows })
            );

            // P0-2: server is authoritative for mySecret — save to localStorage too
            const mySecret = (p.mySecret as string | null) ?? localStorage.getItem(STORAGE_MY_SECRET);
            if (mySecret) localStorage.setItem(STORAGE_MY_SECRET, mySecret);

            return {
              ...prev,
              phase: phaseMap[p.phase as string] ?? "idle",
              roomCode: p.code as string,
              hostName: p.hostName as string,
              guestName: p.guestName as string | null,
              isHost: p.isHost as boolean,
              myGuesses,
              opponentGuesses,
              mySecretSet: p.mySecretSet as boolean,
              opponentSecretSet: p.opponentSecretSet as boolean,
              mySecret,
              winner:
                p.winner === "host"
                  ? (p.isHost ? "me" : "opponent")
                  : p.winner === "guest"
                  ? (p.isHost ? "opponent" : "me")
                  : null,
              isComplete: p.phase === "finished",
              opponentSecret: (p.opponentSecret as string | null) ?? null,
              opponentOnline: true,
              error: null,
            };
          }

          case "secret_set":
            return { ...prev, mySecretSet: true };

          case "opponent_secret_set":
            return { ...prev, opponentSecretSet: true };

          case "game_started":
            return { ...prev, phase: "playing", mySecretSet: true, opponentSecretSet: true };

          case "guess_result": {
            const p = msg.payload;
            const isMine = p.isHost === prev.isHost;
            const entry: GuessEntry = {
              id: (isMine ? prev.myGuesses.length : prev.opponentGuesses.length) + 1,
              guess: p.guess as string,
              bulls: p.bulls as number,
              cows: p.cows as number,
            };
            const winner =
              p.winner === "host"
                ? prev.isHost ? "me" : "opponent"
                : p.winner === "guest"
                ? prev.isHost ? "opponent" : "me"
                : null;

            return {
              ...prev,
              myGuesses: isMine ? [...prev.myGuesses, entry] : prev.myGuesses,
              opponentGuesses: !isMine ? [...prev.opponentGuesses, entry] : prev.opponentGuesses,
              lastResult: isMine
                ? { guess: p.guess as string, bulls: p.bulls as number, cows: p.cows as number }
                : prev.lastResult,
              isComplete: !!p.winner || prev.isComplete,
              winner: winner ?? prev.winner,
              opponentSecret: (p.opponentSecret as string | null) ?? prev.opponentSecret,
              phase: p.winner ? "finished" : prev.phase,
            };
          }

          // P0-4: dedicated opponentOnline flag, not an error
          case "opponent_disconnected":
            return { ...prev, opponentOnline: false };

          // P0-4: opponent came back
          case "opponent_rejoined":
            return { ...prev, opponentOnline: true, error: null };

          case "opponent_left":
            localStorage.removeItem(STORAGE_ROOM_CODE);
            localStorage.removeItem(STORAGE_MY_SECRET);
            return { ...prev, opponentOnline: false, error: "Opponent left the room.", phase: "finished" };

          case "invalid_guess":
          case "invalid_secret":
          case "error":
            return { ...prev, error: msg.payload.message as string };

          case "rejoin_error":
            localStorage.removeItem(STORAGE_ROOM_CODE);
            localStorage.removeItem(STORAGE_MY_SECRET);
            return prev;

          case "room_left":
            return { ...initialState, status: prev.status };

          default:
            return prev;
        }
      });
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", error: "Connection failed" }));
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, status: "disconnected" }));
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    setState((prev) => ({ ...prev, playerName, phase: "creating", error: null }));
    sendMsg("create_room", { name: playerName });
  }, [sendMsg]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    setState((prev) => ({ ...prev, playerName, phase: "joining", error: null }));
    sendMsg("join_room", { code: roomCode, name: playerName });
  }, [sendMsg]);

  const submitSecret = useCallback((secret: string, roomCode: string) => {
    localStorage.setItem(STORAGE_MY_SECRET, secret);
    setState((prev) => ({ ...prev, mySecret: secret }));
    sendMsg("set_secret", { secret, code: roomCode });
  }, [sendMsg]);

  const makeGuess = useCallback((guess: string, roomCode: string) => {
    setState((prev) => ({ ...prev, error: null }));
    sendMsg("make_guess", { guess, code: roomCode });
  }, [sendMsg]);

  const leaveRoom = useCallback((roomCode: string | null) => {
    if (roomCode) sendMsg("leave_room", { code: roomCode });
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.removeItem(STORAGE_MY_SECRET);
    setState((prev) => ({ ...initialState, status: prev.status }));
  }, [sendMsg]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.removeItem(STORAGE_MY_SECRET);
    setState(initialState);
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    ...state,
    connect,
    createRoom,
    joinRoom,
    submitSecret,
    makeGuess,
    leaveRoom,
    disconnect,
  };
}
