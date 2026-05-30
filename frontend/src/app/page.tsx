"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[88vh] flex flex-col gap-5">
      {/* Hero */}
      <div className="text-center pt-8 pb-2 space-y-2">
        <div className="text-7xl mb-2 select-none">🐂</div>
        <h1 className="text-4xl font-black tracking-tight">
          <span className="bg-linear-to-r from-violet-400 via-purple-300 to-violet-400 bg-clip-text text-transparent">
            Bulls &amp; Cows
          </span>
        </h1>
        <p className="text-gray-500 font-bold text-sm">4-digit code-breaking puzzle game</p>
      </div>

      {/* Mode Cards */}
      <div className="flex flex-col gap-4">
        <Link
          href="/vs-player"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-linear-to-br from-violet-700 to-purple-800 shadow-[0_5px_0_0_#3b0764] btn-push text-white"
        >
          <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-500 text-white tracking-wide uppercase">
            Hot
          </span>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
            👥
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">vs Player</h2>
            <p className="text-white/60 text-sm font-bold mt-0.5">
              Track guesses &amp; use AI solver
            </p>
          </div>
          <span className="ml-auto text-white/30 text-2xl shrink-0 font-black">›</span>
        </Link>

        <Link
          href="/vs-com"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-linear-to-br from-blue-700 to-indigo-800 shadow-[0_5px_0_0_#1e3a8a] btn-push text-white"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">vs Computer</h2>
            <p className="text-white/60 text-sm font-bold mt-0.5">
              Computer picks a secret — crack it!
            </p>
          </div>
          <span className="ml-auto text-white/30 text-2xl shrink-0 font-black">›</span>
        </Link>

        <Link
          href="/multiplayer"
          className="relative flex items-center gap-4 p-5 rounded-2xl bg-linear-to-br from-teal-700 to-emerald-800 shadow-[0_5px_0_0_#064e3b] btn-push text-white"
        >
          <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-400 text-teal-900 tracking-wide uppercase">
            Beta
          </span>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl shrink-0">
            🌐
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">Multiplayer</h2>
            <p className="text-white/60 text-sm font-bold mt-0.5">
              Real-time rooms with friends
            </p>
          </div>
          <span className="ml-auto text-white/30 text-2xl shrink-0 font-black">›</span>
        </Link>
      </div>

      {/* Legend */}
      <div className="mt-auto pb-2">
        <div className="flex items-center justify-center gap-6 text-xs font-black">
          <span className="flex items-center gap-1.5 text-bull">
            🐂 <span>Right digit, right spot</span>
          </span>
          <span className="flex items-center gap-1.5 text-cow">
            🐄 <span>Right digit, wrong spot</span>
          </span>
        </div>
      </div>
    </div>
  );
}
