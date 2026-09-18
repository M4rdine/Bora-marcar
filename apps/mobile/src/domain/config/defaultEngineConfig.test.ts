import { ACTIVITY_IDS, FACTOR_IDS } from '../activities/types';

import { defaultEngineConfig } from './defaultEngineConfig';

describe('defaultEngineConfig', () => {
  it('tem as cinco atividades', () => {
    expect(Object.keys(defaultEngineConfig.activities).sort()).toEqual([...ACTIVITY_IDS].sort());
  });

  it.each(ACTIVITY_IDS)('pesos de %s somam 1', (id) => {
    const sum = FACTOR_IDS.reduce(
      (acc, f) => acc + defaultEngineConfig.activities[id].weights[f],
      0,
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it.each(ACTIVITY_IDS)('faixa térmica de %s é coerente', (id) => {
    const t = defaultEngineConfig.activities[id].thermal;
    expect(t.tolMin).toBeLessThan(t.idealMin);
    expect(t.idealMin).toBeLessThan(t.idealMax);
    expect(t.idealMax).toBeLessThan(t.tolMax);
  });

  it('níveis crescem em XP e começam em 0', () => {
    const xps = defaultEngineConfig.levels.map((l) => l.xp);
    expect(xps[0]).toBe(0);
    expect(xps).toEqual([...xps].sort((a, b) => a - b));
    expect(defaultEngineConfig.levels).toHaveLength(8);
  });

  it('limiares de score são decrescentes', () => {
    const { great, good, fair } = defaultEngineConfig.scores;
    expect(great).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(fair);
  });

  it.each([
    [
      'walk',
      'Caminhada',
      { idealMin: 17, idealMax: 26, tolMin: 8, tolMax: 33 },
      { ok: 20, max: 45 },
      { ok: 5, max: 9 },
      0.7,
      { thermal: 0.4, rain: 0.3, wind: 0.15, uv: 0.1, sun: 0.05, pressure: 0 },
    ],
    [
      'run',
      'Corrida',
      { idealMin: 12, idealMax: 21, tolMin: 3, tolMax: 29 },
      { ok: 20, max: 45 },
      { ok: 5, max: 9 },
      0.6,
      { thermal: 0.45, rain: 0.25, wind: 0.15, uv: 0.15, sun: 0, pressure: 0 },
    ],
    [
      'cycle',
      'Ciclismo',
      { idealMin: 15, idealMax: 25, tolMin: 6, tolMax: 32 },
      { ok: 15, max: 35 },
      { ok: 5, max: 9 },
      0.3,
      { thermal: 0.3, rain: 0.3, wind: 0.3, uv: 0.1, sun: 0, pressure: 0 },
    ],
    [
      'beach',
      'Praia',
      { idealMin: 25, idealMax: 32, tolMin: 20, tolMax: 38 },
      { ok: 15, max: 35 },
      { ok: 6, max: 10 },
      0,
      { thermal: 0.3, rain: 0.25, wind: 0.15, uv: 0.1, sun: 0.2, pressure: 0 },
    ],
    [
      'picnic',
      'Piquenique',
      { idealMin: 19, idealMax: 27, tolMin: 12, tolMax: 33 },
      { ok: 15, max: 40 },
      { ok: 5, max: 9 },
      0.2,
      { thermal: 0.35, rain: 0.35, wind: 0.15, uv: 0.05, sun: 0.1, pressure: 0 },
    ],
  ] as const)(
    'valores literais de %s conferem com o spec',
    (id, name, thermal, wind, uv, nightFactor, weights) => {
      const activity = defaultEngineConfig.activities[id];
      expect(activity.name).toBe(name);
      expect(activity.thermal).toEqual(thermal);
      expect(activity.wind).toEqual(wind);
      expect(activity.uv).toEqual(uv);
      expect(activity.nightFactor).toBe(nightFactor);
      expect(activity.weights).toEqual(weights);
    },
  );

  it('valores literais de scores, window, tips, xp e schemaVersion conferem com o spec', () => {
    expect(defaultEngineConfig.scores).toEqual({ great: 80, good: 65, fair: 45 });
    expect(defaultEngineConfig.window).toEqual({
      sizes: [1, 2, 3],
      minHourScore: 45,
      lengthBonus: 3,
      minRemainingMinutes: 30,
      quietHoursEnd: 5,
      graceHoursAfterEnd: 2,
    });
    expect(defaultEngineConfig.tips).toEqual({
      uvProtect: 6,
      waterApparent: 28,
      coolDropDeg: 4,
      rainNextPct: 40,
      coatApparent: 14,
    });
    expect(defaultEngineConfig.xp).toEqual({
      base: 50,
      planBonus: 25,
      streakPerDay: 5,
      streakMaxDays: 10,
    });
    expect(defaultEngineConfig.schemaVersion).toBe(1);
  });

  it('valores literais dos níveis conferem com o spec', () => {
    expect(defaultEngineConfig.levels.map((l) => [l.level, l.xp, l.name])).toEqual([
      [1, 0, 'Brisa'],
      [2, 100, 'Garoa'],
      [3, 400, 'Sol'],
      [4, 900, 'Ventania'],
      [5, 1600, 'Aurora'],
      [6, 2500, 'Tempestade'],
      [7, 3600, 'Furacão'],
      [8, 4900, 'Clima Perfeito'],
    ]);
  });
});
