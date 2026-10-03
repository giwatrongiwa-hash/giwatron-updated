/**
 * Server-only crypto helpers.
 * Uses Web Crypto API (available in Node.js runtime + Edge runtime) so this
 * file works identically in API routes and middleware.
 */

const encoder = new TextEncoder();

/** SHA-256 hash of a string, returned as lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}

/** Constant-time string comparison to prevent timing attacks. */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  const len = Math.max(aBuf.length, bBuf.length);
  let diff = aBuf.length === bBuf.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
  }
  return diff === 0;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Sign a payload string with HMAC-SHA256, returns hex signature. */
export async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(sig).toString("hex");
}

/** Verify an HMAC-SHA256 hex signature against a payload. */
export async function hmacVerify(payload: string, signatureHex: string, secret: string): Promise<boolean> {
  try {
    const expected = await hmacSign(payload, secret);
    return timingSafeEqual(expected, signatureHex);
  } catch {
    return false;
  }
}

/** Generates a random hex nonce. */
export function randomNonce(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("hex");
}
