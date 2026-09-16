import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import type { ActivityId, TimeWindow } from '@/domain';

import { useGamificationActions } from '../../queries/useGamificationActions';

import { useActionRunner } from './actionRunner';
import type { HeroState } from './heroState';
import { pickableHours, type PickableHour } from './pickableHours';

/** Único plano que o herói ainda permite desfazer: o planejado ou o que expirou sem registro. */
const cancellablePlanId = (state: HeroState): string | null => {
  if (state.kind === 'planned') return state.plan.planId;
  if (state.kind === 'logNoPlan') return state.expiredPlan?.planId ?? null;
  return null;
};

type Input = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly snapshot: OverviewSnapshot;
  readonly hero: HeroState;
};

export type HeroActionsResult = {
  readonly onPlan: () => void;
  /** Planeja numa hora escolhida na cronologia, em vez da janela que o motor recomendou. */
  readonly onPlanAt: (window: TimeWindow, windowScore: number) => void;
  /** Verdadeiro quando ainda não há plano nem registro hoje, então escolher uma hora faz sentido. */
  readonly canPlanAt: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: (hour: number, minute: number, hourScore: number) => void;
  /** Horas de hoje até "agora", para o seletor usado ao registrar fora de um plano. */
  readonly pickableHours: readonly PickableHour[];
  readonly busy: boolean;
  readonly errorMessage: string | null;
};

type Actions = ReturnType<typeof useGamificationActions>;
type Handlers = Omit<HeroActionsResult, 'busy' | 'errorMessage' | 'pickableHours' | 'canPlanAt'>;

/**
 * Estados em que a agenda de hoje está livre. Só neles a cronologia oferece "planejar às Xh":
 * o domínio aceita um plano ativo por dia, e um segundo seria recusado com erro.
 */
const canPlanAtIn = (state: HeroState): boolean =>
  state.kind === 'plan' ||
  state.kind === 'noWindow' ||
  (state.kind === 'logNoPlan' && state.expiredPlan === null);

/** Pura: monta os quatro handlers a partir dos dados de entrada, do herói e das mutações. */
function buildHeroHandlers(
  { city, activity, snapshot, hero }: Input,
  actions: Actions,
  run: (fn: () => Promise<unknown>) => void,
): Handlers {
  const onPlan = () => {
    if (hero.kind !== 'plan') return;
    run(() =>
      actions.plan.mutateAsync({
        city,
        activity,
        window: hero.window,
        windowScore: hero.score,
        utcOffsetSeconds: snapshot.now.utcOffsetSeconds,
      }),
    );
  };

  const onPlanAt = (window: TimeWindow, windowScore: number) => {
    if (!canPlanAtIn(hero)) return;
    run(() =>
      actions.plan.mutateAsync({
        city,
        activity,
        window,
        windowScore,
        utcOffsetSeconds: snapshot.now.utcOffsetSeconds,
      }),
    );
  };

  const onCancel = () => {
    const planId = cancellablePlanId(hero);
    if (planId !== null) run(() => actions.cancel.mutateAsync(planId));
  };

  const onConfirm = () => {
    if (hero.kind !== 'confirm') return;
    run(() =>
      actions.confirm.mutateAsync({
        planId: hero.plan.planId,
        date: snapshot.now.date,
        hourLeft: snapshot.now.hour,
        minuteLeft: snapshot.now.minute,
        hourScore: hero.nowScore ?? 0,
      }),
    );
  };

  const onLogNow = (hour: number, minute: number, hourScore: number) => {
    const input = {
      city,
      activity,
      date: snapshot.now.date,
      hourLeft: hour,
      minuteLeft: minute,
      hourScore,
    };
    run(() => actions.log.mutateAsync(input));
  };

  return { onPlan, onPlanAt, onCancel, onConfirm, onLogNow };
}

const isBusy = (actions: Actions): boolean =>
  actions.plan.isPending ||
  actions.confirm.isPending ||
  actions.log.isPending ||
  actions.cancel.isPending;

/** Move os handlers de plan/confirm/log/cancel para fora da tela, com o próprio estado de erro. */
export function useHeroActions(input: Input): HeroActionsResult {
  const actions = useGamificationActions();
  const { run, errorMessage } = useActionRunner();
  const handlers = buildHeroHandlers(input, actions, run);
  const hours = pickableHours(input.snapshot.overview.today, input.snapshot.now);
  return {
    ...handlers,
    pickableHours: hours,
    canPlanAt: canPlanAtIn(input.hero),
    busy: isBusy(actions),
    errorMessage,
  };
}
