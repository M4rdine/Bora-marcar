import type { DayRecommendation, HourScore, LocalDateTime } from '@/domain';

/** Uma hora da cronologia. `dayOffset` é 0 para hoje e 1 para amanhã; a lista nunca vai além. */
export type TimelineHour = {
  readonly hour: HourScore;
  readonly isNow: boolean;
  readonly dayOffset: 0 | 1;
};

const DEFAULT_MAX_HOURS = 24;

type Input = {
  readonly today: DayRecommendation;
  readonly tomorrow: DayRecommendation | null;
  readonly now: LocalDateTime;
  readonly maxHours?: number;
};

/**
 * A cronologia começa na hora atual, segue até o fim de hoje e entra em amanhã, cortada em
 * `maxHours`. Horas que já passaram ficam de fora: não se planeja para trás, e mantê-las só
 * empurraria o que interessa para longe do topo.
 */
export function buildHourlySequence({
  today,
  tomorrow,
  now,
  maxHours = DEFAULT_MAX_HOURS,
}: Input): readonly TimelineHour[] {
  const rest: readonly TimelineHour[] = today.hours
    .filter((h) => h.hour.hour >= now.hour)
    .map((h) => ({ hour: h, isNow: h.hour.hour === now.hour, dayOffset: 0 }));
  const next: readonly TimelineHour[] = (tomorrow?.hours ?? []).map((h) => ({
    hour: h,
    isNow: false,
    dayOffset: 1,
  }));
  return [...rest, ...next].slice(0, maxHours);
}

/**
 * Cronologia de um dia inteiro, para a tela de um dia específico: sem "agora", sem corte, na
 * ordem do relógio. Todas as horas ficam no bloco 0, que é o único dia que essa tela mostra.
 */
export function buildDaySequence(day: DayRecommendation): readonly TimelineHour[] {
  return day.hours.map((hour) => ({ hour, isNow: false, dayOffset: 0 }));
}

/** A melhor hora da cronologia, para destacá-la sem transformar a recomendação em veredito. */
export function bestOfSequence(sequence: readonly TimelineHour[]): TimelineHour | null {
  return sequence.reduce<TimelineHour | null>(
    (acc, item) => (acc === null || item.hour.score > acc.hour.score ? item : acc),
    null,
  );
}

/**
 * TODAS as horas empatadas na melhor nota, e não só a primeira delas.
 *
 * Marcar apenas a primeira era desonesto: num dia em que oito horas empatam em 100, dizer que a
 * melhor é a das 7h esconde que qualquer uma das oito serve. Marcar as oito conta a verdade, e a
 * verdade aqui é uma informação útil — o dia inteiro está bom, escolha pela sua agenda.
 */
export function bestHoursOf(sequence: readonly TimelineHour[]): ReadonlySet<string> {
  const best = bestOfSequence(sequence);
  if (best === null) return new Set();
  return new Set(
    sequence
      .filter((item) => item.hour.score === best.hour.score)
      .map((item) => item.hour.hour.time),
  );
}
