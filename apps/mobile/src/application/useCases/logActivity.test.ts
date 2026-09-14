import { err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { logActivity } from './logActivity';

const NOW = Date.UTC(2026, 8, 13, 21, 0, 0);
const input = {
  city: saoPaulo,
  activity: 'walk' as const,
  date: '2026-09-13',
  hourLeft: 18,
  hourScore: 72,
};
const setup = (initial: readonly GamificationEvent[] = []) => {
  const progress = memoryProgressRepository(initial);
  const notifications = recordingScheduler();
  const run = logActivity({
    progress,
    notifications,
    clock: fixedClock(NOW),
    ids: sequentialIds('evt'),
  });
  return { progress, notifications, run };
};

describe('logActivity', () => {
  it('grava logged', async () => {
    const { progress, notifications, run } = setup();
    expect(await run({ ...input, minuteLeft: 42 })).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()).toEqual([
      {
        type: 'logged',
        id: 'evt-1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 18,
        minuteLeft: 42,
        hourScore: 72,
        createdAt: NOW,
      },
    ]);
    expect(notifications.cancelled).toEqual([]);
  });

  it('grava logged sem minuteLeft quando não informado', async () => {
    const { progress, run } = setup();
    expect(await run(input)).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()).toEqual([
      {
        type: 'logged',
        id: 'evt-1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 72,
        createdAt: NOW,
      },
    ]);
  });

  it('recusa segundo registro no mesmo dia', async () => {
    const { run } = setup();
    await run(input);
    expect(await run(input)).toEqual(err({ code: 'alreadyDoneToday' }));
  });

  it('cancela o lembrete do plano pendente', async () => {
    const plan: GamificationEvent = {
      type: 'planned',
      id: 'plan-1',
      cityId: saoPaulo.id,
      activity: 'walk',
      date: '2026-09-13',
      window: { date: '2026-09-13', startHour: 17, endHour: 19 },
      windowScore: 84,
      createdAt: NOW - 3600_000,
    };
    const { notifications, run } = setup([plan]);
    expect(await run(input)).toEqual(ok({ eventId: 'evt-1' }));
    expect(notifications.cancelled).toEqual(['plan-1']);
  });
});
