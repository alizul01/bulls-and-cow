import { Elysia } from "elysia";
import { gameWS } from "./ws/game";
import { getRoom, cleanupExpiredRooms, getRoomCount } from "./store/rooms";

const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // run every 1 minute
const PORT = Number(process.env.PORT ?? 3001);

setInterval(() => {
  const removed = cleanupExpiredRooms(ROOM_TTL_MS);
  if (removed > 0) {
    console.log(`[Cleanup] Removed ${removed} expired room(s). Active: ${getRoomCount()}`);
  }
}, CLEANUP_INTERVAL_MS);

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
        isComplete: room.phase === "finished",
      };
    }
  )
  .listen({
    port: PORT,
    hostname: "0.0.0.0",
  });

console.log(`🟢 Bulls & Cows server running at http://localhost:${app.server?.port}`);

export type App = typeof app;
