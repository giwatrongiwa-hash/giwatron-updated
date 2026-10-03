/** Arcade persistence — server-only. See lib/db.ts for access rules. */
import { kv } from "./db";

export type ScoreEntry = { wallet: string; bestScore: number; runs: number; updatedAt: number };

/**
 * Replay guard: atomically claims a run token's nonce. Returns false if the
 * nonce was already used. Expires after the token's own lifetime window.
 */
export async function claimNonce(nonce: string, ttlSec = 15 * 60): Promise<boolean> {
  return (await kv("SET", `nonce:${nonce}`, "1", "NX", "EX", ttlSec)) !== null;
}

export async function recordScore(wallet: string, score: number): Promise<ScoreEntry> {
  const key = `score:${wallet}`;
  const raw = await kv<string | null>("GET", key);
  const prev = raw ? (JSON.parse(raw) as ScoreEntry) : null;
  const next: ScoreEntry = {
    wallet,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    runs: (prev?.runs ?? 0) + 1,
    updatedAt: Date.now(),
  };
  await kv("SET", key, JSON.stringify(next));
  return next;
}
