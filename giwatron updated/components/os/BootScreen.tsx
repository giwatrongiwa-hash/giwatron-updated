"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Wordmark } from "./Wordmark";
import { ROBOT_UNITS } from "@/lib/units";

const TICK_MS = 55;
const TOTAL_TICKS = 44; // ~2.4s
const BAR_SEGMENTS = 24;

const BOOT_LINES: Array<{ at: number; text: string; status?: string; accent?: boolean }> = [
  { at: 2, text: "SYSTEM INITIALIZING" },
  { at: 7, text: "POWER-ON SELF TEST", status: "OK" },
  { at: 12, text: "MEMORY CHECK", status: "OK" },
  { at: 17, text: "LOADING GIWATRON OS", status: "OK" },
  { at: 22, text: "MOUNTING ROBOT DATABASE", status: `${ROBOT_UNITS.length} UNIT` },
  { at: 28, text: "OPTICS CALIBRATION", status: "RED", accent: true },
  { at: 34, text: "CONNECTION ESTABLISHED", accent: true },
];

/**
 * Boot sequence shown on every load (no password, no gate). Any key, click
 * or tap skips it. It renders on the server too, so the page never flashes
 * un-booted content first.
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [tick, setTick] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    let t = 0;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      t += 1;
      setTick(t);
      if (t >= TOTAL_TICKS) {
        clearInterval(id);
        doneTimer = setTimeout(finish, 280);
      }
    }, TICK_MS);

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearInterval(id);
      clearTimeout(doneTimer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const progress = Math.min(1, tick / TOTAL_TICKS);
  const litSegments = Math.round(progress * BAR_SEGMENTS);

  return (
    <motion.div
      className="boot-screen fixed inset-0 z-[80] flex items-center justify-center bg-os-bg px-6"
      exit={{ opacity: 0, transition: { duration: 0.35, ease: "linear" } }}
      role="status"
      aria-label="System booting"
    >
      <div className="w-full max-w-[520px]">
        <p className="os-label mb-5">[ boot.log ]</p>

        <div className="mb-8 min-h-[36px]">{tick >= 1 && <Wordmark size="md" />}</div>

        <ul className="space-y-1.5 text-[12px] sm:text-[13px] min-h-[170px]">
          {BOOT_LINES.filter((l) => tick >= l.at).map((line) => (
            <li key={line.text} className="flex gap-3">
              <span className="text-os-gray">&gt;</span>
              <span className={line.accent ? "text-os-white" : "text-os-light"}>{line.text}</span>
              {line.status && (
                <>
                  <span className="flex-1 overflow-hidden text-os-line-2 whitespace-nowrap">
                    ..........................................
                  </span>
                  <span className={line.accent ? "text-os-red" : "text-os-light"}>{line.status}</span>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <div className="boot-bar" aria-hidden="true">
            {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
              <span key={i} data-on={i < litSegments} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-os-gray tracking-[0.15em]">
            <span>{String(Math.round(progress * 100)).padStart(3, "0")}%</span>
            <span>
              PRESS ANY KEY TO SKIP
              <span className="os-cursor os-cursor-red" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
