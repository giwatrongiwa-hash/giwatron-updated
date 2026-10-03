"use client";

import { RobotDisplay } from "./RobotDisplay";
import { cn } from "@/lib/utils";
import { formatUnitNumber, type RobotUnit } from "@/lib/units";
import Link from "next/link";

function MetaRow({ label, value, red = false }: { label: string; value: string; red?: boolean }) {
  return (
    <div role="listitem" className="flex items-baseline gap-3 py-2.5 border-b border-os-line text-[12px] sm:text-[13px] tracking-[0.12em]">
      <span className="text-os-gray shrink-0">{label}</span>
      <span className="flex-1 overflow-hidden whitespace-nowrap text-os-line-2" aria-hidden="true">
        ..............................................
      </span>
      <span className={red ? "text-os-red" : "text-os-white"}>{value}</span>
    </div>
  );
}

/**
 * A unit as a classified database record. `feature` is the large layout
 * used while the database holds a single unit; `compact` is the grid card
 * used once more units are added.
 */
export function UnitRecord({
  unit,
  variant,
  onOpen,
}: {
  unit: RobotUnit;
  variant: "feature" | "compact";
  onOpen: (unit: RobotUnit) => void;
}) {
  const number = formatUnitNumber(unit.number);
  const open = () => onOpen(unit);

  const image = (
    <button
      type="button"
      onClick={open}
      className="block w-full text-left group"
      aria-label={`Open GIWATRON ${number}`}
    >
      <RobotDisplay unit={unit} mode="static" sizes={variant === "feature" ? "(max-width: 768px) 90vw, 520px" : "320px"} />
    </button>
  );

  const meta = (
    <div role="list" aria-label="Unit metadata">
      <MetaRow label="MODEL" value={unit.model} />
      <MetaRow label="STATUS" value={unit.status} red={unit.status === "ACTIVE"} />
      <MetaRow label="TYPE" value={unit.type} />
      <MetaRow label="SYSTEM" value={unit.system} />
    </div>
  );

  return (
    <article className={cn("px-frame", variant === "feature" && "px-frame-thick")}>
      <div className="os-titlebar">
        <span className="text-os-white">[ GIWATRON {number} ]</span>
        <span className="os-titlebar-end flex items-center gap-2">
          <span className={unit.status === "ACTIVE" ? "os-dot" : "os-dot os-dot-gray"} />
          <span className={unit.status === "ACTIVE" ? "text-os-red" : ""}>{unit.status}</span>
        </span>
      </div>

      {variant === "feature" ? (
        <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="p-3 sm:p-4 md:border-r-2 border-os-line">{image}</div>
          <div className="p-5 sm:p-7 flex flex-col">
            <p className="os-label mb-1">classified record</p>
            <h3 className="font-pixel text-os-white text-[28px] sm:text-[36px] leading-none mb-6">
              GIWA<span className="text-os-red">TRON</span> {number}
            </h3>
            {meta}
            <p className="mt-6 text-[12px] text-os-gray leading-relaxed">
              &gt; first unit on record. the database will expand as new units are recovered.
            </p>
            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <button type="button" onClick={open} className="os-btn os-btn-sm">
                OPEN FILE
              </button>
              <Link href="/whitelist" className="os-btn os-btn-sm os-btn-red">
                WHITELIST
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3">
          {image}
          <div className="mt-3">{meta}</div>
        </div>
      )}
    </article>
  );
}
