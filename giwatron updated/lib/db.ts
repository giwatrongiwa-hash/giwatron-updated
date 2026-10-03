/**
 * Key-value storage.
 *
 * Production: Upstash Redis over its REST API (Vercel Marketplace "Upstash
 * for Redis" injects KV_REST_API_URL / KV_REST_API_TOKEN automatically;
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work).
 * Local dev: an in-memory emulation of the handful of commands used here.
 *
 * ACCESS RULES (the "database permission rules" for this project):
 *  - The Redis token lives only in server-side environment variables. It is
 *    never sent to the browser, and no client code talks to Redis.
 *  - Every command is sent as a JSON array of arguments — values are never
 *    concatenated into a command string, so user input cannot inject
 *    commands (the Redis equivalent of parameterized SQL).
 *  - Only the key prefixes below are ever written:
 *      rl:*       rate-limit counters (auto-expire)
 *      wl:*       whitelist entries and uniqueness locks
 *      nonce:*    arcade replay guards (auto-expire)
 *      score:*    arcade best scores
 *      backup:*   daily whitelist snapshots (auto-expire after 30 days)
 *  - Writes that must be unique use SET NX, so concurrent requests cannot
 *    create duplicates.
 */

type Arg = string | number;
type Reply = string | number | null | Reply[];

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const hasDurableStore = Boolean(REST_URL && REST_TOKEN);

/** True on a real production deploy that has no database attached — callers must fail closed. */
export const storeMissingInProduction = process.env.NODE_ENV === "production" && !hasDurableStore;

export class StoreError extends Error {}

// ---------------------------------------------------------------- Upstash --

async function upstash(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${REST_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new StoreError(`store http ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------- Memory --

type MemValue = { v: string | Set<string>; exp: number | null };
const mem = new Map<string, MemValue>();

function memGet(key: string): MemValue | undefined {
  const e = mem.get(key);
  if (e && e.exp !== null && e.exp <= Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e;
}

function memExec(cmd: Arg[]): Reply {
  const [rawName, ...rest] = cmd;
  const name = String(rawName).toUpperCase();
  const args = rest.map(String);
  const key = args[0];

  switch (name) {
    case "GET": {
      const e = memGet(key);
      return e && typeof e.v === "string" ? e.v : null;
    }
    case "MGET":
      return args.map((k) => {
        const e = memGet(k);
        return e && typeof e.v === "string" ? e.v : null;
      });
    case "SET": {
      const opts = args.slice(2).map((a) => a.toUpperCase());
      const existing = memGet(key);
      if (opts.includes("NX") && existing) return null;
      let exp: number | null = null;
      const exIdx = opts.indexOf("EX");
      if (exIdx >= 0) exp = Date.now() + Number(args[2 + exIdx + 1]) * 1000;
      if (opts.includes("KEEPTTL") && existing) exp = existing.exp;
      mem.set(key, { v: args[1], exp });
      return "OK";
    }
    case "DEL": {
      let n = 0;
      for (const k of args) if (mem.delete(k)) n++;
      return n;
    }
    case "INCR": {
      const e = memGet(key);
      const next = (e && typeof e.v === "string" ? Number(e.v) : 0) + 1;
      mem.set(key, { v: String(next), exp: e?.exp ?? null });
      return next;
    }
    case "EXPIRE": {
      const e = memGet(key);
      if (!e) return 0;
      const nx = args[2]?.toUpperCase() === "NX";
      if (nx && e.exp !== null) return 0;
      e.exp = Date.now() + Number(args[1]) * 1000;
      return 1;
    }
    case "TTL": {
      const e = memGet(key);
      if (!e) return -2;
      return e.exp === null ? -1 : Math.ceil((e.exp - Date.now()) / 1000);
    }
    case "SADD": {
      const e = memGet(key);
      const set = e && e.v instanceof Set ? e.v : new Set<string>();
      let n = 0;
      for (const m of args.slice(1)) {
        if (!set.has(m)) {
          set.add(m);
          n++;
        }
      }
      mem.set(key, { v: set, exp: e?.exp ?? null });
      return n;
    }
    case "SREM": {
      const e = memGet(key);
      if (!e || !(e.v instanceof Set)) return 0;
      let n = 0;
      for (const m of args.slice(1)) if (e.v.delete(m)) n++;
      return n;
    }
    case "SMEMBERS": {
      const e = memGet(key);
      return e && e.v instanceof Set ? [...e.v] : [];
    }
    case "SCARD": {
      const e = memGet(key);
      return e && e.v instanceof Set ? e.v.size : 0;
    }
    default:
      throw new StoreError(`unsupported command ${name}`);
  }
}

// ----------------------------------------------------------------- Public --

/** Run one command. Arguments are passed as an array — never string-built. */
export async function kv<T extends Reply = Reply>(...cmd: Arg[]): Promise<T> {
  if (!hasDurableStore) return memExec(cmd) as T;
  const data = (await upstash("", cmd)) as { result?: Reply; error?: string };
  if (data.error) throw new StoreError("store command failed");
  return data.result as T;
}

/** Run several commands in one round trip (not atomic as a group). */
export async function kvPipeline(cmds: Arg[][]): Promise<Reply[]> {
  if (!hasDurableStore) return cmds.map(memExec);
  const data = (await upstash("/pipeline", cmds)) as Array<{ result?: Reply; error?: string }>;
  return data.map((d) => {
    if (d.error) throw new StoreError("store command failed");
    return d.result ?? null;
  });
}
