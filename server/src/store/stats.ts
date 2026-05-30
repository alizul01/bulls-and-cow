export interface UserStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalGuesses: number;
  dailyStreak: number;
  lastDailyDate: string | null;
  updatedAt: number;
}

const statsMap = new Map<string, UserStats>();

function getOrCreate(userId: string): UserStats {
  let s = statsMap.get(userId);
  if (!s) {
    s = {
      userId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalGuesses: 0,
      dailyStreak: 0,
      lastDailyDate: null,
      updatedAt: Date.now(),
    };
    statsMap.set(userId, s);
  }
  return s;
}

export function recordGame(userId: string, won: boolean, guessCount: number): UserStats {
  const s = getOrCreate(userId);
  s.gamesPlayed++;
  s.totalGuesses += guessCount;
  if (won) s.wins++;
  else s.losses++;
  s.updatedAt = Date.now();
  return { ...s };
}

export function recordDaily(userId: string, guessCount: number): { stats: UserStats; newStreak: number } {
  const s = getOrCreate(userId);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (s.lastDailyDate !== today) {
    if (s.lastDailyDate === yesterday) {
      s.dailyStreak++;
    } else {
      s.dailyStreak = 1;
    }
    s.lastDailyDate = today;
  }

  s.gamesPlayed++;
  s.totalGuesses += guessCount;
  s.wins++;
  s.updatedAt = Date.now();

  return { stats: { ...s }, newStreak: s.dailyStreak };
}

export function getUserStats(userId: string): UserStats {
  return { ...getOrCreate(userId) };
}
