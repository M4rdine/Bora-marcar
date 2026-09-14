import type { ActivityRecord } from '@/domain';

import { xpReceipt } from './xpReceipt';

const baseRecord: ActivityRecord = {
  id: 'evt-1',
  date: '2026-09-13',
  cityId: 'sp',
  activity: 'run',
  hourLeft: 17,
  minuteLeft: 42,
  hourScore: 86,
  planFulfilled: true,
  streakDays: 7,
  xp: { base: 50, hourBonus: 43, planBonus: 25, streakBonus: 35, total: 153 },
  createdAt: 0,
};

describe('xpReceipt', () => {
  it('lista as parcelas de XP com o total', () => {
    const receipt = xpReceipt(baseRecord);
    expect(receipt.rows).toEqual([
      { key: 'base', label: 'Atividade registrada', value: '50' },
      { key: 'hour', label: 'Saiu com score 86', value: '+43' },
      { key: 'plan', label: 'Cumpriu o plano', value: '+25' },
      { key: 'streak', label: '7 dias seguidos', value: '+35' },
    ]);
    expect(receipt.total).toBe(153);
  });

  it('sem plano cumprido, não mostra a linha de plano', () => {
    const receipt = xpReceipt({
      ...baseRecord,
      planFulfilled: false,
      xp: { ...baseRecord.xp, planBonus: 0, total: 128 },
    });
    expect(receipt.rows.some((r) => r.key === 'plan')).toBe(false);
  });

  it('sem bônus de sequência, não mostra a linha de streak', () => {
    const receipt = xpReceipt({
      ...baseRecord,
      streakDays: 0,
      xp: { ...baseRecord.xp, streakBonus: 0, total: 118 },
    });
    expect(receipt.rows.some((r) => r.key === 'streak')).toBe(false);
  });
});
