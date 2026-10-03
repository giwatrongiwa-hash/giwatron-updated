"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionShell } from "./SectionShell";
import { useTyped } from "@/hooks/useTyped";
import { X_HANDLE, X_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

// Only facts that are true today. Unknowns are stated as unknowns.
const QUERIES: Array<{ q: string; a: string; link?: { href: string; label: string; external?: boolean } }> = [
  {
    q: "WHAT IS GIWATRON",
    a: "A pixel-art robot NFT collection. Every unit is a front-facing portrait built from hard square pixels.",
  },
  {
    q: "HOW MANY UNITS EXIST",
    a: "One. GIWATRON #001 is the first and currently the only unit on record. New units appear in the database as they are revealed.",
    link: { href: "/#database", label: "OPEN DATABASE" },
  },
  {
    q: "HOW DO I JOIN THE WHITELIST",
    a: `Open the whitelist protocol, complete the 3 tasks on X (follow @${X_HANDLE}, like the tweet, then reply to and quote it), verify, then register your X handle and EVM address. One entry per address and per X account.`,
    link: { href: "/whitelist", label: "ENTER PROTOCOL" },
  },
  {
    q: "WHEN IS THE MINT. WHAT DOES IT COST",
    a: `Not announced yet. Details will be posted on @${X_HANDLE} first.`,
    link: { href: X_URL, label: `@${X_HANDLE}`, external: true },
  },
  {
    q: "DO I NEED TO CONNECT A WALLET",
    a: "No. The site never asks for a signature or a wallet connection. It only stores the public address you type in.",
  },
  {
    q: "WHAT IS THE ARCADE",
    a: "A small game built into the system. Scores are verified server-side and linked to the address you submit. It is just for fun and has no connection to the mint.",
  },
];

function Response({ index }: { index: number }) {
  const entry = QUERIES[index];
  const typed = useTyped(entry.a, true, 12);

  return (
    <div className="p-5 sm:p-7 min-h-[240px] flex flex-col">
      <p className="text-[12px] tracking-[0.12em] text-os-gray">
        <span className="text-os-red">$</span> query --id {String(index + 1).padStart(2, "0")}
      </p>
      <p className="mt-2 text-[13px] tracking-[0.14em] text-os-white">&gt; {entry.q}</p>
      <p className="mt-5 text-[14px] sm:text-[15px] leading-relaxed text-os-light" aria-live="polite">
        {typed.output}
        {!typed.done && <span className="os-cursor os-cursor-red" />}
      </p>
      {typed.done && entry.link && (
        <div className="mt-6">
          {entry.link.external ? (
            <a href={entry.link.href} target="_blank" rel="noopener noreferrer" className="os-btn os-btn-sm">
              {entry.link.label}
            </a>
          ) : (
            <Link href={entry.link.href} className="os-btn os-btn-sm os-btn-red">
              {entry.link.label}
            </Link>
          )}
        </div>
      )}
      <p className="mt-auto pt-6 text-[11px] tracking-[0.16em] text-os-gray">RESULT: 1 RECORD // {typed.done ? "COMPLETE" : "STREAMING"}</p>
    </div>
  );
}

/**
 * FAQ as a query console: pick a query on the left, the answer streams into
 * the response screen on the right. All answers are also rendered (visually
 * hidden) for search engines and screen readers.
 */
export function Faq() {
  const [selected, setSelected] = useState(0);

  return (
    <SectionShell id="faq" command="query --list /faq" title="FAQ">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-start">
        <div className="px-frame">
          <div className="os-titlebar">
            <span>[ queries ]</span>
            <span className="os-titlebar-end">{String(QUERIES.length).padStart(2, "0")} FOUND</span>
          </div>
          <ul className="p-2" role="listbox" aria-label="Questions">
            {QUERIES.map((entry, i) => (
              <li key={entry.q}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === i}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "faq-query w-full text-left flex items-center gap-3 px-3 py-3 text-[12px] sm:text-[13px] tracking-[0.12em]",
                    selected === i ? "is-selected" : ""
                  )}
                >
                  <span className="text-os-gray">Q.{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{entry.q}</span>
                  <span className="faq-query-arrow" aria-hidden="true">
                    &gt;
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-frame px-frame-red lg:sticky lg:top-24">
          <div className="os-titlebar">
            <span>[ response ]</span>
            <span className="os-titlebar-end flex items-center gap-2 text-os-red">
              <span className="os-dot" /> LIVE
            </span>
          </div>
          <Response key={selected} index={selected} />
        </div>
      </div>

      <div className="sr-only">
        {QUERIES.map((entry) => (
          <p key={entry.q}>
            {entry.q}: {entry.a}
          </p>
        ))}
      </div>
    </SectionShell>
  );
}
