/**
 * Whitelist storage — server-only. See lib/db.ts for access rules.
 *
 * Keys:
 *   wl:wallet:<address>   JSON entry (the record itself)
 *   wl:x:<handle>         lock: one registration per X handle
 *   wl:sid:<sid>          lock: one registration per protocol session
 *   wl:all                set of registered addresses (for export)
 *   backup:<YYYY-MM-DD>   daily snapshot (30-day TTL), listed in backup:index
 */
import { kv, kvPipeline } from "./db";

export type WhitelistEntry = {
  wallet: string;
  xHandle: string;
  createdAt: number;
};

export type RegisterOutcome = "registered" | "wallet_taken" | "handle_taken" | "session_used";

const X_HANDLE_RE = /^[a-z0-9_]{1,15}$/;
const WALLET_RE = /^0x[a-f0-9]{40}$/;

export function normalizeWallet(raw: string): string | null {
  const w = raw.trim().toLowerCase();
  return WALLET_RE.test(w) ? w : null;
}

/** Accepts "handle", "@handle" or an x.com / twitter.com profile URL. */
export function normalizeXHandle(raw: string): string | null {
  const h = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .toLowerCase();
  return X_HANDLE_RE.test(h) ? h : null;
}

/**
 * Atomic-per-key registration: each uniqueness lock is taken with SET NX.
 * If a later lock fails, the earlier ones are released so a half-written
 * entry never remains.
 */
export async function registerEntry(sid: string, wallet: string, xHandle: string): Promise<RegisterOutcome> {
  const entry: WhitelistEntry = { wallet, xHandle, createdAt: Date.now() };

  const sidOk = await kv("SET", `wl:sid:${sid}`, wallet, "NX");
  if (sidOk === null) return "session_used";

  const walletOk = await kv("SET", `wl:wallet:${wallet}`, JSON.stringify(entry), "NX");
  if (walletOk === null) {
    await kv("DEL", `wl:sid:${sid}`);
    return "wallet_taken";
  }

  const handleOk = await kv("SET", `wl:x:${xHandle}`, wallet, "NX");
  if (handleOk === null) {
    await kv("DEL", `wl:sid:${sid}`, `wl:wallet:${wallet}`);
    return "handle_taken";
  }

  await kv("SADD", "wl:all", wallet);
  return "registered";
}

export async function listEntries(): Promise<WhitelistEntry[]> {
  const wallets = await kv<string[]>("SMEMBERS", "wl:all");
  if (!wallets.length) return [];
  const raw = await kv<(string | null)[]>("MGET", ...wallets.map((w) => `wl:wallet:${w}`));
  return raw
    .filter((r): r is string => typeof r === "string")
    .map((r) => JSON.parse(r) as WhitelistEntry)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function countEntries(): Promise<number> {
  return kv<number>("SCARD", "wl:all");
}

/**
 * Hard delete: removes the live record, its locks, AND scrubs it from every
 * retained backup snapshot, so a deletion request is actually honored.
 */
export async function deleteEntry(wallet: string): Promise<boolean> {
  const raw = await kv<string | null>("GET", `wl:wallet:${wallet}`);
  if (!raw) return false;
  const entry = JSON.parse(raw) as WhitelistEntry;

  await kvPipeline([
    ["DEL", `wl:wallet:${wallet}`, `wl:x:${entry.xHandle}`],
    ["SREM", "wl:all", wallet],
  ]);

  const backupKeys = await kv<string[]>("SMEMBERS", "backup:index");
  for (const key of backupKeys) {
    const snap = await kv<string | null>("GET", key);
    if (!snap) {
      await kv("SREM", "backup:index", key);
      continue;
    }
    const entries = (JSON.parse(snap) as WhitelistEntry[]).filter((e) => e.wallet !== wallet);
    await kv("SET", key, JSON.stringify(entries), "KEEPTTL");
  }
  return true;
}

const BACKUP_TTL_SEC = 30 * 24 * 60 * 60;

export async function snapshotBackup(): Promise<{ key: string; count: number }> {
  const entries = await listEntries();
  const key = `backup:${new Date().toISOString().slice(0, 10)}`;
  await kvPipeline([
    ["SET", key, JSON.stringify(entries), "EX", BACKUP_TTL_SEC],
    ["SADD", "backup:index", key],
  ]);
  return { key, count: entries.length };
}
