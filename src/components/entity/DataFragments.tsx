'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { withShared } from '@/systems/sharedUniforms';
import { buildFragmentGeometry } from '@/systems/particleSystem';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import vert from '@/shaders/data.vert.glsl';
import frag from '@/shaders/data.frag.glsl';

/** Thousands of tiny unreadable data fragments drifting through the field. */
export default function DataFragments({ count }: { count: number }) {
  const geometry = useMemo(() => buildFragmentGeometry(count), [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `${noise}\n${vert}`,
        fragmentShader: `${noise}\n${palette}\n${frag}`,
        uniforms: withShared(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
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

  return <mesh geometry={geometry} material={material} renderOrder={8} frustumCulled={false} />;
}
