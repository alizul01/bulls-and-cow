"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export const dynamic = "force-dynamic";

interface Stats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalGuesses: number;
  dailyStreak: number;
  lastDailyDate: string | null;
}

function getBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:3001";
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "";
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export default function StatsPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const token = getStoredToken();
    const base = getBaseUrl();
    fetch(`${base}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setStats(d.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-400 text-black dark:text-white font-black text-lg shadow-[2px_2px_0_0_#000] dark:shadow-none btn-push"
        >
          {'\u2039'}
        </Link>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white">Profile</h1>
      </div>

      {!user ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-8 text-center shadow-[3px_3px_0_0_#000] dark:shadow-none">
          <div className="text-5xl mb-3">{'\uD83D\uDD12'}</div>
          <p className="text-neutral-500 dark:text-neutral-400 font-bold">Sign in with Google to see your stats</p>
          <div id="google-signin-btn" className="flex justify-center mt-4" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* User card */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-600 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0_0_#000] dark:shadow-none space-y-4">
            <div className="flex items-center gap-4">
              <img src={user.picture} alt="" className="w-14 h-14 rounded-full border-2 border-black dark:border-violet-400 shadow-[2px_2px_0_0_#000] dark:shadow-none" />
              <div>
                <p className="text-lg font-black text-black dark:text-white">{user.name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
              </div>
              <button onClick={logout} className="ml-auto text-xs font-bold text-red-500 hover:text-red-700">Logout</button>
            </div>
          </div>

          {/* Stats grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-violet-500/60 rounded-2xl p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-3xl font-black text-violet-600 dark:text-violet-400">{stats.gamesPlayed}</p>
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Games</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-green-500/60 rounded-2xl p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-3xl font-black text-green-600 dark:text-green-400">{stats.wins}</p>
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Wins</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-red-500/60 rounded-2xl p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-3xl font-black text-red-500 dark:text-red-400">{stats.losses}</p>
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Losses</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-amber-500/60 rounded-2xl p-4 text-center shadow-[2px_2px_0_0_#000] dark:shadow-none">
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.dailyStreak}</p>
                <p className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">Streak</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-neutral-400 text-sm font-bold py-4">Play some games to see stats!</p>
          )}
        </div>
      )}
    </div>
  );
}
