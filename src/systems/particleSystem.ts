import * as THREE from 'three';

/** Deterministic, fast PRNG so the organism is reproducible per seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/*  Volumetric particle field                                          */
/*  aOrbit: (radius, angle0, angularSpeed, inclination)                */
/*  aSeed:  (rand1, rand2, rand3, population)                          */
/*  populations: 0 disc · 1 halo · 2 far shell · 3 foreground drift    */
/* ------------------------------------------------------------------ */

export function buildFieldGeometry(count: number, seed = 1207): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const orbit = new Float32Array(count * 4);
  const rand = new Float32Array(count * 4);
  const size = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const u = rng();
    let population: number;
    if (u < 0.6) population = 0;
    else if (u < 0.88) population = 1;
    else if (u < 0.985) population = 2;
    else population = 3;

    let radius: number;
    let inclination = (rng() - 0.5) * 1.1;
    if (population === 0) radius = 0.38 + Math.pow(rng(), 2.3) * 7.2;
    else if (population === 1) {
      radius = 0.5 + Math.pow(rng(), 2.0) * 8.4;
      inclination = (rng() - 0.5) * 2.6;
    } else if (population === 2) radius = 4.5 + rng() * 9.5;
    else radius = 0.8 + rng() * 3.6;

    // slow differential rotation; mostly prograde, a few rebels
    const dir = rng() < 0.88 ? 1 : -1;
    const omega = ((0.045 + rng() * 0.05) / Math.pow(radius, 1.22)) * dir;

    let s: number;
    if (population === 2) s = 0.005 + rng() * 0.008;
    else if (population === 3) s = 0.045 + rng() * 0.07;
    else s = 0.006 + Math.pow(rng(), 3.0) * 0.032;

    const o = i * 4;
    orbit[o] = radius;
    orbit[o + 1] = rng() * TAU;
    orbit[o + 2] = omega;
    orbit[o + 3] = inclination;
    rand[o] = rng();
    rand[o + 1] = rng();
    rand[o + 2] = rng();
    rand[o + 3] = population;
    size[i] = s;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // dummy
  g.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 4));
  g.setAttribute('aSeed', new THREE.BufferAttribute(rand, 4));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  return g;
}

/* ------------------------------------------------------------------ */
/*  Concentric particle rings — each ring gets its own                 */
/*  radius / speed / brightness / gaps, encoded per particle.          */
/*  aRing: (radius, angularSpeed, brightness, phase)                   */
/*  aSeed: (angle0, thicknessRand, randB, randC)                       */
/* ------------------------------------------------------------------ */

export function buildRingGeometry(
  ringCount: number,
  totalParticles: number,
  seed = 4409,
): THREE.BufferGeometry {
  const rng = mulberry32(seed);

  interface Ring {
    radius: number;
    speed: number;
    bright: number;
    phase: number;
    weight: number;
  }
  const rings: Ring[] = [];

  let r = 1.3;
  while (rings.length < ringCount && r < 5.9) {
    // power-law brightness: a few intense rings, many ghostly ones
    const bright = Math.pow(rng(), 2.3) * 1.05 + 0.04;
    const dir = rng() < 0.86 ? 1 : -1;
    const speed = ((0.05 + rng() * 0.1) / Math.sqrt(r)) * dir;
    const phase = rng();
    const weight = (1.5 / (0.45 + r * 0.34)) * (0.45 + bright);
    rings.push({ radius: r, speed, bright: bright / (1 + r * 0.24), phase, weight });

    // irregular radial spacing with occasional close clusters
    r += rng() < 0.2 ? 0.02 + rng() * 0.02 : 0.055 + rng() * 0.16;
  }

  const totalWeight = rings.reduce((a, b) => a + b.weight, 0);
  const ring = new Float32Array(totalParticles * 4);
  const rand = new Float32Array(totalParticles * 4);

  let idx = 0;
  for (const ringDef of rings) {
    const n = Math.max(24, Math.floor((ringDef.weight / totalWeight) * totalParticles));
    for (let j = 0; j < n && idx < totalParticles; j++, idx++) {
      const o = idx * 4;
      ring[o] = ringDef.radius;
      ring[o + 1] = ringDef.speed;
      ring[o + 2] = ringDef.bright;
      ring[o + 3] = ringDef.phase;
      rand[o] = rng() * TAU;
      rand[o + 1] = rng();
      rand[o + 2] = rng();
      rand[o + 3] = rng();
    }
  }
  // remainder → last ring
  while (idx < totalParticles) {
    const o = idx * 4;
    const last = rings[rings.length - 1];
    ring[o] = last.radius;
    ring[o + 1] = last.speed;
    ring[o + 2] = last.bright;
    ring[o + 3] = last.phase;
    rand[o] = rng() * TAU;
    rand[o + 1] = rng();
    rand[o + 2] = rng();
    rand[o + 3] = rng();
    idx++;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalParticles * 3), 3));
  g.setAttribute('aRing', new THREE.BufferAttribute(ring, 4));
  g.setAttribute('aSeed', new THREE.BufferAttribute(rand, 4));
  return g;
}

/* ------------------------------------------------------------------ */
/*  Radial iris filaments (GL line segments, displaced in-shader)      */
/*  aSeed: (angle/TAU, length, phase, rand)  ·  aT: 0..1 along hair    */
/* ------------------------------------------------------------------ */

export function buildFilamentGeometry(count: number, segments = 10, seed = 9021): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const vertsPerFilament = segments * 2;
  const total = count * vertsPerFilament;

  const pos = new Float32Array(total * 3);
  const seedArr = new Float32Array(total * 4);
  const tArr = new Float32Array(total);

  for (let f = 0; f < count; f++) {
    const angle = rng();
    const len = 0.42 + Math.pow(rng(), 1.55) * 1.95;
    const phase = rng();
    const rand = rng();
    for (let s = 0; s < segments; s++) {
      const t0 = s / segments;
      const t1 = (s + 1) / segments;
      const base = (f * vertsPerFilament + s * 2) * 4;
      for (let e = 0; e < 2; e++) {
        const vi = f * vertsPerFilament + s * 2 + e;
        seedArr[base + e * 4] = angle;
        seedArr[base + e * 4 + 1] = len;
        seedArr[base + e * 4 + 2] = phase;
        seedArr[base + e * 4 + 3] = rand;
        tArr[vi] = e === 0 ? t0 : t1;
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 4));
  g.setAttribute('aT', new THREE.BufferAttribute(tArr, 1));
  return g;
}

/* ------------------------------------------------------------------ */
/*  Data fragments — instanced billboarded micro-glyphs                */
/*  aPos: base position · aInfo: (type, size, phase, rand) · aId       */
/* ------------------------------------------------------------------ */

export function buildFragmentGeometry(count: number, seed = 3313): THREE.InstancedBufferGeometry {
  const rng = mulberry32(seed);
  const aPos = new Float32Array(count * 3);
  const aInfo = new Float32Array(count * 4);
  const aId = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const foreground = rng() < 0.12;
    let x: number, y: number, z: number;
    if (foreground) {
      const a = rng() * TAU;
      const rr = 0.4 + rng() * 2.6;
      x = Math.cos(a) * rr;
      y = Math.sin(a) * rr * 0.7;
      z = 2.6 + rng() * 2.8;
    } else {
      const a = rng() * TAU;
      const rr = 1.25 + Math.pow(rng(), 1.35) * 5.4;
      x = Math.cos(a) * rr;
      y = Math.sin(a) * rr;
      z = (rng() - 0.5) * 3.4;
    }
    aPos[i * 3] = x;
    aPos[i * 3 + 1] = y;
    aPos[i * 3 + 2] = z;

    const tu = rng();
    const type = tu < 0.36 ? 0 : tu < 0.62 ? 1 : tu < 0.82 ? 2 : 3;
    aInfo[i * 4] = type;
    aInfo[i * 4 + 1] = 0.014 + rng() * 0.05;
    aInfo[i * 4 + 2] = rng();
    aInfo[i * 4 + 3] = rng();
    aId[i] = i;
  }

  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index;
  g.setAttribute('position', quad.getAttribute('position'));
  g.setAttribute('uv', quad.getAttribute('uv'));
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
  g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 4));
  g.setAttribute('aId', new THREE.InstancedBufferAttribute(aId, 1));
  g.instanceCount = count;
  return g;
}
