import type { Metadata } from "next";
import { SiteChrome } from "@/components/os/SiteChrome";
import { WhitelistProtocol } from "@/components/whitelist/WhitelistProtocol";

export const metadata: Metadata = {
  title: "WHITELIST — GIWATRON",
  description: "GIWATRON robot registration protocol. Complete the tasks on X, verify and register your EVM address.",
};

export default function WhitelistPage() {
  return (
    <SiteChrome>
      <main id="top">
        <WhitelistProtocol />
      </main>
    </SiteChrome>
  );
}
