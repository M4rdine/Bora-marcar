import {
  defaultEngineConfig,
  deriveProgress,
  err,
  ok,
  type ActivityId,
  type Result,
} from '@/domain';

import type { City, Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type LogError = { readonly code: 'alreadyDoneToday' };
export type LogInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly hourLeft: number;
  readonly minuteLeft?: number;
  readonly hourScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const logActivity =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (input: LogInput): Promise<Result<{ eventId: string }, LogError>> => {
    const events = await progress.load();
    // defaultEngineConfig: ver comentário equivalente em planActivity.ts.
    const current = deriveProgress(events, defaultEngineConfig, input.date);
    if (current.todayRecord !== null) return err({ code: 'alreadyDoneToday' });
    const pendingPlan = current.activePlan;
    const eventId = ids.next();
    await progress.append({
      type: 'logged',
      id: eventId,
      cityId: input.city.id,
      activity: input.activity,
      date: input.date,
      hourLeft: input.hourLeft,
      ...(input.minuteLeft === undefined ? {} : { minuteLeft: input.minuteLeft }),
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    if (pendingPlan !== null) await notifications.cancel(pendingPlan.planId);
    return ok({ eventId });
  };
