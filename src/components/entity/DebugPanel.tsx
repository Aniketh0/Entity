'use client';

import { useEffect, useRef, useState } from 'react';
import { tunables, type QualityName } from '@/config/entityConfig';
import { perf } from '@/systems/performanceSystem';
import { interaction } from '@/systems/interactionSystem';

interface SliderDef {
  key: keyof typeof tunables;
  label: string;
  min: number;
  max: number;
  step: number;
  rebuild?: boolean;
}

const SLIDERS: SliderDef[] = [
  { key: 'masterBrightness', label: 'brightness', min: 0.2, max: 2, step: 0.01 },
  { key: 'irisBrightness', label: 'iris bright', min: 0.2, max: 2.5, step: 0.01 },
  { key: 'irisScale', label: 'iris scale', min: 0.5, max: 1.8, step: 0.01 },
  { key: 'bloom', label: 'bloom', min: 0, max: 2.5, step: 0.01 },
  { key: 'noiseStrength', label: 'noise', min: 0, max: 2, step: 0.01 },
  { key: 'turbulence', label: 'turbulence', min: 0.1, max: 3, step: 0.01 },
  { key: 'cameraDepth', label: 'camera depth', min: 5.5, max: 10.5, step: 0.05 },
  { key: 'interactionStrength', label: 'interaction', min: 0, max: 2, step: 0.01 },
  { key: 'grain', label: 'grain', min: 0, max: 3, step: 0.01 },
  { key: 'fieldDensity', label: 'field density', min: 0.2, max: 1.6, step: 0.05, rebuild: true },
  { key: 'ringCount', label: 'ring count', min: 0.3, max: 1.6, step: 0.05, rebuild: true },
  { key: 'filamentDensity', label: 'filaments', min: 0.2, max: 2, step: 0.05, rebuild: true },
  { key: 'fragmentDensity', label: 'fragments', min: 0.2, max: 2, step: 0.05, rebuild: true },
  { key: 'splineCount', label: 'splines', min: 0.3, max: 2, step: 0.05, rebuild: true },
];

/**
 * Development-only control surface. Never visible in cinematic
 * production mode (toggle with ` or ?debug=1).
 */
export default function DebugPanel({
  onRebuild,
  quality,
  mode,
  onState,
}: {
  onRebuild: () => void;
  quality: QualityName;
  mode: 'BLUE' | 'RED';
  onState: (s: 'BLUE' | 'RED') => void;
}) {
  const [, force] = useState(0);
  const [fps, setFps] = useState(0);
  const [state, setState] = useState('—');
  const rebuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setFps(Math.round(perf.fps));
      setState(interaction.stateName);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const onChange = (def: SliderDef, v: number) => {
    (tunables[def.key] as number) = v;
    force((n) => n + 1);
    if (def.rebuild) {
      if (rebuildTimer.current) clearTimeout(rebuildTimer.current);
      rebuildTimer.current = setTimeout(() => onRebuild(), 350);
    }
  };

  return (
    <div className="debug-panel">
      <h2>ENTITY · DEBUG</h2>
      {SLIDERS.map((def) => (
        <div className="debug-row" key={def.key}>
          <label>{def.label}</label>
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={tunables[def.key] as number}
            onChange={(e) => onChange(def, parseFloat(e.target.value))}
          />
          <output>{(tunables[def.key] as number).toFixed(2)}</output>
        </div>
      ))}
      <div className="debug-meta">
        <span>{fps} FPS</span>
        <span>{quality}</span>
        <span>{state}</span>
      </div>
      <div className="debug-state-row">
        <button
          className="debug-button debug-state"
          data-active={mode === 'BLUE'}
          onClick={() => onState('BLUE')}
        >
          BLUE STATE
        </button>
        <button
          className="debug-button debug-state"
          data-active={mode === 'RED'}
          onClick={() => onState('RED')}
        >
          RED STATE
        </button>
      </div>
      <button className="debug-button" onClick={onRebuild}>
        REBUILD SYSTEMS
      </button>
    </div>
  );
}
