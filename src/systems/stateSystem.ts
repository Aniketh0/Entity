/* ------------------------------------------------------------------ */
/*  ENTITY STATE SYSTEM — the BLUE ↔ RED transition engine.            */
/*  One organism, two operational states.                              */
/*                                                                     */
/*  The two directions are deliberately ASYMMETRIC:                    */
/*                                                                     */
/*  BLUE → RED (escalation, ~3.4s):                                    */
/*    behavior intensity leads, palette follows, instability climbs    */
/*    to a midpoint peak; a strong pulse fires at the crossover.       */
/*                                                                     */
/*  RED → BLUE (stabilization, ~4.6s):                                 */
/*    energy/turbulence/interference drain FIRST (the system powers    */
/*    down while still red), the palette turns blue afterwards, a      */
/*    calmer blue pulse expands from the pupil as blue re-emerges,     */
/*    then the environment settles. No midpoint rage spike.            */
/*                                                                     */
/*  Re-requesting mid-transition blends continuously (no palette pop). */
/* ------------------------------------------------------------------ */

import * as THREE from 'three';
import { shared } from './sharedUniforms';
import { interaction } from './interactionSystem';
import {
  BG_TINT,
  STATE_BEHAVIOR,
  VISUAL_PALETTES,
  type EntityVisualState,
} from '@/config/entityStates';

type Listener = (state: EntityVisualState) => void;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => x * x * (3 - 2 * x);
/** smootherstep — flat at both ends, steep through the middle */
const smoother = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

class EntityStateSystem {
  current: EntityVisualState = 'BLUE';
  /** UI-facing state — flips at the transition midpoint for drama */
  display: EntityVisualState = 'BLUE';
  private target: EntityVisualState = 'BLUE';
  private t = 1; // 0..1 transition progress (1 = settled)
  private duration = 3.4;
  private pulseAt = 0.5;
  private midFired = true;

  /** palette/state mix (what the shaders call uStateMix) */
  private mPal = 0;
  /** behavior mix (energy, turbulence, interference, …) */
  private mBeh = 0;
  /** transient instability envelope (escalation spike / release bump) */
  private trEnv = 0;
  /** continuity offsets for interrupted/reversed transitions */
  private palOff = 0;
  private behOff = 0;
  /** UI label flips once the palette crosses the halfway point */
  private displayFlipped = true;

  private listeners = new Set<Listener>();

  init(state: EntityVisualState, instant = false) {
    this.target = state;
    this.display = state;
    if (instant) {
      this.current = state;
      this.t = 1;
      this.midFired = true;
      this.displayFlipped = true;
      this.mPal = state === 'RED' ? 1 : 0;
      this.mBeh = this.mPal;
      this.trEnv = 0;
    }
    this.apply();
    for (const fn of this.listeners) fn(this.display);
  }

  /** request a state switch (no-op if already heading there) */
  request(next: EntityVisualState) {
    if (next === this.target) return;
    const toRed = next === 'RED';
    this.target = next;
    this.t = 0;
    this.midFired = false;
    this.displayFlipped = false;
    this.duration = toRed ? 3.4 : 4.6;
    this.pulseAt = toRed ? 0.5 : 0.65;
    // continuity offsets: new curve's value at t=0 vs where we actually are,
    // so a reversed mid-flight transition never pops
    this.palOff = this.mPal - (toRed ? 0 : 1);
    this.behOff = this.mBeh - (toRed ? 0 : 1);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get transitioning() {
    return this.t < 1;
  }

  /* ---- introspection for the verification harness ---- */
  get mixValue() {
    return this.mPal;
  }
  get behaviorMix() {
    return this.mBeh;
  }
  get progress() {
    return this.t;
  }
  get targetName() {
    return this.target;
  }

  update(dt: number) {
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.duration);
      const t = this.t;
      const toRed = this.target === 'RED';

      // the radial pulse: at the crossover (→RED) or as blue re-emerges (→BLUE)
      if (!this.midFired && t >= this.pulseAt) {
        this.midFired = true;
        interaction.systemPulse(toRed ? 1.7 : 1.45);
        this.current = this.target;
      }

      // ABSOLUTE redness curves (0 = fully blue, 1 = fully red):
      //  → RED: behavior leads early, palette ignites through the middle,
      //    instability peaks at the crossover
      //  → BLUE: behavior drains FIRST, palette relaxes afterwards, and only
      //    a small release bump rides the blue pulse — the system must calm
      //    down, not rage harder
      let palCurve: number;
      let behCurve: number;
      if (toRed) {
        palCurve = easeInOut(t);
        behCurve = smoother(t / 0.8);
        this.trEnv = Math.sin(Math.PI * t);
      } else {
        palCurve = 1 - smoother((t - 0.2) / 0.68);
        behCurve = 1 - smoother(t / 0.62);
        this.trEnv = 0.45 * Math.exp(-Math.pow((t - 0.65) / 0.1, 2));
      }

      const decay = (1 - t) * (1 - t);
      this.mPal = clamp01(palCurve + this.palOff * decay);
      this.mBeh = clamp01(behCurve + this.behOff * decay);

      // UI label follows the palette, not the clock
      if (!this.displayFlipped) {
        const crossed = toRed ? this.mPal >= 0.5 : this.mPal <= 0.5;
        if (crossed) {
          this.displayFlipped = true;
          this.display = this.target;
          for (const fn of this.listeners) fn(this.display);
        }
      }
    } else {
      const goal = this.target === 'RED' ? 1 : 0;
      const k = 1 - Math.exp(-dt * 2.5);
      this.mPal += (goal - this.mPal) * k;
      this.mBeh += (goal - this.mBeh) * k;
      this.trEnv *= Math.exp(-dt * 3);
    }
    this.apply();
  }

  private apply() {
    const m = THREE.MathUtils.clamp(this.mPal, 0, 1);
    const mb = THREE.MathUtils.clamp(this.mBeh, 0, 1);
    const tr = this.trEnv;
    const L = (a: number, b: number) => a + (b - a) * mb;

    const B = STATE_BEHAVIOR.BLUE;
    const R = STATE_BEHAVIOR.RED;

    shared.uStateMix.value = m;
    shared.uIrisDrift.value = L(B.irisDrift, R.irisDrift) * (1 + tr * 0.9);
    shared.uSpeedMul.value = L(B.speed, R.speed) * (1 + tr * 0.5);
    shared.uBurst.value = L(B.burst, R.burst) * (0.5 + shared.uEnergy.value) + tr * 0.9;
    shared.uCamShake.value = L(B.camShake, R.camShake) * (0.4 + shared.uEnergy.value * 0.7) + tr * 1.3;
    shared.uInterference.value = Math.min(L(B.interference, R.interference) + tr * 1.2, 1.6);
    shared.uBloomMul.value = L(B.bloom, R.bloom) * (1 + tr * 0.35);

    // biases ADDED on top of what the interaction system already wrote
    // (interaction runs first at priority -100 and reassigns each frame).
    // NOTE: during RED→BLUE these decay EARLY (mBeh leads down) — the
    // Entity powers down before its colors change.
    shared.uEnergy.value += L(B.energy, R.energy) + tr * 0.5;
    shared.uTurb.value += L(B.turb, R.turb) + tr * 0.45;
    shared.uGlitch.value = Math.min(shared.uGlitch.value + L(B.glitch, R.glitch) + tr * 0.55, 1.6);
    shared.uEnergyBoost.value = L(B.energy, R.energy);

    // blend the palette + backdrop tint (follows mPal, the slower curve on RED→BLUE)
    const pal = shared.uPalette.value as THREE.Vector3[];
    for (let i = 0; i < 5; i++) {
      pal[i].lerpVectors(VISUAL_PALETTES.BLUE[i], VISUAL_PALETTES.RED[i], m);
    }
    (shared.uBgTint.value as THREE.Vector3).lerpVectors(BG_TINT.BLUE, BG_TINT.RED, m);
  }
}

export const stateSystem = new EntityStateSystem();
