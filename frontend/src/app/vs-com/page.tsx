"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVsCom } from "@/hooks/useVsCom";

export default function VsComPage() {
  const {
    secret,
    guesses,
    isComplete,
    bestScore,
    error,
    submitGuess,
    resetGame,
    clearError,
  } = useVsCom();

  const [guessValue, setGuessValue] = useState("");
  const [guessError, setGuessError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleGuess = useCallback(() => {
    const err = submitGuess(guessValue);
    if (err) {
      setGuessError(err);
      setTimeout(() => setGuessError(null), 3000);
    } else {
      setGuessValue("");
      setGuessError(null);
    }
  }, [guessValue, submitGuess]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
        >
          ‹
        </Link>
        {!isComplete && (
          <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-black text-sm px-3 py-1.5 rounded-full border-2 border-black dark:border-violet-500">
            Attempt #{guesses.length + 1}
          </span>
        )}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-black active:scale-95 transition-transform"
        >
          New
        </button>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-black dark:text-white">vs Computer 🤖</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">
          Crack the hidden 4-digit code!
        </p>
      </div>

      {/* Best score */}
      {bestScore > 0 && (
        <div className="flex items-center justify-center">
          <span className="text-amber-700 dark:text-amber-400 font-black text-sm flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 border-2 border-black dark:border-amber-500 px-4 py-2 rounded-full shadow-[2px_2px_0_0_#000] dark:shadow-none">
            🏆 Best: {bestScore} attempt{bestScore > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Win screen */}
      {isComplete && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-black dark:border-green-500 rounded-2xl p-8 text-center space-y-4 shadow-[4px_4px_0_0_#000] dark:shadow-none">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-black text-green-700 dark:text-green-400">Code Cracked!</h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-bold mt-1">
              The number was{" "}
              <span className="text-black dark:text-white font-mono font-black tracking-widest text-xl">
                {secret}
              </span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-green-500 rounded-2xl px-5 py-3 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
              <p className="text-green-600 dark:text-green-400 font-black text-2xl">{guesses.length}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">attempts</p>
            </div>
            {bestScore === guesses.length && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-black dark:border-amber-500 rounded-2xl px-5 py-3 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-amber-600 dark:text-amber-400 font-black text-2xl">🏆</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">New Best!</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-8 py-3 bg-violet-600 font-black rounded-2xl text-white border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-sm"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Guess input */}
      {!isComplete && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-5 space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <NumberInput
            value={guessValue}
            onChange={(v) => {
              setGuessValue(v);
              clearError();
              setGuessError(null);
            }}
            error={error ?? guessError ?? undefined}
            disabled={isComplete}
            autoFocus
          />
          <button
            onClick={handleGuess}
            disabled={guessValue.length !== 4 || isComplete}
            className="w-full py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-base"
          >
            Submit Guess
          </button>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-5 shadow-[3px_3px_0_0_#000] dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
            History
          </h2>
          <span className="text-xs font-black bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-600 px-2 py-1 rounded-full text-neutral-500 dark:text-neutral-400">
            {guesses.length} guess{guesses.length !== 1 ? "es" : ""}
          </span>
        </div>
        <GuessHistory guesses={guesses} />
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Start New Game?"
        message="Computer will pick a new secret number. Current game will be lost."
        confirmLabel="New Game"
        onConfirm={() => {
          resetGame();
          setGuessValue("");
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
