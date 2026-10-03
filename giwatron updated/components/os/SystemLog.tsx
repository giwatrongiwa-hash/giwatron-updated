"use client";

import { motion } from "framer-motion";
import { SectionShell } from "./SectionShell";
import { useInView } from "@/hooks/useInView";
import { ROBOT_UNITS } from "@/lib/units";

const HERO_UNIT = ROBOT_UNITS[0];

// Atmosphere, not claims: no supply, dates, chain or numbers beyond what exists.
const LOG_LINES: Array<{ text: string; level?: "warn" }> = [
  { text: "signal detected on an unlisted channel." },
  { text: `unit recovered: ${HERO_UNIT.model}.` },
  { text: "chassis: forged metal. palette: grayscale." },
  { text: "optics: red. state: awake." },
  { text: "rendered in hard pixels. no curves. no gradients." },
  { text: `robot database mounted. units on record: ${ROBOT_UNITS.length}.` },
  { text: "database is expandable. listening for new signals.", level: "warn" },
];

/** Zoomed crop of the unit's optics, straight from the artwork (x4, pixelated). */
function OpticsZoom() {
  const eye = HERO_UNIT.optics?.[0] ?? { x: 0.5, y: 0.4 };
  const midX = HERO_UNIT.optics && HERO_UNIT.optics.length > 1 ? (HERO_UNIT.optics[0].x + HERO_UNIT.optics[1].x) / 2 : eye.x;
  const ZOOM = 4;
  // background-position that puts point p of the (square) artwork at the
  // center of a 4:3 box. `ratio` = box height / box width.
  const posX = (p: number) => `${((p * ZOOM - 0.5) / (ZOOM - 1)) * 100}%`;
  const posY = (p: number, ratio = 0.75) => `${((p * ZOOM - ratio / 2) / (ZOOM - ratio)) * 100}%`;

  return (
    <div className="px-frame">
      <div className="os-titlebar">
        <span>[ optics.zoom x{ZOOM} ]</span>
        <span className="os-titlebar-end text-os-red">LOCK</span>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0d1015]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_UNIT.image})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${posX(midX)} ${posY(eye.y)}`,
            imageRendering: "pixelated",
          }}
        />
        {/* crosshair */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-os-red/40" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-os-red/40" />
        <div className="absolute left-1/2 top-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 border-2 border-os-red/70" />
      </div>
      <div className="px-3 py-2 text-[11px] tracking-[0.14em] text-os-gray flex justify-between">
        <span>TARGET: {HERO_UNIT.model}</span>
        <span className="text-os-red">RED</span>
      </div>
    </div>
  );
}

export function SystemLog() {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <SectionShell id="system" command="cat /sys/giwatron.log" title="System">
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="px-frame" ref={ref}>
          <div className="os-titlebar">
            <span>[ giwatron.log ]</span>
            <span className="os-titlebar-end">READ-ONLY</span>
          </div>
          <ol className="p-5 sm:p-7 space-y-3 text-[13px] sm:text-[14px]">
            {LOG_LINES.map((line, i) => (
              <motion.li
                key={line.text}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{ delay: 0.35 + i * 0.28, duration: 0.01 }}
                className="flex gap-4"
              >
                <span className="text-os-gray shrink-0">[00:{String(i).padStart(2, "0")}]</span>
                <span className={line.level === "warn" ? "text-os-red" : "text-os-light"}>
                  {line.level === "warn" && "WARN "}
                  {line.text}
                </span>
              </motion.li>
            ))}
            <motion.li
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : undefined}
              transition={{ delay: 0.35 + LOG_LINES.length * 0.28, duration: 0.01 }}
              className="flex gap-4 text-os-gray"
            >
              <span>$</span>
              <span className="os-cursor os-cursor-red" />
            </motion.li>
          </ol>
        </div>

        <OpticsZoom />
      </div>
    </SectionShell>
  );
}
