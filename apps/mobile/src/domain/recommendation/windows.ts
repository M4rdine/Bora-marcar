import { FACTOR_IDS, type FactorId } from '../activities/types';
import type { EngineConfig } from '../config/types';

import type { HourScore } from './scoreHour';
import type { VetoId } from './vetoes';

export type TimeWindow = {
  readonly date: string;
  readonly startHour: number;
  readonly endHour: number; // exclusivo
};

export type WindowResult =
  | {
      readonly kind: 'window';
      readonly window: TimeWindow;
      readonly hours: readonly HourScore[];
      readonly score: number;
    }
  | {
      readonly kind: 'none';
      readonly best: HourScore | null;
      readonly dominant: FactorId | VetoId | null;
    };

type Clock = { readonly hour: number; readonly minute: number };
type Candidate = {
  readonly hours: readonly HourScore[];
  readonly mean: number;
  readonly rank: number;
};

const MINUTES_PER_HOUR = 60;

export function candidateHours(
  dayHours: readonly HourScore[],
  now: Clock | null,
  cfg: EngineConfig,
): readonly HourScore[] {
  if (now === null) return dayHours;
  const remaining = MINUTES_PER_HOUR - now.minute;
  const firstHour = remaining >= cfg.window.minRemainingMinutes ? now.hour : now.hour + 1;
  return dayHours.filter((h) => h.hour.hour >= firstHour);
}

// hours[i] existe para todo i < hours.length - 1, então o acesso abaixo nunca é undefined.
const isContiguous = (hours: readonly HourScore[]): boolean =>
  hours.slice(1).every((h, i) => h.hour.hour === (hours[i] as HourScore).hour.hour + 1);

const mean = (hours: readonly HourScore[]): number =>
  hours.reduce((acc, h) => acc + h.score, 0) / hours.length;

function slidingCandidates(
  hours: readonly HourScore[],
  size: number,
  rules: { minHourScore: number; lengthBonus: number },
): Candidate[] {
  return hours
    .map((_, start) => hours.slice(start, start + size))
    .filter((slice) => slice.length === size && isContiguous(slice))
    .filter((slice) => slice.every((h) => h.score >= rules.minHourScore))
    .map((slice) => {
      const m = mean(slice);
      return { hours: slice, mean: m, rank: m + rules.lengthBonus * (size - 1) };
    });
}

const EPSILON = 1e-9;

/**
 * Ranking maior vence; em empate exato (dentro de EPSILON) vence quem começa mais cedo;
 * se o início também empatar, vence a candidata mais longa.
 */
function better(candidate: Candidate, current: Candidate | null): boolean {
  if (current === null) return true;
  if (candidate.rank > current.rank + EPSILON) return true;
  if (candidate.rank < current.rank - EPSILON) return false;
  // hours[0] sempre existe: slidingCandidates exige slice.length === size e sizes não contém 0
  const candidateStart = (candidate.hours[0] as HourScore).hour.hour;
  const currentStart = (current.hours[0] as HourScore).hour.hour;
  if (candidateStart !== currentStart) return candidateStart < currentStart;
  return candidate.hours.length > current.hours.length;
}

export function dominantProblem(h: HourScore): FactorId | VetoId {
  if (h.veto !== null) return h.veto;
  return FACTOR_IDS.reduce(
    (worst, f) => (h.comforts[f] < h.comforts[worst] ? f : worst),
    'thermal',
  );
}

function noWindow(candidates: readonly HourScore[]): WindowResult {
  const best = candidates.reduce<HourScore | null>(
    (acc, h) => (acc === null || h.score > acc.score ? h : acc),
    null,
  );
  return { kind: 'none', best, dominant: best === null ? null : dominantProblem(best) };
}

export function findBestWindow(candidates: readonly HourScore[], cfg: EngineConfig): WindowResult {
  const all = cfg.window.sizes.flatMap((size) => slidingCandidates(candidates, size, cfg.window));
  // em empate exato de ranking, better() decide pela mais cedo (e, se também empatar, a mais longa)
  const winner = all.reduce<Candidate | null>((acc, c) => (better(c, acc) ? c : acc), null);
  if (winner === null) return noWindow(candidates);
  // winner.hours nunca é vazio: slidingCandidates exige slice.length === size e sizes não contém 0
  const first = winner.hours[0] as HourScore;
  const last = winner.hours[winner.hours.length - 1] as HourScore;
  return {
    kind: 'window',
    window: { date: first.hour.date, startHour: first.hour.hour, endHour: last.hour.hour + 1 },
    hours: winner.hours,
    score: Math.round(winner.mean),
  };
}

export function isWithinWindow(window: TimeWindow, now: Clock, graceHours: number): boolean {
  const minutes = now.hour * MINUTES_PER_HOUR + now.minute;
  const start = window.startHour * MINUTES_PER_HOUR;
  const end = (window.endHour + graceHours) * MINUTES_PER_HOUR;
  return minutes >= start && minutes < end;
}
