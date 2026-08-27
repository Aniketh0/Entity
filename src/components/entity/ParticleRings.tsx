'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { withShared } from '@/systems/sharedUniforms';
import { buildRingGeometry } from '@/systems/particleSystem';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import vert from '@/shaders/rings.vert.glsl';
import frag from '@/shaders/rings.frag.glsl';

/** ~30–60 broken concentric rings built purely from particles. */
export default function ParticleRings({ ringCount, particles }: { ringCount: number; particles: number }) {
  const geometry = useMemo(() => buildRingGeometry(ringCount, particles), [ringCount, particles]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `${noise}\n${vert}`,
        fragmentShader: `${palette}\n${frag}`,
        uniforms: withShared(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <points geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />;
}
