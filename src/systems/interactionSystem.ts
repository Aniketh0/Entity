import * as THREE from 'three';
import { shared } from './sharedUniforms';
import { tunables, WORLD } from '@/config/entityConfig';

/* ------------------------------------------------------------------ */
/*  Entity states                                                      */
/* ------------------------------------------------------------------ */

export type EntityState =
  | 'IDLE'
  | 'PROCESSING'
  | 'FOCUS'
  | 'SURGE'
  | 'RECALIBRATION'
  | 'ERROR'
  | 'BLUE_STATE';

interface StateParams {
  energy: number;
  contraction: number;
  ringDistort: number;
  glitch: number;
  turbBoost: number;
  brightness: number;
  camPush: number;
  /** seconds */
  duration: [number, number];
  weight: number;
  cooldown?: number;
}

const BLUE_STATE: StateParams = {
  energy: 0.26, contraction: 0.03, ringDistort: 0.0, glitch: 0,
  turbBoost: 0.04, brightness: 1.0, camPush: 0, duration: [10, 20], weight: 0.3,
};
const STATES: Record<EntityState, StateParams> = {
  IDLE:          { ...BLUE_STATE, energy: 0.1,  brightness: 0.9,  duration: [7, 13],  weight: 0.15 },
  PROCESSING:    { ...BLUE_STATE, energy: 0.46, turbBoost: 0.16, brightness: 1.02, duration: [6, 12], weight: 0.26 },
  FOCUS:         { ...BLUE_STATE, energy: 0.38, contraction: 0.32, brightness: 1.06, camPush: 0.5, duration: [3.5, 6], weight: 0.1 },
  SURGE:         { ...BLUE_STATE, energy: 0.95, contraction: 0.1, ringDistort: 0.16, turbBoost: 0.6, brightness: 1.12, camPush: 0.15, duration: [2.4, 2.8], weight: 0.07, cooldown: 18 },
  RECALIBRATION: { ...BLUE_STATE, energy: 0.45, ringDistort: 0.95, glitch: 0.04, turbBoost: 0.2, brightness: 1.05, duration: [6, 7.5], weight: 0.07, cooldown: 40 },
  ERROR:         { ...BLUE_STATE, energy: 0.55, contraction: 0.12, ringDistort: 0.1, glitch: 1.0, turbBoost: 0.35, brightness: 0.95, duration: [0.8, 1.1], weight: 0.04, cooldown: 75 },
  BLUE_STATE,
};

interface Pulse {
  x: number;
  y: number;
  age: number;
  strength: number;
}

/**
 * The Entity's nervous system: pointer awareness, the internal state
 * machine, twitch generator and click shockwaves. Runs once per frame,
 * before every other system (useFrame priority -100).
 */
export class InteractionSystem {
  state: EntityState = 'BLUE_STATE';
  stateName = 'BLUE_STATE';
  private stateT = 0;
  private stateUntil = 12;
  private lastSpecial: Partial<Record<EntityState, number>> = {};
  private focusLock = false;

  // smoothed params
  private p = { ...BLUE_STATE };
  private quickEnergy = 0;

  // pointer
  private ndc = new THREE.Vector2(0, 0);
  private ndcTarget = new THREE.Vector2(0, 0);
  private worldMouse = new THREE.Vector2(999, 999);
  private prevNdc = new THREE.Vector2(0, 0);
  private mouseSpeed = 0;
  private attention = 0;
  /** the Entity only notices a cursor that actually exists */
  private pointerActive = false;

  private pulses: Pulse[] = [];
  private time = 0;
  private clockStart = performance.now();
  private raycaster = new THREE.Raycaster();
  private entityPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private hit = new THREE.Vector3();

  private nextTwitch = 5;
  private twitchAmp = 0;

  attach(canvas: HTMLElement) {
    const onMove = (e: PointerEvent) => {
      this.pointerActive = true;
      const r = canvas.getBoundingClientRect();
      this.ndcTarget.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
    };
    const onDown = (e: PointerEvent) => {
      this.pointerActive = true;
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.ndcTarget.set(nx, ny);
      this.spawnPulse(nx, ny);
      this.quickEnergy = Math.min(this.quickEnergy + 0.85 + shared.uStateMix.value * 0.35, 1.75);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }

  /** State-transition shockwave: a system-level pulse from the pupil. */
  systemPulse(strength = 1.5) {
    const p: Pulse = { x: 0, y: 0, age: 0, strength };
    if (this.pulses.length >= WORLD.maxPulses) this.pulses.shift();
    this.pulses.push(p);
    this.quickEnergy = Math.min(this.quickEnergy + 0.9, 1.6);
  }

  private spawnPulse(ndcX: number, ndcY: number) {
    // project the click onto the entity plane using a throwaway camera copy
    const cam = this.camera;
    if (cam) {
      this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
      this.raycaster.ray.intersectPlane(this.entityPlane, this.hit) ?? this.hit.set(999, 999, 0);
    } else {
      this.hit.set(ndcX * 3, ndcY * 1.7, 0);
    }
    const iris = shared.uIrisRadius.value;
    const near = Math.hypot(this.hit.x, this.hit.y) < iris * 1.35;
    const strength = near ? 1.35 : 0.85;
    const p: Pulse = { x: this.hit.x, y: this.hit.y, age: 0, strength };
    if (this.pulses.length >= WORLD.maxPulses) this.pulses.shift();
    this.pulses.push(p);
  }

  private camera: THREE.Camera | null = null;
  setCamera(c: THREE.Camera) {
    this.camera = c;
  }

  /* ---------------- state machine ---------------- */

  private pickNext(now: number): EntityState {
    const entries = Object.entries(STATES) as [EntityState, StateParams][];
    const pool = entries.filter(([name, def]) => {
      const cd = def.cooldown;
      if (cd !== undefined && this.lastSpecial[name] !== undefined && now - this.lastSpecial[name]! < cd) return false;
      return true;
    });
    let total = 0;
    for (const [, def] of pool) total += def.weight;
    let r = Math.random() * total;
    for (const [name, def] of pool) {
      r -= def.weight;
      if (r <= 0) return name;
    }
    return 'BLUE_STATE';
  }

  private enter(name: EntityState, now: number) {
    this.state = name;
    this.stateName = name;
    this.stateT = 0;
    const def = STATES[name];
    this.stateUntil = def.duration[0] + Math.random() * (def.duration[1] - def.duration[0]);
    if (def.cooldown !== undefined) this.lastSpecial[name] = now;
  }

  /* ---------------- per-frame update ---------------- */

  update(dt: number, camera: THREE.Camera) {
    this.time += dt;
    const t = this.time;
    const now = t;

    // ---- intro ramp ----
    const intro = THREE.MathUtils.smoothstep(Math.min(t / 5.6, 1), 0, 1);
    shared.uIntro.value = intro;

    // ---- pointer smoothing ----
    const k = 1 - Math.exp(-dt * 6.5);
    this.prevNdc.copy(this.ndc);
    this.ndc.lerp(this.ndcTarget, k);
    const instSpeed = Math.min(this.prevNdc.distanceTo(this.ndc) / Math.max(dt, 1e-4), 4) / 4;
    this.mouseSpeed += (instSpeed - this.mouseSpeed) * (1 - Math.exp(-dt * 4));

    this.camera = camera;
    this.raycaster.setFromCamera(this.ndc, camera);
    const ok = this.raycaster.ray.intersectPlane(this.entityPlane, this.hit);
    if (ok) this.worldMouse.set(this.hit.x, this.hit.y);

    shared.uMouseNdc.value.copy(this.ndc);
    shared.uMouse.value.copy(this.worldMouse);
    shared.uMouseSpeed.value = this.mouseSpeed;

    // attention — cursor approaching the pupil (only for a real cursor)
    const iris = shared.uIrisRadius.value;
    const dCenter = Math.min(this.worldMouse.length() / (iris * 1.55), 1);
    const attTarget = (1 - THREE.MathUtils.smoothstep(dCenter, 0.25, 1)) * (this.pointerActive ? 1 : 0);
    this.attention += (attTarget * tunables.interactionStrength - this.attention) * (1 - Math.exp(-dt * 3));

    // cursor proximity forces FOCUS
    if (this.attention > 0.62 && this.state !== 'FOCUS' && this.state !== 'ERROR') {
      this.enter('FOCUS', now);
      this.focusLock = true;
    }
    if (this.focusLock && this.attention < 0.35) this.focusLock = false;

    // ---- state transitions ----
    this.stateT += dt;
    if (!this.focusLock && this.stateT > this.stateUntil) this.enter(this.pickNext(now), now);

    // ---- twitch generator: rare, fast, localized ----
    this.nextTwitch -= dt;
    if (this.nextTwitch <= 0) {
      this.twitchAmp = 0.5 + Math.random() * 0.7;
      this.nextTwitch = (3.5 + Math.random() * 7.5) * (1 - shared.uStateMix.value * 0.55);
    }
    this.twitchAmp *= Math.exp(-dt * 6.5);

    // ---- pulse lifecycle ----
    for (const p of this.pulses) p.age += dt;
    this.pulses = this.pulses.filter((p) => p.age < 3.4);
    const arr = shared.uPulses.value;
    for (let i = 0; i < WORLD.maxPulses; i++) {
      const p = this.pulses[i];
      if (p) arr[i].set(p.x, p.y, p.age, p.strength);
      else arr[i].set(0, 0, 99, 0);
    }

    // ---- parameter smoothing toward the current state ----
    const target = STATES[this.state];
    const energyTarget = target.energy + this.quickEnergy + this.attention * 0.25;
    const lerp = (cur: number, to: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));

    this.quickEnergy *= Math.exp(-dt * 1.6);
    this.p.energy = lerp(this.p.energy, energyTarget, 1.6);
    this.p.contraction = lerp(this.p.contraction, target.contraction + this.attention * 0.14 + shared.uStateMix.value * 0.05, 1.1);
    this.p.ringDistort = lerp(this.p.ringDistort, target.ringDistort, 0.8);
    this.p.glitch = lerp(this.p.glitch, target.glitch, this.state === 'ERROR' ? 7 : 3.2);
    this.p.turbBoost = lerp(this.p.turbBoost, target.turbBoost, 1.3);
    this.p.brightness = lerp(this.p.brightness, target.brightness, 1.0);
    this.p.camPush = lerp(this.p.camPush, target.camPush, 0.8);

    // ---- write the shared nervous system ----
    shared.uTime.value = t;
    shared.uEnergy.value = this.p.energy;
    shared.uContraction.value = this.p.contraction;
    shared.uRingDistort.value = this.p.ringDistort;
    shared.uGlitch.value = this.p.glitch;
    shared.uTwitch.value = this.twitchAmp * (0.35 + this.p.energy * 0.5);
    shared.uAttention.value = this.attention;
    shared.uSurge.value = Math.max(0, this.quickEnergy - 0.15) + (this.state === 'SURGE' ? 0.35 : 0);
    shared.uNoiseStrength.value = tunables.noiseStrength;
    shared.uBrightness.value =
      tunables.masterBrightness * this.p.brightness * (0.55 + 0.45 * intro) * 0.82;

    // turbulence rises with energy, cursor speed and clicks
    const turb =
      tunables.turbulence *
      (0.2 + this.p.energy * 0.22 + this.p.turbBoost +
        Math.min(this.mouseSpeed * 0.5 * (1 + shared.uStateMix.value * 0.6), 0.55));
    shared.uTurb.value += (turb - shared.uTurb.value) * (1 - Math.exp(-dt * 2.5));

    // field parallax: the environment leans toward the cursor
    const shiftX = this.ndc.x * 0.42 * tunables.interactionStrength;
    const shiftY = this.ndc.y * 0.3 * tunables.interactionStrength;
    shared.uFieldShift.value.lerp(new THREE.Vector2(shiftX, shiftY), 1 - Math.exp(-dt * 2.2));
  }
}

export const interaction = new InteractionSystem();
