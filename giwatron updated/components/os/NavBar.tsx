"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "./Wordmark";
import { NAV_SECTIONS, X_URL, type SectionId } from "@/lib/site";

/** Highlights the nav entry for whichever home section owns the middle of the viewport. */
function useActiveSection(enabled: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [enabled]);

  return enabled ? active : null;
}

export function NavBar() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onWhitelist = pathname === "/whitelist";
  const active = useActiveSection(onHome);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-os-bg/95 border-b-2 border-os-line">
      <div className="mx-auto max-w-6xl h-14 px-5 sm:px-8 flex items-center justify-between gap-6">
        <Link href="/" onClick={close} className="flex items-center gap-2" aria-label="GIWATRON home">
          <Wordmark size="sm" />
          <span className="os-cursor os-cursor-red text-[13px] hidden sm:inline-block" aria-hidden="true" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Sections">
          {NAV_SECTIONS.map((s) => (
            <a key={s.id} href={`/#${s.id}`} className="os-navlink" data-active={active === s.id}>
              {s.label}
            </a>
          ))}
          <Link href="/whitelist" className="os-navlink os-navlink-red" data-active={onWhitelist}>
            whitelist
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="os-toggle" aria-label="@GIWATRON on X">
            [X]
          </a>
          <button
            type="button"
            className="lg:hidden os-toggle text-os-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? ">close" : ">menu"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Sections"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "linear" }}
            className="lg:hidden border-t-2 border-os-line bg-os-bg px-5 py-3 flex flex-col"
          >
            {NAV_SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`/#${s.id}`}
                onClick={close}
                className="py-3 flex items-center gap-3 border-b border-os-line text-[14px] tracking-[0.1em]"
              >
                <span className="text-os-gray text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                <span className={active === s.id ? "text-os-red" : "text-os-gray"}>&gt;</span>
                <span className={active === s.id ? "text-os-white" : "text-os-light"}>{s.label}</span>
              </a>
            ))}
            <Link href="/whitelist" onClick={close} className="py-3 flex items-center gap-3 text-[14px] tracking-[0.1em]">
              <span className="text-os-gray text-[11px]">{String(NAV_SECTIONS.length + 1).padStart(2, "0")}</span>
              <span className="text-os-red">&gt;</span>
              <span className="text-os-white">whitelist</span>
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
