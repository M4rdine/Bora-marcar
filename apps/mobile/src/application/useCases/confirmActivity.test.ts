import { defaultEngineConfig, err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  fixedConfig,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { confirmActivity } from './confirmActivity';
import { getProgress } from './getProgress';

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
    config: fixedConfig(),
  });
  return { progress, notifications, run };
};

describe('confirmActivity', () => {
  it('grava confirmed e cancela o lembrete', async () => {
    const { progress, notifications, run } = setup([plan]);
    expect(
      await run({
        planId: 'plan-1',
        date: '2026-09-13',
        hourLeft: 17,
        minuteLeft: 42,
        hourScore: 86,
      }),
    ).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()[1]).toEqual({
      type: 'confirmed',
      id: 'evt-1',
      planId: 'plan-1',
      date: '2026-09-13',
      hourLeft: 17,
      minuteLeft: 42,
      hourScore: 86,
      createdAt: NOW,
    });
    expect(notifications.cancelled).toEqual(['plan-1']);
  });

  it('grava confirmed sem minuteLeft quando não informado', async () => {
    const { progress, run } = setup([plan]);
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

  it('aceita confirmar um plano mesmo já tendo registro no dia', async () => {
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
      (await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 })).ok,
    ).toBe(true);
  });

  it('usa a config injetada (não a estática) ao derivar o progresso', async () => {
    const config = fixedConfig({
      ...defaultEngineConfig,
      xp: { ...defaultEngineConfig.xp, base: 60 },
    });
    const progress = memoryProgressRepository([plan]);
    const notifications = recordingScheduler();
    const run = confirmActivity({
      progress,
      notifications,
      clock: fixedClock(NOW),
      ids: sequentialIds('evt'),
      config,
    });
    const result = await run({
      planId: 'plan-1',
      date: '2026-09-13',
      hourLeft: 17,
      hourScore: 86,
    });
    expect(result.ok).toBe(true);
    const p = await getProgress({ progress, config })('2026-09-13');
    expect(p.todayRecord?.xp.base).toBe(60);
  });
});
