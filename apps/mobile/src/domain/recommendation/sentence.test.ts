import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { scoreHour } from './scoreHour';
import { buildCaveat, buildSentence } from './sentence';
import { makeHour } from './testing/fixtures';

const walk = cfg.activities.walk;
const run = cfg.activities.run;
const beach = cfg.activities.beach;

const scored = (hours: ReturnType<typeof makeHour>[], profile = walk) =>
  hours.map((h) => scoreHour(h, profile, cfg));

describe('buildSentence', () => {
  it('caminhada: sensação, chuva e vento (três maiores pesos)', () => {
    const hours = scored([
      makeHour({ hour: 17, apparentTemperature: 23, precipitationProbability: 5, windSpeedKmh: 9 }),
      makeHour({ hour: 18, apparentTemperature: 23, precipitationProbability: 5, windSpeedKmh: 9 }),
    ]);
    expect(buildSentence(hours, walk)).toBe('Sensação de 23°, sem chuva e vento leve.');
  });

  it('corrida: sensação, chuva e um dos fatores de 0,15 (vento vem antes de UV)', () => {
    const hours = scored(
      [makeHour({ apparentTemperature: 18, precipitationProbability: 40, windSpeedKmh: 25 })],
      run,
    );
    expect(buildSentence(hours, run)).toBe('Sensação de 18°, chance de chuva e vento moderado.');
  });

  it('praia: sensação, chuva e sol', () => {
    const hours = scored([makeHour({ apparentTemperature: 29, cloudCoverPct: 10 })], beach);
    expect(buildSentence(hours, beach)).toBe('Sensação de 29°, sem chuva e céu aberto.');
  });

  it('ignora o terceiro fator quando o peso é menor que 0,1', () => {
    // piquenique: thermal .35, rain .35, wind .15 → três fatores normalmente; força pesos custom
    const profile = {
      ...walk,
      weights: { thermal: 0.6, rain: 0.35, wind: 0.05, uv: 0, sun: 0, pressure: 0 },
    };
    const hours = scored([makeHour({ apparentTemperature: 20 })], profile);
    expect(buildSentence(hours, profile)).toBe('Sensação de 20° e sem chuva.');
  });

  it('arredonda a sensação média', () => {
    const hours = scored([
      makeHour({ apparentTemperature: 22.4 }),
      makeHour({ apparentTemperature: 23.4 }),
    ]);
    expect(buildSentence(hours, walk)).toMatch(/^Sensação de 23°/);
  });

  it('um único fator vira frase simples', () => {
    const profile = {
      ...walk,
      weights: { thermal: 1, rain: 0, wind: 0, uv: 0, sun: 0, pressure: 0 },
    };
    const hours = scored([makeHour({ apparentTemperature: 20 })], profile);
    expect(buildSentence(hours, profile)).toBe('Sensação de 20°.');
  });

  it('UV entra na frase quando tem peso', () => {
    const profile = {
      ...run,
      weights: { thermal: 0.5, rain: 0, wind: 0, uv: 0.5, sun: 0, pressure: 0 },
    };
    const hours = scored([makeHour({ apparentTemperature: 18, uvIndex: 4 })], profile);
    expect(buildSentence(hours, profile)).toBe('Sensação de 18° e UV moderado.');
  });
});

describe('buildCaveat', () => {
  const window = { date: '2026-09-13', startHour: 17, endHour: 19 };

  it('avisa sobre UV alto nas 3 horas antes da janela', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({ hour, uvIndex: hour >= 14 && hour < 17 ? 9 : 2 }),
      ),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h o UV está alto: melhor esperar.');
  });

  it('avisa sobre chuva antes da janela', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({ hour, precipitationProbability: hour === 16 ? 70 : 0 }),
      ),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h há chance de chuva.');
  });

  it('avisa sobre calor antes da janela', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({ hour, apparentTemperature: hour === 15 ? 31 : 22 }),
      ),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h a sensação térmica está quente.');
  });

  it('avisa sobre vento antes da janela', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({ hour, windSpeedKmh: hour === 16 ? 40 : 5 }),
      ),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h o vento está forte.');
  });

  it('sem problema antes da janela devolve null', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour })));
    expect(buildCaveat(day, window, walk)).toBeNull();
  });

  it('ignora fatores com peso zero e nuvens', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({ hour, cloudCoverPct: hour === 16 ? 100 : 0, uvIndex: hour === 16 ? 9 : 2 }),
      ),
      run,
    );
    // corrida: sun tem peso 0; UV tem peso e conforto < 0,5 → ressalva de UV
    expect(buildCaveat(day, window, run)).toBe('Antes das 17h o UV está alto: melhor esperar.');
  });

  it('janela às 0h não tem horas anteriores', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour })));
    expect(buildCaveat(day, { date: '2026-09-13', startHour: 0, endHour: 1 }, walk)).toBeNull();
  });

  it('com mais de um problema, avisa o de menor conforto', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) =>
        makeHour({
          hour,
          uvIndex: hour === 16 ? 9 : 2,
          precipitationProbability: hour === 16 ? 70 : 0,
        }),
      ),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h há chance de chuva.');
  });
});
