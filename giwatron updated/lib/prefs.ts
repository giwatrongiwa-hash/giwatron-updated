"use client";
/**
 * Tiny persisted client store: remembers the visitor's own last-entered
 * public EVM address (prefills the arcade score form). Nothing sensitive.
 *
 * useSyncExternalStore keeps server render and first client render
 * identical (no hydration mismatch). localStorage access is wrapped because
 * it can throw (private mode, disabled storage).
 */
import { useCallback, useSyncExternalStore } from "react";

export type Prefs = { operatorAddress: string };

const STORAGE_KEY = "giwatron_os_prefs";
const DEFAULT_PREFS: Prefs = { operatorAddress: "" };

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function readPrefs(): Prefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = { operatorAddress: typeof parsed?.operatorAddress === "string" ? parsed.operatorAddress.slice(0, 64) : "" };
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache;
}

function writePrefs(next: Prefs) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — keep the in-memory value for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    writePrefs({ ...readPrefs(), [key]: value });
  }, []);
  return { prefs, setPref };
}
