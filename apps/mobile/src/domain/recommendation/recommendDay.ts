import type { ActivityId, ActivityProfile } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { DailySummary, Forecast } from '../forecast/types';

import { labelFor, scoreHour, type HourScore, type ScoreLabel } from './scoreHour';
import { buildCaveat, buildSentence } from './sentence';
import { preparationTips, type Tip } from './tips';
import { candidateHours, findBestWindow, type WindowResult } from './windows';

export type DayRecommendation = {
  readonly date: string;
  readonly activityId: ActivityId;
  readonly hours: readonly HourScore[];
  readonly result: WindowResult;
  readonly score: number | null;
  readonly label: ScoreLabel | null;
  readonly sentence: string | null;
  readonly caveat: string | null;
  readonly tips: readonly Tip[];
  readonly daily: DailySummary | null;
};

type Options = { readonly date: string; readonly now?: { hour: number; minute: number } | null };

export function recommendDay(
  forecast: Forecast,
  profile: ActivityProfile,
  cfg: EngineConfig,
  opts: Options,
): DayRecommendation {
  const raw = forecast.hourly.filter((h) => h.date === opts.date);
  const hours = raw.map((h) => scoreHour(h, profile, cfg));
  const result = findBestWindow(candidateHours(hours, opts.now ?? null, cfg), cfg);
  const daily = forecast.daily.find((d) => d.date === opts.date) ?? null;
  const base = { date: opts.date, activityId: profile.id, hours, result, daily };

  if (result.kind === 'window') {
    return {
      ...base,
      score: result.score,
      label: labelFor(result.score, cfg),
      sentence: buildSentence(result.hours, profile),
      caveat: buildCaveat(hours, result.window, profile),
      tips: preparationTips(raw, result.window, cfg),
    };
  }
  const score = result.best?.score ?? null;
  return {
    ...base,
    score,
    label: score === null ? null : labelFor(score, cfg),
    sentence: null,
    caveat: null,
    tips: [],
  };
}
