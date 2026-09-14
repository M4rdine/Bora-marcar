import {
  defaultEngineConfig,
  deriveProgress,
  err,
  ok,
  type ActivityId,
  type Result,
} from '@/domain';

import type { City, Clock, IdGenerator, ProgressRepository } from '../ports';

export type LogError = { readonly code: 'alreadyDoneToday' };
export type LogInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const logActivity =
  ({ progress, clock, ids }: Deps) =>
  async (input: LogInput): Promise<Result<{ eventId: string }, LogError>> => {
    const events = await progress.load();
    // defaultEngineConfig: ver comentário equivalente em planActivity.ts.
    if (deriveProgress(events, defaultEngineConfig, input.date).todayRecord !== null)
      return err({ code: 'alreadyDoneToday' });
    const eventId = ids.next();
    await progress.append({
      type: 'logged',
      id: eventId,
      cityId: input.city.id,
      activity: input.activity,
      date: input.date,
      hourLeft: input.hourLeft,
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    return ok({ eventId });
  };
