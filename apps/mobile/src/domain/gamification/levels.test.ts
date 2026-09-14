import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { levelFor } from './levels';

describe('levelFor', () => {
  it('0 XP é nível 1 Brisa, faltam 100 para o 2', () => {
    expect(levelFor(0, cfg.levels)).toEqual({
      level: 1,
      name: 'Brisa',
      totalXp: 0,
      levelStartXp: 0,
      nextLevelXp: 100,
      xpToNext: 100,
      progress: 0,
    });
  });

  it('1358 XP é nível 4 Ventania com 242 para Aurora', () => {
    const l = levelFor(1358, cfg.levels);
    expect(l).toMatchObject({
      level: 4,
      name: 'Ventania',
      levelStartXp: 900,
      nextLevelXp: 1600,
      xpToNext: 242,
    });
    expect(l.progress).toBeCloseTo((1358 - 900) / 700);
  });

  it('exatamente no limiar sobe de nível', () => {
    expect(levelFor(900, cfg.levels).level).toBe(4);
    expect(levelFor(899, cfg.levels).level).toBe(3);
  });

  it('último nível não tem próximo', () => {
    expect(levelFor(10000, cfg.levels)).toMatchObject({
      level: 8,
      name: 'Clima Perfeito',
      nextLevelXp: null,
      xpToNext: null,
      progress: 1,
    });
  });

  it('lista de níveis vazia cai no nível 1 sem nome', () => {
    expect(levelFor(50, [])).toEqual({
      level: 1,
      name: '',
      totalXp: 50,
      levelStartXp: 0,
      nextLevelXp: null,
      xpToNext: null,
      progress: 1,
    });
  });
});
