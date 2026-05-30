export const DEFAULT_DIGITS = 4;

export interface ValidationOptions {
  digitLength?: number;
  allowDuplicates?: boolean;
}

export function calcBullsCows(
  secret: string,
  guess: string
): { bulls: number; cows: number } {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows };
}

export function generateSecret(
  digits: number = DEFAULT_DIGITS,
  allowDuplicates: boolean = false
): string {
  if (allowDuplicates) {
    let result = "";
    for (let i = 0; i < digits; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  const pool = "0123456789".split("");
  const result: string[] = [];

  while (result.length < digits) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return result.join("");
}

export function isValidNumber(
  value: string,
  digits: number = DEFAULT_DIGITS,
  allowDuplicates: boolean = false
): boolean {
  if (value.length !== digits) return false;
  if (!/^\d+$/.test(value)) return false;
  if (!allowDuplicates) {
    const unique = new Set(value.split(""));
    return unique.size === digits;
  }
  return true;
}

export function seedFromDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDailySecret(dateStr: string, digits: number = 4): string {
  const seed = seedFromDate(dateStr);
  let rng = seed;
  const next = () => {
    rng = (rng * 1664525 + 1013904223) | 0;
    return (rng >>> 0) / 0xFFFFFFFF;
  };
  const pool = "0123456789".split("");
  const result: string[] = [];
  while (result.length < digits) {
    const idx = Math.floor(next() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result.join("");
}
