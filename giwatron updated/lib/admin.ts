/**
 * Admin authorization — server-only.
 *
 * Role model: there is exactly one role, "admin", proven by a bearer token.
 * Only the SHA-256 hash of that token is stored (ADMIN_TOKEN_HASH), so a
 * leaked environment dump does not reveal a usable credential. Comparison is
 * constant-time. If ADMIN_TOKEN_HASH is not set, admin endpoints answer 404
 * as if they did not exist.
 */
import { NextRequest } from "next/server";
import { sha256Hex, timingSafeEqual } from "./crypto";
import { env } from "./env";

export type AdminCheck = "ok" | "disabled" | "denied";

export async function checkAdmin(req: NextRequest): Promise<AdminCheck> {
  const expectedHash = env.ADMIN_TOKEN_HASH;
  if (!expectedHash) return "disabled";
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/);
  if (!match) return "denied";
  const hash = await sha256Hex(match[1]);
  return timingSafeEqual(hash, expectedHash.toLowerCase()) ? "ok" : "denied";
}
