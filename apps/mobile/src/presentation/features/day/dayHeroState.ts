import type { ActivePlan, DayRecommendation, TimeWindow } from '@/domain';

export type DayHeroState =
  | {
      readonly kind: 'plan';
      readonly day: DayRecommendation;
      readonly window: TimeWindow;
      readonly score: number;
    }
  | { readonly kind: 'planned'; readonly plan: ActivePlan }
  | { readonly kind: 'viewOnly' }
  | { readonly kind: 'noWindow'; readonly day: DayRecommendation };

type Input = {
  readonly day: DayRecommendation;
  readonly date: string;
  /** Só usado pelo chamador para calcular `tomorrow`; a decisão de "hoje" já aconteceu antes de
   * chegar aqui (a tela redireciona para a Home), então a função em si só depende de `tomorrow`. */
  readonly today: string;
  readonly tomorrow: string;
  readonly plan: ActivePlan | null;
};

/**
 * Só amanhã pode ser planejado (spec 4.3): hoje redireciona para a Home antes de chegar aqui, e
 * qualquer outro dia (inclusive o próprio hoje, por segurança) vira "somente visualização".
 */
export function dayHeroState({ day, date, tomorrow, plan }: Input): DayHeroState {
  if (date !== tomorrow) return { kind: 'viewOnly' };
  if (plan !== null) return { kind: 'planned', plan };
  if (day.result.kind === 'window')
    return { kind: 'plan', day, window: day.result.window, score: day.result.score };
  return { kind: 'noWindow', day };
}
