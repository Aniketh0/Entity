'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { shared } from '@/systems/sharedUniforms';
import { WORLD } from '@/config/entityConfig';
import pupilVert from '@/shaders/pupil.vert.glsl';
import pupilFrag from '@/shaders/pupil.frag.glsl';

/**
 * The central pupil: a tiny, almost-black aperture that stays visually
 * stable while everything around it evolves.
 */
export default function EntityCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pupilVert,
        fragmentShader: pupilFrag,
        transparent: true,
        depthWrite: true,
        depthTest: true,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    if (meshRef.current) meshRef.current.scale.setScalar(shared.uPupilRadius.value * 1.18);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, WORLD.pupilZ]} material={material} renderOrder={1}>
      <circleGeometry args={[1, 48]} />
    </mesh>
  );
}
