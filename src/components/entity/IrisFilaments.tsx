'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { withShared } from '@/systems/sharedUniforms';
import { buildFilamentGeometry } from '@/systems/particleSystem';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import vert from '@/shaders/filaments.vert.glsl';
import frag from '@/shaders/filaments.frag.glsl';

/** Thousands of hair-thin GPU line filaments radiating from the pupil. */
export default function IrisFilaments({ count }: { count: number }) {
  const geometry = useMemo(() => buildFilamentGeometry(count), [count]);
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

  return <lineSegments geometry={geometry} material={material} renderOrder={4} frustumCulled={false} />;
}
