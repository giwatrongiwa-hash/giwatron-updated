"use client";
import { useCallback } from "react";
import { getAudioEngine } from "@/lib/audio-engine";

/** Arcade sound effects. Sounds only ever play after a user gesture (see unlock). */
export function useAudio() {
  const unlock = useCallback(() => {
    getAudioEngine().unlock();
  }, []);
  return { unlock, audio: getAudioEngine() };
}
