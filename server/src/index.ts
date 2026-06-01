import { Elysia } from "elysia";
import { gameWS } from "./ws/game";
import { getRoom, cleanupExpiredRooms, getRoomCount, listPublicRooms } from "./store/rooms";
import { generateDailySecret, isValidNumber } from "./game/logic";
import { createOrUpdateUser, getUserByToken, removeSession } from "./store/auth";
import { recordGame, getUserStats, recordDaily } from "./store/stats";

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

async function verifyGoogleToken(idToken: string): Promise<{ sub: string; name: string; email: string; picture: string } | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub || !data.email_verified) return null;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && data.aud !== clientId) {
      console.log(`[Auth] Token audience mismatch: ${data.aud} !== ${clientId}`);
      return null;
    }

    return {
      sub: data.sub,
      name: data.name ?? "Player",
      email: data.email ?? "",
      picture: data.picture ?? "",
    };
  } catch {
    return null;
  }
}

const app = new Elysia()
  .ws("/ws", gameWS)
  .get("/api/health", () => ({ status: "ok", rooms: getRoomCount() }))
  .get("/api/rooms", () => {
    return listPublicRooms();
  })
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
  .post("/api/auth/google", async ({ request }) => {
    try {
      const body = await request.json() as { idToken: string };
      const idToken = body.idToken ?? "";
      if (!idToken) return Response.json({ error: "Missing token" }, { status: 400 });

      const profile = await verifyGoogleToken(idToken);
      if (!profile) return Response.json({ error: "Invalid token" }, { status: 401 });

      const sessionToken = createOrUpdateUser({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      });

      return {
        token: sessionToken,
        user: { id: profile.sub, name: profile.name, email: profile.email, picture: profile.picture },
      };
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
  })
  .get("/api/auth/me", ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return Response.json({ user: null }, { status: 401 });
    }
    const token = auth.slice(7);
    const user = getUserByToken(token);
    if (!user) return Response.json({ user: null }, { status: 401 });
    return { user };
  })
  .post("/api/auth/logout", ({ request }) => {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      removeSession(auth.slice(7));
    }
    return { ok: true };
  })
  .get("/api/stats", ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return Response.json({ stats: null }, { status: 401 });
    }
    const token = auth.slice(7);
    const user = getUserByToken(token);
    if (!user) return Response.json({ stats: null }, { status: 401 });
    const stats = getUserStats(user.id);
    return { stats };
  })
  .post("/api/stats/game", async ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return Response.json({ ok: false }, { status: 401 });
    const token = auth.slice(7);
    const user = getUserByToken(token);
    if (!user) return Response.json({ ok: false }, { status: 401 });

    try {
      const body = await request.json() as { won: boolean; guessCount: number; type?: string };
      if (body.type === "daily") {
        recordDaily(user.id, body.guessCount ?? 0);
      } else {
        recordGame(user.id, body.won ?? false, body.guessCount ?? 0);
      }
      return { ok: true };
    } catch {
      return Response.json({ ok: false }, { status: 400 });
    }
  })
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
