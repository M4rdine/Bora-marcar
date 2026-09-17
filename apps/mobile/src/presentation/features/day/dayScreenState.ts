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
  // O céu de um dia futuro não pode ser "agora", que é outro dia, nem um meio-dia mágico. Mostra
  // a hora que a tela está recomendando: se a melhor janela é às 7h, o céu amanhece, e a
  // atmosfera passa a dizer algo verdadeiro sobre aquele dia em vez de decorar.
  const phase = snapshot
    ? phaseFor({
        now: { ...snapshot.now, hour: featuredHour(day) },
        daily: day?.daily ?? null,
        isBadDay,
      })
    : 'day';
  const ready =
    city !== null && snapshot !== null && config !== undefined && progress !== undefined;
  return { day, phase, ready };
}

/** Hora que representa o dia: o começo da janela recomendada; sem janela, o meio da tarde. */
const MIDDAY = 12;
function featuredHour(day: DayRecommendation | null): number {
  if (day === null) return MIDDAY;
  if (day.result.kind === 'window') return day.result.window.startHour;
  return day.result.best?.hour.hour ?? MIDDAY;
}
