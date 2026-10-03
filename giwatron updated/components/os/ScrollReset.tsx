"use client";

import { useEffect } from "react";

/**
 * Coming back to the site always starts at the top.
 *
 * Browsers normally restore the previous scroll position on reload, on
 * back/forward, and when a page is restored from the back-forward cache.
 * This turns that off. A deliberate link to a section (e.g. "/#faq" from the
 * whitelist page) still scrolls to that section.
 */
export function ScrollReset() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const toTop = () => {
      // Drop a stale #section so the browser doesn't jump back to it.
      if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const returning = nav?.type === "reload" || nav?.type === "back_forward";
    if (returning || !location.hash) toTop();

    // Page restored from the back-forward cache (no new load happens).
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) toTop();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
