import { NextRequest, NextResponse } from "next/server";
import { hmacSign } from "./crypto";
import { env } from "./env";

const NO_STORE = { "Cache-Control": "no-store" };

/** JSON response that is never cached by browsers or CDNs. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Deliberately vague error for clients — details go to server logs only. */
export function fail(status: number, error: string, headers: Record<string, string> = {}) {
  return json({ ok: false, error }, status, headers);
}

/**
 * Client IP. On Vercel `x-real-ip` / the first `x-forwarded-for` hop is set
 * by the platform edge, not by the client.
 */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/** IPs are never stored raw: rate-limit keys use a keyed hash. */
export async function ipKey(req: NextRequest): Promise<string> {
  return (await hmacSign(`ip:${clientIp(req)}`, env.SESSION_SECRET)).slice(0, 24);
}

/**
 * Cross-origin lock: browsers always send `Origin` on cross-origin POSTs, so
 * a mismatch means another site's JavaScript is calling us. Requests without
 * Origin (curl, server-to-server) carry no victim cookies and are allowed.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    // Next.js normalizes loopback URLs to localhost in development.
    // Compare against the actual HTTP host there, retaining the port check.
    const host = process.env.NODE_ENV === "development"
      ? req.headers.get("host") ?? req.nextUrl.host
      : req.nextUrl.host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type JsonBody = { ok: true; data: unknown } | { ok: false; response: NextResponse };

/**
 * Reads a small JSON body safely:
 *  - requires Content-Type: application/json (blocks cross-site HTML form posts)
 *  - hard size cap (no uploads, no oversized payloads)
 *  - malformed JSON -> 400
 */
export async function readJson(req: NextRequest, maxBytes = 2048): Promise<JsonBody> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: fail(415, "UNSUPPORTED REQUEST") };
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, response: fail(413, "REQUEST TOO LARGE") };

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: fail(400, "MALFORMED REQUEST") };
  }
  if (Buffer.byteLength(text) > maxBytes) return { ok: false, response: fail(413, "REQUEST TOO LARGE") };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: fail(400, "MALFORMED REQUEST") };
  }
}

/** Common guard stack for public POST endpoints. Returns a response to send, or null to continue. */
export function guardOrigin(req: NextRequest): NextResponse | null {
  if (!isSameOrigin(req)) return fail(403, "FORBIDDEN");
  return null;
}

/** Masks an address for logs: 0x1234…abcd */
export function mask(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : "***";
}
