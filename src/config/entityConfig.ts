/* ------------------------------------------------------------------ */
/*  THE ENTITY — BLUE STATE                                            */
/*  Central configuration: palette, quality presets, live tunables.    */
/* ------------------------------------------------------------------ */

export const PALETTE = {
  bg: '#02040A',
  deep: '#031A45',
  electric: '#0878FF',
  cyan: '#27D9FF',
  ice: '#8DEFFF',
  core: '#F2FCFF',
} as const;

export type QualityName = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface QualityPreset {
  /** volumetric particle field count */
  field: number;
  /** particles spread across the concentric rings */
  ringParticles: number;
  /** logical ring count (each gets its own radius/speed/brightness) */
  ringCount: number;
  /** radial hair-thin filaments leaving the iris */
  filaments: number;
  /** floating data fragments (instanced) */
  fragments: number;
  /** neural spline curves */
  splines: number;
  /** device pixel ratio cap */
  dpr: number;
  /** depth of field bokeh strength (0 = off) */
  dof: number;
  /** temporal smear pass */
  smear: boolean;
}

export const QUALITY_PRESETS: Record<QualityName, QualityPreset> = {
  LOW: {
    field: 60_000,
    ringParticles: 26_000,
    ringCount: 34,
    filaments: 900,
    fragments: 1_400,
    splines: 45,
    dpr: 1.0,
    dof: 0,
    smear: false,
  },
  MEDIUM: {
    field: 190_000,
    ringParticles: 48_000,
    ringCount: 44,
    filaments: 1_600,
    fragments: 3_400,
    splines: 90,
    dpr: 1.5,
    dof: 2.0,
    smear: true,
  },
  HIGH: {
    field: 420_000,
    ringParticles: 80_000,
    ringCount: 54,
    filaments: 2_300,
    fragments: 5_600,
    splines: 140,
    dpr: 2.0,
    dof: 2.4,
    smear: true,
  },
  ULTRA: {
    field: 720_000,
    ringParticles: 112_000,
    ringCount: 60,
    filaments: 3_100,
    fragments: 8_200,
    splines: 190,
    dpr: 2.0,
    dof: 2.8,
    smear: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Live tunables — mutated by the hidden debug system only.           */
/* ------------------------------------------------------------------ */

export interface Tunables {
  masterBrightness: number;
  irisBrightness: number;
  irisScale: number;
  bloom: number;
  noiseStrength: number;
  turbulence: number;
  cameraDepth: number;
  interactionStrength: number;
  grain: number;
  /** multipliers below require a rebuild (handled by the debug panel) */
  fieldDensity: number;
  ringCount: number;
  filamentDensity: number;
  fragmentDensity: number;
  splineCount: number;
}

export const tunables: Tunables = {
  masterBrightness: 1.0,
  irisBrightness: 1.0,
  irisScale: 1.0,
  bloom: 1.0,
  noiseStrength: 1.0,
  turbulence: 1.0,
  cameraDepth: 7.6,
  interactionStrength: 1.0,
  grain: 1.0,
  fieldDensity: 1.0,
  ringCount: 1.0,
  filamentDensity: 1.0,
  fragmentDensity: 1.0,
  splineCount: 1.0,
};

/* ------------------------------------------------------------------ */
/*  World layout constants (world units, entity sits at the origin)    */
/* ------------------------------------------------------------------ */

export const WORLD = {
  pupilRadius: 0.165,
  irisRadius: 1.02,
  irisPlaneZ: 0.06,
  pupilZ: 0.02,
  hazeZ: -2.6,
  bgZ: -70,
  cameraFov: 45,
  cameraFar: 140,
  /** shockwave travel speed (world units / s) shared by every shader */
  pulseSpeed: 3.4,
  maxPulses: 4,
} as const;

/* ------------------------------------------------------------------ */
/*  URL helpers                                                        */
/* ------------------------------------------------------------------ */

export function urlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function detectInitialQuality(): QualityName {
  const q = urlParam('quality');
  if (q && q.toUpperCase() in QUALITY_PRESETS) return q.toUpperCase() as QualityName;

  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 620;
  const weakCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  if (isTouch || smallScreen || weakCores) return 'LOW';
  return 'MEDIUM';
}

export function debugWanted(): boolean {
  if (typeof window === 'undefined') return false;
  if (urlParam('debug') === '1') return true;
  try {
    return sessionStorage.getItem('entity-debug') === '1';
  } catch {
    return false;
  }
}
