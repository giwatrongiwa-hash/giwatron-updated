"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameEngine, GAME_DIMENSIONS } from "@/lib/game-engine";
import { SectionShell } from "@/components/os/SectionShell";
import { useAudio } from "@/hooks/useAudio";
import { usePrefs } from "@/lib/prefs";
import { isValidWalletFormat } from "@/lib/utils";
import { captureScoreCard, ScoreCard, ShareScore } from "@/components/game/ScoreCard";

type Phase = "idle" | "starting" | "playing" | "over" | "submitting" | "submitted" | "error";

const pad = (n: number, len = 6) => String(Math.max(0, n)).padStart(len, "0");

export function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const tokenRef = useRef<string | null>(null);

  const { audio, unlock } = useAudio();
  const { prefs, setPref } = usePrefs();

  const [scoreImage, setScoreImage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [finalScore, setFinalScore] = useState(0);
  const [hasOpenedShare, setHasOpenedShare] = useState(false);
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<{ bestScore: number; runs: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initEngine = useCallback(() => {
    if (!canvasRef.current || engineRef.current) return;
    engineRef.current = new GameEngine(canvasRef.current, {
      onScoreChange: setScore,
      onLivesChange: setLives,
      onGameOver: (fs) => {
        if (canvasRef.current) {
          try {
            setScoreImage(captureScoreCard(canvasRef.current, fs));
          } catch {
            setScoreImage(null);
          }
        }
        setFinalScore(fs);
        setPhase("over");
        audio.playGameOver();
      },
    });
    engineRef.current.drawFrame();
  }, [audio]);

  useEffect(() => {
    initEngine();
    return () => engineRef.current?.stop();
  }, [initEngine]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing" || !engineRef.current) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || k === "a") engineRef.current.setMoveLeft(true);
      if (e.key === "ArrowRight" || k === "d") engineRef.current.setMoveRight(true);
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        engineRef.current.fire();
        audio.playLaser();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || k === "a") engineRef.current.setMoveLeft(false);
      if (e.key === "ArrowRight" || k === "d") engineRef.current.setMoveRight(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, audio]);

  const startRun = async () => {
    setHasOpenedShare(false);
    unlock();
    audio.playClick();
    setScoreImage(null);
    setPhase("starting");
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "START FAILED");
      tokenRef.current = data.token;
      setPhase("playing");
      engineRef.current?.start();
    } catch {
      audio.playError();
      setErrorMsg("CONNECTION FAILED");
      setPhase("error");
    }
  };

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasOpenedShare) return;
    unlock();
    // Empty field falls back to the address registered on the whitelist (shown as placeholder).
    const wallet = address.trim() || prefs.operatorAddress;
    if (!tokenRef.current) return;
    if (!isValidWalletFormat(wallet)) {
      audio.playError();
      setErrorMsg("INVALID ADDRESS — 0x + 40 HEX");
      return;
    }
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/game/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, score: finalScore, wallet }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "SCORE REJECTED");
      setPref("operatorAddress", wallet);
      setResult({ bestScore: data.bestScore, runs: data.runs });
      audio.playCoin();
      tokenRef.current = null;
      setPhase("submitted");
    } catch (err) {
      audio.playError();
      setErrorMsg(err instanceof Error ? err.message : "SCORE REJECTED");
      setPhase("error");
    }
  };

  const touchHold = (dir: "left" | "right", down: boolean) => {
    if (!engineRef.current) return;
    if (dir === "left") engineRef.current.setMoveLeft(down);
    else engineRef.current.setMoveRight(down);
  };

  return (
    <SectionShell id="arcade" command="./arcade --run" title="Arcade">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
        <div className="px-frame mx-auto w-full" style={{ maxWidth: GAME_DIMENSIONS.width + 24 }}>
          <div className="os-titlebar">
            <span>[ arcade.exe ]</span>
            <span className="os-titlebar-end flex gap-4">
              <span>
                SCORE <span className="text-os-white">{pad(score)}</span>
              </span>
              <span className="text-os-red" aria-label={`${lives} lives`}>
                {"■".repeat(Math.max(0, lives))}
                <span className="text-os-line-2">{"■".repeat(Math.max(0, 3 - lives))}</span>
              </span>
            </span>
          </div>

          <div className="p-3">
            <div
              className="relative mx-auto"
              style={{ aspectRatio: `${GAME_DIMENSIONS.width}/${GAME_DIMENSIONS.height}` }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full block border-2 border-os-line"
                style={{ imageRendering: "pixelated" }}
              />

              <AnimatePresence>
                {phase !== "playing" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: "linear" }}
                    className="absolute inset-0 bg-os-bg/90 flex flex-col items-center justify-center overflow-y-auto text-center px-4 py-3 gap-3"
                  >
                    {phase === "idle" && (
                      <>
                        <p className="font-pixel text-os-white text-[22px]">INSERT COIN</p>
                        <p className="text-os-gray text-[12px] leading-relaxed max-w-[300px]">
                          shoot the gray data cubes before they hit the floor. leave the red ones alone.
                        </p>
                        <button type="button" onClick={startRun} className="os-btn os-btn-red">
                          START GAME
                        </button>
                      </>
                    )}

                    {phase === "starting" && (
                      <p className="text-os-light tracking-[0.16em] text-[13px]">
                        LOADING<span className="os-cursor os-cursor-red" />
                      </p>
                    )}

                    {phase === "over" && (
                      <>
                        <p className="font-pixel text-os-red text-[26px]">GAME OVER</p>
                        <p className="text-os-light tracking-[0.16em] text-[13px]">
                          FINAL SCORE <span className="text-os-white">{pad(finalScore)}</span>
                        </p>
                        <ShareScore score={finalScore} onShare={() => setHasOpenedShare(true)} />
                        <form onSubmit={submitScore} className="w-full max-w-[320px] space-y-3">
                          <p id="score-share-status" role="status" className="text-os-gray text-[11px]">
                            {hasOpenedShare ? "Wallet unlocked. Save your score below." : "Click SHARE SCORE ON X to unlock wallet entry."}
                          </p>
                          <label className="flex items-center gap-2 border-2 border-os-line-2 bg-os-bg px-3 py-2 focus-within:border-os-red">
                            <span className="text-os-red">$</span>
                            <span className="sr-only">EVM address</span>
                            <input
                              className="os-input !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={!hasOpenedShare}
                              aria-describedby="score-share-status"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder={prefs.operatorAddress || "0x… your EVM address"}
                              autoComplete="off"
                              spellCheck={false}
                              maxLength={64}
                            />
                          </label>
                          {errorMsg && <p className="text-os-red text-[11px] tracking-[0.1em]">{errorMsg}</p>}
                          <div className="flex flex-wrap justify-center gap-2">
                            <button type="submit" disabled={!hasOpenedShare} className="os-btn os-btn-sm os-btn-red">
                              SUBMIT WALLET
                            </button>
                            <button type="button" onClick={startRun} className="os-btn os-btn-sm">
                              PLAY AGAIN
                            </button>
                          </div>
                        </form>
                      </>
                    )}

                    {phase === "submitting" && (
                      <p className="text-os-light tracking-[0.16em] text-[13px]">
                        VERIFYING SCORE<span className="os-cursor os-cursor-red" />
                      </p>
                    )}

                    {phase === "submitted" && result && (
                      <>
                        <p className="font-pixel text-os-white text-[22px]">SCORE VERIFIED</p>
                        <div className="text-[12px] tracking-[0.14em] space-y-1 text-os-light">
                          <p>
                            BEST <span className="text-os-white">{pad(result.bestScore)}</span>
                          </p>
                          <p>
                            RUNS <span className="text-os-white">{pad(result.runs, 3)}</span>
                          </p>
                        </div>
                        <ShareScore score={finalScore} />
                        <button type="button" onClick={startRun} className="os-btn os-btn-red">
                          PLAY AGAIN
                        </button>
                      </>
                    )}

                    {phase === "error" && (
                      <>
                        <p className="text-os-red tracking-[0.16em] text-[13px]">ERR {errorMsg}</p>
                        <button type="button" onClick={startRun} className="os-btn">
                          RETRY
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {scoreImage && <ScoreCard key={scoreImage} image={scoreImage} score={finalScore} />}

            {/* Touch controls */}
            <div className="grid grid-cols-3 gap-2 mt-3 sm:hidden">
              <button
                type="button"
                onTouchStart={() => touchHold("left", true)}
                onTouchEnd={() => touchHold("left", false)}
                className="os-btn !px-0"
                aria-label="Move left"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.fire();
                  audio.playLaser();
                }}
                className="os-btn os-btn-red !px-0"
              >
                FIRE
              </button>
              <button
                type="button"
                onTouchStart={() => touchHold("right", true)}
                onTouchEnd={() => touchHold("right", false)}
                className="os-btn !px-0"
                aria-label="Move right"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <aside className="px-frame hidden lg:block">
          <div className="os-titlebar">
            <span>[ controls.txt ]</span>
          </div>
          <dl className="p-5 space-y-3 text-[12px] tracking-[0.1em]">
            {[
              ["MOVE", "A / D  ◀ ▶"],
              ["FIRE", "SPACE  ▲"],
              ["GRAY CUBE", "+10"],
              ["RED CUBE", "-5 / -1 LIFE"],
              ["MISSED CUBE", "-1 LIFE"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-os-line pb-2">
                <dt className="text-os-gray">{k}</dt>
                <dd className="text-os-white">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="px-5 pb-5 text-[11px] text-os-gray leading-relaxed">
            scores are verified server-side against the run&apos;s signed timer.
          </p>
        </aside>
      </div>
    </SectionShell>
  );
}
