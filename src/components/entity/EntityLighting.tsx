'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { shared } from '@/systems/sharedUniforms';
import { WORLD } from '@/config/entityConfig';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import bgVert from '@/shaders/bg.vert.glsl';
import bgFrag from '@/shaders/bg.frag.glsl';
import hazeVert from '@/shaders/haze.vert.glsl';
import hazeFrag from '@/shaders/haze.frag.glsl';

/**
 * The Entity emits its own light. This system holds:
 *  - the deep-space backdrop (opaque, writes depth — the DoF reference)
 *  - the volumetric blue haze the iris casts into its environment
 */
export default function EntityLighting() {
  const size = useThree((s) => s.size);

  const bgMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bgVert,
        fragmentShader: `${noise}\n${palette}\n${bgFrag}`,
        uniforms: {
          uTime: shared.uTime,
          uAspect: { value: 1.7778 },
        },
        depthWrite: true,
        depthTest: true,
      }),
    [],
  );

  const hazeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: hazeVert,
        fragmentShader: `${noise}\n${palette}\n${hazeFrag}`,
        uniforms: withSharedHaze(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      }),
    [],
  );

  useEffect(() => {
    bgMaterial.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
  }, [size, bgMaterial]);

  useEffect(
    () => () => {
      bgMaterial.dispose();
      hazeMaterial.dispose();
    },
    [bgMaterial, hazeMaterial],
  );

  return (
    <>
      <mesh position={[0, 0, WORLD.bgZ]} material={bgMaterial} renderOrder={-10}>
        <planeGeometry args={[160, 92]} />
      </mesh>
      <mesh position={[0, 0, WORLD.hazeZ]} material={hazeMaterial} renderOrder={2}>
        <planeGeometry args={[38, 24]} />
      </mesh>
    </>
  );
}

function withSharedHaze(): Record<string, THREE.IUniform> {
  return {
    uTime: shared.uTime,
    uIntro: shared.uIntro,
    uEnergy: shared.uEnergy,
  } as unknown as Record<string, THREE.IUniform>;
}
