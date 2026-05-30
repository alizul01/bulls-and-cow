import { calcBullsCows, type GuessEntry, DEFAULT_DIGITS } from "./game-logic";

function generateAllPossibilities(digits: number = DEFAULT_DIGITS): string[] {
  const pool = "0123456789".split("");
  const results: string[] = [];

  function backtrack(current: string[]) {
    if (current.length === digits) {
      results.push(current.join(""));
      return;
    }
    for (const ch of pool) {
      if (!current.includes(ch)) {
        current.push(ch);
        backtrack(current);
        current.pop();
      }
    }
  }

  backtrack([]);
  return results;
}

const allPossibilities: string[] = generateAllPossibilities(DEFAULT_DIGITS);

export function getPossibleNumbers(guesses: GuessEntry[]): string[] {
  if (guesses.length === 0) return allPossibilities;

  return allPossibilities.filter((candidate) =>
    guesses.every((g) => {
      const result = calcBullsCows(candidate, g.guess);
      return result.bulls === g.bulls && result.cows === g.cows;
    })
  );
}

export function suggestGuess(guesses: GuessEntry[]): string {
  const possible = getPossibleNumbers(guesses);

  if (possible.length === 0) return ""; // inconsistent input
  if (possible.length === 1) return possible[0];

  // If no guesses yet, suggest a good starting number (1234 is classic)
  if (guesses.length === 0) return "0123";

  // Simple strategy: pick the first remaining candidate
  // A minimax strategy would be better but this works well enough
  return possible[0];
}

export function formatPossibilityCount(count: number): string {
  if (count === 0) return "No possibilities (check your inputs)";
  if (count === 1) return "1 possibility remaining";
  return `${count} possibilities remaining`;
}
