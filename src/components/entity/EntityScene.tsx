'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import {
  QUALITY_PRESETS,
  WORLD,
  debugWanted,
  detectInitialQuality,
  tunables,
  urlParam,
  type QualityName,
} from '@/config/entityConfig';
import { perf } from '@/systems/performanceSystem';
import { interaction } from '@/systems/interactionSystem';
import { stateSystem } from '@/systems/stateSystem';
import type { EntityVisualState } from '@/config/entityStates';
import { syncIris } from '@/systems/irisSystem';
import { shared } from '@/systems/sharedUniforms';

import EntityCamera from './EntityCamera';
import EntityLighting from './EntityLighting';
import EntityCore from './EntityCore';
import EntityIris from './EntityIris';
import IrisFilaments from './IrisFilaments';
import ParticleRings from './ParticleRings';
import ParticleField from './ParticleField';
import DataFragments from './DataFragments';
import NeuralSplines from './NeuralSplines';
import EntityPostFX from './EntityPostFX';
import DebugPanel from './DebugPanel';

/* ------------------------------------------------------------------ */
/*  Scene plumbing                                                     */
/* ------------------------------------------------------------------ */

function InteractionController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    interaction.setCamera(camera);
    return interaction.attach(gl.domElement);
  }, [camera, gl]);

  useFrame((_, dt) => {
    interaction.update(Math.min(dt, 0.05), camera);
    syncIris();
  }, -100);

  return null;
}

function PerfMonitor() {
  useFrame((_, dt) => perf.frame(dt, performance.now()));
  return null;
}

/** drives the BLUE <-> RED transition engine after the base simulation */
function StateController() {
  useFrame((_, dt) => {
    stateSystem.update(Math.min(dt, 0.05));
    if (typeof window !== 'undefined') {
      (window as unknown as { __entity?: object }).__entity = {
        mix: stateSystem.mixValue,
        behavior: stateSystem.behaviorMix,
        t: stateSystem.progress,
        target: stateSystem.targetName,
      };
    }
  });
  return null;
}

function PixelScaleSync() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => {
    const h = size.height * dpr;
    shared.uPointScale.value = h / (2 * Math.tan((WORLD.cameraFov * Math.PI) / 360));
    shared.uPixelRatio.value = dpr;
  }, [size, dpr]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export default function EntityScene() {
  const [quality, setQuality] = useState<QualityName>('MEDIUM');
  const [buildTick, setBuildTick] = useState(0);
  const [debug, setDebug] = useState(false);
  const [mode, setMode] = useState<EntityVisualState>('BLUE');

  const preset = QUALITY_PRESETS[quality];

  const requestState = useCallback((next: EntityVisualState) => {
    stateSystem.request(next);
  }, []);

  useEffect(() => {
    const auto = urlParam('quality') === null;
    perf.start(detectInitialQuality(), auto);
    setQuality(perf.quality);
    return perf.subscribe(setQuality);
  }, []);

  useEffect(() => {
    // initial visual state from URL (?state=red), without a transition
    const initial = urlParam('state');
    stateSystem.init(
      initial && initial.toUpperCase() === 'RED' ? 'RED' : 'BLUE',
      true,
    );
    return stateSystem.subscribe(setMode);
  }, []);

  useEffect(() => {
    setDebug(debugWanted());
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'b') stateSystem.request('BLUE');
      if (k === 'r') stateSystem.request('RED');
      if (e.key === '`' || e.key === '~') {
        setDebug((d) => {
          const next = !d;
          try {
            sessionStorage.setItem('entity-debug', next ? '1' : '0');
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rebuild = useCallback(() => setBuildTick((t) => t + 1), []);

  const counts = useMemo(() => {
    void buildTick; // counts re-derive only on quality change or debug rebuild
    return {
      field: Math.round(perf.quality === quality ? QUALITY_PRESETS[quality].field * tunables.fieldDensity : QUALITY_PRESETS[quality].field),
      rings: Math.round(QUALITY_PRESETS[quality].ringParticles),
      ringCount: Math.round(QUALITY_PRESETS[quality].ringCount * tunables.ringCount),
      filaments: Math.round(QUALITY_PRESETS[quality].filaments * tunables.filamentDensity),
      fragments: Math.round(QUALITY_PRESETS[quality].fragments * tunables.fragmentDensity),
      splines: Math.round(QUALITY_PRESETS[quality].splines * tunables.splineCount),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, buildTick]);

  const key = `${quality}-${buildTick}`;

  return (
    <>
      <Canvas
        dpr={[1, preset.dpr]}
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: WORLD.cameraFov,
          near: 0.1,
          far: WORLD.cameraFar,
          position: [0, 0.15, 9.6],
        }}
      >
        <color attach="background" args={['#02040A']} />
        <InteractionController />
        <StateController />
        <PerfMonitor />
        <PixelScaleSync />
        <EntityCamera />
        <EntityLighting />
        <EntityCore />
        <EntityIris />
        <IrisFilaments key={`fil-${key}`} count={counts.filaments} />
        <NeuralSplines key={`spl-${key}`} count={counts.splines} />
        <ParticleRings key={`rng-${key}`} ringCount={counts.ringCount} particles={counts.rings} />
        <ParticleField key={`fld-${key}`} count={counts.field} />
        <DataFragments key={`dat-${key}`} count={counts.fragments} />
        <EntityPostFX dof={preset.dof} smear={preset.smear} />
        <AdaptiveDpr />
      </Canvas>

      <div className="fx-intro" aria-hidden />
      <div className="fx-title" aria-hidden>
        <span>THE&nbsp;ENTITY</span>
        <em>{mode === 'RED' ? 'RED STATE' : 'BLUE STATE'}</em>
      </div>

      <div className={mode === 'RED' ? 'state-switch red' : 'state-switch'} role="group" aria-label="Entity state">
        <button type="button" data-active={mode === 'BLUE'} onClick={() => requestState('BLUE')}>
          BLUE
        </button>
        <span className="state-switch-sep" aria-hidden />
        <button type="button" data-active={mode === 'RED'} onClick={() => requestState('RED')}>
          RED
        </button>
      </div>

      {debug && <DebugPanel onRebuild={rebuild} quality={quality} mode={mode} onState={requestState} />}
      {debug && (
        <div className="debug-hint">
          ` toggle · move cursor · click = pulse
        </div>
      )}
    </>
  );
}

// keep THREE referenced for types
void THREE;
