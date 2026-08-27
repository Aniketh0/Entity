'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import * as RTP from '@react-three/postprocessing';
import { BlendFunction, Effect } from 'postprocessing';
import { shared } from '@/systems/sharedUniforms';
import { tunables } from '@/config/entityConfig';

/* ------------------------------------------------------------------ */
/*  Subtle temporal smear — a tiny custom postprocessing Effect that   */
/*  acts as cinematic motion blur / temporal accumulation.             */
/* ------------------------------------------------------------------ */

const smearFrag = /* glsl */ `
uniform float uSmear;
uniform float uIntensity; // RED-state interference amount
uniform float uGlitch;
uniform float uTime;

float ifxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;

  /* occasional displaced horizontal bands while the system is unstable */
  float bandId = floor(p.y * 150.0);
  float band = step(0.9965, ifxHash(vec2(bandId, floor(uTime * 22.0))));
  p.x += band * (uGlitch * 0.03 + uIntensity * 0.006)
       * (ifxHash(vec2(bandId, floor(uTime * 22.0) + 3.0)) - 0.5) * 2.0;

  /* subtle temporal smear — cinematic motion accumulation */
  vec2 dir = (p - 0.5) * vec2(1.0, 0.85) * (0.014 * uSmear);
  vec4 c = texture2D(inputBuffer, p);
  c += texture2D(inputBuffer, p - dir * 0.4);
  c += texture2D(inputBuffer, p + dir * 0.4);
  c += texture2D(inputBuffer, p - dir);
  c += texture2D(inputBuffer, p + dir);
  c /= 5.0;

  /* RED STATE: scanline interference */
  float scan = 0.5 + 0.5 * sin(p.y * 640.0);
  c.rgb *= 1.0 - uIntensity * 0.045 * scan;

  /* faint crimson interference lines */
  float line = step(0.9990, ifxHash(vec2(floor(p.y * 220.0), floor(uTime * 9.0))));
  c.rgb += vec3(0.35, 0.05, 0.03) * line * uIntensity * 0.3;

  outputColor = c;
}
`;

class SmearEffect extends Effect {
  constructor() {
    super('SmearEffect', smearFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform<number>>([
        ['uSmear', new THREE.Uniform(0.6)],
        ['uIntensity', new THREE.Uniform(0)],
        ['uGlitch', new THREE.Uniform(0)],
        ['uTime', new THREE.Uniform(0)],
      ]),
    });
  }
}

/* wrapEffect exists in @react-three/postprocessing; guard defensively */
let Smear: React.ComponentType<{ ref?: React.Ref<object> }> | null = null;
const wrap = (RTP as unknown as { wrapEffect?: (E: new () => Effect) => unknown }).wrapEffect;
if (typeof wrap === 'function') {
  Smear = wrap(SmearEffect) as typeof Smear;
}

/* ------------------------------------------------------------------ */

export default function EntityPostFX({ dof, smear }: { dof: number; smear: boolean }) {
  const bloomRef = useRef<any>(null);
  const caRef = useRef<any>(null);
  const noiseRef = useRef<any>(null);
  const smearRef = useRef<any>(null);

  const caOffset = useMemo(() => new THREE.Vector2(0.00048, 0.00052), []);

  useFrame(() => {
    const s = shared.uSurge.value;
    const g = shared.uGlitch.value;
    const m = shared.uStateMix.value;

    if (bloomRef.current) {
      bloomRef.current.intensity =
        0.52 * tunables.bloom * shared.uBloomMul.value * (1 + s * 0.3 + g * 0.25);
    }
    if (caRef.current?.offset?.set) {
      const o = 0.00048 * (1 + m * 0.6) + g * 0.0045 + s * 0.0005;
      caRef.current.offset.set(o, o * 1.08);
    }
    if (noiseRef.current?.blendMode) {
      noiseRef.current.blendMode.opacity.value = 0.005 * tunables.grain * (1 + m * 0.5);
    }
    const u = smearRef.current?.uniforms;
    if (u?.get) {
      const su = u.get('uSmear');
      if (su) su.value = 0.55 + s * 1.7 + m * 0.35;
      const iu = u.get('uIntensity');
      if (iu) iu.value = shared.uInterference.value * 0.8;
      const gu = u.get('uGlitch');
      if (gu) gu.value = g;
      const tu = u.get('uTime');
      if (tu) tu.value = shared.uTime.value;
    }
  });

  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <Bloom
        ref={bloomRef}
        mipmapBlur
        intensity={0.52}
        luminanceThreshold={0.32}
        luminanceSmoothing={0.35}
        radius={0.55}
      />
      {dof > 0 && <DepthOfField focusDistance={0.056} focalLength={0.03} bokehScale={dof} />}
      {smear && Smear != null && <Smear ref={smearRef as never} />}
      <ChromaticAberration ref={caRef as never} offset={caOffset} />
      <Vignette offset={0.16} darkness={0.92} />
      <Noise ref={noiseRef as never} opacity={0.005} blendFunction={BlendFunction.SCREEN} />
    </EffectComposer>
  );
}
