import { describe, test, expect } from "bun:test";
import { calcBullsCows, generateSecret, isValidNumber } from "./logic";

describe("calcBullsCows", () => {
  test("all correct positions = all bulls", () => {
    expect(calcBullsCows("1234", "1234")).toEqual({ bulls: 4, cows: 0 });
  });

  test("no correct positions = no bulls/cows", () => {
    expect(calcBullsCows("1234", "5678")).toEqual({ bulls: 0, cows: 0 });
  });

  test("correct digit, wrong position = cow", () => {
    expect(calcBullsCows("1234", "4321")).toEqual({ bulls: 0, cows: 4 });
  });

  test("mixed bulls and cows", () => {
    expect(calcBullsCows("1234", "1243")).toEqual({ bulls: 2, cows: 2 });
  });

  test("one bull only", () => {
    expect(calcBullsCows("1234", "1678")).toEqual({ bulls: 1, cows: 0 });
  });

  test("one cow only", () => {
    expect(calcBullsCows("1234", "5617")).toEqual({ bulls: 0, cows: 1 });
  });

  test("no double count: digit used as bull not counted as cow", () => {
    expect(calcBullsCows("1111", "1111")).toEqual({ bulls: 4, cows: 0 });
  });
});

describe("generateSecret", () => {
  test("generates string of correct length", () => {
    const secret = generateSecret(4);
    expect(secret).toHaveLength(4);
  });

  test("all characters are digits", () => {
    const secret = generateSecret(4);
    expect(/^\d{4}$/.test(secret)).toBe(true);
  });

  test("all digits are unique", () => {
    const secret = generateSecret(4);
    expect(new Set(secret.split("")).size).toBe(4);
  });

  test("generates different values each time (statistical)", () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 50; i++) {
      secrets.add(generateSecret(4));
    }
    expect(secrets.size).toBeGreaterThan(10);
  });
});

describe("isValidNumber", () => {
  test("valid 4 unique digits", () => {
    expect(isValidNumber("1234")).toBe(true);
  });

  test("too short", () => {
    expect(isValidNumber("123")).toBe(false);
  });

  test("too long", () => {
    expect(isValidNumber("12345")).toBe(false);
  });

  test("contains non-digit", () => {
    expect(isValidNumber("12a4")).toBe(false);
    expect(isValidNumber("12 4")).toBe(false);
    expect(isValidNumber("")).toBe(false);
  });

  test("duplicate digits", () => {
    expect(isValidNumber("1123")).toBe(false);
  });

  test("custom digit count", () => {
    expect(isValidNumber("123", 3)).toBe(true);
    expect(isValidNumber("122", 3)).toBe(false);
    expect(isValidNumber("12345", 5)).toBe(true);
  });
});
