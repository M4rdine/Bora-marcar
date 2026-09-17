import { defaultEngineConfig as cfg, recommendDay, type LocalDateTime } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import {
  bestHoursOf,
  bestOfSequence,
  buildDaySequence,
  buildHourlySequence,
} from './hourlySequence';

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

describe('bestHoursOf', () => {
  /** Limiar de "razoável" da configuração padrão; abaixo dele nenhuma hora merece a marca. */
  const FAIR = 45;
  const seq = buildHourlySequence({
    today: dayAt('2026-09-13'),
    tomorrow: dayAt('2026-09-14'),
    now: at(0),
  });

  it('marca TODAS as horas empatadas na melhor nota, não só a primeira', () => {
    const best = bestHoursOf(seq, FAIR);
    const topScore = bestOfSequence(seq)?.hour.score ?? 0;
    const tied = seq.filter((i) => i.hour.score === topScore);
    expect(best.size).toBe(tied.length);
    for (const item of tied) expect(best.has(item.hour.hour.time)).toBe(true);
  });

  it('nenhuma hora abaixo da melhor nota entra', () => {
    const best = bestHoursOf(seq, FAIR);
    const topScore = bestOfSequence(seq)?.hour.score ?? 0;
    for (const item of seq) {
      if (item.hour.score < topScore) expect(best.has(item.hour.hour.time)).toBe(false);
    }
  });

  /**
   * O caso que a marca mentia. Num dia em que a melhor hora tirou 30 — "Ruim" — o app marcava
   * nove linhas seguidas como "melhor", prometendo uma escolha boa onde não havia nenhuma.
   */
  it('num dia sem hora razoável, ninguém é a melhor', () => {
    const topScore = bestOfSequence(seq)?.hour.score ?? 0;
    expect(bestHoursOf(seq, topScore + 1).size).toBe(0);
  });

  it('a hora que empata EXATAMENTE no limiar ainda conta', () => {
    const topScore = bestOfSequence(seq)?.hour.score ?? 0;
    expect(bestHoursOf(seq, topScore).size).toBeGreaterThan(0);
  });

  it('cronologia vazia não marca nada', () => {
    expect(bestHoursOf([], FAIR).size).toBe(0);
  });
});
