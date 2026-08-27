import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  DUAL VISUAL STATE SYSTEM — BLUE ↔ RED                              */
/*  One Entity, two operational states. Every system reads the         */
/*  blended palette + behavior parameters; nothing is duplicated.      */
/* ------------------------------------------------------------------ */

export type EntityVisualState = 'BLUE' | 'RED';

const srgb = (hex: string): THREE.Vector3 => {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  return new THREE.Vector3(c.r, c.g, c.b);
};

/**
 * Palette ramps, dark → incandescent (5 stops, linear space).
 * Every shader colors through the same blended ramp, so the whole
 * organism moves as one creature during a transition.
 */
export const VISUAL_PALETTES: Record<EntityVisualState, THREE.Vector3[]> = {
  BLUE: [
    srgb('#031A45'), // deep space blue
    srgb('#0878FF'), // electric blue
    srgb('#27D9FF'), // cyan
    srgb('#8DEFFF'), // ice
    srgb('#F2FCFF'), // core white
  ],
  RED: [
    srgb('#2E070C'), // near-black crimson
    srgb('#7A0D1B'), // blood red
    srgb('#D0202F'), // scarlet
    srgb('#FF5A26'), // ember orange-red
    srgb('#FFD9B0'), // hot white-orange
  ],
};

/** near-black backdrop tint per state (linear) */
export const BG_TINT: Record<EntityVisualState, THREE.Vector3> = {
  BLUE: new THREE.Vector3(0.0007, 0.0018, 0.0055),
  RED: new THREE.Vector3(0.00099, 0.000023, 0.000107),
};

/**
 * Behavior intensities per state. BLUE = current Arena version values
 * (all neutral). RED = the same Entity, overloaded.
 */
export interface StateBehavior {
  /** added to entity energy */
  energy: number;
  /** added to turbulence */
  turb: number;
  /** baseline corruption (glitch banding) */
  glitch: number;
  /** iris filament time multiplier */
  irisDrift: number;
  /** global data motion multiplier */
  speed: number;
  /** angular micro-burst strength */
  burst: number;
  /** camera micro-shake amount */
  camShake: number;
  /** scanline / interference amount */
  interference: number;
  /** bloom multiplier */
  bloom: number;
}

export const STATE_BEHAVIOR: Record<EntityVisualState, StateBehavior> = {
  BLUE: {
    energy: 0,
    turb: 0,
    glitch: 0,
    irisDrift: 1,
    speed: 1,
    burst: 0,
    camShake: 0,
    interference: 0,
    bloom: 1,
  },
  RED: {
    energy: 0.16,
    turb: 0.1,
    glitch: 0.045,
    irisDrift: 1.8,
    speed: 1.4,
    burst: 1,
    camShake: 1,
    interference: 1,
    bloom: 1.16,
  },
};
