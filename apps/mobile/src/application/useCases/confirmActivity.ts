import { deriveProgress, err, ok, type Result } from '@/domain';

import type {
  Clock,
  EngineConfigProvider,
  IdGenerator,
  NotificationScheduler,
  ProgressRepository,
} from '../ports';

export type ConfirmError = { readonly code: 'planNotFound' };
export type ConfirmInput = {
  readonly planId: string;
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
  readonly config: EngineConfigProvider;
};

export const confirmActivity =
  ({ progress, notifications, clock, ids, config }: Deps) =>
  async (input: ConfirmInput): Promise<Result<{ eventId: string }, ConfirmError>> => {
    const events = await progress.load();
    const current = deriveProgress(events, await config.get(), input.date);
    const pendentes = current.plansByDate.get(input.date) ?? [];
    if (!pendentes.some((p) => p.planId === input.planId)) return err({ code: 'planNotFound' });
    const eventId = ids.next();
    await progress.append({
      type: 'confirmed',
      id: eventId,
      planId: input.planId,
      date: input.date,
      hourLeft: input.hourLeft,
      ...(input.minuteLeft === undefined ? {} : { minuteLeft: input.minuteLeft }),
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    // Sem `await`: cancelar o lembrete é acessório e não pode segurar a ação do usuário.
    // Ver `planActivity.ts` para o defeito que este padrão causava.
    void notifications.cancel(input.planId).catch(() => undefined);
    return ok({ eventId });
  };
