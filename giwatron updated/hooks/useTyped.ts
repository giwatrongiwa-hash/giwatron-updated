"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Terminal-style typing: reveals `text` one character at a time once
 * `active` is true. With prefers-reduced-motion the full text is shown
 * immediately.
 */
export function useTyped(text: string, active: boolean, speedMs = 32) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || reduceMotion) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, active, speedMs, reduceMotion]);

  if (reduceMotion) return { output: active ? text : "", done: active };
  return { output: text.slice(0, count), done: count >= text.length };
}
