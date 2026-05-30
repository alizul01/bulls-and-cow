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
          <h1 className="text-2xl sm:text-3xl font-black">Multiplayer</h1>
          <p className="text-gray-500 font-bold text-xs sm:text-sm leading-tight">
            Play Bulls &amp; Cows against a friend
          </p>
        </div>

        {isReconnecting && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-yellow-300 font-black text-sm">Reconnecting...</p>
            </div>
            <p className="text-yellow-500/70 text-xs font-bold mt-1">
              Connection was lost {'\u2014'} trying to restore
            </p>
          </div>
        )}

        {status === "error" && !isReconnecting && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in">
            <p className="text-danger font-black">Connection Failed</p>
            <p className="text-gray-400 text-xs font-bold mt-1">
              {error ?? "Make sure server is running:"}
            </p>
            <code className="block bg-surface rounded-xl px-3 py-2 mt-2 text-xs text-gray-300 font-mono">
              cd server &amp;&amp; bun dev
            </code>
            <button
              onClick={connect}
              className="mt-3 px-5 py-2 bg-primary text-white font-black rounded-xl text-sm btn-push"
            >
              Retry Connection
            </button>
          </div>
        )}

        <button
          onClick={connect}
          disabled={status === "connecting" || isReconnecting}
          className="px-8 py-3.5 bg-primary disabled:opacity-50 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center gap-2 text-sm"
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

        <Link href="/" className="text-sm text-gray-600 hover:text-gray-400 font-bold">
          {'\u2190'} Back
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
      <Toast
        message="Copied!"
        visible={copied}
        variant="success"
        duration={1600}
      />
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
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-surface text-gray-400 font-black text-lg active:scale-90 transition-transform"
        >
          {'\u2039'}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleSoundToggle}
            className="text-sm px-2 py-1 rounded-lg bg-surface hover:bg-surface-light transition-colors"
            title={soundOn ? "Mute sounds" : "Enable sounds"}
          >
            {soundOn ? "\uD83D\uDD0A" : "\uD83D\uDD07"}
          </button>
          {isReconnecting ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="hidden sm:inline">Reconnecting...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-gray-500 hidden sm:inline">Online</span>
            </span>
          )}
          {!showLobby && (
            <button
              onClick={() => leaveRoom(roomCode)}
              className="text-xs font-black text-danger/70 hover:text-danger transition-colors"
            >
              Leave
            </button>
          )}
          <button
            onClick={disconnect}
            className="text-xs text-gray-600 hover:text-gray-400 font-bold"
          >
            Discon
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black">Multiplayer</h1>
        <p className="text-gray-500 text-xs font-bold">
          Each player sets a secret {'\u2014'} race to crack the other&apos;s!
        </p>
      </div>

      {error && (
        <div className={`rounded-xl px-3.5 py-3 border flex items-start gap-2 animate-shake ${
          errorType === "room_expired"
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-danger/10 border-danger/30"
        }`}>
          <span className="shrink-0 text-sm mt-0.5">{'\u26A0'}</span>
          <div>
            <p className={`text-sm font-black ${errorType === "room_expired" ? "text-amber-300" : "text-danger"}`}>
              {error}
            </p>
            {errorType === "room_expired" && (
              <button
                onClick={() => setMode(null)}
                className="text-xs text-amber-400 font-bold underline mt-1"
              >
                Go to Lobby
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOBBY */}
      {showLobby && (
        <div className="bg-surface border border-surface-light rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full bg-surface-light border border-surface-light rounded-xl px-4 py-3 text-white font-bold focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
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
                className="py-3.5 sm:py-4 bg-primary disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-sm sm:text-base"
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("join")}
                disabled={!nameInput.trim()}
                className="py-3.5 sm:py-4 bg-surface-light disabled:opacity-40 text-white font-black rounded-2xl active:scale-95 transition-transform text-sm sm:text-base"
              >
                Join Room
              </button>
            </div>
          ) : mode === "create" ? (
            <div className="space-y-3">
              <button
                onClick={() => createRoom(nameInput)}
                disabled={isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-primary disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
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
                className="w-full py-2.5 text-xs text-gray-500 font-bold hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="XXXXX"
                  maxLength={5}
                  className="w-full bg-surface-light border border-surface-light rounded-xl px-4 py-3.5 sm:py-4 text-white text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.4em] font-black font-mono focus:border-primary focus:outline-none transition-colors placeholder:text-gray-700"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && roomInput.length === 5 && !isSubmitting) joinRoom(roomInput, nameInput);
                  }}
                />
              </div>
              <button
                onClick={() => joinRoom(roomInput, nameInput)}
                disabled={roomInput.length !== 5 || isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-primary disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
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
                className="w-full py-2.5 text-xs text-gray-500 font-bold hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* WAITING FOR OPPONENT */}
      {showWaiting && (
        <div className="bg-surface border border-surface-light rounded-2xl p-6 sm:p-8 text-center space-y-4 sm:space-y-5 animate-scale-in">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div>
            <p className="text-base sm:text-lg font-black">Waiting for opponent...</p>
            <p className="text-gray-500 text-xs sm:text-sm font-bold mt-1">
              Share this code with your friend
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 sm:p-5 inline-block">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
              Room Code
            </p>
            <p className="text-3xl sm:text-5xl font-black font-mono tracking-[0.2em] sm:tracking-[0.3em] text-primary">
              {roomCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-5 py-2.5 text-sm font-black bg-surface-light hover:bg-indigo-800 rounded-xl active:scale-95 transition-all"
          >
            Copy Code
          </button>
        </div>
      )}

      {/* SETTING SECRET */}
      {showSetting && (
        <div className="space-y-3 sm:space-y-4 animate-fade-in">
          <div className="bg-surface border border-surface-light rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-bold">Room</p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest truncate">{roomCode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500 font-bold">Players</p>
              <p className="text-xs sm:text-sm font-black">
                <span className="text-primary">{hostName}</span>
                {guestName && (
                  <>
                    <span className="text-gray-600 mx-1">vs</span>
                    <span className="text-accent">{guestName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-surface-light rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-black">Set Your Secret</h2>
              <p className="text-xs sm:text-sm text-gray-500 font-bold mt-1">
                Pick a 4-digit number {'\u2014'} your opponent will try to crack it!
              </p>
            </div>

            {mySecretSet ? (
              <div className="text-center py-4 sm:py-5 animate-scale-in">
                <div className="text-3xl sm:text-4xl mb-2">{'\u2705'}</div>
                <p className="text-success font-black">Secret locked in!</p>
                <p className="text-gray-500 text-xs sm:text-sm font-bold mt-1">
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
                  className="w-full py-3.5 sm:py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
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
              <span className={`flex items-center gap-1.5 ${mySecretSet ? "text-success" : "text-gray-600"}`}>
                <span className={`w-2 h-2 rounded-full ${mySecretSet ? "bg-success" : "bg-gray-700"}`} />
                You: {mySecretSet ? "ready" : "setting..."}
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  !opponentOnline ? "text-yellow-400" : opponentSecretSet ? "text-success" : "text-gray-600"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    !opponentOnline ? "bg-yellow-400 animate-pulse" : opponentSecretSet ? "bg-success" : "bg-gray-700"
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
          <div className="bg-surface border border-surface-light rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-bold">Room</p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest truncate">{roomCode}</p>
            </div>
            <div className="text-center px-2 sm:px-4 shrink-0">
              <span className="text-primary font-black text-sm">{hostName}</span>
              <span className="text-gray-600 font-black mx-1.5 sm:mx-2 text-sm">vs</span>
              <span className="text-accent font-black text-sm">{guestName}</span>
            </div>
          </div>

          {/* Opponent offline */}
          {!opponentOnline && !isComplete && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
              <div>
                <p className="text-yellow-300 text-sm font-black">
                  {opponentName ?? "Opponent"} disconnected
                </p>
                <p className="text-yellow-500/70 text-xs font-bold">
                  Waiting for them to rejoin {'\u2014'} room stays open for 10 min
                </p>
              </div>
            </div>
          )}

          {/* My secret */}
          {mySecret && (
            <div className="bg-surface border border-surface-light rounded-xl px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                Your Secret
              </p>
              <p className="font-mono font-black text-base sm:text-lg tracking-widest text-accent">
                {mySecret}
              </p>
            </div>
          )}

          {/* Result banner */}
          {isComplete && (
            <div
              className={`rounded-2xl p-5 sm:p-6 text-center space-y-3 border ${
                winner === "me"
                  ? "bg-success/10 border-success/30 animate-bounce-in animate-pulse-win"
                  : "bg-danger/10 border-danger/30 animate-bounce-in animate-pulse-lose"
              }`}
            >
              <div className="text-4xl sm:text-5xl">
                {winner === "me" ? "\uD83C\uDFC6" : "\uD83D\uDE22"}
              </div>
              <p className={`text-xl sm:text-2xl font-black ${winner === "me" ? "text-success" : "text-danger"}`}>
                {winner === "me" ? "You Win!" : "You Lose!"}
              </p>
              {opponentSecret && (
                <p className="text-sm text-gray-400 font-bold">
                  {opponentName}&apos;s secret was{" "}
                  <span className="text-white font-mono font-black tracking-widest">
                    {opponentSecret}
                  </span>
                </p>
              )}
              <div className="bg-black/20 rounded-xl px-4 py-2 inline-block">
                <p className="text-sm font-bold text-gray-400">
                  Solved in{" "}
                  <span className="text-white font-black">
                    {myGuesses.length} attempt{myGuesses.length !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => leaveRoom(roomCode)}
                  className="px-4 py-2.5 bg-primary text-white font-black rounded-xl text-sm shadow-[0_3px_0_0_#4c1d95] btn-push"
                >
                  Play Again
                </button>
                <button
                  onClick={handleShareResult}
                  className="px-4 py-2.5 bg-surface-light text-white font-black rounded-xl text-sm border border-surface-light active:scale-95 transition-transform"
                >
                  Share Result
                </button>
                <Link
                  href="/"
                  className="px-4 py-2.5 bg-surface text-gray-400 font-black rounded-xl text-sm border border-surface-light hover:text-gray-200 transition-colors"
                >
                  Lobby
                </Link>
              </div>
            </div>
          )}

          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-primary/30 rounded-2xl p-3 sm:p-4 text-center">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                {myName ?? "You"}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-primary">{myGuesses.length}</p>
              <p className="text-xs text-gray-600 font-bold">guesses</p>
            </div>
            <div className="bg-surface border border-accent/30 rounded-2xl p-3 sm:p-4 text-center">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                {opponentName ?? "Opponent"}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-accent">{opponentGuesses.length}</p>
              <p className="text-xs text-gray-600 font-bold">guesses</p>
            </div>
          </div>

          {/* Last result */}
          {lastResult && (
            <div className="bg-surface border border-surface-light rounded-xl px-4 py-3 flex items-center justify-between animate-slide-up">
              <div>
                <p className="text-xs text-gray-500 font-bold">Last Guess</p>
                <p className="text-lg sm:text-xl font-mono font-black tracking-widest">{lastResult.guess}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-sm font-black px-2.5 py-1 rounded-lg border border-amber-500/30">
                  {lastResult.bulls}
                </span>
                <span className="flex items-center gap-1 bg-teal-500/20 text-teal-400 text-sm font-black px-2.5 py-1 rounded-lg border border-teal-500/30">
                  {lastResult.cows}
                </span>
              </div>
            </div>
          )}

          {/* Guess input */}
          {!isComplete && (
            <div className="bg-surface border border-surface-light rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
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
                className="w-full py-3.5 sm:py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
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
            <div className="bg-surface border border-primary/20 rounded-2xl p-3 sm:p-4">
              <h2 className="text-xs font-black text-primary uppercase tracking-widest mb-2 sm:mb-3">
                Your Guesses ({myGuesses.length})
              </h2>
              <GuessHistory guesses={myGuesses} />
            </div>
            <div className="bg-surface border border-accent/20 rounded-2xl p-3 sm:p-4">
              <h2 className="text-xs font-black text-accent uppercase tracking-widest mb-2 sm:mb-3">
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
