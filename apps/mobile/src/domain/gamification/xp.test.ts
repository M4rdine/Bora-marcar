import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { computeXp } from './xp';

describe('computeXp', () => {
  it('exemplo do spec: score 86, plano cumprido, 7 dias → 153', () => {
    expect(computeXp({ hourScore: 86, planFulfilled: true, streakDays: 7 }, cfg.xp)).toEqual({
      base: 50,
      hourBonus: 43,
      planBonus: 25,
      streakBonus: 35,
      total: 153,
    });
  });

  it('sem plano e primeiro dia', () => {
    expect(computeXp({ hourScore: 30, planFulfilled: false, streakDays: 1 }, cfg.xp)).toEqual({
      base: 50,
      hourBonus: 15,
      planBonus: 0,
      streakBonus: 5,
      total: 70,
    });
  });

  it('bônus de sequência tem teto em 10 dias', () => {
    expect(
      computeXp({ hourScore: 0, planFulfilled: false, streakDays: 25 }, cfg.xp).streakBonus,
    ).toBe(50);
  });

  it('arredonda o bônus de horário', () => {
    expect(
      computeXp({ hourScore: 85, planFulfilled: false, streakDays: 1 }, cfg.xp).hourBonus,
    ).toBe(43);
  });
});
