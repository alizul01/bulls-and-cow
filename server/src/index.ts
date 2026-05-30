import { Elysia } from "elysia";
import { gameWS } from "./ws/game";
import { getRoom, cleanupExpiredRooms, getRoomCount } from "./store/rooms";
import { generateDailySecret, isValidNumber } from "./game/logic";

const ROOM_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const PORT = Number(process.env.PORT ?? 3001);

const dailyAttempts = new Map<string, { guesses: number; solved: boolean }>();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyAttemptKey() {
  return `daily_${getTodayKey()}`;
}

const app = new Elysia()
  .ws("/ws", gameWS)
  .get("/api/health", () => ({ status: "ok", rooms: getRoomCount() }))
  .get(
    "/api/rooms/:code",
    ({ params: { code } }) => {
      const room = getRoom(code.toUpperCase());
      if (!room) {
        return Response.json({ exists: false }, { status: 404 });
      }
      return {
        exists: true,
        playerCount: room.guestClientId ? 2 : 1,
        phase: room.phase,
        settings: room.settings,
        currentTurn: room.currentTurn ?? null,
        isComplete: room.phase === "finished",
      };
    }
  )
  .get("/api/daily", ({ request }) => {
    const today = getTodayKey();
    const secret = generateDailySecret(today);

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "anon";
    const key = `${getDailyAttemptKey()}_${ip}`;
    const attempt = dailyAttempts.get(key) ?? { guesses: 0, solved: false };

    return { date: today, guesses: attempt.guesses, solved: attempt.solved };
  })
  .post("/api/daily/guess", async ({ request }) => {
    try {
      const body = await request.json() as { guess: string };
      const guess = body.guess ?? "";

      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() ?? "anon";
      const key = `${getDailyAttemptKey()}_${ip}`;

      const today = getTodayKey();
      const secret = generateDailySecret(today);

      if (!isValidNumber(guess)) {
        return Response.json({ error: "Must be 4 unique digits" }, { status: 400 });
      }

      let attempt = dailyAttempts.get(key) ?? { guesses: 0, solved: false };
      attempt.guesses++;
      dailyAttempts.set(key, attempt);

      let bulls = 0, cows = 0;
      for (let i = 0; i < secret.length; i++) {
        if (secret[i] === guess[i]) bulls++;
        else if (secret.includes(guess[i])) cows++;
      }

      if (bulls === 4) {
        attempt.solved = true;
        dailyAttempts.set(key, attempt);
      }

      return { bulls, cows, guessCount: attempt.guesses, solved: bulls === 4 };
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
  })
  .listen({
    port: PORT,
    hostname: "0.0.0.0",
  });

globalThis._elysiaApp = app;

setInterval(() => {
  const removed = cleanupExpiredRooms(ROOM_TTL_MS);
  if (removed.length > 0) {
    console.log(`[Cleanup] Removed ${removed.length} expired room(s): ${removed.join(", ")}. Active: ${getRoomCount()}`);
  }
}, CLEANUP_INTERVAL_MS);

console.log(`[OK] Bulls & Cows server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
