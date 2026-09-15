import { defaultEngineConfig } from '@/domain';

import { fixedConfig, memoryProgressRepository, saoPaulo } from '../testing/fakes';

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
    const p = await getProgress({ progress, config: fixedConfig() })('2026-09-13');
    expect(p.totalXp).toBe(50 + 40 + 5);
    expect(p.streak).toBe(1);
  });

  it('usa a config injetada (não a estática) ao computar o xp do todayRecord', async () => {
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
    const config = fixedConfig({
      ...defaultEngineConfig,
      xp: { ...defaultEngineConfig.xp, base: 60 },
    });
    const p = await getProgress({ progress, config })('2026-09-13');
    expect(p.todayRecord?.xp.base).toBe(60);
  });
});
