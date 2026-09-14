import {
  localNow,
  recommendOverview,
  type ActivityId,
  type EngineConfig,
  type Forecast,
  type LocalDateTime,
  type Overview,
} from '@/domain';

import type { Clock } from '../ports';

type Deps = { readonly clock: Clock };
type Input = {
  readonly forecast: Forecast;
  readonly activity: ActivityId;
  readonly config: EngineConfig;
};
export type OverviewSnapshot = { readonly overview: Overview; readonly now: LocalDateTime };

export const buildOverview =
  ({ clock }: Deps) =>
  ({ forecast, activity, config }: Input): OverviewSnapshot => {
    const now = localNow(clock.now(), forecast.utcOffsetSeconds);
    const overview = recommendOverview(forecast, config.activities[activity], config, now);
    return { overview, now };
  };
