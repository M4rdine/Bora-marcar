import { defaultEngineConfig as cfg, recommendDay, type LocalDateTime } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { bestOfSequence, buildDaySequence, buildHourlySequence } from './hourlySequence';

const DATES = ['2026-09-13', '2026-09-14'];
const forecast = makeForecast(DATES);
const at = (hour: number): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute: 0,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const dayAt = (date: string) => recommendDay(forecast, cfg.activities.walk, cfg, { date });

describe('buildHourlySequence', () => {
  const today = dayAt('2026-09-13');
  const tomorrow = dayAt('2026-09-14');

  it('começa na hora atual e não olha para trás', () => {
    const seq = buildHourlySequence({ today, tomorrow, now: at(14) });
    expect(seq[0]?.hour.hour.hour).toBe(14);
    expect(seq.every((i) => i.dayOffset === 1 || i.hour.hour.hour >= 14)).toBe(true);
  });

  it('marca a hora atual e só ela', () => {
    const seq = buildHourlySequence({ today, tomorrow, now: at(14) });
    expect(seq.filter((i) => i.isNow)).toHaveLength(1);
    expect(seq.find((i) => i.isNow)?.hour.hour.hour).toBe(14);
  });

  it('atravessa para amanhã quando hoje acaba', () => {
    const seq = buildHourlySequence({ today, tomorrow, now: at(22) });
    expect(seq.filter((i) => i.dayOffset === 0)).toHaveLength(2);
    expect(seq.filter((i) => i.dayOffset === 1).length).toBeGreaterThan(0);
    expect(seq[2]?.dayOffset).toBe(1);
  });

  it('respeita o corte de horas', () => {
    expect(buildHourlySequence({ today, tomorrow, now: at(0), maxHours: 6 })).toHaveLength(6);
  });

  it('sem amanhã, entrega só o resto de hoje', () => {
    const seq = buildHourlySequence({ today, tomorrow: null, now: at(21) });
    expect(seq).toHaveLength(3);
    expect(seq.every((i) => i.dayOffset === 0)).toBe(true);
  });

  it('na última hora do dia, ainda entrega a hora atual', () => {
    const seq = buildHourlySequence({ today, tomorrow: null, now: at(23) });
    expect(seq).toHaveLength(1);
    expect(seq[0]?.isNow).toBe(true);
  });
});

describe('buildDaySequence', () => {
  it('entrega as 24 horas do dia, em ordem, sem marcar agora', () => {
    const seq = buildDaySequence(dayAt('2026-09-14'));
    expect(seq).toHaveLength(24);
    expect(seq.map((i) => i.hour.hour.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(seq.some((i) => i.isNow)).toBe(false);
    expect(seq.every((i) => i.dayOffset === 0)).toBe(true);
  });
});

describe('bestOfSequence', () => {
  it('devolve a hora de maior score', () => {
    const seq = buildHourlySequence({
      today: dayAt('2026-09-13'),
      tomorrow: dayAt('2026-09-14'),
      now: at(0),
    });
    const best = bestOfSequence(seq);
    expect(best).not.toBeNull();
    expect(seq.every((i) => i.hour.score <= (best?.hour.score ?? 0))).toBe(true);
  });

  it('devolve nulo para cronologia vazia', () => {
    expect(bestOfSequence([])).toBeNull();
  });
});
