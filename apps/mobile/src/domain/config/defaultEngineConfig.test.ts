import { ACTIVITY_IDS, FACTOR_IDS } from '../activities/types';

import { defaultEngineConfig } from './defaultEngineConfig';

describe('defaultEngineConfig', () => {
  it('tem as cinco atividades', () => {
    expect(Object.keys(defaultEngineConfig.activities).sort()).toEqual([...ACTIVITY_IDS].sort());
  });

  it.each(ACTIVITY_IDS)('pesos de %s somam 1', (id) => {
    const sum = FACTOR_IDS.reduce(
      (acc, f) => acc + defaultEngineConfig.activities[id].weights[f],
      0,
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it.each(ACTIVITY_IDS)('faixa térmica de %s é coerente', (id) => {
    const t = defaultEngineConfig.activities[id].thermal;
    expect(t.tolMin).toBeLessThan(t.idealMin);
    expect(t.idealMin).toBeLessThan(t.idealMax);
    expect(t.idealMax).toBeLessThan(t.tolMax);
  });

  it('níveis crescem em XP e começam em 0', () => {
    const xps = defaultEngineConfig.levels.map((l) => l.xp);
    expect(xps[0]).toBe(0);
    expect(xps).toEqual([...xps].sort((a, b) => a - b));
    expect(defaultEngineConfig.levels).toHaveLength(8);
  });

  it('limiares de score são decrescentes', () => {
    const { great, good, fair } = defaultEngineConfig.scores;
    expect(great).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(fair);
  });
});
