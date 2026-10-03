/**
 * Whitelist protocol session — server-only.
 *
 * State lives in a signed, httpOnly cookie. Every timestamp in it is written
 * by the server, and the HMAC signature (SESSION_SECRET) means the browser
 * cannot edit it: the 30-second wait and the "all tasks opened" rule are
 * enforced here, not in client JavaScript.
 *
 * LIMITATION (by design, documented to the owner): X's free API cannot
 * confirm that a follow/like/reply/quote actually happened. This protocol
 * records that each task link was opened and enforces the wait; the X
 * handle collected at registration lets the team review entries manually.
 */
import { cookies } from "next/headers";
import { hmacSign, hmacVerify, randomNonce } from "./crypto";
import { env } from "./env";

export const QUEST_TASKS = ["follow", "like", "reply_quote"] as const;
export type QuestTask = (typeof QUEST_TASKS)[number];

export const VERIFY_WAIT_MS = 30_000;
const SESSION_TTL_SEC = 2 * 60 * 60;

export type QuestState = {
  v: 1;
  sid: string;
  iat: number;
  tasks: Partial<Record<QuestTask, number>>;
  verifiedAt: number | null;
  registered: boolean;
};

const isProd = process.env.NODE_ENV === "production";
// __Host- prefix: browser only accepts it with Secure, Path=/ and no Domain,
// so a sibling subdomain can never plant or overwrite this cookie.
const COOKIE_NAME = isProd ? "__Host-gw_protocol" : "gw_protocol";

function b64url(s: string) {
  return Buffer.from(s, "utf8").toString("base64url");
}
function fromB64url(s: string) {
  return Buffer.from(s, "base64url").toString("utf8");
}

async function encode(state: QuestState): Promise<string> {
  const payload = b64url(JSON.stringify(state));
  return `${payload}.${await hmacSign(payload, env.SESSION_SECRET)}`;
}

async function decode(raw: string | undefined): Promise<QuestState | null> {
  if (!raw || raw.length > 1024) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if (!(await hmacVerify(payload, sig, env.SESSION_SECRET))) return null;
  try {
    const s = JSON.parse(fromB64url(payload)) as QuestState;
    if (s.v !== 1 || typeof s.sid !== "string" || typeof s.iat !== "number") return null;
    if (Date.now() - s.iat > SESSION_TTL_SEC * 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function readQuest(): Promise<QuestState | null> {
  const jar = await cookies();
  return decode(jar.get(COOKIE_NAME)?.value);
}

export async function writeQuest(state: QuestState): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, await encode(state), {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function newQuest(): QuestState {
  return { v: 1, sid: randomNonce(16), iat: Date.now(), tasks: {}, verifiedAt: null, registered: false };
}

export function allTasksOpened(s: QuestState): boolean {
  return QUEST_TASKS.every((t) => typeof s.tasks[t] === "number");
}

/** Epoch ms when VERIFY becomes allowed, or null if not every task has been opened yet. */
export function verifyUnlocksAt(s: QuestState): number | null {
  if (!allTasksOpened(s)) return null;
  return Math.max(...QUEST_TASKS.map((t) => s.tasks[t] as number)) + VERIFY_WAIT_MS;
}

/** Shape sent to the browser (no signature, no session id). */
export function publicState(s: QuestState) {
  return {
    tasks: Object.fromEntries(QUEST_TASKS.map((t) => [t, typeof s.tasks[t] === "number"])) as Record<QuestTask, boolean>,
    verifyUnlocksAt: verifyUnlocksAt(s),
    verified: s.verifiedAt !== null,
    registered: s.registered,
    serverNow: Date.now(),
  };
}
