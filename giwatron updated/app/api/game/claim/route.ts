import { NextRequest } from "next/server";
import { validateClaim } from "@/lib/game-session";
import { claimNonce, recordScore } from "@/lib/scores";
import { normalizeWallet } from "@/lib/whitelist";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, guardOrigin, ipKey, json, mask, readJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  const blocked = guardOrigin(req);
  if (blocked) return blocked;

  try {
    const limit = await consumeRateLimit("game-claim", await ipKey(req), 30, 600);
    if (!limit.allowed) return fail(429, "TOO MANY REQUESTS", { "Retry-After": String(limit.retryAfterSec) });

    const body = await readJson(req, 1024);
    if (!body.ok) return body.response;
    const { token, score, wallet } = (body.data ?? {}) as { token?: unknown; score?: unknown; wallet?: unknown };

    if (typeof token !== "string" || token.length > 512 || typeof score !== "number" || typeof wallet !== "string") {
      return fail(400, "INVALID REQUEST");
    }
    const address = normalizeWallet(wallet);
    if (!address) return fail(400, "INVALID ADDRESS");

    const validation = await validateClaim(token, score);
    if (!validation.ok) {
      // Reason stays server-side; the raw token is never logged.
      console.warn(`[game/claim] rejected ${mask(address)} reason=${validation.reason}`);
      return fail(400, "SCORE REJECTED");
    }

    // Atomic single-use: a second submission of the same run is refused.
    if (!(await claimNonce(validation.nonce))) return fail(409, "SCORE ALREADY SUBMITTED");

    const entry = await recordScore(address, score);
    return json({ ok: true, bestScore: entry.bestScore, runs: entry.runs });
  } catch (err) {
    console.error("[game/claim] failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
