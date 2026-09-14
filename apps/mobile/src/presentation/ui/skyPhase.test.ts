import type { DailySummary, LocalDateTime } from '@/domain';

import { phaseFor } from './skyPhase';

const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const daily: DailySummary = {
  date: '2026-09-13',
  sunrise: '2026-09-13T06:12',
  sunset: '2026-09-13T18:04',
  weatherCode: 1,
  tempMax: 26,
  tempMin: 16,
};

describe('phaseFor', () => {
  it.each([
    [at(5, 30), 'dawn'],
    [at(12), 'day'],
    [at(18, 30), 'dusk'],
    [at(22), 'night'],
  ] as const)('%o → %s', (now, phase) => {
    expect(phaseFor({ now, daily, isBadDay: false })).toBe(phase);
  });
  it('dia ruim vira rainy em qualquer hora', () => {
    expect(phaseFor({ now: at(12), daily, isBadDay: true })).toBe('rainy');
  });
  it('sem resumo diário assume 06:00–18:00', () => {
    expect(phaseFor({ now: at(12), daily: null, isBadDay: false })).toBe('day');
    expect(phaseFor({ now: at(23), daily: null, isBadDay: false })).toBe('night');
  });
});
