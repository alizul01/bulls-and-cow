export const DEFAULT_DIGITS = 4;

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

export function generateSecret(digits: number = DEFAULT_DIGITS): string {
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
  digits: number = DEFAULT_DIGITS
): boolean {
  if (value.length !== digits) return false;
  if (!/^\d+$/.test(value)) return false;
  const unique = new Set(value.split(""));
  return unique.size === digits;
}
