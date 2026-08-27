'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { withShared } from '@/systems/sharedUniforms';
import { buildSplines } from '@/systems/splineSystem';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import vert from '@/shaders/spline.vert.glsl';
import frag from '@/shaders/spline.frag.glsl';

/** Thin neural pathways crossing the field, with traveling pulses. */
export default function NeuralSplines({ count }: { count: number }) {
  const { geometry } = useMemo(() => {
    const data = buildSplines(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aMeta', new THREE.BufferAttribute(data.meta, 4));
    return { geometry: g };
  }, [count]);

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

  return <lineSegments geometry={geometry} material={material} renderOrder={6} frustumCulled={false} />;
}
