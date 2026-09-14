import { defaultEngineConfig, deriveProgress, err, ok, type Result } from '@/domain';

import type { Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type ConfirmError = { readonly code: 'planNotFound' | 'alreadyDoneToday' };
export type ConfirmInput = {
  readonly planId: string;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const confirmActivity =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (input: ConfirmInput): Promise<Result<{ eventId: string }, ConfirmError>> => {
    const events = await progress.load();
    // defaultEngineConfig: ver comentário equivalente em planActivity.ts.
    const current = deriveProgress(events, defaultEngineConfig, input.date);
    if (current.activePlan === null || current.activePlan.planId !== input.planId)
      return err({ code: 'planNotFound' });
    if (current.todayRecord !== null) return err({ code: 'alreadyDoneToday' });
    const eventId = ids.next();
    await progress.append({
      type: 'confirmed',
      id: eventId,
      planId: input.planId,
      date: input.date,
      hourLeft: input.hourLeft,
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    await notifications.cancel(input.planId);
    return ok({ eventId });
  };
