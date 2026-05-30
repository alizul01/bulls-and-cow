"use client";

import type { GuessEntry } from "@/lib/game-logic";

function BullCowBadge({ bulls, cows }: { bulls: number; cows: number }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-xs font-black px-2 py-1 rounded-lg border border-amber-500/30">
        {bulls}
      </span>
      <span className="flex items-center gap-1 bg-teal-500/20 text-teal-400 text-xs font-black px-2 py-1 rounded-lg border border-teal-500/30">
        {cows}
      </span>
    </div>
  );
}

export default function GuessHistory({ guesses }: { guesses: GuessEntry[] }) {
  if (guesses.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600">
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
            idx === 0
              ? "bg-primary/10 border border-primary/20"
              : "bg-surface"
          } ${idx === 0 ? "animate-slide-up" : ""}`}
        >
          <span className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center text-xs font-black text-gray-500 shrink-0">
            {entry.id}
          </span>
          <span className="flex-1 font-black text-xl tracking-[0.2em] font-mono text-gray-200">
            {entry.guess}
          </span>
          <BullCowBadge bulls={entry.bulls} cows={entry.cows} />
        </div>
      ))}
    </div>
  );
}
