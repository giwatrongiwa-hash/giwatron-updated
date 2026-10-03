/**
 * Fixed-window rate limiter backed by the shared store (lib/db.ts), so the
 * limit holds across all serverless instances in production. Keys use a
 * hashed IP (see ipKey in lib/http.ts), never the raw address.
 */
import { kv } from "./db";

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

export async function consumeRateLimit(
  scope: string,
  id: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const key = `rl:${scope}:${id}`;
  const count = await kv<number>("INCR", key);
  if (count === 1) await kv("EXPIRE", key, windowSec);
  if (count > limit) {
    const ttl = await kv<number>("TTL", key);
    // Self-heal a counter that somehow lost its expiry.
    if (ttl < 0) await kv("EXPIRE", key, windowSec);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
  }
  return { allowed: true, retryAfterSec: 0 };
}
