import type { ActivityProfile } from '../activities/types';
import type { HourlyConditions } from '../forecast/types';

export type VetoId = 'storm' | 'rain' | 'snow' | 'thermal';

type Veto = { readonly id: VetoId; readonly cap: number };

const STORM_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);
const RAIN_PROB_VETO = 80;
const RAIN_MM_VETO = 1;
const FOG_CYCLING_FACTOR = 0.6;

const CAPS = { storm: 0, rain: 20, snow: 20, thermal: 30 } as const;

function collectVetoes(h: HourlyConditions, p: ActivityProfile): readonly Veto[] {
  const outOfTolerance =
    h.apparentTemperature < p.thermal.tolMin || h.apparentTemperature > p.thermal.tolMax;
  const candidates: readonly (Veto | null)[] = [
    STORM_CODES.has(h.weatherCode) ? { id: 'storm', cap: CAPS.storm } : null,
    h.precipitationProbability >= RAIN_PROB_VETO || h.precipitationMm >= RAIN_MM_VETO
      ? { id: 'rain', cap: CAPS.rain }
      : null,
    SNOW_CODES.has(h.weatherCode) ? { id: 'snow', cap: CAPS.snow } : null,
    outOfTolerance ? { id: 'thermal', cap: CAPS.thermal } : null,
  ];
  return candidates.filter((v): v is Veto => v !== null);
}

export function applyVetoes(
  h: HourlyConditions,
  profile: ActivityProfile,
  baseScore: number,
): { score: number; veto: VetoId | null } {
  const fogAdjusted =
    profile.id === 'cycle' && FOG_CODES.has(h.weatherCode)
      ? Math.round(baseScore * FOG_CYCLING_FACTOR)
      : baseScore;
  const vetoes = collectVetoes(h, profile);
  const strongest = vetoes.reduce<Veto | null>(
    (acc, v) => (acc === null || v.cap < acc.cap ? v : acc),
    null,
  );
  if (strongest === null) return { score: fogAdjusted, veto: null };
  return { score: Math.min(fogAdjusted, strongest.cap), veto: strongest.id };
}
