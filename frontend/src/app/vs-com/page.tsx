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
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface text-gray-400 font-black text-lg active:scale-90 transition-transform"
        >
          ‹
        </Link>
        {!isComplete && (
          <span className="bg-primary/20 text-primary font-black text-sm px-3 py-1.5 rounded-full border border-primary/30">
            Attempt #{guesses.length + 1}
          </span>
        )}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-gray-500 hover:text-gray-300 font-black active:scale-95 transition-transform"
        >
          New
        </button>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black">vs Computer 🤖</h1>
        <p className="text-gray-500 text-xs font-bold">
          Crack the hidden 4-digit code!
        </p>
      </div>

      {/* Best score */}
      {bestScore > 0 && (
        <div className="flex items-center justify-center">
          <span className="text-bull font-black text-sm flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">
            🏆 Best: {bestScore} attempt{bestScore > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Win screen */}
      {isComplete && (
        <div className="bg-surface border border-surface-light rounded-2xl p-8 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-black text-success">Code Cracked!</h2>
            <p className="text-gray-400 font-bold mt-1">
              The number was{" "}
              <span className="text-white font-mono font-black tracking-widest text-xl">
                {secret}
              </span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-success/10 border border-success/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-success font-black text-2xl">{guesses.length}</p>
              <p className="text-xs text-gray-500 font-bold">attempts</p>
            </div>
            {bestScore === guesses.length && (
              <div className="bg-bull/10 border border-bull/30 rounded-2xl px-5 py-3 text-center">
                <p className="text-bull font-black text-2xl">🏆</p>
                <p className="text-xs text-bull font-bold">New Best!</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-8 py-3 bg-primary font-black rounded-2xl text-white shadow-[0_4px_0_0_#4c1d95] btn-push text-sm"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Guess input */}
      {!isComplete && (
        <div className="bg-surface border border-surface-light rounded-2xl p-5 space-y-4">
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
            className="w-full py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-base"
          >
            Submit Guess
          </button>
        </div>
      )}

      {/* History */}
      <div className="bg-surface border border-surface-light rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
            History
          </h2>
          <span className="text-xs font-black bg-surface-light px-2 py-1 rounded-full text-gray-500">
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
