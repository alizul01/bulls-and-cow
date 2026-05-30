"use client";

import { useState, useCallback, useMemo } from "react";
import {
  calcBullsCows,
  isValidNumber,
  type GuessEntry,
  DEFAULT_DIGITS,
} from "@/lib/game-logic";
import { getPossibleNumbers, suggestGuess } from "@/lib/solver";

type VsPlayerMode = "manual" | "auto";

interface VsPlayerState {
  mode: VsPlayerMode;
  secret: string | null;
  guesses: GuessEntry[];
  isRevealed: boolean;
  isComplete: boolean;
  error: string | null;
}

export function useVsPlayer() {
  const [state, setState] = useState<VsPlayerState>({
    mode: "manual",
    secret: null,
    guesses: [],
    isRevealed: false,
    isComplete: false,
    error: null,
  });

  const setMode = useCallback((mode: VsPlayerMode) => {
    setState({
      mode,
      secret: null,
      guesses: [],
      isRevealed: false,
      isComplete: false,
      error: null,
    });
  }, []);

  // ===== Manual mode (WA/phone play) =====

  const addManualGuess = useCallback(
    (guess: string, bulls: number, cows: number): string | null => {
      if (!isValidNumber(guess)) {
        return "Must be 4 unique digits (0-9, no repeats)";
      }

      if (bulls < 0 || bulls > 4 || cows < 0 || cows > 4) {
        return "Bulls and cows must be 0-4";
      }

      if (bulls + cows > 4) {
        return "Bulls + cows cannot exceed 4";
      }

      if (bulls === 4 && cows > 0) {
        return "If bulls = 4, cows must be 0";
      }

      let errorMsg: string | null = null;

      setState((prev) => {
        const duplicate = prev.guesses.find((g) => g.guess === guess);
        if (duplicate) {
          errorMsg = "You already tried this number";
          return { ...prev, error: "You already tried this number" };
        }

        const newEntry: GuessEntry = {
          id: prev.guesses.length + 1,
          guess,
          bulls,
          cows,
        };

        return {
          ...prev,
          guesses: [...prev.guesses, newEntry],
          isComplete: bulls === DEFAULT_DIGITS,
          error: null,
        };
      });

      return errorMsg;
    },
    []
  );

  const removeLastGuess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      guesses: prev.guesses.slice(0, -1),
      isComplete: false,
    }));
  }, []);

  // ===== Auto mode (in-person, secret known) =====

  const setSecret = useCallback((secret: string) => {
    if (!isValidNumber(secret)) {
      setState((prev) => ({
        ...prev,
        error: "Must be 4 unique digits (0-9, no repeats)",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      mode: "auto",
      secret,
      guesses: [],
      isRevealed: false,
      isComplete: false,
      error: null,
    }));
  }, []);

  const submitGuess = useCallback((guess: string): string | null => {
    if (!isValidNumber(guess)) {
      return "Must be 4 unique digits (0-9, no repeats)";
    }

    let result: string | null = null;

    setState((prev) => {
      if (!prev.secret) {
        result = "Set a secret number first";
        return { ...prev, error: result };
      }

      if (prev.isComplete) {
        result = "Game is already over";
        return { ...prev, error: result };
      }

      const duplicate = prev.guesses.find((g) => g.guess === guess);
      if (duplicate) {
        result = "You already tried this number";
        return { ...prev, error: result };
      }

      const { bulls, cows } = calcBullsCows(prev.secret, guess);
      const newEntry: GuessEntry = {
        id: prev.guesses.length + 1,
        guess,
        bulls,
        cows,
      };

      return {
        ...prev,
        guesses: [...prev.guesses, newEntry],
        isComplete: bulls === DEFAULT_DIGITS,
        error: null,
      };
    });

    return result;
  }, []);

  const revealSecret = useCallback(() => {
    setState((prev) => ({ ...prev, isRevealed: true }));
  }, []);

  // ===== Common =====

  const resetGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      secret: null,
      guesses: [],
      isRevealed: false,
      isComplete: false,
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ===== Solver (manual mode) =====

  const possibleNumbers = useMemo(
    () => (state.mode === "manual" ? getPossibleNumbers(state.guesses) : []),
    [state.mode, state.guesses]
  );

  const suggestedGuess = useMemo(
    () => (state.mode === "manual" ? suggestGuess(state.guesses) : ""),
    [state.mode, state.guesses]
  );

  return {
    ...state,
    setMode,
    // manual
    addManualGuess,
    removeLastGuess,
    possibleNumbers,
    suggestedGuess,
    // auto
    setSecret,
    submitGuess,
    revealSecret,
    // common
    resetGame,
    clearError,
  };
}
