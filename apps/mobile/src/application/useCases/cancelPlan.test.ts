import { err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { cancelPlan } from './cancelPlan';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);
const plan: GamificationEvent = {
  type: 'planned',
  id: 'plan-1',
  cityId: saoPaulo.id,
  activity: 'run',
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour: 17, endHour: 19 },
  windowScore: 84,
  createdAt: NOW - 1000,
};

describe('cancelPlan', () => {
  it('grava planCancelled e cancela a notificação', async () => {
    const progress = memoryProgressRepository([plan]);
    const notifications = recordingScheduler();
    const run = cancelPlan({
      progress,
      notifications,
      clock: fixedClock(NOW),
      ids: sequentialIds('evt'),
    });
    expect(await run('plan-1')).toEqual(ok(undefined));
    expect(progress.events()[1]).toEqual({
      type: 'planCancelled',
      id: 'evt-1',
      planId: 'plan-1',
      createdAt: NOW,
    });
    expect(notifications.cancelled).toEqual(['plan-1']);
  });

  it('plano desconhecido', async () => {
    const run = cancelPlan({
      progress: memoryProgressRepository([]),
      notifications: recordingScheduler(),
      clock: fixedClock(NOW),
      ids: sequentialIds(),
    });
    expect(await run('x')).toEqual(err({ code: 'planNotFound' }));
  });
});
