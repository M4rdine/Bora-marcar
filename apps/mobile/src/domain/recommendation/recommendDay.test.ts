import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { recommendDay } from './recommendDay';
import { makeForecast } from './testing/fixtures';

const walk = cfg.activities.walk;
const DATES = ['2026-09-13', '2026-09-14'];

describe('recommendDay', () => {
  it('dia bom: janela, frase, sem ressalva, sem dicas, com resumo diário', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, { date: '2026-09-13' });
    expect(r.hours).toHaveLength(24);
    expect(r.result.kind).toBe('window');
    expect(r.result.kind === 'window' && r.result.window).toEqual({
      date: '2026-09-13',
      startHour: 6,
      endHour: 9,
    });
    expect(r.score).toBe(100);
    expect(r.label).toBe('great');
    expect(r.sentence).toBe('Sensação de 22°, sem chuva e vento leve.');
    expect(r.caveat).toBeNull();
    expect(r.tips).toEqual([]);
    expect(r.daily?.sunrise).toBe('2026-09-13T06:12');
    expect(r.activityId).toBe('walk');
    expect(r.bestScoreOfDay).toBe(100);
  });

  it('chuva das 5h às 23h com madrugada limpa não recomenda 1h–4h: fica sem janela', () => {
    // Regressão do QA visual: o nightFactor sozinho deixava a madrugada vencer o dia chuvoso.
    const f = makeForecast(DATES, (_, hour) =>
      hour >= 5 ? { precipitationProbability: 95, precipitationMm: 3, weatherCode: 63 } : {},
    );
    const r = recommendDay(f, walk, cfg, { date: '2026-09-13' });
    expect(r.result.kind).toBe('none');
    expect(r.result.kind === 'none' && r.result.dominant).toBe('rain');
    // As horas da madrugada continuam pontuadas de verdade (timeline, XP), só não viram janela.
    expect(r.hours[2]?.score).toBeGreaterThan(45);
  });

  it('bestScoreOfDay olha o dia inteiro, mesmo quando o "agora" não deixa janela', () => {
    const r = recommendDay(makeForecast(DATES), cfg.activities.beach, cfg, {
      date: '2026-09-13',
      now: { hour: 20, minute: 0 },
    });
    expect(r.result.kind).toBe('none');
    expect(r.bestScoreOfDay).toBeGreaterThanOrEqual(80);
  });

  it('só considera as horas da data pedida', () => {
    const f = makeForecast(DATES, (date) =>
      date === '2026-09-13' ? { precipitationProbability: 90 } : {},
    );
    const r = recommendDay(f, walk, cfg, { date: '2026-09-14' });
    expect(r.hours.every((h) => h.hour.date === '2026-09-14')).toBe(true);
    expect(r.result.kind).toBe('window');
  });

  it('respeita o "agora" ao escolher candidatas', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, {
      date: '2026-09-13',
      now: { hour: 14, minute: 0 },
    });
    expect(r.result.kind === 'window' && r.result.window).toEqual({
      date: '2026-09-13',
      startHour: 14,
      endHour: 17,
    });
  });

  it('dia de chuva: sem janela, melhor score isolado e sem frase', () => {
    const f = makeForecast(DATES, () => ({ precipitationProbability: 90, precipitationMm: 2 }));
    const r = recommendDay(f, walk, cfg, { date: '2026-09-13' });
    expect(r.result).toMatchObject({ kind: 'none', dominant: 'rain' });
    expect(r.score).toBe(20);
    expect(r.label).toBe('poor');
    expect(r.sentence).toBeNull();
    expect(r.tips).toEqual([]);
    expect(r.bestScoreOfDay).toBe(20);
  });

  it('data sem previsão devolve vazio sem quebrar', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, { date: '2030-01-01' });
    expect(r.hours).toEqual([]);
    expect(r.result).toEqual({ kind: 'none', best: null, dominant: null });
    expect(r.score).toBeNull();
    expect(r.label).toBeNull();
    expect(r.daily).toBeNull();
    expect(r.bestScoreOfDay).toBeNull();
  });

  it('gera ressalva e dicas quando cabem', () => {
    const f = makeForecast(DATES, (_, hour) => ({
      uvIndex: hour >= 11 && hour < 14 ? 9 : hour >= 14 ? 6 : 1,
      apparentTemperature: hour < 14 ? 34 : 22,
    }));
    const r = recommendDay(f, walk, cfg, { date: '2026-09-13' });
    expect(r.result.kind === 'window' && r.result.window.startHour).toBe(14);
    expect(r.caveat).toBe('Antes das 14h a sensação térmica está muito quente.');
    expect(r.tips.map((t) => t.id)).toEqual(['sunscreen']);
  });
});
