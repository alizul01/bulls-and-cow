"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { GuessEntry } from "@/lib/game-logic";

function getServerUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:3001/ws";

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (isLocalhost) return "ws://localhost:3001/ws";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}
const STORAGE_CLIENT_ID = "mp_client_id";
const STORAGE_ROOM_CODE = "mp_room_code";
const STORAGE_MY_SECRET = "mp_my_secret";

type ConnectionStatus = "disconnected" | "connecting" | "reconnecting" | "connected" | "error";
type GameMode = "free" | "turns";
type TurnPlayer = "host" | "guest";
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
  errorType: string | null;
  lastResult: { guess: string; bulls: number; cows: number } | null;
  isSubmitting: boolean;
  reconnecting: boolean;
  gameMode: GameMode;
  currentTurn: TurnPlayer | null;
  isMyTurn: boolean;
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
  errorType: null,
  lastResult: null,
  isSubmitting: false,
  reconnecting: false,
  gameMode: "free",
  currentTurn: null,
  isMyTurn: true,
};

type GuessList = { guess: string; bulls: number; cows: number }[];

function getUserFriendlyError(errorType: string | null, message: string): string {
  const map: Record<string, string> = {
    already_in_room: "You are already in another room. Leave it first.",
    rate_limited: "You're acting too fast. Take a breath and try again.",
    room_not_found: "Room was not found. It may have expired.",
    wrong_phase: "That action can't be taken right now.",
    game_over: "This game has already ended.",
    already_set: "Your secret is already locked in.",
    invalid_client: "Connection issue. Try reconnecting.",
    invalid_code: "Invalid room code format.",
    invalid_guess: "Invalid guess.",
    not_your_turn: "It's not your turn yet.",
    unknown_type: "Unexpected server error.",
  };
  return map[errorType ?? ""] ?? message;
}

export function useMultiplayer() {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<MultiplayerState>(initialState);
  const clientId = useRef<string>("");
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReconnect = useRef(false);
  const sentMessages = useRef<Set<string>>(new Set());

  const deriveIsMyTurn = useCallback((gameMode: GameMode, currentTurn: TurnPlayer | null, isHost: boolean): boolean => {
    if (gameMode !== "turns") return true;
    return currentTurn === (isHost ? "host" : "guest");
  }, []);

  useEffect(() => {
    clientId.current = getClientId();
  }, []);

  const sendMsg = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;

    const messageId = crypto.randomUUID();
    sentMessages.current.add(messageId);

    wsRef.current.send(JSON.stringify({
      type,
      payload: { ...payload, clientId: clientId.current, messageId },
    }));
    return true;
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping", payload: {} }));
      }
    }, 15_000);
  }, [stopPing]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnect.current) return;

    const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30_000);
    const jitter = delay * 0.3 * Math.random();
    const wait = delay + jitter;

    retryCount.current++;
    setState((prev) => ({ ...prev, reconnecting: true, error: null }));

    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      doConnect();
    }, wait);
  }, []);

  const doConnect = useCallback(() => {
    clearRetry();

    const ws = new WebSocket(getServerUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      startPing();
      setState((prev) => ({
        ...prev,
        status: "connected",
        reconnecting: false,
        error: null,
        errorType: null,
      }));

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

      // P0-7: heartbeat
      if (msg.type === "pong") return;

      setState((prev) => {
        switch (msg.type) {
          case "room_created": {
            const code = msg.payload.code as string;
            localStorage.setItem(STORAGE_ROOM_CODE, code);
            shouldReconnect.current = true;
            return {
              ...prev,
              phase: "waiting",
              roomCode: code,
              hostName: msg.payload.hostName as string,
              isHost: true,
              gameMode: ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? "free"),
              currentTurn: (msg.payload.currentTurn as TurnPlayer | null) ?? null,
              isMyTurn: deriveIsMyTurn(
                ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? "free"),
                (msg.payload.currentTurn as TurnPlayer | null) ?? null,
                true
              ),
              error: null,
              errorType: null,
              isSubmitting: false,
            };
          }

          case "join_success": {
            const code = msg.payload.code as string;
            localStorage.setItem(STORAGE_ROOM_CODE, code);
            shouldReconnect.current = true;
            return {
              ...prev,
              phase: "setting_secret",
              roomCode: code,
              hostName: msg.payload.hostName as string,
              guestName: msg.payload.guestName as string,
              isHost: false,
              gameMode: ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? "free"),
              currentTurn: (msg.payload.currentTurn as TurnPlayer | null) ?? null,
              isMyTurn: deriveIsMyTurn(
                ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? "free"),
                (msg.payload.currentTurn as TurnPlayer | null) ?? null,
                false
              ),
              opponentOnline: true,
              error: null,
              errorType: null,
              isSubmitting: false,
            };
          }

          case "join_error":
            return {
              ...prev,
              error: getUserFriendlyError(null, msg.payload.message as string),
              errorType: (msg.payload.errorType as string) ?? null,
              phase: "idle",
              isSubmitting: false,
            };

          case "opponent_joined":
            return {
              ...prev,
              phase: "setting_secret",
              guestName: msg.payload.guestName as string,
              gameMode: ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? prev.gameMode),
              currentTurn: (msg.payload.currentTurn as TurnPlayer | null) ?? prev.currentTurn,
              isMyTurn: deriveIsMyTurn(
                ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? prev.gameMode),
                (msg.payload.currentTurn as TurnPlayer | null) ?? prev.currentTurn,
                prev.isHost
              ),
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

            const mySecret = (p.mySecret as string | null) ?? localStorage.getItem(STORAGE_MY_SECRET);
            if (mySecret) localStorage.setItem(STORAGE_MY_SECRET, mySecret);

            shouldReconnect.current = true;
            const gameMode = ((p.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? "free");
            const currentTurn = (p.currentTurn as TurnPlayer | null) ?? null;
            const isHost = p.isHost as boolean;

            return {
              ...prev,
              phase: phaseMap[p.phase as string] ?? "idle",
              roomCode: p.code as string,
              hostName: p.hostName as string,
              guestName: p.guestName as string | null,
              isHost,
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
              gameMode,
              currentTurn,
              isMyTurn: deriveIsMyTurn(gameMode, currentTurn, isHost),
              error: null,
              errorType: null,
              reconnecting: false,
              isSubmitting: false,
            };
          }

          case "secret_set":
            return { ...prev, mySecretSet: true, isSubmitting: false };

          case "opponent_secret_set":
            return { ...prev, opponentSecretSet: true };

          case "game_started":
            {
              const gameMode = ((msg.payload.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? prev.gameMode);
              const currentTurn = (msg.payload.currentTurn as TurnPlayer | null) ?? prev.currentTurn;
              return {
                ...prev,
                phase: "playing",
                mySecretSet: true,
                opponentSecretSet: true,
                isSubmitting: false,
                gameMode,
                currentTurn,
                isMyTurn: deriveIsMyTurn(gameMode, currentTurn, prev.isHost),
              };
            }

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
            const gameMode = ((p.settings as { gameMode?: GameMode } | undefined)?.gameMode ?? prev.gameMode);
            const currentTurn = (p.currentTurn as TurnPlayer | null) ?? prev.currentTurn;

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
              gameMode,
              currentTurn,
              isMyTurn: deriveIsMyTurn(gameMode, currentTurn, prev.isHost),
              isSubmitting: false,
              error: null,
              errorType: null,
            };
          }

          case "opponent_disconnected":
            return { ...prev, opponentOnline: false };

          case "opponent_rejoined":
            return { ...prev, opponentOnline: true, error: null, errorType: null };

          case "opponent_left":
            localStorage.removeItem(STORAGE_ROOM_CODE);
            localStorage.removeItem(STORAGE_MY_SECRET);
            shouldReconnect.current = false;
            return { ...prev, opponentOnline: false, error: "Opponent left the room.", errorType: "opponent_left", phase: "finished", isSubmitting: false };

          case "room_closed": {
            localStorage.removeItem(STORAGE_ROOM_CODE);
            localStorage.removeItem(STORAGE_MY_SECRET);
            shouldReconnect.current = false;
            return {
              ...prev,
              phase: "idle",
              error: "Room has expired. You've been returned to the lobby.",
              errorType: "room_expired",
              roomCode: null,
              isSubmitting: false,
            };
          }

          case "invalid_guess":
          case "invalid_secret":
            return {
              ...prev,
              error: msg.payload.message as string,
              errorType: msg.payload.errorType as string ?? null,
              isSubmitting: false,
            };

          case "error":
            return {
              ...prev,
              error: getUserFriendlyError((msg.payload.errorType as string) ?? null, msg.payload.message as string),
              errorType: (msg.payload.errorType as string) ?? null,
              isSubmitting: false,
            };

          case "rejoin_error":
            localStorage.removeItem(STORAGE_ROOM_CODE);
            localStorage.removeItem(STORAGE_MY_SECRET);
            shouldReconnect.current = false;
            return { ...prev, reconnecting: false, phase: "idle" };

          case "room_left":
            stopPing();
            shouldReconnect.current = false;
            return { ...initialState, status: prev.status };

          default:
            return prev;
        }
      });
    };

    ws.onerror = () => {
      stopPing();
      setState((prev) => ({
        ...prev,
        status: "error",
        reconnecting: false,
        error: "Connection failed. Will retry...",
        errorType: "connection_failed",
      }));
    };

    ws.onclose = () => {
      stopPing();
      setState((prev) => ({
        ...prev,
        status: "disconnected",
        reconnecting: false,
        isSubmitting: false,
      }));

      if (shouldReconnect.current) {
        scheduleReconnect();
      }
    };
  }, [clearRetry, startPing, stopPing, scheduleReconnect, deriveIsMyTurn]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    shouldReconnect.current = true;
    retryCount.current = 0;
    setState((prev) => ({ ...prev, status: "connecting", error: null, errorType: null }));
    doConnect();
  }, [doConnect]);

  const createRoom = useCallback((playerName: string, gameMode: GameMode = "free") => {
    setState((prev) => ({ ...prev, playerName, phase: "creating", error: null, errorType: null, isSubmitting: true }));
    sendMsg("create_room", { name: playerName, gameMode });
  }, [sendMsg]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    setState((prev) => ({ ...prev, playerName, phase: "joining", error: null, errorType: null, isSubmitting: true }));
    sendMsg("join_room", { code: roomCode, name: playerName });
  }, [sendMsg]);

  const submitSecret = useCallback((secret: string, roomCode: string) => {
    localStorage.setItem(STORAGE_MY_SECRET, secret);
    setState((prev) => ({ ...prev, mySecret: secret, isSubmitting: true, error: null }));
    sendMsg("set_secret", { secret, code: roomCode });
  }, [sendMsg]);

  const makeGuess = useCallback((guess: string, roomCode: string) => {
    setState((prev) => ({ ...prev, error: null, errorType: null, isSubmitting: true }));
    sendMsg("make_guess", { guess, code: roomCode });
  }, [sendMsg]);

  const leaveRoom = useCallback((roomCode: string | null) => {
    if (roomCode) sendMsg("leave_room", { code: roomCode });
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.removeItem(STORAGE_MY_SECRET);
    shouldReconnect.current = false;
    stopPing();
    setState((prev) => ({ ...initialState, status: prev.status }));
  }, [sendMsg, stopPing]);

  const disconnect = useCallback(() => {
    clearRetry();
    stopPing();
    wsRef.current?.close();
    wsRef.current = null;
    shouldReconnect.current = false;
    localStorage.removeItem(STORAGE_ROOM_CODE);
    localStorage.removeItem(STORAGE_MY_SECRET);
    setState(initialState);
  }, [clearRetry, stopPing]);

  useEffect(() => {
    return () => {
      clearRetry();
      stopPing();
      wsRef.current?.close();
    };
  }, [clearRetry, stopPing]);

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
