import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqual } from "@/lib/crypto";
import { snapshotBackup } from "@/lib/whitelist";
import { fail, json } from "@/lib/http";

/**
 * Daily whitelist snapshot, triggered by Vercel Cron (see vercel.json).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: NextRequest) {
  const secret = env.CRON_SECRET;
  if (!secret) return fail(404, "NOT FOUND");
  const header = req.headers.get("authorization") ?? "";
  if (!timingSafeEqual(header, `Bearer ${secret}`)) return fail(401, "UNAUTHORIZED");

  try {
    const { key, count } = await snapshotBackup();
    console.info(`[cron/backup] ${key} entries=${count}`);
    return json({ ok: true, key, count });
  } catch (err) {
    console.error("[cron/backup] failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
