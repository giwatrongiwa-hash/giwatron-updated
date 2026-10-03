"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { BootScreen } from "./BootScreen";
import { SiteChrome } from "./SiteChrome";
import { Hero } from "./Hero";
import { SystemLog } from "./SystemLog";
import { UnitDatabase } from "./UnitDatabase";
import { WhitelistGate } from "./WhitelistGate";
import { Faq } from "./Faq";
import { ArcadeGame } from "@/components/game/ArcadeGame";

/**
 * Home page root. Flow: boot -> hero -> system -> database -> whitelist gate
 * (links to /whitelist) -> arcade -> faq. No access gate of any kind.
 */
export function GiwatronOS() {
  const [booted, setBooted] = useState(false);
  const onBooted = useCallback(() => setBooted(true), []);

  return (
    <>
      {/* Without JS the boot overlay could never be dismissed — hide it. */}
      <noscript>
        <style>{".boot-screen{display:none!important}"}</style>
      </noscript>

      <AnimatePresence>{!booted && <BootScreen key="boot" onDone={onBooted} />}</AnimatePresence>

      <SiteChrome>
        <main>
          <Hero active={booted} />
          <SystemLog />
          <UnitDatabase />
          <WhitelistGate />
          <ArcadeGame />
          <Faq />
        </main>
      </SiteChrome>
    </>
  );
}
