import { defaultEngineConfig, ok } from '@/domain';

import type { NotificationScheduler } from '../ports';
import { memoryProgressRepository, saoPaulo } from '../testing/fakes';

import { cancelPlan } from './cancelPlan';
import { planActivity } from './planActivity';

const deps = (notifications: NotificationScheduler) => ({
  progress: memoryProgressRepository(),
  notifications,
  clock: { now: () => Date.UTC(2026, 8, 13, 12, 0, 0) },
  ids: { next: () => 'plan-1' },
  config: { get: async () => defaultEngineConfig },
});

const input = {
  city: saoPaulo,
  activity: 'walk' as const,
  window: { date: '2026-09-13', startHour: 15, endHour: 17 },
  windowScore: 90,
  utcOffsetSeconds: -10800,
};

describe('planActivity e o lembrete', () => {
  it('não espera o agendamento: um lembrete que pendura não pode travar o plano', async () => {
    // Uma promessa que nunca resolve é exatamente o que acontece no iPhone enquanto a permissão
    // de notificação está pendente. Antes desta correção, o caso de uso pendurava junto, o estado
    // de ocupado ficava ligado para sempre e o botão principal apagava com o plano já salvo.
    const hanging: NotificationScheduler = {
      schedule: () => new Promise<void>(() => undefined),
      cancel: async () => undefined,
    };
    const d = deps(hanging);

    const result = await Promise.race([
      planActivity(d)(input),
      new Promise((resolve) => setTimeout(() => resolve('pendurou'), 50)),
    ]);

    expect(result).toEqual(ok({ planId: 'plan-1' }));
  });

  it('o plano fica gravado mesmo quando o agendamento falha', async () => {
    const failing: NotificationScheduler = {
      schedule: async () => {
        throw new Error('sem permissão');
      },
      cancel: async () => undefined,
    };
    const d = deps(failing);

    const result = await planActivity(d)(input);

    expect(result.ok).toBe(true);
    expect(d.progress.events().some((e) => e.type === 'planned')).toBe(true);
  });

  it('e o agendamento continua sendo pedido, com a hora do lembrete certa', async () => {
    const calls: { id: string; atEpochMs: number }[] = [];
    const spy: NotificationScheduler = {
      schedule: async (r) => {
        calls.push({ id: r.id, atEpochMs: r.atEpochMs });
      },
      cancel: async () => undefined,
    };

    await planActivity(deps(spy))(input);
    // o `void` não aguarda, então damos um tique ao laço de eventos antes de conferir
    await Promise.resolve();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe('plan-1');
    // janela às 15h em UTC-3 é 18h UTC; o lembrete sai 30 minutos antes
    expect(calls[0]?.atEpochMs).toBe(Date.UTC(2026, 8, 13, 17, 30, 0));
  });
});

describe('cancelar o lembrete também não pode travar nem derrubar', () => {
  const rejecting: NotificationScheduler = {
    schedule: async () => undefined,
    cancel: async () => {
      throw new Error('sem suporte');
    },
  };

  it('desfazer um plano sobrevive a um cancelamento que rejeita', async () => {
    const d = deps(rejecting);
    await planActivity(d)(input);
    await Promise.resolve();

    const result = await cancelPlan({
      progress: d.progress,
      notifications: rejecting,
      clock: d.clock,
      ids: { next: () => 'cancel-1' },
    })('plan-1');

    expect(result.ok).toBe(true);
    expect(d.progress.events().some((e) => e.type === 'planCancelled')).toBe(true);
  });
});
