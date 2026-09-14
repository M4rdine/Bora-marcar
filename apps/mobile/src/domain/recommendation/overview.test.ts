import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';
import type { LocalDateTime } from '../time/localDateTime';

import { recommendOverview } from './overview';
import { makeForecast } from './testing/fixtures';

const walk = cfg.activities.walk;
const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const rainy = { precipitationProbability: 50 }; // caminhada → 85 de dia

describe('recommendOverview', () => {
  it('hoje usa o "agora"; próximos dias são os 4 seguintes inteiros', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(14));
    expect(o.today.result.kind === 'window' && o.today.result.window.startHour).toBe(14);
    expect(o.nextDays.map((d) => d.date)).toEqual(DATES.slice(1));
    expect(o.nextDays[0]?.result.kind === 'window' && o.nextDays[0].result.window.startHour).toBe(
      6,
    );
  });

  it('score de agora é o da hora atual', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(20, 15));
    expect(o.now?.hour.hour).toBe(20);
    expect(o.now?.score).toBe(70);
  });

  it('nowInWindow reflete a janela de hoje', () => {
    const f = makeForecast(DATES, (_, hour) => (hour < 17 || hour > 18 ? rainy : {}));
    expect(recommendOverview(f, walk, cfg, at(17, 30)).nowInWindow).toBe(true);
    expect(recommendOverview(f, walk, cfg, at(9)).nowInWindow).toBe(false);
  });

  it('comparativo: amanhã melhor que hoje por 10+ pontos', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-13' ? rainy : {}));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.comparison).toBe('tomorrowBetter');
    expect(o.bestDate).toBe('2026-09-14');
  });

  it('comparativo: hoje é o melhor da semana (empate resolve para o mais cedo)', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(8));
    expect(o.comparison).toBe('todayBestOfWeek');
    expect(o.bestDate).toBe('2026-09-13');
  });

  it('comparativo nulo quando nem hoje é o melhor nem amanhã é bem melhor', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-15' ? {} : rainy));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.comparison).toBeNull();
    expect(o.bestDate).toBe('2026-09-15');
  });

  it('hoje sem janela e amanhã com janela → amanhã melhor', () => {
    const f = makeForecast(DATES, (date) =>
      date === '2026-09-13' ? { precipitationProbability: 95 } : {},
    );
    expect(recommendOverview(f, walk, cfg, at(8)).comparison).toBe('tomorrowBetter');
  });

  it('nenhum dia com janela → sem melhor data', () => {
    const f = makeForecast(DATES, () => ({ precipitationProbability: 95 }));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.bestDate).toBeNull();
    expect(o.comparison).toBeNull();
    expect(o.nowInWindow).toBe(false);
  });

  it('sem próximos dias: comparativo é "hoje é o melhor" e lista vazia', () => {
    const o = recommendOverview(makeForecast(['2026-09-13']), walk, cfg, at(8));
    expect(o.nextDays).toEqual([]);
    expect(o.comparison).toBe('todayBestOfWeek');
    expect(o.bestDate).toBe('2026-09-13');
  });

  it('hoje fora da previsão: sem score de agora, amanhã é melhor', () => {
    const o = recommendOverview(makeForecast(['2026-09-14']), walk, cfg, at(8));
    expect(o.now).toBeNull();
    expect(o.nowInWindow).toBe(false);
    expect(o.today.hours).toEqual([]);
    expect(o.comparison).toBe('tomorrowBetter');
    expect(o.bestDate).toBe('2026-09-14');
  });
});
