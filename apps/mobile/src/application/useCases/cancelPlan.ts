import { err, ok, type Result } from '@/domain';

import type { Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type CancelError = { readonly code: 'planNotFound' | 'alreadyConfirmed' };
type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const cancelPlan =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (planId: string): Promise<Result<void, CancelError>> => {
    const events = await progress.load();
    const exists = events.some((e) => e.type === 'planned' && e.id === planId);
    const alreadyCancelled = events.some((e) => e.type === 'planCancelled' && e.planId === planId);
    if (!exists || alreadyCancelled) return err({ code: 'planNotFound' });
    const alreadyConfirmed = events.some((e) => e.type === 'confirmed' && e.planId === planId);
    if (alreadyConfirmed) return err({ code: 'alreadyConfirmed' });
    await progress.append({
      type: 'planCancelled',
      id: ids.next(),
      planId,
      createdAt: clock.now(),
    });
    // Sem `await`: cancelar o lembrete é acessório e não pode segurar a ação do usuário.
    // Ver `planActivity.ts` para o defeito que este padrão causava.
    void notifications.cancel(planId).catch(() => undefined);
    return ok(undefined);
  };
