import { err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { confirmActivity } from './confirmActivity';

const NOW = Date.UTC(2026, 8, 13, 20, 42, 0);
const plan: GamificationEvent = {
  type: 'planned',
  id: 'plan-1',
  cityId: saoPaulo.id,
  activity: 'run',
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour: 17, endHour: 19 },
  windowScore: 84,
  createdAt: NOW - 3600_000,
};
const setup = (initial: readonly GamificationEvent[]) => {
  const progress = memoryProgressRepository(initial);
  const notifications = recordingScheduler();
  const run = confirmActivity({
    progress,
    notifications,
    clock: fixedClock(NOW),
    ids: sequentialIds('evt'),
  });
  return { progress, notifications, run };
};

describe('confirmActivity', () => {
  it('grava confirmed e cancela o lembrete', async () => {
    const { progress, notifications, run } = setup([plan]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()[1]).toEqual({
      type: 'confirmed',
      id: 'evt-1',
      planId: 'plan-1',
      date: '2026-09-13',
      hourLeft: 17,
      hourScore: 86,
      createdAt: NOW,
    });
    expect(notifications.cancelled).toEqual(['plan-1']);
  });

  it('plano inexistente ou cancelado', async () => {
    const { run } = setup([
      plan,
      { type: 'planCancelled', id: 'c', planId: 'plan-1', createdAt: NOW - 1 },
    ]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(err({ code: 'planNotFound' }));
    expect(await run({ planId: 'nope', date: '2026-09-13', hourLeft: 17, hourScore: 86 })).toEqual(
      err({ code: 'planNotFound' }),
    );
  });

  it('dia que já tem registro', async () => {
    const logged: GamificationEvent = {
      type: 'logged',
      id: 'l',
      cityId: saoPaulo.id,
      activity: 'walk',
      date: '2026-09-13',
      hourLeft: 7,
      hourScore: 70,
      createdAt: NOW - 10,
    };
    const { run } = setup([plan, logged]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(err({ code: 'alreadyDoneToday' }));
  });
});
