import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { labelFor, scoreHour } from './scoreHour';
import { makeHour } from './testing/fixtures';

const walk = cfg.activities.walk;
const beach = cfg.activities.beach;

describe('labelFor', () => {
  it.each([
    [100, 'great'],
    [80, 'great'],
    [79, 'good'],
    [65, 'good'],
    [64, 'fair'],
    [45, 'fair'],
    [44, 'poor'],
    [0, 'poor'],
  ])('%i → %s', (score, label) => {
    expect(labelFor(score, cfg)).toBe(label);
  });
});

describe('scoreHour', () => {
  it('hora perfeita para caminhada dá 100', () => {
    const r = scoreHour(makeHour(), walk, cfg);
    expect(r.score).toBe(100);
    expect(r.label).toBe('great');
    expect(r.veto).toBeNull();
    expect(r.comforts).toEqual({ thermal: 1, rain: 1, wind: 1, uv: 1, sun: 1 });
  });

  it('pondera pelos pesos da atividade', () => {
    // chuva 50% → conforto 0,5; peso chuva caminhada 0,30 → base 0,85
    const r = scoreHour(makeHour({ precipitationProbability: 50 }), walk, cfg);
    expect(r.score).toBe(85);
    expect(r.comforts.rain).toBeCloseTo(0.5);
  });

  it('à noite multiplica pelo fator noturno', () => {
    expect(scoreHour(makeHour({ isDay: false }), walk, cfg).score).toBe(70);
    expect(scoreHour(makeHour({ isDay: false, apparentTemperature: 28 }), beach, cfg).score).toBe(
      0,
    );
  });

  it('aplica vetos depois da média', () => {
    const r = scoreHour(makeHour({ weatherCode: 95 }), walk, cfg);
    expect(r).toMatchObject({ score: 0, veto: 'storm', label: 'poor' });
  });

  it('praia valoriza sol: céu fechado derruba mais que na corrida', () => {
    const cloudy = makeHour({ cloudCoverPct: 100, apparentTemperature: 28 });
    const beachScore = scoreHour(cloudy, beach, cfg).score;
    const walkScore = scoreHour({ ...cloudy, apparentTemperature: 22 }, walk, cfg).score;
    expect(beachScore).toBe(86); // 1 - 0,2 × 0,7
    expect(walkScore).toBe(97); // 1 - 0,05 × 0,7 → 96,5 → 97
  });

  it('mantém referência à hora de entrada', () => {
    const h = makeHour({ hour: 17 });
    expect(scoreHour(h, walk, cfg).hour).toBe(h);
  });
});
