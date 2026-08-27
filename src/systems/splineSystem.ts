import * as THREE from 'three';
import { mulberry32 } from './particleSystem';

const TAU = Math.PI * 2;

export interface SplineData {
  positions: Float32Array; // line-segment pairs (xyz)
  meta: Float32Array; // per-vertex (t, seed, brightness, phase)
  vertexCount: number;
}

/**
 * Neural spline network.
 * Catmull-Rom curves grown procedurally: most start on a wandering annulus
 * around the Entity and flow tangentially, curling through the particle
 * field, occasionally branching. They are rendered as hair-thin additive
 * lines whose life-cycle and traveling pulses are computed in-shader.
 */
export function buildSplines(curveCount: number, seed = 7717): SplineData {
  const rng = mulberry32(seed);
  const pos: number[] = [];
  const meta: number[] = [];

  const addCurve = (ctrl: THREE.Vector3[], brightness: number) => {
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.6);
    const segs = Math.max(14, Math.floor(curve.getLength() * 11));
    const pts = curve.getPoints(segs);
    const cseed = rng();
    const phase = rng();
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1);
      const t1 = (i + 1) / (pts.length - 1);
      pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      meta.push(t0, cseed, brightness, phase, t1, cseed, brightness, phase);
    }
  };

  const grow = (branchFrom?: THREE.Vector3) => {
    const nearEntity = branchFrom !== undefined ? false : rng() < 0.64;
    let p: THREE.Vector3;
    let dir = new THREE.Vector3();

    if (branchFrom !== undefined) {
      p = branchFrom.clone();
      const a = rng() * TAU;
      dir.set(Math.cos(a), Math.sin(a), (rng() - 0.5) * 0.6).normalize();
    } else if (nearEntity) {
      const a = rng() * TAU;
      const rr = 1.18 + rng() * 1.5;
      p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, (rng() - 0.5) * 1.5);
      // tangential flow around the entity
      dir.set(-Math.sin(a), Math.cos(a), (rng() - 0.5) * 0.35).normalize();
    } else {
      const a = rng() * TAU;
      const rr = 2.1 + rng() * 4.4;
      p = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, (rng() - 0.5) * 5.2);
      const a2 = rng() * TAU;
      dir.set(Math.cos(a2), Math.sin(a2), (rng() - 0.5) * 0.5).normalize();
    }

    const n = branchFrom !== undefined ? 3 + Math.floor(rng() * 2) : 4 + Math.floor(rng() * 4);
    const stepLen = 0.55 + rng() * 1.05;
    const ctrl = [p.clone()];
    for (let i = 0; i < n; i++) {
      const turn = (rng() - 0.5) * (nearEntity ? 1.15 : 0.85);
      const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      dir.applyAxisAngle(axis, turn).normalize();
      p = p.clone().addScaledVector(dir, stepLen * (0.7 + rng() * 0.7));
      p.z += (rng() - 0.5) * 0.5;
      ctrl.push(p.clone());
    }

    const brightness = 0.4 + Math.pow(rng(), 1.7) * 0.85;
    addCurve(ctrl, brightness);

    // occasional branch
    if (branchFrom === undefined && rng() < 0.3 && ctrl.length > 3) {
      grow(ctrl[Math.floor(ctrl.length * 0.45)]);
    }
  };

  for (let i = 0; i < curveCount; i++) grow();

  const positions = new Float32Array(pos);
  const metaArr = new Float32Array(meta);
  return { positions, meta: metaArr, vertexCount: positions.length / 3 };
}
