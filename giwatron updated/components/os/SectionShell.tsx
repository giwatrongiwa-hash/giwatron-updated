"use client";

import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { useTyped } from "@/hooks/useTyped";
import { NAV_SECTIONS, type SectionId } from "@/lib/site";

/**
 * Every section opens like a terminal command being typed:
 *   $ cat /sys/giwatron.log
 *   SYSTEM                                   [ 01 / 05 ]
 * then its content fades in.
 */
export function SectionShell({
  id,
  command,
  title,
  children,
}: {
  id: SectionId;
  command: string;
  title: string;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const typed = useTyped(command, inView, 26);
  const index = NAV_SECTIONS.findIndex((s) => s.id === id) + 1;

  return (
    <section id={id} className="relative mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
      <div ref={ref}>
        <p className="os-prompt text-[12px] sm:text-[13px] h-5">
          <span className="text-os-light">{typed.output}</span>
          {inView && !typed.done && <span className="os-cursor" />}
        </p>
        <div className="mt-4 mb-10 sm:mb-14 flex items-end justify-between gap-4 border-b-2 border-os-line pb-4">
          <h2 className="font-pixel text-os-white text-[30px] sm:text-[44px] leading-none uppercase">{title}</h2>
          <span className="os-label shrink-0">
            [ {String(index).padStart(2, "0")} / {String(NAV_SECTIONS.length).padStart(2, "0")} ]
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.35, delay: 0.25, ease: "linear" }}
      >
        {children}
      </motion.div>
    </section>
  );
}
