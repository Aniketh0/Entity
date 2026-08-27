'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { shared } from '@/systems/sharedUniforms';
import { tunables, WORLD } from '@/config/entityConfig';

/**
 * Cinematic camera rig: extremely subtle continuous drift, breathing
 * zoom, cursor parallax and a slow intro dolly. The Entity stays
 * approximately centered — the camera never orbits dramatically.
 */
export default function EntityCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = shared.uTime.value;

    const introDolly = (1 - shared.uIntro.value) * 1.9;
    const push =
      shared.uContraction.value * 0.55 +
      shared.uAttention.value * 0.4 +
      shared.uSurge.value * 0.22;

    let z = tunables.cameraDepth + introDolly - push;
    let x = 0.3 * Math.sin(t * 0.057 + 1.7) + 0.1 * Math.sin(t * 0.151 + 0.4);
    let y = 0.22 * Math.sin(t * 0.079 + 4.0) + 0.07 * Math.sin(t * 0.187 + 2.2);

    /* RED STATE: subtle computational micro-shake + pulse impact kick */
    const shake = shared.uCamShake.value;
    if (shake > 0.003) {
      const st = t * 12.0;
      x += (Math.sin(st * 1.7 + 1.3) * 0.5 + Math.sin(st * 3.7 + 0.6) * 0.3 + Math.sin(st * 7.3 + 2.2) * 0.2) * 0.017 * shake;
      y += (Math.sin(st * 2.3 + 4.1) * 0.5 + Math.sin(st * 5.1 + 1.9) * 0.3 + Math.sin(st * 8.9 + 0.4) * 0.2) * 0.013 * shake;
    }
    z += shared.uSurge.value * 0.1;

    camera.position.set(x, y, z);

    target.set(shared.uMouseNdc.value.x * 0.18, shared.uMouseNdc.value.y * 0.14, 0);
    camera.lookAt(target);
    camera.rotation.z += 0.006 * Math.sin(t * 0.11);
    camera.rotation.z += Math.sin(t * 9.2) * 0.0032 * shake;

    const fov = WORLD.cameraFov + 0.65 * Math.sin(t * 0.19) - shared.uContraction.value * 0.9;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -50);

  return null;
}
