"use client";

import { motion } from "framer-motion";
import { WhitelistButton } from "./WhitelistButton";
import { useInView } from "@/hooks/useInView";
import { useTyped } from "@/hooks/useTyped";
import { X_HANDLE } from "@/lib/site";

const PREVIEW_TASKS = [`FOLLOW @${X_HANDLE}`, "LIKE THE LATEST POST", "REPLY TO THE LATEST POST", "QUOTE THE LATEST POST"];

/** Home-page teaser for the whitelist protocol (the protocol itself lives on /whitelist). */
export function WhitelistGate() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const typed = useTyped("./whitelist --protocol", inView, 30);

  return (
    <section id="whitelist" className="relative mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28">
      <div ref={ref} className="gate-frame">
        <div className="os-titlebar">
          <span>[ whitelist.protocol ]</span>
          <span className="os-titlebar-end flex items-center gap-2 text-os-red">
            <span className="os-dot" /> OPEN
          </span>
        </div>

        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="os-prompt text-[12px] sm:text-[13px] h-5">
              <span className="text-os-light">{typed.output}</span>
              {inView && !typed.done && <span className="os-cursor" />}
            </p>
            <h2 className="mt-4 font-pixel text-os-white text-[38px] sm:text-[58px] leading-none">
              WHITE<span className="text-os-red">LIST</span>
            </h2>
            <p className="mt-5 text-[13px] sm:text-[14px] text-os-gray-2 max-w-md leading-relaxed">
              &gt; ROBOT REGISTRATION PROTOCOL. COMPLETE 4 TASKS ON X, VERIFY, THEN REGISTER YOUR EVM ADDRESS.
            </p>
            <div className="mt-8">
              <WhitelistButton label="ENTER PROTOCOL" size="lg" />
            </div>
          </div>

          <ol className="space-y-2">
            {PREVIEW_TASKS.map((task, i) => (
              <motion.li
                key={task}
                initial={{ opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.2, ease: "linear" }}
                className="flex items-center gap-4 border-2 border-os-line bg-os-bg/70 px-4 py-3 text-[12px] sm:text-[13px] tracking-[0.12em]"
              >
                <span className="text-os-gray">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-os-light">{task}</span>
                <span className="text-os-line-2">[ ]</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
