import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import type { DayRecommendation, EngineConfig, Progress } from '@/domain';

import { phaseFor, type SkyPhase } from '../../ui';

type Input = {
  readonly city: City | null;
  readonly snapshot: OverviewSnapshot | null;
  readonly config: EngineConfig | undefined;
  readonly progress: Progress | undefined;
  readonly date: string;
  readonly isToday: boolean;
};

export type DayScreenState = {
  readonly day: DayRecommendation | null;
  readonly phase: SkyPhase;
  readonly ready: boolean;
};

/** Deriva o dia visitado, a fase do céu e se há dados suficientes para renderizar o conteúdo. */
export function dayScreenState({
  city,
  snapshot,
  config,
  progress,
  date,
  isToday,
}: Input): DayScreenState {
  const day =
    snapshot && !isToday ? (snapshot.overview.nextDays.find((d) => d.date === date) ?? null) : null;
  const isBadDay =
    day !== null &&
    day.bestScoreOfDay !== null &&
    config !== undefined &&
    day.bestScoreOfDay < config.scores.fair;
  const phase = snapshot
    ? phaseFor({ now: { ...snapshot.now, hour: 12 }, daily: day?.daily ?? null, isBadDay })
    : 'day';
  const ready =
    city !== null && snapshot !== null && config !== undefined && progress !== undefined;
  return { day, phase, ready };
}
