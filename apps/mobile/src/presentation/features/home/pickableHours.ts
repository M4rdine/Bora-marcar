import type { DayRecommendation, LocalDateTime, ScoreLabel } from '@/domain';

export type PickableHour = {
  readonly hour: number;
  readonly score: number;
  readonly label: ScoreLabel;
};

/** Horas de 0 até `now.hour` (inclusive), com o score de cada uma — opções do seletor usado ao
 * registrar uma atividade fora de um plano ("Saí em outro horário"). */
export function pickableHours(
  today: DayRecommendation,
  now: LocalDateTime,
): readonly PickableHour[] {
  return today.hours
    .filter((h) => h.hour.hour <= now.hour)
    .map((h) => ({ hour: h.hour.hour, score: h.score, label: h.label }));
}
