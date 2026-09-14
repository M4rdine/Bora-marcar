import type { ActivityProfile } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { Forecast } from '../forecast/types';
import type { LocalDateTime } from '../time/localDateTime';

import { recommendDay, type DayRecommendation } from './recommendDay';
import type { HourScore } from './scoreHour';
import { isWithinWindow } from './windows';

export type Comparison = 'tomorrowBetter' | 'todayBestOfWeek' | null;

export type Overview = {
  readonly today: DayRecommendation;
  readonly nextDays: readonly DayRecommendation[];
  readonly now: HourScore | null;
  readonly nowInWindow: boolean;
  readonly bestDate: string | null;
  readonly comparison: Comparison;
};

const NEXT_DAYS = 4;
const TOMORROW_BETTER_BY = 10;

const windowScore = (d: DayRecommendation): number | null =>
  d.result.kind === 'window' ? d.result.score : null;

function pickBestDate(days: readonly DayRecommendation[]): string | null {
  return (
    days.reduce<{ date: string; score: number } | null>((acc, d) => {
      const s = windowScore(d);
      if (s === null) return acc;
      return acc === null || s > acc.score ? { date: d.date, score: s } : acc;
    }, null)?.date ?? null
  );
}

function compare(
  today: DayRecommendation,
  tomorrow: DayRecommendation | undefined,
  bestDate: string | null,
): Comparison {
  const todayScore = windowScore(today);
  const tomorrowScore = tomorrow ? windowScore(tomorrow) : null;
  if (
    tomorrowScore !== null &&
    (todayScore === null || tomorrowScore - todayScore >= TOMORROW_BETTER_BY)
  ) {
    return 'tomorrowBetter';
  }
  if (todayScore !== null && bestDate === today.date) return 'todayBestOfWeek';
  return null;
}

export function recommendOverview(
  forecast: Forecast,
  profile: ActivityProfile,
  cfg: EngineConfig,
  now: LocalDateTime,
): Overview {
  const today = recommendDay(forecast, profile, cfg, { date: now.date, now });
  const futureDates = forecast.daily
    .map((d) => d.date)
    .filter((d) => d > now.date)
    .slice(0, NEXT_DAYS);
  const nextDays = futureDates.map((date) => recommendDay(forecast, profile, cfg, { date }));
  const nowScore = today.hours.find((h) => h.hour.hour === now.hour) ?? null;
  const nowInWindow =
    today.result.kind === 'window' &&
    isWithinWindow(today.result.window, now, cfg.window.graceHoursAfterEnd);
  const bestDate = pickBestDate([today, ...nextDays]);
  return {
    today,
    nextDays,
    now: nowScore,
    nowInWindow,
    bestDate,
    comparison: compare(today, nextDays[0], bestDate),
  };
}
