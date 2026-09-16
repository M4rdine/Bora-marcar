import { defaultEngineConfig as cfg, FACTOR_IDS, recommendDay } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { factorBreakdown, limitingFactor } from './factorBreakdown';

const DATES = ['2026-09-13'];
const hoursOf = (overrides: Parameters<typeof makeForecast>[1], activity: 'walk' | 'run') =>
  recommendDay(makeForecast(DATES, overrides), cfg.activities[activity], cfg, {
    date: '2026-09-13',
  }).hours;

describe('factorBreakdown', () => {
  it('devolve todos os fatores do motor, sem perder nenhum', () => {
    const hour = hoursOf(() => ({}), 'walk')[12];
    if (hour === undefined) throw new Error('fixture sem a hora 12');
    const rows = factorBreakdown(hour, cfg.activities.walk);
    expect(rows.map((r) => r.id).sort()).toEqual([...FACTOR_IDS].sort());
  });

  it('ordena pelo que mais derruba a nota, não pela ordem do motor', () => {
    const hour = hoursOf(() => ({ precipitationProbability: 90 }), 'walk')[12];
    if (hour === undefined) throw new Error('fixture sem a hora 12');
    const rows = factorBreakdown(hour, cfg.activities.walk);
    expect(rows[0]?.id).toBe('rain');
    const impacts = rows.map((r) => r.impact);
    expect([...impacts].sort((a, b) => b - a)).toEqual(impacts);
  });

  it('pondera pela atividade: o mesmo clima limita cada uma de um jeito', () => {
    const overrides = () => ({ uvIndex: 11, apparentTemperature: 33 });
    const walkHour = hoursOf(overrides, 'walk')[12];
    const runHour = hoursOf(overrides, 'run')[12];
    if (walkHour === undefined || runHour === undefined) throw new Error('fixture sem a hora 12');
    const walkThermal = factorBreakdown(walkHour, cfg.activities.walk).find(
      (r) => r.id === 'thermal',
    );
    const runThermal = factorBreakdown(runHour, cfg.activities.run).find((r) => r.id === 'thermal');
    expect(runThermal?.impact).toBeGreaterThan(walkThermal?.impact ?? 0);
  });
});

describe('limitingFactor', () => {
  it('nomeia o fator quando ele passa do mínimo', () => {
    const hour = hoursOf(() => ({ precipitationProbability: 90 }), 'walk')[12];
    if (hour === undefined) throw new Error('fixture sem a hora 12');
    const rows = factorBreakdown(hour, cfg.activities.walk);
    expect(limitingFactor(rows, 0.05)?.id).toBe('rain');
  });

  it('não culpa ninguém quando nada atrapalha o suficiente', () => {
    const hour = hoursOf(() => ({}), 'walk')[12];
    if (hour === undefined) throw new Error('fixture sem a hora 12');
    const rows = factorBreakdown(hour, cfg.activities.walk);
    expect(limitingFactor(rows, 1.1)).toBeNull();
  });

  it('devolve nulo para lista vazia', () => {
    expect(limitingFactor([], 0)).toBeNull();
  });
});
