import { NextRequest } from "next/server";
import { mintGameToken } from "@/lib/game-session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, guardOrigin, ipKey, json } from "@/lib/http";

export async function POST(req: NextRequest) {
  const blocked = guardOrigin(req);
  if (blocked) return blocked;

  try {
    // A real run takes well over 3s, so 30 starts / 10 min is generous for
    // humans while stopping scripted token farming.
    const limit = await consumeRateLimit("game-start", await ipKey(req), 30, 600);
    if (!limit.allowed) return fail(429, "TOO MANY REQUESTS", { "Retry-After": String(limit.retryAfterSec) });

    const { token, issuedAt } = await mintGameToken();
    return json({ ok: true, token, issuedAt });
  } catch (err) {
    console.error("[game/start] failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
