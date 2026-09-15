import type { City } from '@/application/ports';
import type { ActivityId, TimeWindow } from '@/domain';

import { useGamificationActions } from '../../queries/useGamificationActions';
import { useActionRunner } from '../home/actionRunner';

type PlanInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly window: TimeWindow;
  readonly windowScore: number;
  readonly utcOffsetSeconds: number;
};

export type DayActionsResult = {
  readonly onPlan: (input: PlanInput) => void;
  readonly onCancel: (planId: string) => void;
  readonly busy: boolean;
  readonly errorMessage: string | null;
};

/** Planejar/desfazer para o dia visitado: mesma forma de `useHeroActions`, com as duas ações que
 * a tela do dia expõe. Os dados da ação (cidade, janela…) chegam no momento da chamada, não na
 * construção do hook, então ele pode ser usado incondicionalmente mesmo antes da previsão carregar. */
export function useDayActions(): DayActionsResult {
  const gamification = useGamificationActions();
  const { run, errorMessage } = useActionRunner();
  return {
    onPlan: (input: PlanInput) => run(() => gamification.plan.mutateAsync(input)),
    onCancel: (planId: string) => run(() => gamification.cancel.mutateAsync(planId)),
    busy: gamification.plan.isPending || gamification.cancel.isPending,
    errorMessage,
  };
}
