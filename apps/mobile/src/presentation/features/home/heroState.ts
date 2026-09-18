import {
  isWithinWindow,
  planFor,
  type ActivePlan,
  type ActivityId,
  type ActivityRecord,
  type DayRecommendation,
  type LocalDateTime,
  type Progress,
  type TimeWindow,
} from '@/domain';

export type HeroState =
  | {
      readonly kind: 'plan';
      readonly day: DayRecommendation;
      readonly window: TimeWindow;
      readonly score: number;
    }
  | { readonly kind: 'planned'; readonly plan: ActivePlan }
  | { readonly kind: 'confirm'; readonly plan: ActivePlan; readonly nowScore: number | null }
  | { readonly kind: 'done'; readonly record: ActivityRecord }
  | {
      readonly kind: 'logNoPlan';
      readonly day: DayRecommendation;
      readonly expiredPlan: ActivePlan | null;
      /**
       * A melhor hora que JÁ PASSOU hoje, quando havia alguma razoável.
       *
       * Sem ela o cartão dizia "sua janela de hoje já passou" e parava: a frase sugeria um
       * compromisso que a pessoa nunca marcou, e não dizia quando foram as boas horas — que é a
       * única informação útil ali. Em Sinop, às 9h58, a melhor hora para corrida tinha sido de
       * madrugada, e a tela não contava isso.
       */
      readonly bestPast: { readonly hour: number; readonly score: number } | null;
    }
  | { readonly kind: 'noWindow'; readonly day: DayRecommendation };

type Input = {
  readonly today: DayRecommendation;
  /** A atividade selecionada. O cartão é DELA: outra atividade tem outro plano e outro registro. */
  readonly activity: ActivityId;
  readonly now: LocalDateTime;
  readonly progress: Progress;
  readonly graceHours: number;
  readonly fairThreshold: number;
};

const MINUTES_PER_HOUR = 60;

/** A melhor hora já passada do dia que ainda valia a pena. `null` quando nenhuma valia. */
function bestPastHour(
  today: DayRecommendation,
  now: LocalDateTime,
  fairThreshold: number,
): { readonly hour: number; readonly score: number } | null {
  return today.hours.reduce<{ hour: number; score: number } | null>((melhor, h) => {
    if (h.hour.hour >= now.hour || h.score < fairThreshold) return melhor;
    return melhor === null || h.score > melhor.score
      ? { hour: h.hour.hour, score: h.score }
      : melhor;
  }, null);
}

/**
 * "Sem janela boa" só vale quando o dia inteiro é ruim. Se o dia tinha horas boas e elas já
 * passaram (ou o plano expirou), o herói convida a registrar em vez de culpar o clima.
 */
export function deriveHeroState({
  today,
  activity,
  now,
  progress,
  graceHours,
  fairThreshold,
}: Input): HeroState {
  // Registro e plano são lidos pela atividade selecionada. Antes vinham do dia inteiro, e quem
  // tinha ciclismo marcado via o cartão de ciclismo mesmo com corrida selecionada — trocar de aba
  // não mudava nada na tela.
  const record = progress.records.findLast((r) => r.date === now.date && r.activity === activity);
  if (record !== undefined) return { kind: 'done', record };
  const plan = planFor(progress.todayPlans, activity);
  if (plan !== null) {
    if (isWithinWindow(plan.window, now, graceHours)) {
      const nowScore = today.hours.find((h) => h.hour.hour === now.hour)?.score ?? null;
      return { kind: 'confirm', plan, nowScore };
    }
    const nowMinutes = now.hour * MINUTES_PER_HOUR + now.minute;
    if (nowMinutes < plan.window.startHour * MINUTES_PER_HOUR) return { kind: 'planned', plan };
    return {
      kind: 'logNoPlan',
      day: today,
      expiredPlan: plan,
      bestPast: bestPastHour(today, now, fairThreshold),
    };
  }
  if (today.result.kind === 'window')
    return { kind: 'plan', day: today, window: today.result.window, score: today.result.score };
  if (today.bestScoreOfDay !== null && today.bestScoreOfDay >= fairThreshold)
    return {
      kind: 'logNoPlan',
      day: today,
      expiredPlan: null,
      bestPast: bestPastHour(today, now, fairThreshold),
    };
  return { kind: 'noWindow', day: today };
}
