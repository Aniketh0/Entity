import * as THREE from 'three';
import { WORLD } from '@/config/entityConfig';

/**
 * A single shared uniform bank. Every ShaderMaterial receives these exact
 * uniform objects, so one CPU write per frame updates the entire organism.
 * The Entity is one creature — its uniforms are one nervous system.
 */
export const shared: Record<string, THREE.IUniform> = {
  uTime: { value: 0 },
  /** 0 → 1 intro ramp */
  uIntro: { value: 0 },
  /** global brightness (master × state) */
  uBrightness: { value: 1 },
  uPixelRatio: { value: 1 },
  /** device-pixels-per-world-unit at distance 1: size * uPointScale / dist = px */
  uPointScale: { value: 500 },

  uMouse: { value: new THREE.Vector2(999, 999) }, // world coords on the entity plane
  uMouseNdc: { value: new THREE.Vector2() }, // -1..1
  uMouseSpeed: { value: 0 }, // smoothed 0..~1
  uFieldShift: { value: new THREE.Vector2() }, // parallax offset for the field

  // ---- entity state params (smoothed by the state machine) ----
  uEnergy: { value: 0.25 },
  uContraction: { value: 0 },
  uTurb: { value: 0.25 },
  uRingDistort: { value: 0 },
  uGlitch: { value: 0 },
  uTwitch: { value: 0 },
  uAttention: { value: 0 },
  uSurge: { value: 0 },

  // ---- iris geometry ----
  uPupilRadius: { value: WORLD.pupilRadius },
  uIrisRadius: { value: WORLD.irisRadius },
  uNoiseStrength: { value: 1 },

  // ---- dual visual state (BLUE=0 ↔ RED=1), written by stateSystem ----
  uStateMix: { value: 0 },
  /** blended 5-stop palette, CPU-mixed each frame */
  uPalette: {
    value: [
      new THREE.Vector3(0.0004, 0.0034, 0.0268),
      new THREE.Vector3(0.0031, 0.2, 1.0),
      new THREE.Vector3(0.02, 0.68, 1.0),
      new THREE.Vector3(0.28, 0.85, 1.0),
      new THREE.Vector3(0.89, 0.97, 1.0),
    ],
  },
  uBgTint: { value: new THREE.Vector3(0.0007, 0.0018, 0.0055) },
  uIrisDrift: { value: 1 },
  uSpeedMul: { value: 1 },
  uBurst: { value: 0 },
  uCamShake: { value: 0 },
  uInterference: { value: 0 },
  uEnergyBoost: { value: 0 },
  uGlitchBase: { value: 0 },
  uBloomMul: { value: 1 },

  // ---- click shockwaves: xy = origin (entity plane), z = age, w = strength ----
  uPulses: {
    value: Array.from({ length: WORLD.maxPulses }, () => new THREE.Vector4(0, 0, 99, 0)),
  },
};

export type SharedUniforms = typeof shared;

/** Convenience: build the standard uniform block for a custom material. */
export function withShared(extra: Record<string, THREE.IUniform> = {}): Record<string, THREE.IUniform> {
  return { ...shared, ...extra } as unknown as Record<string, THREE.IUniform>;
}
