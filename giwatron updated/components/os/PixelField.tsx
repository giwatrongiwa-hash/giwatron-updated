"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient background: the page behaves like a dim LED pixel matrix.
 *  - random pixels flicker on and fade out (mostly gray, a few red)
 *  - "data packets" travel along rows leaving a fading trail
 *  - a slow vertical scan sweeps across and wakes pixels in its column
 *  - pixels light up around the pointer
 *
 * Performance: only lit cells are drawn (never the full grid), capped at
 * ~30fps, device-pixel-ratio limited, paused while the tab is hidden, and
 * fully static for prefers-reduced-motion. The dot grid itself is CSS.
 */

const CELL = 12; // grid pitch (px)
const DOT = 4; // lit pixel size (px)
const FRAME_MS = 1000 / 30;

type Spark = { cx: number; cy: number; life: number; max: number; red: boolean; peak: number };
type Packet = { cy: number; x: number; speed: number; dir: 1 | -1; red: boolean; trail: number };

export function PixelField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    const sparks: Spark[] = [];
    const packets: Packet[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let sweepX = -200;
    let sweepCooldown = 3000;
    let last = 0;
    let acc = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
    };

    const spark = (cx: number, cy: number, peak: number, red = false, max = 900 + Math.random() * 1600) => {
      if (sparks.length > 900) return;
      sparks.push({ cx, cy, life: max, max, red, peak });
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const step = (dt: number) => {
      // Ambient flicker, scaled to screen area.
      const perFrame = (cols * rows) / 2600;
      for (let i = 0; i < perFrame; i++) {
        if (Math.random() < 0.55) {
          spark(
            Math.floor(Math.random() * cols),
            Math.floor(Math.random() * rows),
            0.12 + Math.random() * 0.22,
            Math.random() < 0.08
          );
        }
      }

      // Data packets travelling along rows.
      if (packets.length < 5 && Math.random() < 0.02) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        packets.push({
          cy: Math.floor(Math.random() * rows),
          x: dir === 1 ? -2 : cols + 2,
          speed: 12 + Math.random() * 22,
          dir,
          red: Math.random() < 0.3,
          trail: 0,
        });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        const prev = Math.floor(p.x);
        p.x += p.dir * p.speed * (dt / 1000);
        const cur = Math.floor(p.x);
        if (cur !== prev) spark(cur, p.cy, p.red ? 0.75 : 0.5, p.red, 700);
        if (p.x < -4 || p.x > cols + 4) packets.splice(i, 1);
      }

      // Vertical scan sweep every so often.
      sweepCooldown -= dt;
      if (sweepCooldown <= 0 && sweepX < -100) {
        sweepX = 0;
        sweepCooldown = 14000 + Math.random() * 8000;
      }
      if (sweepX >= 0) {
        const prevCol = Math.floor(sweepX / CELL);
        sweepX += (dt / 1000) * 220;
        const col = Math.floor(sweepX / CELL);
        if (col !== prevCol) {
          for (let r = 0; r < rows; r++) if (Math.random() < 0.18) spark(col, r, 0.2 + Math.random() * 0.3, Math.random() < 0.05, 1200);
        }
        if (sweepX > width + 40) sweepX = -200;
      }

      // Pointer halo.
      if (pointer.active) {
        const pc = Math.floor(pointer.x / CELL);
        const pr = Math.floor(pointer.y / CELL);
        for (let i = 0; i < 3; i++) {
          const ox = Math.round((Math.random() - 0.5) * 10);
          const oy = Math.round((Math.random() - 0.5) * 10);
          const d = Math.hypot(ox, oy);
          if (d <= 5) spark(pc + ox, pr + oy, 0.55 - d * 0.08, Math.random() < 0.25, 600 + Math.random() * 500);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].life -= dt;
        if (sparks[i].life <= 0) sparks.splice(i, 1);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const off = (CELL - DOT) / 2;
      for (const s of sparks) {
        const t = s.life / s.max;
        // quick attack, slow stepped decay (quantized to feel "digital")
        const a = Math.round(s.peak * (t > 0.85 ? (1 - t) / 0.15 : t / 0.85) * 8) / 8;
        if (a <= 0) continue;
        ctx.fillStyle = s.red ? `rgba(232,32,42,${a})` : `rgba(210,215,222,${a})`;
        ctx.fillRect(s.cx * CELL + off, s.cy * CELL + off, DOT, DOT);
      }
    };

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = ts;
      const dt = Math.min(100, ts - last);
      last = ts;
      acc += dt;
      if (acc < FRAME_MS) return;
      step(acc);
      acc = 0;
      draw();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pixel-field">
      <canvas ref={canvasRef} />
    </div>
  );
}
