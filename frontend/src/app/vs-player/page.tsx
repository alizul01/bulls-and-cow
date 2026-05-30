"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import NumberInput from "@/components/NumberInput";
import GuessHistory from "@/components/GuessHistory";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useVsPlayer } from "@/hooks/useVsPlayer";
import { formatPossibilityCount } from "@/lib/solver";

function Selector({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const isBulls = label === "Bulls";
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg w-8 shrink-0 ${isBulls ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}`}>
        {isBulls ? "🐂" : "🐄"}
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            disabled={disabled}
            className={`w-11 h-11 rounded-xl text-base font-black transition-all active:scale-90 border-2 ${
              value === n
                ? isBulls
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-black dark:border-amber-400 shadow-[2px_2px_0_0_#000] dark:shadow-none"
                  : "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-black dark:border-teal-400 shadow-[2px_2px_0_0_#000] dark:shadow-none"
                : "bg-white dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-zinc-600 hover:border-neutral-400"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VsPlayerPage() {
  const {
    mode,
    secret,
    guesses,
    isRevealed,
    isComplete,
    error,
    setMode,
    addManualGuess,
    removeLastGuess,
    possibleNumbers,
    suggestedGuess,
    setSecret,
    submitGuess,
    revealSecret,
    resetGame,
    clearError,
  } = useVsPlayer();

  const [guessValue, setGuessValue] = useState("");
  const [bullsValue, setBullsValue] = useState(0);
  const [cowsValue, setCowsValue] = useState(0);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [secretValue, setSecretValue] = useState("");
  const [showSolver, setShowSolver] = useState(true);

  const isManual = mode === "manual";
  const isAuto = mode === "auto";
  const hasSecret = !!secret;

  const handleManualSubmit = useCallback(() => {
    const err = addManualGuess(guessValue, bullsValue, cowsValue);
    if (err) {
      setGuessError(err);
      setTimeout(() => setGuessError(null), 3000);
    } else {
      setGuessValue("");
      setGuessError(null);
    }
  }, [guessValue, bullsValue, cowsValue, addManualGuess]);

  const handleAutoGuess = useCallback(() => {
    const err = submitGuess(guessValue);
    if (err) {
      setGuessError(err);
      setTimeout(() => setGuessError(null), 3000);
    } else {
      setGuessValue("");
      setGuessError(null);
    }
  }, [guessValue, submitGuess]);

  const handleSetSecret = useCallback(() => {
    if (!secretValue || secretValue.length < 4) return;
    setSecret(secretValue);
  }, [secretValue, setSecret]);

  const handleUseSuggestion = useCallback(() => {
    if (suggestedGuess) setGuessValue(suggestedGuess);
  }, [suggestedGuess]);

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
            Guess #{guesses.length + 1}
          </span>
        )}
        {(hasSecret || guesses.length > 0) && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white font-black active:scale-95 transition-transform"
          >
            New
          </button>
        )}
        {!hasSecret && guesses.length === 0 && <div className="w-10" />}
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-black dark:text-white">vs Player 👥</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs font-bold">
          Bull &amp; Cow assistant — track &amp; deduce
        </p>
      </div>

      {/* Mode Toggle */}
      {!hasSecret && guesses.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 space-y-3 shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest text-center">
            Game Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("manual")}
              className={`py-3.5 px-4 rounded-xl text-sm font-black transition-all active:scale-95 border-2 ${
                isManual
                  ? "bg-violet-600 text-white border-black shadow-[2px_2px_0_0_#000]"
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-zinc-600 hover:border-neutral-400"
              }`}
            >
              📞 Manual
            </button>
            <button
              onClick={() => setMode("auto")}
              className={`py-3.5 px-4 rounded-xl text-sm font-black transition-all active:scale-95 border-2 ${
                isAuto
                  ? "bg-violet-600 text-white border-black shadow-[2px_2px_0_0_#000]"
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-zinc-600 hover:border-neutral-400"
              }`}
            >
              🎯 Auto
            </button>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold text-center">
            {isManual
              ? "Opponent tells you bulls/cows → you input them manually"
              : "App knows the secret → auto-calculates bulls/cows"}
          </p>
        </div>
      )}

      {/* ===== MANUAL MODE ===== */}
      {isManual && (
        <div className="space-y-4">
          {/* Solver Panel */}
          {guesses.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                  AI Solver
                </h2>
                <button
                  onClick={() => setShowSolver(!showSolver)}
                  className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-black"
                >
                  {showSolver ? "Hide" : "Show"}
                </button>
              </div>

              {showSolver && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                      {formatPossibilityCount(possibleNumbers.length)}
                    </span>
                    {possibleNumbers.length > 0 && (
                      <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
                        {((possibleNumbers.length / 5040) * 100).toFixed(1)}% remaining
                      </span>
                    )}
                  </div>

                  {possibleNumbers.length > 0 && (
                    <div className="h-2.5 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-neutral-200 dark:border-zinc-600">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${100 - (possibleNumbers.length / 5040) * 100}%` }}
                      />
                    </div>
                  )}

                  {suggestedGuess && possibleNumbers.length > 1 && (
                    <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border-2 border-black dark:border-violet-500 rounded-xl p-3 shadow-[2px_2px_0_0_#000] dark:shadow-none">
                      <div className="flex-1">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold mb-0.5">Best Next Guess</p>
                        <span className="text-2xl font-black font-mono tracking-widest text-violet-700 dark:text-violet-300">
                          {suggestedGuess}
                        </span>
                      </div>
                      <button
                        onClick={handleUseSuggestion}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] btn-push"
                      >
                        Use
                      </button>
                    </div>
                  )}

                  {possibleNumbers.length === 1 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-black dark:border-green-500 rounded-xl p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                      <p className="text-green-700 dark:text-green-400 font-black text-sm">Only one possibility!</p>
                      <p className="text-2xl font-black font-mono tracking-widest text-green-700 dark:text-green-400 mt-1">
                        {possibleNumbers[0]}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {guessError && (
            <p className="text-red-600 dark:text-red-400 text-sm font-black flex items-center gap-1.5 px-1">
              ⚠ {guessError}
            </p>
          )}

          {isComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-black dark:border-green-500 rounded-2xl p-8 text-center space-y-3 shadow-[4px_4px_0_0_#000] dark:shadow-none">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-black text-green-700 dark:text-green-400">Code Cracked!</h2>
              <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-green-500 rounded-xl px-5 py-3 inline-block shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-green-600 dark:text-green-400 font-black text-2xl">{guesses.length}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">attempts</p>
              </div>
            </div>
          )}

          {!isComplete && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-5 space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
              <NumberInput
                value={guessValue}
                onChange={(v) => {
                  setGuessValue(v);
                  clearError();
                  setGuessError(null);
                }}
                label="Your Guess"
                autoFocus
              />

              <div className="space-y-3 bg-neutral-50 dark:bg-zinc-800 rounded-xl p-4 border border-neutral-200 dark:border-zinc-700">
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                  Opponent&apos;s Result
                </p>
                <Selector label="Bulls" value={bullsValue} onChange={setBullsValue} />
                <Selector label="Cows" value={cowsValue} onChange={setCowsValue} />
                {bullsValue + cowsValue > 4 && (
                  <p className="text-amber-600 dark:text-amber-400 text-xs font-black">
                    ⚠ Bulls + cows cannot exceed 4
                  </p>
                )}
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={guessValue.length !== 4 || bullsValue + cowsValue > 4}
                className="w-full py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-base"
              >
                Log Guess
              </button>

              {guesses.length > 0 && (
                <button
                  onClick={removeLastGuess}
                  className="w-full py-2 text-sm text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white font-bold transition-colors"
                >
                  ↩ Undo Last Guess
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== AUTO MODE ===== */}
      {isAuto && (
        <div className="space-y-5">
          {!secret ? (
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-5 space-y-4 shadow-[3px_3px_0_0_#000] dark:shadow-none">
              <div>
                <h2 className="text-lg font-black text-black dark:text-white">Set Secret Number</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">
                  Player 1 — pick a secret 4-digit number (all unique)
                </p>
              </div>
              <NumberInput
                value={secretValue}
                onChange={setSecretValue}
                label="Secret Number"
                error={error ?? undefined}
                autoFocus
              />
              <button
                onClick={handleSetSecret}
                disabled={secretValue.length !== 4}
                className="w-full py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-base"
              >
                Lock In Secret 🔒
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-5 shadow-[3px_3px_0_0_#000] dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-black dark:text-white">Player 2&apos;s Turn</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold">Start guessing!</p>
                  </div>
                  <button
                    onClick={() => setShowRevealConfirm(true)}
                    className="px-3 py-1.5 text-sm font-black border-2 border-black dark:border-zinc-500 rounded-xl bg-white dark:bg-zinc-800 text-black dark:text-white shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
                  >
                    Reveal
                  </button>
                </div>

                {isRevealed && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-black dark:border-amber-500 rounded-xl text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest mb-1">
                      Secret Number
                    </p>
                    <p className="text-4xl font-mono font-black tracking-widest text-amber-700 dark:text-amber-300">
                      {secret}
                    </p>
                  </div>
                )}

                {isComplete && (
                  <div className="mb-4 p-6 text-center space-y-2">
                    <div className="text-5xl">🎉</div>
                    <h2 className="text-xl font-black text-green-700 dark:text-green-400">Code Cracked!</h2>
                    <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-green-500 rounded-xl px-4 py-2 inline-block mt-1 shadow-[2px_2px_0_0_#000] dark:shadow-none">
                      <p className="text-green-600 dark:text-green-400 font-black text-xl">{guesses.length}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">attempts</p>
                    </div>
                  </div>
                )}

                {!isComplete && (
                  <div className="space-y-3">
                    <NumberInput
                      value={guessValue}
                      onChange={(v) => {
                        setGuessValue(v);
                        clearError();
                        setGuessError(null);
                      }}
                      label="Your Guess"
                      error={guessError ?? undefined}
                      disabled={isComplete}
                      autoFocus
                    />
                    <button
                      onClick={handleAutoGuess}
                      disabled={guessValue.length !== 4 || isComplete}
                      className="w-full py-4 bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] btn-push text-base"
                    >
                      Submit Guess
                    </button>
                  </div>
                )}
              </div>

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
            </div>
          )}
        </div>
      )}

      {/* History for manual mode */}
      {isManual && (
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
      )}

      <ConfirmDialog
        open={showRevealConfirm}
        title="Reveal Secret?"
        message="Are you sure you want to reveal the secret number?"
        confirmLabel="Reveal"
        variant="danger"
        onConfirm={() => {
          revealSecret();
          setShowRevealConfirm(false);
        }}
        onCancel={() => setShowRevealConfirm(false)}
      />

      <ConfirmDialog
        open={showResetConfirm}
        title="Start New Game?"
        message="This will clear all guesses and secret."
        confirmLabel="New Game"
        onConfirm={() => {
          resetGame();
          setSecretValue("");
          setGuessValue("");
          setBullsValue(0);
          setCowsValue(0);
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
