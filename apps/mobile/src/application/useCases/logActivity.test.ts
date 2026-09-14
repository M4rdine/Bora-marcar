import { err, ok } from '@/domain';

import { fixedClock, memoryProgressRepository, saoPaulo, sequentialIds } from '../testing/fakes';

import { logActivity } from './logActivity';

const NOW = Date.UTC(2026, 8, 13, 21, 0, 0);
const input = {
  city: saoPaulo,
  activity: 'walk' as const,
  date: '2026-09-13',
  hourLeft: 18,
  hourScore: 72,
};

describe('logActivity', () => {
  it('grava logged', async () => {
    const progress = memoryProgressRepository();
    const run = logActivity({ progress, clock: fixedClock(NOW), ids: sequentialIds('evt') });
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
    const progress = memoryProgressRepository();
    const run = logActivity({ progress, clock: fixedClock(NOW), ids: sequentialIds('evt') });
    await run(input);
    expect(await run(input)).toEqual(err({ code: 'alreadyDoneToday' }));
  });
});
