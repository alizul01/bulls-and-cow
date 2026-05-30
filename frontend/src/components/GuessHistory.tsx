"use client";

import type { GuessEntry } from "@/lib/game-logic";

function BullCowBadge({ bulls, cows }: { bulls: number; cows: number }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-black px-2 py-1 rounded-lg border-2 border-black dark:border-amber-500">
        🐂 {bulls}
      </span>
      <span className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-black px-2 py-1 rounded-lg border-2 border-black dark:border-teal-500">
        🐄 {cows}
      </span>
    </div>
  );
}

export default function GuessHistory({ guesses }: { guesses: GuessEntry[] }) {
  if (guesses.length === 0) {
    return (
      <div className="text-center py-10 text-neutral-400 dark:text-neutral-500">
        <div className="text-4xl mb-2 opacity-60">&#128203;</div>
        <p className="font-black text-sm">No guesses yet</p>
        <p className="text-xs mt-1 font-semibold">Your history will appear here</p>
      </div>
    );
  }

  const reversed = [...guesses].reverse();

  return (
    <div className="space-y-2">
      {reversed.map((entry, idx) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 ${
            idx === 0
              ? "bg-violet-50 dark:bg-violet-900/20 border-black dark:border-violet-500 shadow-[2px_2px_0_0_#000] dark:shadow-none"
              : "bg-white dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700"
          } ${idx === 0 ? "animate-slide-up" : ""}`}
        >
          <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-zinc-700 border border-neutral-300 dark:border-zinc-500 flex items-center justify-center text-xs font-black text-neutral-500 dark:text-neutral-400 shrink-0">
            {entry.id}
          </span>
          <span className="flex-1 font-black text-xl tracking-[0.2em] font-mono text-black dark:text-white">
            {entry.guess}
          </span>
          <BullCowBadge bulls={entry.bulls} cows={entry.cows} />
        </div>
      ))}
    </div>
  );
}
