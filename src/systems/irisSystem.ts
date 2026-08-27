import { shared } from './sharedUniforms';
import { tunables, WORLD } from '@/config/entityConfig';

/**
 * Iris geometry parameters. The pupil must remain visually stable while the
 * iris continuously evolves — only gentle, low-frequency scaling is allowed,
 * driven from the shared state (breathing / contraction happen in-shader).
 */
export function syncIris() {
  const s = Math.max(0.35, Math.min(2.2, tunables.irisScale));
  shared.uIrisRadius.value = WORLD.irisRadius * s;
  shared.uPupilRadius.value = WORLD.pupilRadius * (0.55 + 0.45 * s);
}
