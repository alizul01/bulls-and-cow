"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import Toast from "@/components/Toast";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useSound } from "@/hooks/useSound";
import ScratchPad, { useScratchPad } from "@/components/ScratchPad";
import { useAuth } from "@/hooks/useAuth";
import type { RoomSettings } from "@/lib/game-logic";
import { Suspense } from "react";

interface PublicRoom {
  code: string;
  hostName: string;
  settings: RoomSettings;
}

function getBaseUrl() {
  return typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "";
}

function MultiplayerContent() {
  const searchParams = useSearchParams();
  const roomFromUrl = searchParams.get("room") ?? "";
  const { user, token, logout } = useAuth();

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
    settings,
    currentTurn,
    isMyTurn,
    connect,
    createRoom,
    joinRoom,
    submitSecret,
    makeGuess,
    leaveRoom,
    disconnect,
  } = useMultiplayer(user?.id);

  const { playGuess, playWin, playLose, playError, playConnected, setEnabled } = useSound();
  const sp = useScratchPad(roomCode);

  const [nameInput, setNameInput] = useState(user?.name ?? "");
  const [roomInput, setRoomInput] = useState(roomFromUrl.toUpperCase());
  const [guessInput, setGuessInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [mode, setMode] = useState<"create" | "join" | "browse" | null>(null);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [digitLen, setDigitLen] = useState(4);
  const [allowDup, setAllowDup] = useState(false);
  const [maxAttemptsVal, setMaxAttemptsVal] = useState(0);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const prevIsComplete = useRef(false);
  const prevGuessCount = useRef(0);

  useEffect(() => {
    if (user?.name && !nameInput) setNameInput(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (roomFromUrl) setRoomInput(roomFromUrl.toUpperCase());
  }, [roomFromUrl]);

  useEffect(() => {
    if (copied) { const t = setTimeout(() => setCopied(false), 1200); return () => clearTimeout(t); }
  }, [copied]);

  useEffect(() => {
    if (errorType === "room_expired" && phase === "idle") { setMode(null); setNameInput(""); setRoomInput(""); }
  }, [errorType, phase]);

  useEffect(() => {
    if (error && errorType !== "room_expired" && errorType !== "opponent_left") playError();
  }, [error, errorType, playError]);

  useEffect(() => {
    if (isComplete && !prevIsComplete.current) {
      if (winner === "me") playWin(); else if (winner === "opponent") playLose();
      // Record stats if authenticated
      if (user && token) {
        const base = getBaseUrl();
        fetch(`${base}/api/stats/game`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ won: winner === "me", guessCount: myGuesses.length }),
        }).catch(() => {});
      }
    }
    prevIsComplete.current = isComplete;
  }, [isComplete, winner, playWin, playLose, user, token, myGuesses.length]);

  useEffect(() => {
    if (myGuesses.length > prevGuessCount.current && !isComplete) playGuess();
    prevGuessCount.current = myGuesses.length;
  }, [myGuesses.length, isComplete, playGuess]);

  useEffect(() => {
    if (status === "connected") playConnected();
  }, [status, playConnected]);

  const fetchPublicRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/rooms`);
      const data = await res.json();
      setPublicRooms(data);
    } catch { /* silent */ }
    setRoomsLoading(false);
  }, []);

  useEffect(() => {
    if (mode === "browse") fetchPublicRooms();
  }, [mode, fetchPublicRooms]);

  const handleSoundToggle = useCallback(() => {
    const next = !soundOn; setSoundOn(next); setEnabled(next);
  }, [soundOn, setEnabled]);

  const handleCopyCode = useCallback(() => {
    if (roomCode) { navigator.clipboard.writeText(roomCode); setCopied(true); }
  }, [roomCode]);

  const handleCopyLink = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(`${window.location.origin}/multiplayer?room=${roomCode}`);
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
    if (navigator.share) navigator.share({ text, title: "Bulls & Cows" });
    else { navigator.clipboard.writeText(text); setCopied(true); }
  }, [isComplete, isHost, hostName, guestName, winner, myGuesses.length, opponentSecret]);

  const createRoomWithSettings = useCallback(() => {
    createRoom(nameInput || user?.name || "Player", {
      gameMode: "free",
      digitLength: digitLen,
      allowDuplicates: allowDup,
      maxAttempts: maxAttemptsVal,
      isPublic: isPublicRoom,
    });
  }, [nameInput, user?.name, digitLen, allowDup, maxAttemptsVal, isPublicRoom, createRoom]);

  const isConnected = status === "connected";
  const isReconnecting = reconnecting;
  const myName = isHost ? hostName : guestName;
  const opponentName = isHost ? guestName : hostName;

  const renderSettingsBadge = () => {
    if (phase === "idle") return null;
    const parts: string[] = [];
    parts.push(`${settings.digitLength}d`);
    if (settings.allowDuplicates) parts.push("dupes");
    if (settings.maxAttempts > 0) parts.push("max " + settings.maxAttempts);
    if (settings.gameMode === "turns") parts.push("turns");
    if (settings.isPublic) parts.push("public"); else parts.push("private");
    return (
      <span className="text-xs font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
        {parts.join(" ")}
      </span>
    );
  };

  // ===== NOT CONNECTED =====
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-2">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-1">{'\uD83C\uDF10'}</div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white">Multiplayer</h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-bold text-xs sm:text-sm leading-tight">
            Play Bulls &amp; Cows against a friend
          </p>
        </div>

        {/* Auth section */}
        {!user && (
          <div id="google-signin-btn" className="flex justify-center" />
        )}
        {user && (
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-600 dark:text-neutral-300">
            <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
            {user.name}
          </div>
        )}

        {isReconnecting && (
          <div className="bg-yellow-50 dark:bg-amber-900/20 border-2 border-amber-500 dark:border-amber-500 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-700 dark:text-amber-300 font-black text-sm">Reconnecting...</p>
            </div>
          </div>
        )}

        {status === "error" && !isReconnecting && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-500 rounded-2xl p-4 text-center max-w-sm w-full animate-fade-in">
            <p className="text-red-600 dark:text-red-400 font-black">Connection Failed</p>
            <button onClick={connect} className="mt-3 px-5 py-2 bg-violet-600 text-white font-black rounded-xl text-sm btn-push shadow-[0_4px_0_0_#4c1d95]">Retry</button>
          </div>
        )}

        <button
          onClick={connect}
          disabled={status === "connecting" || isReconnecting}
          className="px-8 py-3.5 bg-violet-600 disabled:opacity-50 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center gap-2 text-sm"
        >
          {status === "connecting" || isReconnecting ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connecting...</>
          ) : "Connect to Server"}
        </button>
        <Link href="/" className="text-sm text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-bold">
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
    <>
      <div className="space-y-4 sm:space-y-5">
      <Toast message="Copied!" visible={copied} variant="success" duration={1600} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push">
          {'\u2039'}
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={handleSoundToggle} className="text-sm px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push" title={soundOn ? "Mute" : "Unmute"}>
            {soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
          </button>
          {!showLobby && (
            <>
              <button onClick={sp.toggle} disabled={!roomCode} className={`text-sm px-2 py-1 rounded-lg border-2 shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push transition-colors disabled:opacity-40 ${sp.open ? "bg-amber-200 dark:bg-amber-800 border-amber-500 text-amber-900 dark:text-amber-200" : "bg-white dark:bg-zinc-900 border-black dark:border-zinc-600 text-black dark:text-white"}`} title="Scratch Pad">
                {'\u270F'}
              </button>
              <button onClick={() => leaveRoom(roomCode)} className="text-xs font-black text-red-500 dark:text-red-400 hover:text-red-700">Leave</button>
            </>
          )}
          {user && (
            <img src={user.picture} alt="" className="w-6 h-6 rounded-full hidden sm:block" title={user.name} />
          )}
          {isReconnecting ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="hidden sm:inline">Recon...</span></span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-neutral-500 dark:text-neutral-400 hidden sm:inline">Online</span></span>
          )}
          <button onClick={disconnect} className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-bold">Discon</button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white">Multiplayer {renderSettingsBadge()}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">Each player sets a secret {'\u2014'} race to crack the other&apos;s!</p>
      </div>

      {error && (
        <div className={`rounded-xl px-3.5 py-3 border-2 flex items-start gap-2 animate-shake ${errorType === "room_expired" ? "bg-amber-50 dark:bg-amber-900/20 border-black dark:border-amber-500" : "bg-red-50 dark:bg-red-900/20 border-black dark:border-red-500"}`}>
          <span className="shrink-0 text-sm mt-0.5">{'\u26A0'}</span>
          <div>
            <p className={`text-sm font-black ${errorType === "room_expired" ? "text-amber-700 dark:text-amber-300" : "text-red-600 dark:text-red-400"}`}>{error}</p>
            {errorType === "room_expired" && <button onClick={() => setMode(null)} className="text-xs text-amber-600 dark:text-amber-400 font-bold underline mt-1">Go to Lobby</button>}
          </div>
        </div>
      )}

      {/* LOBBY */}
      {showLobby && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none animate-fade-in">
          {/* User info */}
          {user ? (
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-zinc-800 rounded-xl p-3">
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-black dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-neutral-400 truncate">{user.email}</p>
              </div>
              <button onClick={logout} className="text-xs text-neutral-400 hover:text-red-500 font-bold">Logout</button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div id="google-signin-btn" />
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Your Name</label>
            <input
              type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
              placeholder={user ? user.name : "Enter your name"} maxLength={20}
              className="w-full bg-neutral-50 dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-3 text-black dark:text-white font-bold focus:border-black dark:focus:border-violet-400 focus:outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim() && !mode) setMode("create"); if (e.key === "Enter" && nameInput.trim() && mode === "create") createRoomWithSettings(); }}
            />
          </div>

          {!mode ? (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setMode("create")} disabled={!nameInput.trim() && !user} className="py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-sm sm:text-base">Create</button>
              <button onClick={() => setMode("join")} disabled={!nameInput.trim() && !user} className="py-3.5 sm:py-4 bg-neutral-100 dark:bg-zinc-800 border-2 border-neutral-300 dark:border-zinc-600 disabled:opacity-40 text-black dark:text-white font-black rounded-2xl active:scale-95 transition-transform text-sm sm:text-base shadow-[2px_2px_0_0_#ccc] dark:shadow-none">Join</button>
              <button onClick={() => { setMode("browse"); fetchPublicRooms(); }} className="py-3.5 sm:py-4 bg-emerald-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#047857] btn-push text-sm sm:text-base">Browse</button>
            </div>
          ) : mode === "create" ? (
            <div className="space-y-3">
              <button onClick={() => setShowSettings(!showSettings)} className="w-full py-2.5 text-xs font-black text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors">
                {showSettings ? "Hide" : "Show"} Custom Settings {'\u2699'}
              </button>

              {showSettings && (
                <div className="bg-neutral-50 dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl p-4 space-y-3 animate-slide-up">
                  <div>
                    <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Digits ({digitLen})</label>
                    <div className="flex gap-1.5">
                      {[3,4,5,6,7].map(n => (
                        <button key={n} onClick={() => setDigitLen(n)} className={`flex-1 py-2 rounded-lg font-black text-sm border-2 transition-colors ${digitLen === n ? "bg-violet-100 dark:bg-violet-900/40 border-violet-500 text-violet-700 dark:text-violet-300" : "bg-white dark:bg-zinc-700 border-neutral-300 dark:border-zinc-500 text-neutral-600 dark:text-neutral-300 hover:border-violet-400"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Allow Duplicates</span>
                    <button onClick={() => setAllowDup(!allowDup)} className={`w-11 h-6 rounded-full transition-colors relative ${allowDup ? "bg-violet-500" : "bg-neutral-300 dark:bg-zinc-600"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowDup ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                    </button>
                  </label>
                  <div>
                    <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">Max Attempts ({maxAttemptsVal === 0 ? "off" : maxAttemptsVal})</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[0,5,10,15,20,25].map(n => (
                        <button key={n} onClick={() => setMaxAttemptsVal(n)} className={`px-3 py-1.5 rounded-lg font-black text-xs border-2 transition-colors ${maxAttemptsVal === n ? "bg-violet-100 dark:bg-violet-900/40 border-violet-500 text-violet-700 dark:text-violet-300" : "bg-white dark:bg-zinc-700 border-neutral-300 dark:border-zinc-500 text-neutral-600 dark:text-neutral-300 hover:border-violet-400"}`}>{n === 0 ? "off" : n}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Public Room</span>
                    <button onClick={() => setIsPublicRoom(!isPublicRoom)} className={`w-11 h-6 rounded-full transition-colors relative ${isPublicRoom ? "bg-emerald-500" : "bg-neutral-300 dark:bg-zinc-600"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublicRoom ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                    </button>
                  </label>
                  <p className="text-xs text-neutral-400">Public rooms appear in Browse list for anyone to join</p>
                </div>
              )}

              <button onClick={createRoomWithSettings} disabled={isSubmitting} className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base">
                {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating room...</> : "Create Room"}
              </button>
              <button onClick={() => setMode(null)} disabled={isSubmitting} className="w-full py-2.5 text-xs text-neutral-500 dark:text-neutral-400 font-bold hover:text-black dark:hover:text-white">Cancel</button>
            </div>
          ) : mode === "browse" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Public Rooms</p>
                <button onClick={fetchPublicRooms} className="text-xs font-bold text-violet-500 hover:text-violet-600">{roomsLoading ? "Loading..." : "Refresh"}</button>
              </div>
              {publicRooms.length === 0 && !roomsLoading ? (
                <div className="text-center py-8 text-neutral-400">
                  <p className="text-4xl mb-2">{'\uD83C\uDFE0'}</p>
                  <p className="text-sm font-bold">No public rooms available</p>
                  <p className="text-xs mt-1">Create one or wait for others!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {publicRooms.map(room => (
                    <button
                      key={room.code}
                      onClick={() => {
                        setRoomInput(room.code);
                        setMode("join");
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 hover:border-violet-400 active:scale-[0.98] transition-all text-left shadow-[2px_2px_0_0_#000] dark:shadow-none"
                    >
                      <div>
                        <p className="font-black font-mono tracking-widest text-base text-black dark:text-white">{room.code}</p>
                        <p className="text-xs text-neutral-400 font-bold mt-0.5">{room.hostName} {'\u00B7'} {room.settings.digitLength}d{room.settings.allowDuplicates ? " dupes" : ""}{room.settings.maxAttempts > 0 ? " max " + room.settings.maxAttempts : ""}</p>
                      </div>
                      <span className="px-3 py-1.5 text-xs font-black rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-500">Join</span>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setMode(null)} className="w-full py-2.5 text-xs text-neutral-500 dark:text-neutral-400 font-bold hover:text-black dark:hover:text-white">Cancel</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Room Code</label>
                <input
                  type="text" value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="XXXXX" maxLength={5}
                  className="w-full bg-neutral-50 dark:bg-zinc-800 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-3.5 sm:py-4 text-black dark:text-white text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.4em] font-black font-mono focus:border-violet-400 dark:focus:border-violet-400 focus:outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                  onKeyDown={(e) => { if (e.key === "Enter" && roomInput.length === 5 && !isSubmitting) joinRoom(roomInput, nameInput || user?.name || "Player"); }}
                />
              </div>
              <button
                onClick={() => joinRoom(roomInput, nameInput || user?.name || "Player")}
                disabled={roomInput.length !== 5 || isSubmitting}
                className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Joining room...</> : "Join Room"}
              </button>
              <button onClick={() => setMode(null)} disabled={isSubmitting} className="w-full py-2.5 text-xs text-neutral-500 dark:text-neutral-400 font-bold hover:text-black dark:hover:text-white">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* WAITING + shareable link */}
      {showWaiting && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-6 sm:p-8 text-center space-y-4 sm:space-y-5 shadow-[3px_3px_0_0_#000] dark:shadow-none animate-scale-in">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto border-4 border-violet-200 border-t-violet-500 dark:border-violet-800 dark:border-t-violet-400 rounded-full animate-spin" />
          <div>
            <p className="text-base sm:text-lg font-black text-black dark:text-white">Waiting for opponent...</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-bold mt-1">Share this link or code with your friend</p>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-500 dark:border-violet-500 rounded-2xl p-4 sm:p-5 inline-block">
            <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">Room Code</p>
            <p className="text-3xl sm:text-5xl font-black font-mono tracking-[0.2em] sm:tracking-[0.3em] text-violet-600 dark:text-violet-300">{roomCode}</p>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={handleCopyCode} className="px-4 py-2.5 text-sm font-black bg-neutral-100 dark:bg-zinc-800 border-2 border-neutral-300 dark:border-zinc-600 rounded-xl active:scale-95 transition-all shadow-[2px_2px_0_0_#ccc] dark:shadow-none">Copy Code</button>
            <button onClick={handleCopyLink} className="px-4 py-2.5 text-sm font-black bg-violet-600 text-white rounded-xl active:scale-95 transition-all shadow-[2px_2px_0_0_#4c1d95] btn-push">Copy Invite Link</button>
          </div>
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
              <p className="text-xs sm:text-sm font-black text-black dark:text-white">
                <span className="text-violet-600 dark:text-violet-400">{hostName}</span>
                {guestName && <><span className="text-neutral-400 dark:text-neutral-500 mx-1">vs</span><span className="text-violet-500 dark:text-violet-300">{guestName}</span></>}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <div>
              <h2 className="text-base sm:text-lg font-black text-black dark:text-white">Set Your Secret <span className="text-xs font-mono text-neutral-400">({settings.digitLength}d{settings.allowDuplicates ? " dupes ok" : " unique"}{settings.maxAttempts > 0 ? ` max ${settings.maxAttempts}` : ""})</span></h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Pick a {settings.digitLength}-digit number {'\u2014'} your opponent will try to crack it!</p>
            </div>
            {mySecretSet ? (
              <div className="text-center py-4 sm:py-5 animate-scale-in">
                <div className="text-3xl sm:text-4xl mb-2">{'\u2705'}</div>
                <p className="text-green-600 dark:text-green-400 font-black">Secret locked in!</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-bold mt-1">{opponentSecretSet ? "Starting game..." : `Waiting for ${opponentName} to set their secret...`}</p>
              </div>
            ) : (
              <>
                <NumberInput value={secretInput} onChange={setSecretInput} length={settings.digitLength} allowDuplicates={settings.allowDuplicates} autoFocus />
                <button onClick={() => { submitSecret(secretInput, roomCode!); setSecretInput(""); }} disabled={secretInput.length !== settings.digitLength || isSubmitting} className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base">
                  {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Locking in...</> : "Lock In Secret"}
                </button>
              </>
            )}
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold">
              <span className={`flex items-center gap-1.5 ${mySecretSet ? "text-green-600 dark:text-green-400" : "text-neutral-400 dark:text-neutral-500"}`}>
                <span className={`w-2 h-2 rounded-full ${mySecretSet ? "bg-green-500" : "bg-neutral-300 dark:bg-zinc-600"}`} />You: {mySecretSet ? "ready" : "setting..."}
              </span>
              <span className={`flex items-center gap-1.5 ${!opponentOnline ? "text-amber-600 dark:text-amber-400" : opponentSecretSet ? "text-green-600 dark:text-green-400" : "text-neutral-400 dark:text-neutral-500"}`}>
                <span className={`w-2 h-2 rounded-full ${!opponentOnline ? "bg-amber-500 animate-pulse" : opponentSecretSet ? "bg-green-500" : "bg-neutral-300 dark:bg-zinc-600"}`} />
                {opponentName ?? "Opponent"}: {!opponentOnline ? "disconnected" : opponentSecretSet ? "ready" : "setting..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* GAME */}
      {showGame && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-[2px_2px_0_0_#000] dark:shadow-none">
            <div className="min-w-0"><p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Room</p><p className="font-mono font-black text-base sm:text-lg tracking-widest truncate text-black dark:text-white">{roomCode}</p></div>
            <div className="text-center px-2 sm:px-4 shrink-0"><span className="text-violet-600 dark:text-violet-400 font-black text-sm">{hostName}</span><span className="text-neutral-400 dark:text-neutral-500 font-black mx-1.5 sm:mx-2 text-sm">vs</span><span className="text-violet-500 dark:text-violet-300 font-black text-sm">{guestName}</span></div>
          </div>
          {settings.gameMode === "turns" && !isComplete && (
            <div className={`text-center font-black rounded-2xl py-3 px-4 border-2 shadow-[2px_2px_0_0_#000] dark:shadow-none transition-colors ${isMyTurn ? "bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 border-green-500 shadow-[2px_2px_0_0_#22c55e] dark:shadow-none animate-slide-up" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-zinc-600"}`}>
              {isMyTurn ? (
                <span className="flex items-center justify-center gap-2">{'\uD83C\uDFAF'} Go! Your turn to guess</span>
              ) : (
                <span className="flex items-center justify-center gap-2">{'\u23F3'} Waiting for {opponentName}&apos;s guess...</span>
              )}
            </div>
          )}
          {!opponentOnline && !isComplete && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" /><div><p className="text-amber-700 dark:text-amber-300 text-sm font-black">{opponentName ?? "Opponent"} disconnected</p><p className="text-amber-600/70 dark:text-amber-500/70 text-xs font-bold">Waiting for rejoin {'\u2014'} 10 min timeout</p></div>
            </div>
          )}
          {mySecret && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-2.5 flex items-center justify-between"><p className="text-xs text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-widest">Your Secret</p><p className="font-mono font-black text-base sm:text-lg tracking-widest text-violet-500 dark:text-violet-300">{mySecret}</p></div>
          )}
          {isComplete && (
            <div className={`rounded-2xl p-5 sm:p-6 text-center space-y-3 border-2 shadow-[3px_3px_0_0_#000] dark:shadow-none ${winner === "me" ? "bg-green-50 dark:bg-green-900/10 border-green-500 animate-bounce-in animate-pulse-win" : "bg-red-50 dark:bg-red-900/10 border-red-500 animate-bounce-in animate-pulse-lose"}`}>
              <div className="text-4xl sm:text-5xl">{winner === "me" ? '\uD83C\uDFC6' : '\uD83D\uDE22'}</div>
              <p className={`text-xl sm:text-2xl font-black ${winner === "me" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{winner === "me" ? "You Win!" : winner === "opponent" ? "You Lose!" : "Draw!"}</p>
              {opponentSecret && <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold">{opponentName}&apos;s secret was <span className="text-black dark:text-white font-mono font-black tracking-widest">{opponentSecret}</span></p>}
              <div className="bg-black/5 dark:bg-white/5 rounded-xl px-4 py-2 inline-block"><p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Solved in <span className="text-black dark:text-white font-black">{myGuesses.length} attempt{myGuesses.length !== 1 ? "s" : ""}</span></p></div>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button onClick={() => leaveRoom(roomCode)} className="px-4 py-2.5 bg-violet-600 text-white font-black rounded-xl text-sm shadow-[0_3px_0_0_#4c1d95] btn-push">Play Again</button>
                <button onClick={handleShareResult} className="px-4 py-2.5 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white font-black rounded-xl text-sm border-2 border-neutral-300 dark:border-zinc-600 active:scale-95 transition-transform shadow-[2px_2px_0_0_#ccc] dark:shadow-none">Share Result</button>
                <Link href="/" className="px-4 py-2.5 bg-white dark:bg-zinc-900 text-neutral-500 dark:text-neutral-400 font-black rounded-xl text-sm border-2 border-neutral-300 dark:border-zinc-600 hover:text-black dark:hover:text-white transition-colors">Lobby</Link>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border-2 border-violet-500/60 dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 text-center shadow-[2px_2px_0_0_#7c3aed] dark:shadow-none"><p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{myName ?? "You"}</p><p className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400">{myGuesses.length}</p><p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">guesses{settings.maxAttempts > 0 ? ` / ${settings.maxAttempts}` : ""}</p></div>
            <div className="bg-white dark:bg-zinc-900 border-2 border-violet-400/60 dark:border-violet-400/60 rounded-2xl p-3 sm:p-4 text-center shadow-[2px_2px_0_0_#c4b5fd] dark:shadow-none"><p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{opponentName ?? "Opponent"}</p><p className="text-2xl sm:text-3xl font-black text-violet-500 dark:text-violet-300">{opponentGuesses.length}</p><p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">guesses{settings.maxAttempts > 0 ? ` / ${settings.maxAttempts}` : ""}</p></div>
          </div>
          {lastResult && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-neutral-200 dark:border-zinc-600 rounded-xl px-4 py-3 flex items-center justify-between animate-slide-up shadow-[2px_2px_0_0_#ccc] dark:shadow-none"><div><p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">Last Guess</p><p className="text-lg sm:text-xl font-mono font-black tracking-widest text-black dark:text-white">{lastResult.guess}</p></div><div className="flex items-center gap-2"><span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-black px-2.5 py-1 rounded-lg border-2 border-amber-500 dark:border-amber-500/50">{lastResult.bulls}</span><span className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm font-black px-2.5 py-1 rounded-lg border-2 border-teal-500 dark:border-teal-500/50">{lastResult.cows}</span></div></div>
          )}
          {!isComplete && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-neutral-200 dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
              <h2 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Guess {opponentName ? `${opponentName}'s` : "Opponent's"} Secret</h2>
              <NumberInput value={guessInput} onChange={setGuessInput} length={settings.digitLength} allowDuplicates={settings.allowDuplicates} disabled={isComplete || isSubmitting || (settings.gameMode === "turns" && !isMyTurn)} autoFocus />
              <button onClick={() => { makeGuess(guessInput, roomCode!); setGuessInput(""); }} disabled={guessInput.length !== settings.digitLength || isComplete || isSubmitting || (settings.gameMode === "turns" && !isMyTurn)} className="w-full py-3.5 sm:py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2 text-sm sm:text-base">
                {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</> : "Submit Guess"}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="bg-white dark:bg-zinc-900 border-2 border-violet-500/60 dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#7c3aed] dark:shadow-none"><h2 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 sm:mb-3">Your Guesses ({myGuesses.length})</h2><GuessHistory guesses={myGuesses} /></div>
            <div className="bg-white dark:bg-zinc-900 border-2 border-violet-400/60 dark:border-violet-400/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#c4b5fd] dark:shadow-none"><h2 className="text-xs font-black text-violet-500 dark:text-violet-300 uppercase tracking-widest mb-2 sm:mb-3">{opponentName ?? "Opponent"}'s Guesses ({opponentGuesses.length})</h2><GuessHistory guesses={opponentGuesses} /></div>
          </div>
        </div>
      )}

    </div>

      <ScratchPad notes={sp.notes} onChange={sp.updateNotes} open={sp.open} onClose={sp.close} disabled={!roomCode} />
    </>
  );
}

export default function MultiplayerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" /></div>}>
      <MultiplayerContent />
    </Suspense>
  );
}
