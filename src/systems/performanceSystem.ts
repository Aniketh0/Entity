import type { QualityName } from '@/config/entityConfig';

type Listener = (q: QualityName) => void;

/**
 * Adaptive performance governor.
 * Measures a rolling average of frame times and steps quality presets up or
 * down with hysteresis so the organism never visibly stutters.
 */
class PerformanceSystem {
  quality: QualityName = 'MEDIUM';
  fps = 60;
  auto = true;

  private listeners = new Set<Listener>();
  private frames = 0;
  private accum = 0;
  private history: number[] = [];
  private lastChange = 0;
  private startedAt = 0;
  private goodStreak = 0;

  start(initial: QualityName, auto: boolean) {
    this.quality = initial;
    this.auto = auto;
    this.startedAt = performance.now();
    this.lastChange = 0;
    this.history = [];
    this.goodStreak = 0;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.quality);
  }

  /** call once per rendered frame */
  frame(dt: number, now: number) {
    if (dt <= 0 || dt > 0.5) return; // tab-switch noise
    this.frames++;
    this.accum += dt;
    if (this.accum < 1.0) return;

    const fps = this.frames / this.accum;
    this.frames = 0;
    this.accum = 0;
    this.fps = this.fps * 0.4 + fps * 0.6;
    this.history.push(fps);
    if (this.history.length > 6) this.history.shift();

    const sinceChange = (now - this.lastChange) / 1000;
    const sinceStart = (now - this.startedAt) / 1000;
    if (!this.auto || sinceStart < 6 || sinceChange < 10) return;

    const order: QualityName[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
    const idx = order.indexOf(this.quality);
    const bad = this.history.length >= 3 && this.history.every((f) => f < 33);
    const good = this.history.length >= 6 && this.history.every((f) => f > 55);

    if (bad && idx > 0) {
      this.goodStreak = 0;
      this.set(order[idx - 1]);
    } else if (good) {
      this.goodStreak++;
      if (this.goodStreak >= 2 && idx < 2) {
        // auto ceiling is HIGH — ULTRA is opt-in (?quality=ultra)
        this.goodStreak = 0;
        this.set(order[idx + 1]);
      }
    } else {
      this.goodStreak = 0;
    }
  }

  set(q: QualityName) {
    if (q === this.quality) return;
    this.quality = q;
    this.lastChange = performance.now();
    this.history = [];
    this.emit();
  }
}

export const perf = new PerformanceSystem();
