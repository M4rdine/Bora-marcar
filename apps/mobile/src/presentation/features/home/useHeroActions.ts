import { useState } from 'react';

import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import type { ActivityId } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { useGamificationActions } from '../../queries/useGamificationActions';

import type { HeroState } from './heroState';

type ActionErrorCode = 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound' | 'alreadyConfirmed';

const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  typeof (e as { code: unknown }).code === 'string';

/** Único plano que o herói ainda permite desfazer: o planejado ou o que expirou sem registro. */
const cancellablePlanId = (state: HeroState): string | null => {
  if (state.kind === 'planned') return state.plan.planId;
  if (state.kind === 'logNoPlan') return state.expiredPlan?.planId ?? null;
  return null;
};

/** Roda uma mutação e converte o erro em mensagem pronta para exibição. */
function useActionRunner(): {
  readonly run: (fn: () => Promise<unknown>) => void;
  readonly errorMessage: string | null;
} {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setErrorMessage(null);
    void fn().catch((e: unknown) => {
      setErrorMessage(isActionError(e) ? t.errors[e.code] : t.errors.network);
    });
  };
  return { run, errorMessage };
}

type Input = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly snapshot: OverviewSnapshot;
  readonly hero: HeroState;
};

export type HeroActionsResult = {
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: (hour: number, minute: number, hourScore: number) => void;
  readonly busy: boolean;
  readonly errorMessage: string | null;
};

type Actions = ReturnType<typeof useGamificationActions>;
type Handlers = Omit<HeroActionsResult, 'busy' | 'errorMessage'>;

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

  return { onPlan, onCancel, onConfirm, onLogNow };
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
  return { ...handlers, busy: isBusy(actions), errorMessage };
}
