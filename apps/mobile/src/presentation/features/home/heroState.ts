import {
  isWithinWindow,
  type ActivePlan,
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
    }
  | { readonly kind: 'noWindow'; readonly day: DayRecommendation };

type Input = {
  readonly today: DayRecommendation;
  readonly now: LocalDateTime;
  readonly progress: Progress;
  readonly graceHours: number;
  readonly fairThreshold: number;
};

const MINUTES_PER_HOUR = 60;

/**
 * "Sem janela boa" só vale quando o dia inteiro é ruim. Se o dia tinha horas boas e elas já
 * passaram (ou o plano expirou), o herói convida a registrar em vez de culpar o clima.
 */
export function deriveHeroState({
  today,
  now,
  progress,
  graceHours,
  fairThreshold,
}: Input): HeroState {
  if (progress.todayRecord !== null) return { kind: 'done', record: progress.todayRecord };
  const plan = progress.activePlan;
  if (plan !== null) {
    if (isWithinWindow(plan.window, now, graceHours)) {
      const nowScore = today.hours.find((h) => h.hour.hour === now.hour)?.score ?? null;
      return { kind: 'confirm', plan, nowScore };
    }
    const nowMinutes = now.hour * MINUTES_PER_HOUR + now.minute;
    if (nowMinutes < plan.window.startHour * MINUTES_PER_HOUR) return { kind: 'planned', plan };
    return { kind: 'logNoPlan', day: today, expiredPlan: plan };
  }
  if (today.result.kind === 'window')
    return { kind: 'plan', day: today, window: today.result.window, score: today.result.score };
  if (today.bestScoreOfDay !== null && today.bestScoreOfDay >= fairThreshold)
    return { kind: 'logNoPlan', day: today, expiredPlan: null };
  return { kind: 'noWindow', day: today };
}
