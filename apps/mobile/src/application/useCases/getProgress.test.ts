import { memoryProgressRepository, saoPaulo } from '../testing/fakes';

import { getProgress } from './getProgress';

describe('getProgress', () => {
  it('deriva o progresso a partir do log', async () => {
    const progress = memoryProgressRepository([
      {
        type: 'logged',
        id: 'l',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 80,
        createdAt: 1,
      },
    ]);
    const p = await getProgress({ progress })('2026-09-13');
    expect(p.totalXp).toBe(50 + 40 + 5);
    expect(p.streak).toBe(1);
  });
});
