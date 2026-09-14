import {
  localNow,
  recommendOverview,
  type ActivityId,
  type EngineConfig,
  type Forecast,
  type LocalDateTime,
  type Overview,
} from '@/domain';

type Input = {
  readonly forecast: Forecast;
  readonly activity: ActivityId;
  readonly config: EngineConfig;
  readonly nowEpochMs: number;
};
export type OverviewSnapshot = { readonly overview: Overview; readonly now: LocalDateTime };

export function buildOverview({ forecast, activity, config, nowEpochMs }: Input): OverviewSnapshot {
  const now = localNow(nowEpochMs, forecast.utcOffsetSeconds);
  const overview = recommendOverview(forecast, config.activities[activity], config, now);
  return { overview, now };
}
