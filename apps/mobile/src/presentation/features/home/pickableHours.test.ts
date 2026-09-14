import { defaultEngineConfig, recommendDay, type LocalDateTime } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { pickableHours } from './pickableHours';

const DATE = '2026-09-13';
const forecast = makeForecast([DATE]);
const profile = defaultEngineConfig.activities.walk;
const today = recommendDay(forecast, profile, defaultEngineConfig, { date: DATE });

const nowAt = (hour: number, minute: number): LocalDateTime => ({
  date: DATE,
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});

describe('pickableHours', () => {
  it('às 14:30 retorna as 15 horas de 0 a 14, com o score de cada uma', () => {
    const options = pickableHours(today, nowAt(14, 30));
    expect(options).toHaveLength(15);
    expect(options.map((o) => o.hour)).toEqual(Array.from({ length: 15 }, (_, i) => i));
    const expectedFourteen = today.hours.find((h) => h.hour.hour === 14);
    expect(options[14]).toEqual({
      hour: 14,
      score: expectedFourteen?.score,
      label: expectedFourteen?.label,
    });
  });

  it('às 0:05 retorna só a hora 0', () => {
    const options = pickableHours(today, nowAt(0, 5));
    expect(options).toHaveLength(1);
    expect(options[0]?.hour).toBe(0);
  });
});
