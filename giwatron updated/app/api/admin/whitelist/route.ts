import { NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { deleteEntry, listEntries, normalizeWallet } from "@/lib/whitelist";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, ipKey, json, mask } from "@/lib/http";

/**
 * Admin-only whitelist access.
 *   GET    /api/admin/whitelist            -> JSON list
 *   GET    /api/admin/whitelist?format=csv -> CSV download
 *   DELETE /api/admin/whitelist?wallet=0x… -> hard delete (incl. backups)
 * Auth: `Authorization: Bearer <ADMIN_TOKEN>` (see scripts/generate-admin-token.mjs).
 */
async function authorize(req: NextRequest) {
  // Brute-force guard: every attempt (good or bad) counts.
  const limit = await consumeRateLimit("admin", await ipKey(req), 10, 600);
  if (!limit.allowed) return fail(429, "TOO MANY REQUESTS", { "Retry-After": String(limit.retryAfterSec) });
  const result = await checkAdmin(req);
  if (result === "disabled") return fail(404, "NOT FOUND");
  if (result === "denied") {
    console.warn("[admin] denied request");
    return fail(401, "UNAUTHORIZED");
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const denied = await authorize(req);
    if (denied) return denied;

    const entries = await listEntries();
    if (req.nextUrl.searchParams.get("format") === "csv") {
      const rows = ["wallet,x_handle,created_at", ...entries.map((e) => `${e.wallet},${e.xHandle},${new Date(e.createdAt).toISOString()}`)];
      return new Response(rows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="giwatron-whitelist.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return json({ ok: true, count: entries.length, entries });
  } catch (err) {
    console.error("[admin] list failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const denied = await authorize(req);
    if (denied) return denied;

    const wallet = normalizeWallet(req.nextUrl.searchParams.get("wallet") ?? "");
    if (!wallet) return fail(400, "INVALID ADDRESS");
    const removed = await deleteEntry(wallet);
    console.info(`[admin] delete ${mask(wallet)} -> ${removed}`);
    return json({ ok: true, removed });
  } catch (err) {
    console.error("[admin] delete failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
