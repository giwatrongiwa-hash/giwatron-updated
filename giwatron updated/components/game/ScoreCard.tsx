"use client";

import { X_HANDLE } from "@/lib/site";

export function captureScoreCard(game: HTMLCanvasElement, score: number): string {
  const card = document.createElement("canvas");
  card.width = 1200;
  card.height = 900;
  const ctx = card.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.strokeStyle = "#343840";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1152, 852);
  ctx.fillStyle = "#ff354f";
  ctx.fillRect(56, 64, 60, 8);
  ctx.font = "bold 58px monospace";
  ctx.fillStyle = "#f2f2f3";
  ctx.fillText("GIWATRON", 56, 150);
  ctx.font = "20px monospace";
  ctx.fillStyle = "#969aa5";
  ctx.fillText("[ ARCADE // RUN COMPLETE ]", 56, 204);
  ctx.fillText("FINAL SCORE", 56, 360);
  ctx.font = "bold 88px monospace";
  ctx.fillStyle = "#ff354f";
  ctx.fillText(String(Math.max(0, score)).padStart(6, "0"), 56, 462, 530);
  ctx.font = "24px monospace";
  ctx.fillStyle = "#f2f2f3";
  ctx.fillText("CAN YOU BEAT MY SCORE?", 56, 572);
  ctx.font = "20px monospace";
  ctx.fillStyle = "#969aa5";
  ctx.fillText(`@${X_HANDLE}  /  #GIWATRON`, 56, 790);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(game, 640, 100, 480, 640);
  ctx.strokeStyle = "#ff354f";
  ctx.strokeRect(638, 98, 484, 644);
  ctx.font = "18px monospace";
  ctx.fillText("[ GAME CAPTURE ]", 640, 790);
  return card.toDataURL("image/png");
}

export function ShareScore({ score, onShare }: { score: number; onShare?: () => void }) {
  const text = `// GIWATRON ARCADE

> score: ${score}
> next operator... YOU?

@${X_HANDLE} #giwatronArcade`;
  const href = `https://x.com/intent/tweet?${new URLSearchParams({ text })}`;

  return (
    <div className="space-y-2">
      <a href={href} onClick={onShare} target="_blank" rel="noopener noreferrer" className="os-btn os-btn-sm os-btn-red">
        SHARE SCORE ON X
      </a>
      <p className="text-os-gray text-[11px]">Share your score on X. No wallet needed.</p>
    </div>
  );
}

export function ScoreCard({ image, score }: { image: string; score: number }) {
  return (
    <div className="mt-4 border-2 border-os-line p-3 space-y-3">
      <p className="text-os-light text-[12px] tracking-[0.12em]">[ YOUR SCORE CARD ]</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`GIWATRON arcade screenshot with a final score of ${score}`} width={1200} height={900} className="w-full h-auto" />
    </div>
  );
}
