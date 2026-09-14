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
  | { readonly kind: 'noWindow'; readonly day: DayRecommendation };

type Input = {
  readonly today: DayRecommendation;
  readonly now: LocalDateTime;
  readonly progress: Progress;
  readonly graceHours: number;
};

export function deriveHeroState({ today, now, progress, graceHours }: Input): HeroState {
  if (progress.todayRecord !== null) return { kind: 'done', record: progress.todayRecord };
  const plan = progress.activePlan;
  if (plan !== null) {
    if (!isWithinWindow(plan.window, now, graceHours)) return { kind: 'planned', plan };
    const nowScore = today.hours.find((h) => h.hour.hour === now.hour)?.score ?? null;
    return { kind: 'confirm', plan, nowScore };
  }
  if (today.result.kind === 'window')
    return { kind: 'plan', day: today, window: today.result.window, score: today.result.score };
  return { kind: 'noWindow', day: today };
}
