"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { formatUnitNumber, type RobotUnit } from "@/lib/units";

const noopSubscribe = () => () => {};

/**
 * Full-screen "open file" view of a unit. Portaled to <body> so no
 * ancestor's transform/filter can trap its fixed positioning.
 */
export function UnitViewer({ unit, onClose }: { unit: RobotUnit | null; onClose: () => void }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!unit) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [unit, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {unit && (
        <motion.div
          key="viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "linear" }}
          className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`GIWATRON ${formatUnitNumber(unit.number)}`}
        >
          <div className="px-frame w-full max-w-[min(88vmin,760px)]" onClick={(e) => e.stopPropagation()}>
            <div className="os-titlebar">
              <span>[ {unit.model.toLowerCase()}.img ]</span>
              <button type="button" onClick={onClose} className="os-titlebar-end os-toggle !p-0 text-os-white">
                [ESC] CLOSE
              </button>
            </div>
            <div className="relative aspect-square robot-screen">
              <Image src={unit.image} alt={`GIWATRON ${formatUnitNumber(unit.number)}`} fill unoptimized sizes="88vmin" />
            </div>
            <div className="px-3 py-2 flex justify-between text-[11px] tracking-[0.14em] text-os-gray">
              <span>GIWATRON {formatUnitNumber(unit.number)}</span>
              <span>
                {unit.size}×{unit.size}PX
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
