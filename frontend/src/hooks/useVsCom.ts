"use client";

import { useState, useCallback, useEffect } from "react";
import {
  calcBullsCows,
  generateSecret,
  isValidNumber,
  type GuessEntry,
  DEFAULT_DIGITS,
} from "@/lib/game-logic";

const BEST_SCORE_KEY = "bulls-cows-vs-com-best";

interface VsComState {
  secret: string;
  guesses: GuessEntry[];
  isComplete: boolean;
  bestScore: number;
  error: string | null;
}

function loadBestScore(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(BEST_SCORE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function saveBestScore(score: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

export function useVsCom() {
  const [state, setState] = useState<VsComState>(() => ({
    secret: generateSecret(),
    guesses: [],
    isComplete: false,
    bestScore: 0,
    error: null,
  }));

  useEffect(() => {
    setState((prev) => ({ ...prev, bestScore: loadBestScore() }));
  }, []);

  const submitGuess = useCallback((guess: string): string | null => {
    if (!isValidNumber(guess)) {
      return "Must be 4 unique digits (0-9, no repeats)";
    }

    let result: string | null = null;

    setState((prev) => {
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

      const isWin = bulls === DEFAULT_DIGITS;
      let newBest = prev.bestScore;

      if (isWin) {
        const attempts = prev.guesses.length + 1;
        if (prev.bestScore === 0 || attempts < prev.bestScore) {
          newBest = attempts;
          saveBestScore(newBest);
        }
      }

      return {
        ...prev,
        guesses: [...prev.guesses, newEntry],
        isComplete: isWin,
        bestScore: newBest,
        error: null,
      };
    });

    return result;
  }, []);

  const resetGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      secret: generateSecret(),
      guesses: [],
      isComplete: false,
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    submitGuess,
    resetGame,
    clearError,
  };
}
