import { err, ok } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { planActivity } from './planActivity';

const window = { date: '2026-09-13', startHour: 17, endHour: 19 };
const base = {
  city: saoPaulo,
  activity: 'run' as const,
  window,
  windowScore: 84,
  utcOffsetSeconds: -10800,
};
const NOW = Date.UTC(2026, 8, 13, 11, 0, 0); // 08:00 em São Paulo

const setup = (initial: Parameters<typeof memoryProgressRepository>[0] = []) => {
  const progress = memoryProgressRepository(initial);
  const notifications = recordingScheduler();
  const run = planActivity({
    progress,
    notifications,
    clock: fixedClock(NOW),
    ids: sequentialIds('plan'),
  });
  return { progress, notifications, run };
};

describe('planActivity', () => {
  it('grava o evento planned e agenda lembrete 30 min antes no fuso da cidade', async () => {
    const { progress, notifications, run } = setup();
    const result = await run(base);
    expect(result).toEqual(ok({ planId: 'plan-1' }));
    expect(progress.events()).toEqual([
      {
        type: 'planned',
        id: 'plan-1',
        cityId: saoPaulo.id,
        activity: 'run',
        date: '2026-09-13',
        window,
        windowScore: 84,
        createdAt: NOW,
      },
    ]);
    expect(notifications.scheduled).toEqual([
      expect.objectContaining({ id: 'plan-1', atEpochMs: Date.UTC(2026, 8, 13, 19, 30, 0) }),
    ]);
  });

  it('recusa um segundo plano ativo para o mesmo dia', async () => {
    const { run } = setup();
    await run(base);
    expect(await run(base)).toEqual(err({ code: 'alreadyPlanned' }));
  });

  it('recusa planejar um dia que já tem atividade registrada', async () => {
    const { run } = setup([
      {
        type: 'logged',
        id: 'l1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 7,
        hourScore: 70,
        createdAt: NOW - 1000,
      },
    ]);
    expect(await run(base)).toEqual(err({ code: 'alreadyDoneToday' }));
  });

  it('recusa com alreadyDoneToday mesmo havendo um plano pendente para o mesmo dia', async () => {
    const { run } = setup([
      {
        type: 'planned',
        id: 'p0',
        cityId: saoPaulo.id,
        activity: 'run',
        date: '2026-09-13',
        window,
        windowScore: 80,
        createdAt: NOW - 2000,
      },
      {
        type: 'logged',
        id: 'l1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 7,
        hourScore: 70,
        createdAt: NOW - 1000,
      },
    ]);
    expect(await run(base)).toEqual(err({ code: 'alreadyDoneToday' }));
  });

  it('permite planejar depois de cancelar', async () => {
    const { run, progress } = setup();
    const first = await run(base);
    if (!first.ok) throw new Error('esperava ok');
    await progress.append({
      type: 'planCancelled',
      id: 'c1',
      planId: first.value.planId,
      createdAt: NOW + 1,
    });
    expect(await run(base)).toEqual(ok({ planId: 'plan-2' }));
  });
});
