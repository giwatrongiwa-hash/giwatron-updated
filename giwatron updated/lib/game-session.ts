/**
 * Stateless anti-cheat tokens for the arcade mini-game.
 *
 * Flow:
 *  1. Client calls POST /api/game/start -> server mints a signed token
 *     containing a server-side start timestamp + a max possible score rate.
 *  2. Client plays entirely client-side (rendering/animation is inherently
 *     client-side for a canvas game) and submits { token, score } to
 *     POST /api/game/claim on game-over.
 *  3. Server re-verifies the HMAC signature (so the token wasn't forged or
 *     edited), recomputes elapsed server time, and rejects any score that
 *     exceeds what's physically achievable in that time window. This makes
 *     it impossible to fabricate a high score purely by editing
 *     localStorage/console/network payloads without a valid, time-bounded,
 *     server-issued token — and even with a valid token, score is capped by
 *     elapsed wall-clock time on the server, not the client.
 */
import { hmacSign, hmacVerify, randomNonce } from "./crypto";
import { env } from "./env";

export const MAX_SCORE_PER_SECOND = 12; // tune to your game's real max scoring rate
export const MIN_GAME_DURATION_MS = 3000; // guards against instant-claim replay
export const MAX_GAME_DURATION_MS = 5 * 60 * 1000; // session token lifetime

type GameTokenPayload = {
  nonce: string;
  iat: number; // server issue time (ms)
  exp: number;
};

function encode(p: GameTokenPayload): string {
  return Buffer.from(JSON.stringify(p)).toString("base64url");
}
function decode(s: string): GameTokenPayload | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function mintGameToken(): Promise<{ token: string; issuedAt: number }> {
  const now = Date.now();
  const payload: GameTokenPayload = {
    nonce: randomNonce(12),
    iat: now,
    exp: now + MAX_GAME_DURATION_MS,
  };
  const encoded = encode(payload);
  const sig = await hmacSign(encoded, env.GAME_SECRET);
  return { token: `${encoded}.${sig}`, issuedAt: now };
}

export type ClaimValidation =
  | { ok: true; elapsedMs: number; maxAllowedScore: number; nonce: string }
  | { ok: false; reason: string };

export async function validateClaim(token: string, claimedScore: number): Promise<ClaimValidation> {
  if (typeof claimedScore !== "number" || !Number.isInteger(claimedScore) || claimedScore < 0) {
    return { ok: false, reason: "invalid_score_type" };
  }

  const [encoded, sig] = (token ?? "").split(".");
  if (!encoded || !sig) return { ok: false, reason: "malformed_token" };

  const validSig = await hmacVerify(encoded, sig, env.GAME_SECRET);
  if (!validSig) return { ok: false, reason: "bad_signature" };

  const payload = decode(encoded);
  if (!payload || typeof payload.iat !== "number" || typeof payload.exp !== "number" || typeof payload.nonce !== "string") {
    return { ok: false, reason: "bad_payload" };
  }

  const now = Date.now();
  if (now > payload.exp) return { ok: false, reason: "token_expired" };

  const elapsedMs = now - payload.iat;
  if (elapsedMs < MIN_GAME_DURATION_MS) return { ok: false, reason: "session_too_short" };

  const maxAllowedScore = Math.floor((elapsedMs / 1000) * MAX_SCORE_PER_SECOND);
  if (claimedScore > maxAllowedScore) {
    return { ok: false, reason: "score_exceeds_physical_maximum" };
  }

  return { ok: true, elapsedMs, maxAllowedScore, nonce: payload.nonce };
}
