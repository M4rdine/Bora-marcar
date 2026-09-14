import { err, ok, type Result } from '@/domain';

import type { Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type CancelError = { readonly code: 'planNotFound' };
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
    if (!exists) return err({ code: 'planNotFound' });
    await progress.append({
      type: 'planCancelled',
      id: ids.next(),
      planId,
      createdAt: clock.now(),
    });
    await notifications.cancel(planId);
    return ok(undefined);
  };
