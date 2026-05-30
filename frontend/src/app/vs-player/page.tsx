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
      <span className={`text-lg w-8 shrink-0 ${isBulls ? "text-bull" : "text-cow"}`}>
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
                  ? "bg-amber-500/25 text-amber-400 border-amber-500/60 shadow-[0_3px_0_0_rgba(120,53,15,0.5)]"
                  : "bg-teal-500/25 text-teal-400 border-teal-500/60 shadow-[0_3px_0_0_rgba(15,118,110,0.5)]"
                : "bg-surface text-gray-500 border-surface-light hover:bg-surface-light"
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
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface text-gray-400 font-black text-lg active:scale-90 transition-transform"
        >
          ‹
        </Link>
        {!isComplete && (
          <span className="bg-primary/20 text-primary font-black text-sm px-3 py-1.5 rounded-full border border-primary/30">
            Guess #{guesses.length + 1}
          </span>
        )}
        {(hasSecret || guesses.length > 0) && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-sm text-gray-500 hover:text-gray-300 font-black active:scale-95 transition-transform"
          >
            New
          </button>
        )}
        {!hasSecret && guesses.length === 0 && <div className="w-10" />}
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black">vs Player 👥</h1>
        <p className="text-gray-500 text-xs font-bold">
          Bull &amp; Cow assistant — track &amp; deduce
        </p>
      </div>

      {/* Mode Toggle */}
      {!hasSecret && guesses.length === 0 && (
        <div className="bg-surface border border-surface-light rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest text-center">
            Game Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("manual")}
              className={`py-3.5 px-4 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isManual
                  ? "bg-primary text-white shadow-[0_3px_0_0_#4c1d95]"
                  : "bg-surface-light text-gray-400 hover:text-gray-200"
              }`}
            >
              📞 Manual
            </button>
            <button
              onClick={() => setMode("auto")}
              className={`py-3.5 px-4 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isAuto
                  ? "bg-primary text-white shadow-[0_3px_0_0_#4c1d95]"
                  : "bg-surface-light text-gray-400 hover:text-gray-200"
              }`}
            >
              🎯 Auto
            </button>
          </div>
          <p className="text-xs text-gray-600 font-bold text-center">
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
            <div className="bg-surface border border-surface-light rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  AI Solver
                </h2>
                <button
                  onClick={() => setShowSolver(!showSolver)}
                  className="text-xs text-gray-600 hover:text-gray-300 font-black"
                >
                  {showSolver ? "Hide" : "Show"}
                </button>
              </div>

              {showSolver && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-400">
                      {formatPossibilityCount(possibleNumbers.length)}
                    </span>
                    {possibleNumbers.length > 0 && (
                      <span className="text-xs font-bold text-gray-600">
                        {((possibleNumbers.length / 5040) * 100).toFixed(1)}% remaining
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {possibleNumbers.length > 0 && (
                    <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${100 - (possibleNumbers.length / 5040) * 100}%` }}
                      />
                    </div>
                  )}

                  {suggestedGuess && possibleNumbers.length > 1 && (
                    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-bold mb-0.5">Best Next Guess</p>
                        <span className="text-2xl font-black font-mono tracking-widest text-primary">
                          {suggestedGuess}
                        </span>
                      </div>
                      <button
                        onClick={handleUseSuggestion}
                        className="px-4 py-2 bg-primary text-white text-sm font-black rounded-xl shadow-[0_3px_0_0_#4c1d95] btn-push"
                      >
                        Use
                      </button>
                    </div>
                  )}

                  {possibleNumbers.length === 1 && (
                    <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
                      <p className="text-success font-black text-sm">Only one possibility!</p>
                      <p className="text-2xl font-black font-mono tracking-widest text-success mt-1">
                        {possibleNumbers[0]}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {guessError && (
            <p className="text-danger text-sm font-black flex items-center gap-1.5 px-1">
              ⚠ {guessError}
            </p>
          )}

          {isComplete && (
            <div className="bg-surface border border-surface-light rounded-2xl p-8 text-center space-y-3">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-black text-success">Code Cracked!</h2>
              <div className="bg-success/10 border border-success/30 rounded-xl px-5 py-3 inline-block">
                <p className="text-success font-black text-2xl">{guesses.length}</p>
                <p className="text-xs text-gray-500 font-bold">attempts</p>
              </div>
            </div>
          )}

          {!isComplete && (
            <div className="bg-surface border border-surface-light rounded-2xl p-5 space-y-4">
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

              <div className="space-y-3 bg-surface-light/60 rounded-xl p-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  Opponent&apos;s Result
                </p>
                <Selector label="Bulls" value={bullsValue} onChange={setBullsValue} />
                <Selector label="Cows" value={cowsValue} onChange={setCowsValue} />
                {bullsValue + cowsValue > 4 && (
                  <p className="text-yellow-400 text-xs font-black">
                    ⚠ Bulls + cows cannot exceed 4
                  </p>
                )}
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={guessValue.length !== 4 || bullsValue + cowsValue > 4}
                className="w-full py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-base"
              >
                Log Guess
              </button>

              {guesses.length > 0 && (
                <button
                  onClick={removeLastGuess}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-400 font-bold transition-colors"
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
            <div className="bg-surface border border-surface-light rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-lg font-black">Set Secret Number</h2>
                <p className="text-sm text-gray-500 font-bold mt-1">
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
                className="w-full py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-base"
              >
                Lock In Secret 🔒
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-surface border border-surface-light rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black">Player 2&apos;s Turn</h2>
                    <p className="text-sm text-gray-500 font-bold">Start guessing!</p>
                  </div>
                  <button
                    onClick={() => setShowRevealConfirm(true)}
                    className="px-3 py-1.5 text-sm font-black border border-surface-light rounded-xl hover:bg-surface-light active:scale-95 transition-all"
                  >
                    Reveal
                  </button>
                </div>

                {isRevealed && (
                  <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                    <p className="text-xs text-amber-400 font-black uppercase tracking-widest mb-1">
                      Secret Number
                    </p>
                    <p className="text-4xl font-mono font-black tracking-widest text-amber-300">
                      {secret}
                    </p>
                  </div>
                )}

                {isComplete && (
                  <div className="mb-4 p-6 text-center space-y-2">
                    <div className="text-5xl">🎉</div>
                    <h2 className="text-xl font-black text-success">Code Cracked!</h2>
                    <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-2 inline-block mt-1">
                      <p className="text-success font-black text-xl">{guesses.length}</p>
                      <p className="text-xs text-gray-500 font-bold">attempts</p>
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
                      className="w-full py-4 bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] btn-push text-base"
                    >
                      Submit Guess
                    </button>
                  </div>
                )}
              </div>

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
            </div>
          )}
        </div>
      )}

      {/* History for manual mode */}
      {isManual && (
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
