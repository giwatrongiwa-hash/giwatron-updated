import { NextRequest } from "next/server";
import {
  QUEST_TASKS,
  allTasksOpened,
  newQuest,
  publicState,
  readQuest,
  verifyUnlocksAt,
  writeQuest,
  type QuestTask,
} from "@/lib/quest";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fail, guardOrigin, ipKey, json, readJson } from "@/lib/http";

/**
 * Whitelist protocol state machine. Actions:
 *   { action: "sync" }                -> returns (and if needed creates) the session
 *   { action: "task", task }          -> records the server time a task link was opened
 *   { action: "verify" }              -> allowed only if all tasks were opened and
 *                                         30s have passed since the last one (server clock)
 */
export async function POST(req: NextRequest) {
  const blocked = guardOrigin(req);
  if (blocked) return blocked;

  try {
    const limit = await consumeRateLimit("quest", await ipKey(req), 60, 600);
    if (!limit.allowed) return fail(429, "TOO MANY REQUESTS", { "Retry-After": String(limit.retryAfterSec) });

    const body = await readJson(req, 256);
    if (!body.ok) return body.response;
    const { action, task } = (body.data ?? {}) as { action?: unknown; task?: unknown };

    let state = await readQuest();
    const isNew = !state;
    if (!state) state = newQuest();

    if (action === "sync") {
      if (isNew) await writeQuest(state);
      return json({ ok: true, state: publicState(state) });
    }

    if (action === "task") {
      if (typeof task !== "string" || !QUEST_TASKS.includes(task as QuestTask)) return fail(400, "INVALID REQUEST");
      if (state.verifiedAt === null && typeof state.tasks[task as QuestTask] !== "number") {
        state.tasks[task as QuestTask] = Date.now();
      }
      await writeQuest(state);
      return json({ ok: true, state: publicState(state) });
    }

    if (action === "verify") {
      if (state.verifiedAt !== null) return json({ ok: true, state: publicState(state) });
      if (!allTasksOpened(state)) {
        if (isNew) await writeQuest(state);
        return fail(400, "COMPLETE ALL TASKS FIRST");
      }
      const unlocksAt = verifyUnlocksAt(state) as number;
      if (Date.now() < unlocksAt) {
        const wait = Math.ceil((unlocksAt - Date.now()) / 1000);
        return fail(425, `VERIFY LOCKED. RETRY IN ${wait}S`, { "Retry-After": String(wait) });
      }
      state.verifiedAt = Date.now();
      await writeQuest(state);
      return json({ ok: true, state: publicState(state) });
    }

    return fail(400, "INVALID REQUEST");
  } catch (err) {
    console.error("[quest] failed:", err instanceof Error ? err.message : "unknown");
    return fail(503, "SERVICE UNAVAILABLE");
  }
}
