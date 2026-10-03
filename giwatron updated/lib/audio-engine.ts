/**
 * Zero-dependency 8-bit synthesizer built on the Web Audio API.
 * No external audio files — every sound is generated procedurally, so
 * there's nothing to fetch, license, or ship as binary assets.
 *
 * Usage:
 *   const audio = getAudioEngine();
 *   audio.unlock();       // call from a user gesture (click/keydown) once
 *   audio.playKeystroke();
 *   audio.playCoin();
 *   audio.playLaser();
 *   audio.playAccessGranted();
 *   audio.playGameOver();
 *   audio.playBoot();
 */

type OscType = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  // Remembered even before the AudioContext exists, so a "muted" preference
  // loaded at startup still applies once the first sound is created.
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Call this from within a user gesture handler to satisfy autoplay policies. */
  unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }


  private tone(
    freq: number,
    durationSec: number,
    type: OscType = "square",
    { attack = 0.005, decay = 0.05, sustain = 0.6, release = 0.05, gain = 0.5 } = {}
  ) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(g);
    g.connect(this.master);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.linearRampToValueAtTime(gain * sustain, now + attack + decay);
    g.gain.linearRampToValueAtTime(0, now + durationSec + release);

    osc.start(now);
    osc.stop(now + durationSec + release + 0.02);
  }

  private sweep(startFreq: number, endFreq: number, durationSec: number, type: OscType = "square", gain = 0.4) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), ctx.currentTime + durationSec);
    osc.connect(g);
    g.connect(this.master);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playKeystroke() {
    this.tone(180 + Math.random() * 40, 0.03, "square", { gain: 0.25, attack: 0.001, decay: 0.01, release: 0.01, sustain: 0.3 });
  }

  playError() {
    this.sweep(220, 90, 0.25, "sawtooth", 0.35);
  }

  playCoin() {
    this.tone(988, 0.08, "square", { gain: 0.4 });
    setTimeout(() => this.tone(1319, 0.12, "square", { gain: 0.4 }), 70);
  }

  playLaser() {
    this.sweep(900, 120, 0.15, "sawtooth", 0.35);
  }

  playAccessGranted() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.15, "square", { gain: 0.4 }), i * 110));
  }

  playGameOver() {
    const notes = [392, 349.23, 293.66, 261.63];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sawtooth", { gain: 0.35 }), i * 160));
  }

  playBoot() {
    this.sweep(60, 480, 0.6, "square", 0.3);
    setTimeout(() => this.tone(240, 0.4, "square", { gain: 0.3 }), 550);
  }

  playClick() {
    this.tone(440, 0.04, "square", { gain: 0.3, attack: 0.001, decay: 0.01, release: 0.01, sustain: 0.2 });
  }
}

let singleton: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
