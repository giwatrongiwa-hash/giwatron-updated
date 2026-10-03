"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wordmark } from "./Wordmark";
import { RobotDisplay } from "./RobotDisplay";
import { ROBOT_UNITS, formatUnitNumber } from "@/lib/units";
import { useTyped } from "@/hooks/useTyped";
import { WhitelistButton } from "./WhitelistButton";

const HERO_UNIT = ROBOT_UNITS[0];
// Matches the CSS reveal timeline: scan-in 1.5s + settle ~1.1s.
const STATUS_DELAY_MS = 2600;

function formatUptime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Session uptime since the display came online — a real, live number, not a fake stat. */
function Uptime({ active }: { active: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return <>{formatUptime(seconds)}</>;
}

function Readout({ label, value, red = false }: { label: string; value: React.ReactNode; red?: boolean }) {
  return (
    <div className="flex gap-2 whitespace-nowrap">
      <span className="text-os-gray">{label}</span>
      <span className="flex-1 overflow-hidden text-os-line-2">.................</span>
      <span className={red ? "text-os-red" : "text-os-light"}>{value}</span>
    </div>
  );
}

export function Hero({ active }: { active: boolean }) {
  const [statusOn, setStatusOn] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setStatusOn(true), STATUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [active]);

  const status = useTyped("SYSTEM STATUS: ", statusOn, 40);

  const panelIn = {
    initial: { opacity: 0 },
    animate: active ? { opacity: 1 } : { opacity: 0 },
  };

  return (
    <section id="top" className="relative flex flex-col items-center px-5 pt-24 sm:pt-28 pb-20">
      <motion.div {...panelIn} transition={{ duration: 0.3, ease: "linear" }} className="os-label mb-5 flex gap-3">
        <span>[ unit.live ]</span>
        <span className="hidden sm:inline text-os-gray">GIWATRON OS // DISPLAY 01</span>
      </motion.div>

      <h1 className="sr-only">GIWATRON</h1>
      <motion.div {...panelIn} transition={{ duration: 0.2, delay: 0.1, ease: "linear" }}>
        <Wordmark size="xl" glitch />
      </motion.div>

      {/* The monitor */}
      <motion.div
        {...panelIn}
        transition={{ duration: 0.2, delay: 0.25, ease: "linear" }}
        className="relative mt-8 sm:mt-10"
        style={{ width: "min(540px, 86vw, 58svh)", minWidth: "min(280px, 86vw)" }}
      >
        {/* Side readouts (desktop only) */}
        <div className="hidden xl:block absolute right-full top-14 mr-10 w-[230px] space-y-2 text-[11px] tracking-[0.12em]">
          <p className="os-label mb-3">[ unit.spec ]</p>
          <Readout label="MODEL" value={HERO_UNIT.model} />
          <Readout label="OPTICS" value="RED" red />
          <Readout label="CHASSIS" value="METAL" />
          <Readout label="RENDER" value="PIXEL" />
        </div>
        <div className="hidden xl:block absolute left-full top-14 ml-10 w-[230px] space-y-2 text-[11px] tracking-[0.12em]">
          <p className="os-label mb-3">[ sys.monitor ]</p>
          <Readout label="SYSTEM" value={HERO_UNIT.system} />
          <Readout label="STATUS" value={HERO_UNIT.status} red />
          <Readout label="UPTIME" value={<Uptime active={active} />} />
          <Readout label="UNITS" value={String(ROBOT_UNITS.length).padStart(3, "0")} />
        </div>

        <div className="px-frame px-frame-thick">
          <div className="os-titlebar">
            <span>[ GIWATRON {formatUnitNumber(HERO_UNIT.number)} ]</span>
            <span className="os-titlebar-end flex items-center gap-2 text-os-red">
              <span className="os-dot" /> REC
            </span>
          </div>
          <div className="p-2 sm:p-3">
            <RobotDisplay unit={HERO_UNIT} mode="boot" active={active} priority />
          </div>
        </div>
        <div className="corner-brackets" aria-hidden="true" />
      </motion.div>

      {/* Status line */}
      <div className="mt-8 h-6 text-[13px] sm:text-[14px] tracking-[0.16em] flex items-center gap-2" aria-live="polite">
        <span className="text-os-light">{status.output}</span>
        {status.done && (
          <span className="flex items-center gap-2 text-os-red">
            ONLINE <span className="os-dot" />
          </span>
        )}
        {!status.done && statusOn && <span className="os-cursor os-cursor-red" />}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={statusOn ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.5, ease: "linear" }}
        className="mt-7 flex flex-wrap items-center justify-center gap-4"
      >
        <WhitelistButton size="lg" />
        <a href="#database" className="os-btn">
          VIEW NFT
        </a>
      </motion.div>
    </section>
  );
}
