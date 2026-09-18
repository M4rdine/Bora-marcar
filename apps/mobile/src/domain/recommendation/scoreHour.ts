import { FACTOR_IDS, type ActivityProfile, type FactorId } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { HourlyConditions } from '../forecast/types';

import {
  pressureComfort,
  rainComfort,
  sunComfort,
  thermalComfort,
  uvComfort,
  windComfort,
} from './comfort';
import { applyVetoes, type VetoId } from './vetoes';

export type ScoreLabel = 'great' | 'good' | 'fair' | 'poor';

export type HourScore = {
  readonly hour: HourlyConditions;
  readonly score: number;
  readonly comforts: Readonly<Record<FactorId, number>>;
  readonly veto: VetoId | null;
  readonly label: ScoreLabel;
};

export function labelFor(score: number, cfg: EngineConfig): ScoreLabel {
  if (score >= cfg.scores.great) return 'great';
  if (score >= cfg.scores.good) return 'good';
  if (score >= cfg.scores.fair) return 'fair';
  return 'poor';
}

export function comfortsFor(h: HourlyConditions, p: ActivityProfile): Record<FactorId, number> {
  return {
    thermal: thermalComfort(h.apparentTemperature, p.thermal),
    rain: rainComfort(h.precipitationProbability, h.precipitationMm),
    wind: windComfort(h.windSpeedKmh, h.windGustsKmh, p.wind),
    uv: uvComfort(h.uvIndex, p.uv),
    sun: sunComfort(h.cloudCoverPct),
    pressure: pressureComfort(h.pressureTrendHpa),
  };
}

export function scoreHour(
  h: HourlyConditions,
  profile: ActivityProfile,
  cfg: EngineConfig,
): HourScore {
  const comforts = comfortsFor(h, profile);
  const weighted = FACTOR_IDS.reduce((acc, f) => acc + profile.weights[f] * comforts[f], 0);
  const light = h.isDay ? 1 : profile.nightFactor;
  const base = Math.round(100 * weighted * light);
  const { score, veto } = applyVetoes(h, profile, base);
  return { hour: h, score, comforts, veto, label: labelFor(score, cfg) };
}
