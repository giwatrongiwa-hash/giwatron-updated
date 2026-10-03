/**
 * GIWATRON ARCADE — a small, dependency-free canvas game engine.
 *
 * Design goals:
 *  - Pure client-side rendering (canvas 2D, no sprite sheet assets required —
 *    everything is drawn with rectangles/shapes in the retro palette so the
 *    game works even before you drop in custom pixel art).
 *  - Deterministic scoring (integer points per destroyed data cube) so the
 *    server-side anti-cheat rate check in lib/game-session.ts stays meaningful.
 *  - No dependency on the DOM beyond a single <canvas>; safe to unit test the
 *    class in isolation.
 */

export type GameEngineCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
};

type Vec = { x: number; y: number };

type Cube = Vec & { id: number; vy: number; kind: "data" | "bomb"; size: number; hue: number };
type Bolt = Vec & { id: number; vy: number };
type Particle = Vec & { id: number; vx: number; vy: number; life: number; color: string };

const WIDTH = 480;
const HEIGHT = 640;
const PLAYER_Y = HEIGHT - 48;
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 20;

let idCounter = 1;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  private raf = 0;
  private running = false;

  private playerX = WIDTH / 2;
  private moveLeft = false;
  private moveRight = false;

  private cubes: Cube[] = [];
  private bolts: Bolt[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private lives = 3;
  private elapsed = 0;
  private spawnTimer = 0;
  private fireCooldown = 0;
  private lastTs = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.callbacks = callbacks;
  }

  setMoveLeft(v: boolean) {
    this.moveLeft = v;
  }
  setMoveRight(v: boolean) {
    this.moveRight = v;
  }
  setPlayerX(x: number) {
    this.playerX = Math.max(PLAYER_WIDTH / 2, Math.min(WIDTH - PLAYER_WIDTH / 2, x));
  }
  fire() {
    if (this.fireCooldown > 0 || !this.running) return;
    this.fireCooldown = 0.18;
    this.bolts.push({ id: idCounter++, x: this.playerX, y: PLAYER_Y, vy: -420 });
  }

  start() {
    this.running = true;
    this.score = 0;
    this.lives = 3;
    this.elapsed = 0;
    this.cubes = [];
    this.bolts = [];
    this.particles = [];
    this.callbacks.onScoreChange(0);
    this.callbacks.onLivesChange(3);
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  /** Paint a single frame without starting the loop (idle screen backdrop). */
  drawFrame() {
    this.render();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = (ts: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private difficulty() {
    // Ramps up gradually; caps out so late-game stays fair/predictable.
    return Math.min(1 + this.elapsed / 25, 3.2);
  }

  private update(dt: number) {
    this.elapsed += dt;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    const speed = 320 * dt;
    if (this.moveLeft) this.setPlayerX(this.playerX - speed);
    if (this.moveRight) this.setPlayerX(this.playerX + speed);

    // Spawn cubes.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const diff = this.difficulty();
      this.spawnTimer = Math.max(0.35, 1.1 / diff);
      const isBomb = Math.random() < 0.22;
      this.cubes.push({
        id: idCounter++,
        x: 24 + Math.random() * (WIDTH - 48),
        y: -20,
        vy: (60 + Math.random() * 40) * diff,
        kind: isBomb ? "bomb" : "data",
        size: isBomb ? 22 : 20,
        hue: isBomb ? 0 : 280,
      });
    }

    // Move bolts.
    this.bolts = this.bolts.filter((b) => b.y > -20);
    this.bolts.forEach((b) => (b.y += b.vy * dt));

    // Move cubes + check ground collision.
    const survivors: Cube[] = [];
    for (const c of this.cubes) {
      c.y += c.vy * dt;
      if (c.y > HEIGHT + 30) {
        if (c.kind === "data") {
          this.loseLife();
        }
        continue;
      }
      survivors.push(c);
    }
    this.cubes = survivors;

    // Bolt vs cube collisions.
    const remainingCubes: Cube[] = [];
    for (const c of this.cubes) {
      let hit = false;
      for (const b of this.bolts) {
        const dx = b.x - c.x;
        const dy = b.y - c.y;
        if (Math.abs(dx) < c.size && Math.abs(dy) < c.size) {
          hit = true;
          b.y = -999; // mark bolt consumed
          if (c.kind === "data") {
            this.score += 10;
            this.spawnParticles(c.x, c.y, "#d9dde3");
          } else {
            this.score = Math.max(0, this.score - 5);
            this.spawnParticles(c.x, c.y, "#e8202a");
          }
          this.callbacks.onScoreChange(this.score);
          break;
        }
      }
      if (!hit) remainingCubes.push(c);
    }
    this.cubes = remainingCubes;
    this.bolts = this.bolts.filter((b) => b.y > -900);

    // Player vs falling cube (direct hit).
    for (const c of this.cubes) {
      if (Math.abs(c.y - PLAYER_Y) < 18 && Math.abs(c.x - this.playerX) < PLAYER_WIDTH / 2 + c.size / 2) {
        if (c.kind === "bomb") {
          this.loseLife();
          this.spawnParticles(c.x, c.y, "#e8202a");
          c.y = HEIGHT + 999;
        }
      }
    }
    this.cubes = this.cubes.filter((c) => c.y < HEIGHT + 900);

    // Particles.
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private spawnParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        id: idCounter++,
        x,
        y,
        vx: Math.cos(angle) * 90,
        vy: Math.sin(angle) * 90,
        life: 0.4,
        color,
      });
    }
  }

  private loseLife() {
    this.lives -= 1;
    this.callbacks.onLivesChange(this.lives);
    if (this.lives <= 0) {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.callbacks.onGameOver(this.score);
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Starfield grid (retro).
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    // Cubes.
    for (const c of this.cubes) {
      ctx.fillStyle = c.kind === "data" ? "#b7bcc4" : "#e8202a";
      ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
    }

    // Bolts.
    ctx.fillStyle = "#d9dde3";
    for (const b of this.bolts) {
      ctx.fillRect(b.x - 2, b.y - 10, 4, 14);
    }

    // Particles.
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 0.4);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    }

    // Player cannon.
    ctx.fillStyle = "#8a9099";
    ctx.fillRect(this.playerX - PLAYER_WIDTH / 2, PLAYER_Y - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.playerX - PLAYER_WIDTH / 2, PLAYER_Y - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.fillStyle = "#000";
    ctx.fillRect(this.playerX - 4, PLAYER_Y - PLAYER_HEIGHT / 2 - 10, 8, 10);
  }
}

export const GAME_DIMENSIONS = { width: WIDTH, height: HEIGHT };
