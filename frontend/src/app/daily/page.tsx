"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import { isValidNumber, calcBullsCows } from "@/lib/game-logic";
import type { GuessEntry, RoomSettings } from "@/lib/game-logic";
import { useSound } from "@/hooks/useSound";

function getServerUrl() {
  if (typeof window === "undefined") return "http://localhost:3001";
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return isLocalhost ? "http://localhost:3001" : "";
}

export default function DailyPage() {
  const { playGuess, playWin, playLose, playError } = useSound();

  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guessInput, setGuessInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const settings: RoomSettings = {
    gameMode: "free",
    digitLength: 4,
    allowDuplicates: false,
    maxAttempts: 0,
  };

  useEffect(() => {
    const base = getServerUrl();
    fetch(`${base}/api/daily`)
      .then(r => r.json())
      .then(d => {
        setDate(d.date);
        setDailyCount(d.guesses);
        if (d.solved) setSolved(true);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot connect to server");
        setLoading(false);
      });
  }, []);

  const handleGuess = useCallback(async () => {
    if (!isValidNumber(guessInput) || solved || submitting) return;

    setSubmitting(true);
    setError("");

    const base = getServerUrl();
    try {
      const res = await fetch(`${base}/api/daily/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: guessInput }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        playError();
        setSubmitting(false);
        return;
      }

      const entry: GuessEntry = {
        id: guesses.length + 1,
        guess: guessInput,
        bulls: data.bulls,
        cows: data.cows,
      };
      setGuesses(prev => [...prev, entry]);
      setDailyCount(data.guessCount);
      playGuess();

      if (data.solved) {
        setSolved(true);
        playWin();
      }
    } catch {
      setError("Network error");
      playError();
    }

    setGuessInput("");
    setSubmitting(false);
  }, [guessInput, solved, submitting, guesses.length, playGuess, playWin, playError]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
        >
          {'\u2039'}
        </Link>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white">Daily Challenge</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">
          {date ? date : "..."} - One secret for everyone
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-3.5 py-3 border-2 bg-red-50 dark:bg-red-900/20 border-black dark:border-red-500 flex items-start gap-2 animate-shake">
          <span className="shrink-0 text-sm mt-0.5">{'\u26A0'}</span>
          <p className="text-sm font-black text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-8 text-center shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <div className="w-10 h-10 mx-auto border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-neutral-500 mt-3 font-bold text-sm">Loading today&apos;s challenge...</p>
        </div>
      ) : solved ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500 dark:border-emerald-500 rounded-2xl p-6 text-center space-y-3 shadow-[3px_3px_0_0_#10b981] dark:shadow-none animate-bounce-in">
          <div className="text-5xl">{'\uD83C\uDFC6'}</div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">You solved it!</p>
          <p className="text-neutral-500 font-bold">
            in {guesses.length} attempt{guesses.length !== 1 ? "s" : ""}
          </p>
          <p className="text-neutral-400 text-xs">Come back tomorrow for a new challenge!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <NumberInput
              value={guessInput}
              onChange={setGuessInput}
              disabled={submitting}
              autoFocus
            />
            <button
              onClick={handleGuess}
              disabled={guessInput.length !== 4 || submitting}
              className="w-full py-3.5 bg-violet-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guessing...
                </>
              ) : (
                "Submit Guess"
              )}
            </button>
          </div>

          {dailyCount > 0 && (
            <p className="text-center text-neutral-400 text-xs font-bold">
              Global guesses today: {dailyCount}
            </p>
          )}

          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#000] dark:shadow-none">
            <h2 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">
              Guesses ({guesses.length})
            </h2>
            <GuessHistory guesses={guesses} />
          </div>
        </div>
      )}
    </div>
  );
}
