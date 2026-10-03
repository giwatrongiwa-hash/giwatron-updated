import { NextRequest } from "next/server";
import { readQuest, writeQuest, publicState } from "@/lib/quest";
import { normalizeWallet, normalizeXHandle, registerEntry } from "@/lib/whitelist";
import { storeMissingInProduction } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, guardOrigin, ipKey, json, mask, readJson } from "@/lib/http";

const OUTCOME_ERRORS = {
  wallet_taken: "ADDRESS ALREADY REGISTERED",
  handle_taken: "X ACCOUNT ALREADY REGISTERED",
  session_used: "THIS SESSION ALREADY REGISTERED",
} as const;

export async function POST(req: NextRequest) {
  const blocked = guardOrigin(req);
  if (blocked) return blocked;

  // Fail closed: never accept entries in production without a durable store.
  if (storeMissingInProduction) {
    console.error("[whitelist] no database configured in production — registration disabled");
    return fail(503, "REGISTRATION OFFLINE");
  }

  try {
    const limit = await consumeRateLimit("whitelist", await ipKey(req), 5, 600);
    if (!limit.allowed) return fail(429, "TOO MANY REQUESTS", { "Retry-After": String(limit.retryAfterSec) });

    // Authorization is decided here, on the server: only a signed session
    // that passed the protocol may register.
    const state = await readQuest();
    if (!state || state.verifiedAt === null) return fail(403, "COMPLETE THE PROTOCOL FIRST");
    if (state.registered) return fail(409, OUTCOME_ERRORS.session_used);

    const body = await readJson(req, 512);
    if (!body.ok) return body.response;
    const { wallet, xHandle } = (body.data ?? {}) as { wallet?: unknown; xHandle?: unknown };
    if (typeof wallet !== "string" || typeof xHandle !== "string" || wallet.length > 64 || xHandle.length > 64) {
      return fail(400, "INVALID REQUEST");
    }

    const address = normalizeWallet(wallet);
    if (!address) return fail(400, "INVALID ADDRESS. EXPECTED 0x + 40 HEX CHARACTERS.");
    const handle = normalizeXHandle(xHandle);
    if (!handle) return fail(400, "INVALID X HANDLE");

    const outcome = await registerEntry(state.sid, address, handle);
    if (outcome !== "registered") return fail(409, OUTCOME_ERRORS[outcome]);

    state.registered = true;
    await writeQuest(state);
    console.info(`[whitelist] registered ${mask(address)}`);
    return json({ ok: true, state: publicState(state) });
  } catch (err) {
    console.error("[whitelist] failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
