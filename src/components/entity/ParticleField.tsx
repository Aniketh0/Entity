'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { withShared } from '@/systems/sharedUniforms';
import { buildFieldGeometry } from '@/systems/particleSystem';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import vert from '@/shaders/field.vert.glsl';
import frag from '@/shaders/field.frag.glsl';

/** The massive volumetric information field (up to 700k+ particles). */
export default function ParticleField({ count }: { count: number }) {
  const geometry = useMemo(() => buildFieldGeometry(count), [count]);
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

  return <points geometry={geometry} material={material} renderOrder={7} frustumCulled={false} />;
}
