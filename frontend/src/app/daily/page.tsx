"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import { isValidNumber } from "@/lib/game-logic";
import type { GuessEntry } from "@/lib/game-logic";
import { useSound } from "@/hooks/useSound";
import { useAuth } from "@/hooks/useAuth";
import Toast from "@/components/Toast";

export const dynamic = "force-dynamic";

const STORAGE_DAILY = "daily_state";
const STORAGE_STREAK = "daily_streak";

function getServerUrl() {
  if (typeof window === "undefined") return "http://localhost:3001";
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "";
}

function loadDailyState(date: string): { guesses: GuessEntry[]; solved: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DAILY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== date) return null;
    return { guesses: data.guesses ?? [], solved: data.solved ?? false };
  } catch { return null; }
}

function saveDailyState(date: string, guesses: GuessEntry[], solved: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_DAILY, JSON.stringify({ date, guesses, solved }));
}

function getStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_STREAK);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.lastDate === today) return data.streak;
    if (data.lastDate === yesterday) return data.streak;
    return 0;
  } catch { return 0; }
}

function updateStreak() {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let streak = 0;
  try {
    const raw = localStorage.getItem(STORAGE_STREAK);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.lastDate === today) return data.streak + 1;
      if (data.lastDate === yesterday) streak = data.streak;
    }
  } catch { }
  streak += 1;
  localStorage.setItem(STORAGE_STREAK, JSON.stringify({ streak, lastDate: today }));
  return streak;
}

export default function DailyPage() {
  const { user, token } = useAuth();
  const { playGuess, playWin, playLose, playError } = useSound();

  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [guessInput, setGuessInput] = useState("");
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(getStreak);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) { const t = setTimeout(() => setCopied(false), 1200); return () => clearTimeout(t); }
  }, [copied]);

  useEffect(() => {
    const base = getServerUrl();
    fetch(`${base}/api/daily`)
      .then(r => r.json())
      .then(d => {
        setDate(d.date);
        setDailyCount(d.guesses);

        const saved = loadDailyState(d.date);
        if (saved) {
          setGuesses(saved.guesses);
          if (saved.solved) setSolved(true);
        } else if (d.solved) {
          setSolved(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot connect to server");
        setLoading(false);
      });
  }, []);

  const handleShare = useCallback(() => {
    const name = user?.name ?? "Player";
    const shareText = `Daily Bulls & Cows ${date}\n${name} solved in ${guesses.length} guesses\nStreak: ${streak} days\n\n${guesses.map((g, i) => `${i + 1}. ${g.guess} \u2192 bulls:${g.bulls} cows:${g.cows}`).join("\n")}`;
    if (navigator.share) {
      navigator.share({ text: shareText, title: "Daily Bulls & Cows" });
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
    }
  }, [user, date, guesses, streak]);

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
      const newGuesses = [...guesses, entry];
      setGuesses(newGuesses);
      setDailyCount(data.guessCount);
      saveDailyState(date, newGuesses, data.solved);
      playGuess();

      if (data.solved) {
        setSolved(true);
        const s = updateStreak();
        setStreak(s);
        playWin();
        if (user && token) {
          const base = getServerUrl();
          fetch(`${base}/api/stats/game`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: "daily", guessCount: newGuesses.length }),
          }).catch(() => {});
        }
      }
    } catch {
      setError("Network error");
      playError();
    }

    setGuessInput("");
    setSubmitting(false);
  }, [guessInput, solved, submitting, guesses, date, playGuess, playWin, playError]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <Toast message="Copied!" visible={copied} variant="success" duration={1600} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
        >
          {'\u2039'}
        </Link>
        {streak > 1 && (
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 px-3 py-1.5 rounded-full shadow-[2px_2px_0_0_#f59e0b] dark:shadow-none">
            <span>{'\uD83D\uDD25'}</span> {streak} day streak
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white">Daily Challenge</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">
          {date || "..."} {'\u2014'} One secret for everyone
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-3.5 py-3 border-2 bg-red-50 dark:bg-red-900/20 border-black dark:border-red-500 flex items-start gap-2 animate-shake shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <span className="shrink-0 text-sm mt-0.5">{'\u26A0'}</span>
          <p className="text-sm font-black text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-8 text-center shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <div className="w-10 h-10 mx-auto border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400 mt-3 font-bold text-sm">Loading today&apos;s challenge...</p>
        </div>
      ) : solved ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-green-900/10 border-2 border-emerald-500 dark:border-emerald-500 rounded-2xl p-6 text-center space-y-3 shadow-[4px_4px_0_0_#10b981] dark:shadow-none animate-bounce-in">
            <div className="text-5xl">{'\uD83C\uDFC6'}</div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">You solved it!</p>
            <p className="text-neutral-500 dark:text-neutral-400 font-bold">
              in {guesses.length} attempt{guesses.length !== 1 ? "s" : ""}
            </p>
            {streak > 0 && (
              <p className="text-amber-600 dark:text-amber-400 font-black text-sm">
                {'\uD83D\uDD25'} {streak} day streak!
              </p>
            )}
            <p className="text-neutral-400 dark:text-neutral-500 text-xs">Come back tomorrow for a new challenge!</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleShare}
                className="px-4 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-sm border-2 border-black shadow-[2px_2px_0_0_#000] btn-push"
              >
                Share Result
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#000] dark:shadow-none">
            <h2 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 sm:mb-3">
              Guesses ({guesses.length})
            </h2>
            <GuessHistory guesses={guesses} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[3px_3px_0_0_#000] dark:shadow-none">
            <NumberInput value={guessInput} onChange={setGuessInput} disabled={submitting} autoFocus />
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
            <p className="text-center text-neutral-400 dark:text-neutral-500 text-xs font-bold">
              Global guesses today: {dailyCount}
            </p>
          )}

          {guesses.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-violet-500/60 rounded-2xl p-3 sm:p-4 shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <h2 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 sm:mb-3">
                Guesses ({guesses.length})
              </h2>
              <GuessHistory guesses={guesses} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
