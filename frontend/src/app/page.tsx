"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[88vh] flex flex-col gap-5">
      {/* Hero */}
      <div className="text-center pt-8 pb-2 space-y-2">
        <div className="text-7xl mb-2 select-none">🐂</div>
        <h1 className="text-5xl font-black tracking-tight text-black dark:text-white uppercase">
          Bulls &amp; Cows
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 font-bold text-sm">
          4-digit code-breaking puzzle game
        </p>
      </div>

      {/* Mode Cards */}
      <div className="flex flex-col gap-4">
        <Link
          href="/vs-player"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-violet-500 dark:bg-violet-600 border-2 border-black dark:border-black shadow-[4px_4px_0_0_#000] btn-push text-white"
        >
          <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-yellow-300 text-black border border-black tracking-wide uppercase">
            Hot
          </span>
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-3xl shrink-0">
            👥
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">vs Player</h2>
            <p className="text-white/75 text-sm font-bold mt-0.5">
              Track guesses &amp; use AI solver
            </p>
          </div>
          <span className="ml-auto text-white/50 text-2xl shrink-0 font-black">›</span>
        </Link>

        <Link
          href="/vs-com"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-sky-500 dark:bg-sky-600 border-2 border-black shadow-[4px_4px_0_0_#000] btn-push text-white"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-3xl shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">vs Computer</h2>
            <p className="text-white/75 text-sm font-bold mt-0.5">
              Computer picks a secret — crack it!
            </p>
          </div>
          <span className="ml-auto text-white/50 text-2xl shrink-0 font-black">›</span>
        </Link>

        <Link
          href="/multiplayer"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-emerald-500 dark:bg-emerald-600 border-2 border-black shadow-[4px_4px_0_0_#000] btn-push text-white"
        >
          <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-200 text-black border border-black tracking-wide uppercase">
            Beta
          </span>
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-3xl shrink-0">
            🌐
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">Multiplayer</h2>
            <p className="text-white/75 text-sm font-bold mt-0.5">
              Real-time rooms with friends
            </p>
          </div>
          <span className="ml-auto text-white/50 text-2xl shrink-0 font-black">›</span>
        </Link>
      </div>

      {/* Legend */}
      <div className="mt-auto pb-2">
        <div className="flex items-center justify-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-2 border-black dark:border-amber-500 px-3 py-1.5 rounded-full">
            🐂 Right digit, right spot
          </span>
          <span className="flex items-center gap-1.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border-2 border-black dark:border-teal-500 px-3 py-1.5 rounded-full">
            🐄 Right digit, wrong spot
          </span>
        </div>
      </div>
    </div>
  );
}
