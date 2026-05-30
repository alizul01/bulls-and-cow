"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import Toast from "@/components/Toast";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useSound } from "@/hooks/useSound";

export default function MultiplayerPage() {
  const {
    status,
    phase,
    roomCode,
    isHost,
    hostName,
    guestName,
    myGuesses,
    opponentGuesses,
    mySecretSet,
    opponentSecretSet,
    isComplete,
    winner,
    mySecret,
    opponentSecret,
    opponentOnline,
    error,
    errorType,
    lastResult,
    isSubmitting,
    reconnecting,
    connect,
    createRoom,
    joinRoom,
    submitSecret,
    makeGuess,
    leaveRoom,
    disconnect,
  } = useMultiplayer();

  const { playGuess, playWin, playLose, playError, playConnected, setEnabled, isEnabled } = useSound();

  const [nameInput, setNameInput] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const prevIsComplete = useRef(false);
  const prevGuessCount = useRef(0);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 1200);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    if (errorType === "room_expired" && phase === "idle") {
      setMode(null);
      setNameInput("");
      setRoomInput("");
    }
  }, [errorType, phase]);

  useEffect(() => {
    if (error && errorType !== "room_expired" && errorType !== "opponent_left") {
      playError();
    }
  }, [error, errorType, playError]);

  useEffect(() => {
    if (isComplete && !prevIsComplete.current) {
      if (winner === "me") playWin();
      else if (winner === "opponent") playLose();
    }
    prevIsComplete.current = isComplete;
  }, [isComplete, winner, playWin, playLose]);

  useEffect(() => {
    if (myGuesses.length > prevGuessCount.current && !isComplete) {
      playGuess();
    }
    prevGuessCount.current = myGuesses.length;
  }, [myGuesses.length, isComplete, playGuess]);

  useEffect(() => {
    if (status === "connected") {
      playConnected();
    }
  }, [status, playConnected]);

  const handleSoundToggle = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setEnabled(next);
  }, [soundOn, setEnabled]);

  const handleCopyCode = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
    }
  }, [roomCode]);

  const handleShareResult = useCallback(() => {
    if (!isComplete) return;
    const myName = isHost ? hostName : guestName;
    const opponentName = isHost ? guestName : hostName;
    const text = winner === "me"
      ? `I beat ${opponentName} in Bulls & Cows! I cracked their code in ${myGuesses.length} guesses.`
      : `${opponentName} beat me in Bulls & Cows... the secret was ${opponentSecret}.`;

    if (navigator.share) {
      navigator.share({ text, title: "Bulls & Cows" });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
    }
  }, [isComplete, isHost, hostName, guestName, winner, myGuesses.length, opponentSecret]);

  const isConnected = status === "connected";
  const isReconnecting = reconnecting || status === "reconnecting";
  const myName = isHost ? hostName : guestName;
  const opponentName = isHost ? guestName : hostName;

  // ===== NOT CONNECTED =====
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-2">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-1">&#127758;</div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white">Multiplayer</h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-bold text-xs sm:text-sm leading-tight">
            Play Bulls &amp; Cows against a friend
          </p>
        </div>

        {isReconnecting && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-black dark:border-amber-500 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-700 dark:text-amber-300 font-black text-sm">Reconnecting...</p>
            </div>
            <p className="text-amber-600/70 dark:text-amber-500/70 text-xs font-bold mt-1">
              Connection was lost — trying to restore
            </p>
          </div>
        )}

        {status === "error" && !isReconnecting && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-black dark:border-red-500 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <p className="text-red-600 dark:text-red-400 font-black">Connection Failed</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold mt-1">
              {error ?? "Make sure server is running:"}
            </p>
            <code className="block bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 mt-2 text-xs text-black dark:text-neutral-300 font-mono">
              cd server &amp;&amp; bun dev
            </code>
            <button
              onClick={connect}
              className="mt-3 px-5 py-2 bg-violet-600 text-white font-black rounded-xl text-sm border-2 border-black shadow-[2px_2px_0_0_#000] btn-push"
            >
              Retry Connection
            </button>
          </div>
        )}

        <button
          onClick={connect}
          disabled={status === "connecting" || isReconnecting}
          className="px-8 py-3.5 bg-violet-600 disabled:opacity-50 text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push flex items-center gap-2 text-sm"
        >
          {status === "connecting" || isReconnecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect to Server"
          )}
        </button>

        <Link href="/" className="text-sm text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-bold">
          ← Back
        </Link>
      </div>
    );
  }

  const showLobby = phase === "idle" || phase === "creating" || phase === "joining";
  const showWaiting = phase === "waiting";
  const showSetting = phase === "setting_secret";
  const showGame = phase === "playing" || phase === "finished";

  return (
    <div className="space-y-4 sm:space-y-5">
      <Toast message="Copied!" visible={copied} variant="success" duration={1600} />
      <Toast
        message="Connected!"
        visible={status === "connected" && phase === "idle"}
        variant="success"
        duration={1500}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
        >
          ‹
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleSoundToggle}
            className="text-sm px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
            title={soundOn ? "Mute sounds" : "Enable sounds"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          {isReconnecting ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-neutral-500 dark:text-neutral-400 hidden sm:inline">Online</span>
            </span>
          )}
          {!showLobby && (
            <button
              onClick={() => leaveRoom(roomCode)}
              className="text-xs font-black text-red-500 dark:text-red-400 hover:text-red-700"
            >
              Leave
            </button>
          )}
          <button
            onClick={disconnect}
            className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-bold"
          >
            Discon
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white">Multiplayer</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">
          Each player sets a secret — race to crack the other&apos;s!
        </p>
      </div>

      {error && (
        <div className={`rounded-xl px-3.5 py-3 border-2 flex items-start gap-2 animate-shake ${
          errorType === "room_expired"
            ? "bg-amber-50 dark:bg-amber-900/20 border-black dark:border-amber-500"
            : "bg-red-50 dark:bg-red-900/20 border-black dark:border-red-500"
        }`}>
          <span className="shrink-0 text-sm mt-0.5">⚠</span>
          <div>
            <p className={`text-sm font-black ${errorType === "room_expired" ? "text-amber-700 dark:text-amber-300" : "text-red-600 dark:text-red-400"}`}>
              {error}
            </p>
            {errorType === "room_expired" && (
              <button
                onClick={() => setMode(null)}
                className="text-xs text-amber-600 dark:text-amber-400 font-bold underline mt-1"
              >
                Go to Lobby
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOBBY */}
      {showLobby && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <div>
            <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full bg-neutral-50 dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-3 text-black dark:text-white font-bold focus:border-black dark:focus:border-violet-400 focus:outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameInput.trim() && !mode) setMode("create");
                if (e.key === "Enter" && nameInput.trim() && mode === "create") createRoom(nameInput);
              }}
            />
          </div>

          {!mode ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("create")}
                disabled={!nameInput.trim()}
                className="py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-sm sm:text-base"
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("join")}
                disabled={!nameInput.trim()}
                className="py-3.5 sm:py-4 bg-white dark:bg-zinc-800 disabled:opacity-40 text-black dark:text-white font-black rounded-2xl border-2 border-black dark:border-zinc-500 shadow-[3px_3px_0_0_#000] dark:shadow-none btn-push text-sm sm:text-base"
              >
                Join Room
              </button>
            </div>
          ) : mode === "create" ? (
            <div className="space-y-3">
              <button
                onClick={() => createRoom(nameInput)}
                disabled={isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating room...
                  </>
                ) : (
                  "Create Room"
                )}
              </button>
              <button
                onClick={() => setMode(null)}
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs text-neutral-400 dark:text-neutral-500 font-bold hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="XXXXX"
                  maxLength={5}
                  className="w-full bg-neutral-50 dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-3.5 sm:py-4 text-black dark:text-white text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.4em] font-black font-mono focus:border-black dark:focus:border-violet-400 focus:outline-none transition-colors placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && roomInput.length === 5 && !isSubmitting) joinRoom(roomInput, nameInput);
                  }}
                />
              </div>
              <button
                onClick={() => joinRoom(roomInput, nameInput)}
                disabled={roomInput.length !== 5 || isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining room...
                  </>
                ) : (
                  "Join Room"
                )}
              </button>
              <button
                onClick={() => setMode(null)}
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs text-neutral-400 dark:text-neutral-500 font-bold hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* WAITING FOR OPPONENT */}
      {showWaiting && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-6 sm:p-8 text-center space-y-4 sm:space-y-5 animate-scale-in shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto border-4 border-neutral-200 dark:border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          <div>
            <p className="text-base sm:text-lg font-black text-black dark:text-white">Waiting for opponent...</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-bold mt-1">
              Share this code with your friend
            </p>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 border-2 border-black dark:border-violet-500 rounded-2xl p-4 sm:p-5 inline-block shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              Room Code
            </p>
            <p className="text-3xl sm:text-5xl font-black font-mono tracking-[0.2em] sm:tracking-[0.3em] text-violet-700 dark:text-violet-300">
              {roomCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-5 py-2.5 text-sm font-black bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-500 rounded-xl shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push text-black dark:text-white"
          >
            Copy Code
          </button>
        </div>
      )}

      {/* SETTING SECRET */}
      {showSetting && (
        <div className="space-y-3 sm:space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-[2px_2px_0_0_#000] dark:shadow-none">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Room</p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest truncate text-black dark:text-white">{roomCode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Players</p>
              <p className="text-xs sm:text-sm font-black">
                <span className="text-violet-600 dark:text-violet-400">{hostName}</span>
                {guestName && (
                  <>
                    <span className="text-neutral-400 dark:text-neutral-500 mx-1">vs</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{guestName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <div>
              <h2 className="text-base sm:text-lg font-black text-black dark:text-white">Set Your Secret</h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">
                Pick a 4-digit number — your opponent will try to crack it!
              </p>
            </div>

            {mySecretSet ? (
              <div className="text-center py-4 sm:py-5 animate-scale-in">
                <div className="text-3xl sm:text-4xl mb-2">✅</div>
                <p className="text-green-600 dark:text-green-400 font-black">Secret locked in!</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-bold mt-1">
                  {opponentSecretSet
                    ? "Starting game..."
                    : `Waiting for ${opponentName} to set their secret...`}
                </p>
              </div>
            ) : (
              <>
                <NumberInput value={secretInput} onChange={setSecretInput} autoFocus />
                <button
                  onClick={() => {
                    submitSecret(secretInput, roomCode!);
                    setSecretInput("");
                  }}
                  disabled={secretInput.length !== 4 || isSubmitting}
                  className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Locking in...
                    </>
                  ) : (
                    "Lock In Secret"
                  )}
                </button>
              </>
            )}

            <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold">
              <span className={`flex items-center gap-1.5 ${mySecretSet ? "text-green-600 dark:text-green-400" : "text-neutral-400 dark:text-neutral-500"}`}>
                <span className={`w-2 h-2 rounded-full ${mySecretSet ? "bg-green-500" : "bg-neutral-300 dark:bg-zinc-600"}`} />
                You: {mySecretSet ? "ready" : "setting..."}
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  !opponentOnline ? "text-amber-600 dark:text-amber-400" : opponentSecretSet ? "text-green-600 dark:text-green-400" : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    !opponentOnline ? "bg-amber-500 animate-pulse" : opponentSecretSet ? "bg-green-500" : "bg-neutral-300 dark:bg-zinc-600"
                  }`}
                />
                {opponentName ?? "Opponent"}:{" "}
                {!opponentOnline ? "disconnected" : opponentSecretSet ? "ready" : "setting..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* GAME */}
      {showGame && (
        <div className="space-y-4 sm:space-y-5">
          {/* Room + players */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-[2px_2px_0_0_#000] dark:shadow-none">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Room</p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest truncate text-black dark:text-white">{roomCode}</p>
            </div>
            <div className="text-center px-2 sm:px-4 shrink-0">
              <span className="text-violet-600 dark:text-violet-400 font-black text-sm">{hostName}</span>
              <span className="text-neutral-400 dark:text-neutral-500 font-black mx-1.5 sm:mx-2 text-sm">vs</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{guestName}</span>
            </div>
          </div>

          {/* Opponent offline */}
          {!opponentOnline && !isComplete && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-black dark:border-amber-500 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <div>
                <p className="text-amber-700 dark:text-amber-300 text-sm font-black">
                  {opponentName ?? "Opponent"} disconnected
                </p>
                <p className="text-amber-600/70 dark:text-amber-500/70 text-xs font-bold">
                  Waiting for them to rejoin — room stays open for 10 min
                </p>
              </div>
            </div>
          )}

          {/* My secret */}
          {mySecret && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-widest">
                Your Secret
              </p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest text-emerald-600 dark:text-emerald-400">
                {mySecret}
              </p>
            </div>
          )}

          {/* Result banner */}
          {isComplete && (
            <div
              className={`rounded-2xl p-5 sm:p-6 text-center space-y-3 border-2 border-black ${
                winner === "me"
                  ? "bg-green-50 dark:bg-green-900/20 animate-bounce-in animate-pulse-win"
                  : "bg-red-50 dark:bg-red-900/20 animate-bounce-in animate-pulse-lose"
              }`}
            >
              <div className="text-4xl sm:text-5xl">
                {winner === "me" ? "🏆" : "😢"}
              </div>
              <p className={`text-xl sm:text-2xl font-black ${winner === "me" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {winner === "me" ? "You Win!" : "You Lose!"}
              </p>
              {opponentSecret && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold">
                  {opponentName}&apos;s secret was{" "}
                  <span className="text-black dark:text-white font-mono font-black tracking-widest">
                    {opponentSecret}
                  </span>
                </p>
              )}
              <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-600 rounded-xl px-4 py-2 inline-block shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                  Solved in{" "}
                  <span className="text-black dark:text-white font-black">
                    {myGuesses.length} attempt{myGuesses.length !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => leaveRoom(roomCode)}
                  className="px-4 py-2.5 bg-violet-600 text-white font-black rounded-xl text-sm border-2 border-black shadow-[2px_2px_0_0_#000] btn-push"
                >
                  Play Again
                </button>
                <button
                  onClick={handleShareResult}
                  className="px-4 py-2.5 bg-white dark:bg-zinc-800 text-black dark:text-white font-black rounded-xl text-sm border-2 border-black dark:border-zinc-500 shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
                >
                  Share Result
                </button>
                <Link
                  href="/"
                  className="px-4 py-2.5 bg-neutral-100 dark:bg-zinc-900 text-neutral-500 dark:text-neutral-400 font-black rounded-xl text-sm border-2 border-neutral-200 dark:border-zinc-600 hover:text-black dark:hover:text-white transition-colors"
                >
                  Lobby
                </Link>
              </div>
            </div>
          )}

          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50 dark:bg-violet-900/20 border-2 border-black dark:border-violet-500 rounded-2xl p-3 sm:p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">
                {myName ?? "You"}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400">{myGuesses.length}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">guesses</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-black dark:border-emerald-500 rounded-2xl p-3 sm:p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">
                {opponentName ?? "Opponent"}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{opponentGuesses.length}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">guesses</p>
            </div>
          </div>

          {/* Last result */}
          {lastResult && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-xl px-4 py-3 flex items-center justify-between animate-slide-up shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Last Guess</p>
                <p className="text-lg sm:text-xl font-mono font-black tracking-widest text-black dark:text-white">{lastResult.guess}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-black px-2.5 py-1 rounded-lg border-2 border-black dark:border-amber-500">
                  🐂 {lastResult.bulls}
                </span>
                <span className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-sm font-black px-2.5 py-1 rounded-lg border-2 border-black dark:border-teal-500">
                  🐄 {lastResult.cows}
                </span>
              </div>
            </div>
          )}

          {/* Guess input */}
          {!isComplete && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
              <h2 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                Guess {opponentName ? `${opponentName}'s` : "Opponent's"} Secret
              </h2>
              <NumberInput
                value={guessInput}
                onChange={setGuessInput}
                disabled={isComplete || isSubmitting}
                autoFocus
              />
              <button
                onClick={() => {
                  makeGuess(guessInput, roomCode!);
                  setGuessInput("");
                }}
                disabled={guessInput.length !== 4 || isComplete || isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Guess"
                )}
              </button>
            </div>
          )}

          {/* Histories */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <h2 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 sm:mb-3">
                Your Guesses ({myGuesses.length})
              </h2>
              <GuessHistory guesses={myGuesses} />
            </div>
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-emerald-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <h2 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 sm:mb-3">
                {opponentName ?? "Opponent"}&apos;s Guesses ({opponentGuesses.length})
              </h2>
              <GuessHistory guesses={opponentGuesses} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
