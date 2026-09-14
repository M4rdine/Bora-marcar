import { addDays } from '../time/localDateTime';

const MAX_LOOKBACK_DAYS = 400;

/**
 * Dias consecutivos com atividade, olhando de hoje para trás.
 * Hoje sem atividade não quebra (o dia ainda não acabou).
 * Dias em restDates (folga por mau tempo) são pulados sem contar nem quebrar.
 */
export function computeStreak(
  activeDates: ReadonlySet<string>,
  restDates: ReadonlySet<string>,
  today: string,
): number {
  const start = activeDates.has(today) ? today : addDays(today, -1);
  const dates = Array.from({ length: MAX_LOOKBACK_DAYS }, (_, i) => addDays(start, -i));
  const firstMiss = dates.findIndex((d) => !activeDates.has(d) && !restDates.has(d));
  const run = firstMiss === -1 ? dates : dates.slice(0, firstMiss);
  return run.filter((d) => activeDates.has(d)).length;
}
