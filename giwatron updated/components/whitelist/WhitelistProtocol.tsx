"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { RobotDisplay } from "@/components/os/RobotDisplay";
import { useTyped } from "@/hooks/useTyped";
import { usePrefs } from "@/lib/prefs";
import { isValidWalletFormat } from "@/lib/utils";
import { ROBOT_UNITS } from "@/lib/units";
import { X_HANDLE, X_URL, WHITELIST_TWEET_URL, WHITELIST_QUOTE_URL } from "@/lib/site";

type TaskId = "follow" | "like" | "reply_quote";

type ServerState = {
  tasks: Record<TaskId, boolean>;
  verifyUnlocksAt: number | null;
  verified: boolean;
  registered: boolean;
  serverNow: number;
};

// Follow opens the profile; engagement tasks open the selected tweet.
const TASKS: Array<{ id: TaskId; label: string; action: string; url: string; description?: string }> = [
  { id: "follow", label: `FOLLOW @${X_HANDLE}`, action: "FOLLOW", url: X_URL },
  { id: "like", label: "LIKE THE TWEET", action: "LIKE", url: WHITELIST_TWEET_URL },
  { id: "reply_quote", label: "REPLY & QUOTE THE TWEET", action: "QUOTE", url: WHITELIST_QUOTE_URL, description: "Open the ready-to-post quote. Reply to the original post too." },
];

type LogLine = { id: number; text: string; tone: "ok" | "err" | "dim" };

async function callApi(path: string, body: unknown): Promise<{ ok: boolean; state?: ServerState; error?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    return await res.json();
  } catch {
    return { ok: false, error: "CONNECTION FAILED" };
  }
}

function formatSeconds(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `00:${String(s).padStart(2, "0")}`;
}

function StepHeader({ n, title, state }: { n: string; title: string; state: "locked" | "active" | "done" }) {
  return (
    <div className="os-titlebar">
      <span className={state === "locked" ? "text-os-gray" : "text-os-white"}>
        [ {n} ] {title}
      </span>
      <span className={`os-titlebar-end ${state === "done" ? "text-os-white" : state === "active" ? "text-os-red" : "text-os-gray"}`}>
        {state === "done" ? "COMPLETE" : state === "active" ? "ACTIVE" : "LOCKED"}
      </span>
    </div>
  );
}

export function WhitelistProtocol() {
  const [state, setState] = useState<ServerState | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0);
  const [checking, setChecking] = useState<number>(-1); // index being "checked" during the verify animation
  const [ticked, setTicked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [wallet, setWallet] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const logId = useRef(0);
  const { prefs, setPref } = usePrefs();

  const title = useTyped("./whitelist --protocol", true, 34);

  const push = useCallback((text: string, tone: LogLine["tone"] = "dim") => {
    const id = logId.current++;
    setLog((l) => [...l.slice(-5), { id, text, tone }]);
  }, []);

  const apply = useCallback((s: ServerState) => {
    setState(s);
    setOffset(s.serverNow - Date.now());
    if (s.verified) setTicked(true);
  }, []);

  // Load (or create) the server-side protocol session.
  useEffect(() => {
    let cancelled = false;
    callApi("/api/quest", { action: "sync" }).then((r) => {
      if (cancelled) return;
      if (r.ok && r.state) apply(r.state);
      else push(`ERR ${(r.error ?? "CONNECTION FAILED").toLowerCase()}`, "err");
    });
    return () => {
      cancelled = true;
    };
  }, [apply, push]);

  // Countdown clock (server-aligned).
  useEffect(() => {
    if (!state?.verifyUnlocksAt || state.verified) return;
    const tick = () => setNow(Date.now() + offset);
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [state?.verifyUnlocksAt, state?.verified, offset]);

  const openTask = async (task: (typeof TASKS)[number]) => {
    // Open X in a normal new browser tab (no popup window), synchronously
    // inside the click so popup blockers allow it.
    window.open(task.url, "_blank", "noopener,noreferrer");
    const r = await callApi("/api/quest", { action: "task", task: task.id });
    if (r.ok && r.state) {
      apply(r.state);
      push(`task ${task.id} opened. complete it on X.`);
    } else {
      push(`ERR ${(r.error ?? "request failed").toLowerCase()}`, "err");
    }
  };

  const verify = async () => {
    setVerifying(true);
    const r = await callApi("/api/quest", { action: "verify" });
    if (!r.ok || !r.state) {
      setVerifying(false);
      push(`ERR ${(r.error ?? "verification failed").toLowerCase()}`, "err");
      return;
    }
    // Step through each task, then tick them all.
    for (let i = 0; i < TASKS.length; i++) {
      setChecking(i);
      await new Promise((res) => setTimeout(res, 480));
    }
    setChecking(-1);
    setVerifying(false);
    apply(r.state);
    push("ALL TASKS CONFIRMED. REGISTRATION UNLOCKED.", "ok");
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = wallet.trim() || prefs.operatorAddress;
    if (!xHandle.trim()) return push("ERR x handle required.", "err");
    if (!isValidWalletFormat(w)) return push("ERR invalid address. expected 0x + 40 hex characters.", "err");
    setSubmitting(true);
    const r = await callApi("/api/whitelist", { wallet: w, xHandle });
    setSubmitting(false);
    if (r.ok && r.state) {
      setPref("operatorAddress", w);
      apply(r.state);
      push("ACCESS GRANTED. ADDRESS REGISTERED.", "ok");
    } else {
      push(`ERR ${(r.error ?? "registration failed").toLowerCase()}`, "err");
    }
  };

  const allOpened = state ? TASKS.every((t) => state.tasks[t.id]) : false;
  const remaining = state?.verifyUnlocksAt ? state.verifyUnlocksAt - now : null;
  const unlocked = remaining !== null && now > 0 && remaining <= 0;
  const step1: "active" | "done" = allOpened ? "done" : "active";
  const step2: "locked" | "active" | "done" = state?.verified ? "done" : allOpened ? "active" : "locked";
  const step3: "locked" | "active" | "done" = state?.registered ? "done" : state?.verified && ticked ? "active" : "locked";

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 sm:pt-32 pb-20">
      <Link href="/" className="os-toggle">
        [ ← SYSTEM ]
      </Link>

      <header className="mt-8 mb-10 sm:mb-14 border-b-2 border-os-line pb-6">
        <p className="os-prompt text-[12px] sm:text-[13px] h-5">
          <span className="text-os-light">{title.output}</span>
          {!title.done && <span className="os-cursor" />}
        </p>
        <h1 className="mt-4 font-pixel text-os-white text-[40px] sm:text-[64px] leading-none">
          WHITE<span className="text-os-red">LIST</span>
        </h1>
        <p className="mt-4 text-[13px] tracking-[0.14em] text-os-gray-2">&gt; ROBOT REGISTRATION PROTOCOL</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <div className="space-y-8">
          {/* STEP 01 — tasks */}
          <section className="px-frame" aria-labelledby="step-1">
            <StepHeader n="01" title="TASK QUEUE" state={step1} />
            <h2 id="step-1" className="sr-only">
              Step 1: tasks on X
            </h2>
            <ol className="p-3 sm:p-4 space-y-2">
              {TASKS.map((task, i) => {
                const opened = !!state?.tasks[task.id];
                const isChecking = checking === i;
                const isTicked = ticked && state?.verified;
                return (
                  <li
                    key={task.id}
                    className={`task-row ${isTicked ? "is-done" : opened ? "is-open" : ""}`}
                  >
                    <span className="text-os-gray text-[11px] w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 min-w-0 text-[12px] sm:text-[13px] tracking-[0.12em] text-os-light">
                      {task.label}
                      {task.description && (
                        <span className="block mt-1 text-[10px] tracking-normal text-os-gray-2">
                          {task.description}
                          {task.id === "reply_quote" && (
                            <a href={WHITELIST_TWEET_URL} target="_blank" rel="noopener noreferrer" className="block mt-1 underline text-os-light">OPEN ORIGINAL TO REPLY ↗</a>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="task-status" aria-live="polite">
                      {isTicked ? (
                        <motion.span
                          initial={{ scale: 1.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.08, duration: 0.18, ease: "linear" }}
                          className="task-tick"
                        >
                          [✓]
                        </motion.span>
                      ) : isChecking ? (
                        <span className="text-os-white">
                          CHECK<span className="os-cursor os-cursor-red" />
                        </span>
                      ) : opened ? (
                        <span className="text-os-gray-2 task-pending">[··]</span>
                      ) : (
                        <span className="text-os-line-2">[ ]</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => openTask(task)}
                      disabled={!state || !!state.verified}
                      className={`os-btn os-btn-sm shrink-0 ${opened ? "" : "os-btn-red"}`}
                    >
                      {task.action}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="px-4 sm:px-5 pb-4 text-[11px] tracking-[0.1em] text-os-gray">
              X ACCOUNT:{" "}
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-os-light underline decoration-os-red underline-offset-4">
                @{X_HANDLE}
              </a>
            </p>
          </section>

          {/* STEP 02 — verify */}
          <section className="px-frame" aria-labelledby="step-2">
            <StepHeader n="02" title="VERIFY" state={step2} />
            <h2 id="step-2" className="sr-only">
              Step 2: verify
            </h2>
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1 text-[12px] sm:text-[13px] tracking-[0.12em]">
                {state?.verified ? (
                  <p className="text-os-white">&gt; TASKS CONFIRMED.</p>
                ) : !allOpened ? (
                  <p className="text-os-gray">&gt; COMPLETE ALL 3 TASKS TO ARM VERIFICATION.</p>
                ) : unlocked ? (
                  <p className="text-os-white">&gt; VERIFICATION READY.</p>
                ) : (
                  <p className="text-os-light">
                    &gt; VERIFY UNLOCKS IN <span className="text-os-red">{remaining !== null && now > 0 ? formatSeconds(remaining) : "00:30"}</span>
                  </p>
                )}
                {!state?.verified && allOpened && (
                  <div className="mt-3 boot-bar" aria-hidden="true">
                    {Array.from({ length: 30 }, (_, i) => (
                      <span key={i} data-on={remaining !== null && now > 0 && i < Math.floor(30 - Math.max(0, remaining) / 1000)} />
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={verify}
                disabled={!allOpened || !unlocked || verifying || !!state?.verified}
                className="os-btn os-btn-red"
              >
                {verifying ? "CHECKING" : state?.verified ? "VERIFIED" : "VERIFY"}
              </button>
            </div>
          </section>

          {/* STEP 03 — register */}
          <section className="px-frame" aria-labelledby="step-3">
            <StepHeader n="03" title="REGISTER" state={step3} />
            <h2 id="step-3" className="sr-only">
              Step 3: register
            </h2>
            <AnimatePresence mode="wait">
              {state?.registered ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 sm:p-8 text-center"
                >
                  <p className="font-pixel text-os-white text-[30px] sm:text-[40px] leading-none">
                    ACCESS <span className="text-os-red">GRANTED</span>
                  </p>
                  <p className="mt-4 text-[12px] sm:text-[13px] tracking-[0.14em] text-os-gray-2">
                    &gt; YOUR ADDRESS IS ON THE GIWATRON WHITELIST. FOLLOW @{X_HANDLE} FOR MINT DETAILS.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link href="/" className="os-btn os-btn-sm">
                      BACK TO SYSTEM
                    </Link>
                    <a href={X_URL} target="_blank" rel="noopener noreferrer" className="os-btn os-btn-sm os-btn-red">
                      @{X_HANDLE}
                    </a>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={register}
                  className={`p-5 sm:p-6 space-y-3 ${step3 === "locked" ? "opacity-40 pointer-events-none" : ""}`}
                  aria-disabled={step3 === "locked"}
                >
                  <label className="flex items-center gap-3 border-2 border-os-line-2 bg-os-bg px-3 py-3 focus-within:border-os-red">
                    <span className="text-os-red select-none w-4">@</span>
                    <span className="sr-only">X handle</span>
                    <input
                      className="os-input"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      placeholder="YOUR X HANDLE"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={40}
                      disabled={step3 === "locked"}
                    />
                  </label>
                  <label className="flex items-center gap-3 border-2 border-os-line-2 bg-os-bg px-3 py-3 focus-within:border-os-red">
                    <span className="text-os-red select-none w-4">$</span>
                    <span className="sr-only">EVM address</span>
                    <input
                      className="os-input"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder={prefs.operatorAddress || "0x0000000000000000000000000000000000000000"}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={64}
                      disabled={step3 === "locked"}
                    />
                  </label>
                  <div className="flex justify-end">
                    <button type="submit" className="os-btn os-btn-red" disabled={submitting || step3 === "locked"}>
                      {submitting ? "SENDING" : "SUBMIT"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </section>

          {log.length > 0 && (
            <ol className="text-[12px] sm:text-[13px] space-y-1" aria-live="polite">
              {log.map((l) => (
                <li key={l.id} className={l.tone === "ok" ? "text-os-white" : l.tone === "err" ? "text-os-red" : "text-os-gray"}>
                  &gt; {l.text}
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24">
          <div className="px-frame">
            <div className="os-titlebar">
              <span>[ protocol.txt ]</span>
            </div>
            <ul className="p-5 sm:p-6 space-y-3 text-[12px] sm:text-[13px] text-os-light tracking-[0.06em]">
              <li className="flex gap-3">
                <span className="text-os-gray">01</span>
                <span>
                  FOLLOW{" "}
                  <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-os-white underline decoration-os-red underline-offset-4">
                    @{X_HANDLE}
                  </a>{" "}
                  ON X.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-os-gray">02</span>LIKE, REPLY TO AND QUOTE THE LATEST POST.
              </li>
              <li className="flex gap-3">
                <span className="text-os-gray">03</span>VERIFY UNLOCKS 30 SECONDS AFTER YOUR LAST TASK.
              </li>
              <li className="flex gap-3">
                <span className="text-os-gray">04</span>ONE ENTRY PER ADDRESS AND PER X ACCOUNT.
              </li>
              <li className="flex gap-3">
                <span className="text-os-gray">05</span>NO SIGNATURE. NO WALLET CONNECTION.
              </li>
              <li className="flex gap-3">
                <span className="text-os-gray">06</span>ENTRIES MAY BE REVIEWED BEFORE ALLOCATION.
              </li>
            </ul>
          </div>

          <div className="px-frame hidden sm:block">
            <div className="os-titlebar">
              <span>[ unit #001 ]</span>
              <span className="os-titlebar-end text-os-red">AWAITING OPERATORS</span>
            </div>
            <div className="p-3">
              <RobotDisplay unit={ROBOT_UNITS[0]} mode="static" sizes="360px" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
