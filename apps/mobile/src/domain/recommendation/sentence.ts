import { FACTOR_IDS, type ActivityProfile, type FactorId } from '../activities/types';

import {
  averageFactor,
  describeRain,
  describeSun,
  describeThermal,
  describeUv,
  describeWind,
} from './descriptors';
import type { HourScore } from './scoreHour';
import type { TimeWindow } from './windows';

const MAX_FACTORS = 3;
const MIN_THIRD_WEIGHT = 0.1;
const CAVEAT_LOOKBACK_HOURS = 3;
const CAVEAT_COMFORT = 0.5;

type CaveatFactor = Exclude<FactorId, 'sun'>;

function rankedFactors(profile: ActivityProfile): readonly FactorId[] {
  const sorted = [...FACTOR_IDS]
    .filter((f) => profile.weights[f] > 0)
    .sort(
      (a, b) =>
        profile.weights[b] - profile.weights[a] || FACTOR_IDS.indexOf(a) - FACTOR_IDS.indexOf(b),
    );
  const top = sorted.slice(0, MAX_FACTORS);
  const third = top[2];
  return third !== undefined && profile.weights[third] < MIN_THIRD_WEIGHT ? top.slice(0, 2) : top;
}

function phraseFor(f: FactorId, value: number): string {
  switch (f) {
    case 'thermal':
      return `sensação de ${Math.round(value)}°`;
    case 'rain':
      return describeRain(value);
    case 'wind':
      return `vento ${describeWind(value)}`;
    case 'uv':
      return `UV ${describeUv(value)}`;
    case 'sun':
      return describeSun(value);
  }
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function joinPtBr(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

export function buildSentence(windowHours: readonly HourScore[], profile: ActivityProfile): string {
  const raw = windowHours.map((h) => h.hour);
  const parts = rankedFactors(profile).map((f) => phraseFor(f, averageFactor(f, raw)));
  return `${capitalize(joinPtBr(parts))}.`;
}

function caveatFor(f: CaveatFactor, startHour: number, value: number): string {
  switch (f) {
    case 'uv':
      return `Antes das ${startHour}h o UV está alto: melhor esperar.`;
    case 'rain':
      return `Antes das ${startHour}h há chance de chuva.`;
    case 'thermal':
      return `Antes das ${startHour}h a sensação térmica está ${describeThermal(value)}.`;
    case 'wind':
      return `Antes das ${startHour}h o vento está forte.`;
  }
}

export function buildCaveat(
  dayHours: readonly HourScore[],
  window: TimeWindow,
  profile: ActivityProfile,
): string | null {
  const before = dayHours.filter(
    (h) =>
      h.hour.hour < window.startHour && h.hour.hour >= window.startHour - CAVEAT_LOOKBACK_HOURS,
  );
  if (before.length === 0) return null;
  const problems = FACTOR_IDS.filter(
    (f): f is CaveatFactor => f !== 'sun' && profile.weights[f] > 0,
  )
    .map((f) => ({ f, comfort: Math.min(...before.map((h) => h.comforts[f])) }))
    .filter(({ comfort }) => comfort < CAVEAT_COMFORT)
    .sort((a, b) => a.comfort - b.comfort);
  const worst = problems[0];
  if (!worst) return null;
  const worstHour = before.reduce((acc, h) =>
    h.comforts[worst.f] < acc.comforts[worst.f] ? h : acc,
  );
  return caveatFor(worst.f, window.startHour, averageFactor(worst.f, [worstHour.hour]));
}
