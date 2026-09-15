import { deriveProgress, err, ok, type ActivityId, type Result, type TimeWindow } from '@/domain';

import type {
  City,
  Clock,
  EngineConfigProvider,
  IdGenerator,
  NotificationScheduler,
  ProgressRepository,
} from '../ports';

import { localEpochMs } from './localEpoch';

export const REMINDER_MINUTES_BEFORE = 30;

export type PlanError = { readonly code: 'alreadyPlanned' | 'alreadyDoneToday' };
export type PlanInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly window: TimeWindow;
  readonly windowScore: number;
  readonly utcOffsetSeconds: number;
};

type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly config: EngineConfigProvider;
};

const reminderEpoch = (input: PlanInput): number =>
  localEpochMs(input.window.date, input.window.startHour, 0, input.utcOffsetSeconds) -
  REMINDER_MINUTES_BEFORE * 60_000;

export const planActivity =
  ({ progress, notifications, clock, ids, config }: Deps) =>
  async (input: PlanInput): Promise<Result<{ planId: string }, PlanError>> => {
    const events = await progress.load();
    const current = deriveProgress(events, await config.get(), input.window.date);
    // Precedência intencional: registro do dia é estado terminal, então prevalece mesmo
    // havendo um plano pendente para o mesmo dia.
    if (current.todayRecord !== null) return err({ code: 'alreadyDoneToday' });
    if (current.activePlan !== null) return err({ code: 'alreadyPlanned' });

    const planId = ids.next();
    await progress.append({
      type: 'planned',
      id: planId,
      cityId: input.city.id,
      activity: input.activity,
      date: input.window.date,
      window: input.window,
      windowScore: input.windowScore,
      createdAt: clock.now(),
    });
    await notifications.schedule({
      id: planId,
      title: 'Sua janela está chegando',
      body: `Melhor horário para sair começa às ${input.window.startHour}h.`,
      atEpochMs: reminderEpoch(input),
    });
    return ok({ planId });
  };
