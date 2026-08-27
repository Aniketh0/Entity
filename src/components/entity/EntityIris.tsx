'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { withShared, shared } from '@/systems/sharedUniforms';
import { WORLD } from '@/config/entityConfig';
import noise from '@/shaders/lib/noise.glsl';
import palette from '@/shaders/lib/palette.glsl';
import irisVert from '@/shaders/iris.vert.glsl';
import irisFrag from '@/shaders/iris.frag.glsl';

/**
 * The procedural iris — the most important element. A single GPU quad
 * running polar-coordinate GLSL; the mesh scale only carries the debug
 * iris-scale control, all breathing happens in-shader.
 */
export default function EntityIris() {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    // private uBrightness so the iris gain can be tuned independently
    const uniforms = { ...shared, uBrightness: { value: 1 } } as unknown as Record<string, THREE.IUniform>;
    return new THREE.ShaderMaterial({
      vertexShader: irisVert,
      fragmentShader: `${noise}\n${palette}\n${irisFrag}`,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: true, // fragments that survive discard become the depth of the eye
      depthTest: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const m = material.uniforms.uBrightness;
    m.value = shared.uBrightness.value * 1.0;
    if (meshRef.current) meshRef.current.scale.setScalar(1.0);
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, WORLD.irisPlaneZ]}
      material={material}
      renderOrder={3}
      frustumCulled={false}
    >
      <planeGeometry args={[5.2, 5.2]} />
    </mesh>
  );
}
