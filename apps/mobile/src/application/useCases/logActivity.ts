import { deriveProgress, planFor, ok, type ActivityId, type Result } from '@/domain';

import type {
  City,
  Clock,
  EngineConfigProvider,
  IdGenerator,
  NotificationScheduler,
  ProgressRepository,
} from '../ports';

/**
 * Registrar não tem recusa de regra: qualquer hora do dia serve, e o dia aceita mais de uma
 * atividade. Falha de escrita sobe como exceção, não como `Result`.
 */
export type LogError = never;
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
  readonly config: EngineConfigProvider;
};

export const logActivity =
  ({ progress, notifications, clock, ids, config }: Deps) =>
  async (input: LogInput): Promise<Result<{ eventId: string }, LogError>> => {
    const events = await progress.load();
    const current = deriveProgress(events, await config.get(), input.date);
    // O lembrete cancelado é o da atividade registrada. Cancelar o de outra apagaria um plano
    // que continua de pé.
    const pendingPlan = planFor(current.plansByDate.get(input.date) ?? [], input.activity);
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
    // Sem `await`: cancelar o lembrete é acessório e não pode segurar a ação do usuário.
    // Ver `planActivity.ts` para o defeito que este padrão causava.
    if (pendingPlan !== null) void notifications.cancel(pendingPlan.planId).catch(() => undefined);
    return ok({ eventId });
  };
