import { fixedClock, memoryProgressRepository, sequentialIds } from '../testing/fakes';

import { recordBadWeatherDay } from './recordBadWeatherDay';

describe('recordBadWeatherDay', () => {
  it('grava uma vez por data', async () => {
    const progress = memoryProgressRepository();
    const run = recordBadWeatherDay({
      progress,
      clock: fixedClock(1000),
      ids: sequentialIds('bw'),
    });
    await run({ cityId: 'sp', date: '2026-09-16', bestScore: 22 });
    await run({ cityId: 'sp', date: '2026-09-16', bestScore: 30 });
    expect(progress.events()).toEqual([
      {
        type: 'badWeatherDay',
        id: 'bw-1',
        cityId: 'sp',
        date: '2026-09-16',
        bestScore: 22,
        createdAt: 1000,
      },
    ]);
  });
});
