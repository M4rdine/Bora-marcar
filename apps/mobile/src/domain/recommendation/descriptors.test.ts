import {
  averageFactor,
  describeRain,
  describeSun,
  describeThermal,
  describeUv,
  describeWind,
  factorValue,
} from './descriptors';
import { makeHour } from './testing/fixtures';

describe('descritores PT-BR', () => {
  it.each([
    [5, 'gelado'],
    [7.9, 'gelado'],
    [8, 'frio'],
    [14, 'frio'],
    [15, 'fresco'],
    [18, 'fresco'],
    [19, 'agradável'],
    [26, 'agradável'],
    [27, 'quente'],
    [31, 'quente'],
    [32, 'muito quente'],
  ])('térmico %f → %s', (v, d) => expect(describeThermal(v)).toBe(d));

  it.each([
    [0, 'sem chuva'],
    [9, 'sem chuva'],
    [10, 'baixa chance de chuva'],
    [30, 'baixa chance de chuva'],
    [31, 'chance de chuva'],
    [60, 'chance de chuva'],
    [61, 'chuva provável'],
  ])('chuva %i → %s', (v, d) => expect(describeRain(v)).toBe(d));

  it.each([
    [0, 'calmo'],
    [7.9, 'calmo'],
    [8, 'leve'],
    [19, 'leve'],
    [20, 'moderado'],
    [34, 'moderado'],
    [35, 'forte'],
  ])('vento %f → %s', (v, d) => expect(describeWind(v)).toBe(d));

  it.each([
    [0, 'baixo'],
    [2, 'baixo'],
    [3, 'moderado'],
    [5, 'moderado'],
    [6, 'alto'],
    [7, 'alto'],
    [8, 'muito alto'],
  ])('UV %i → %s', (v, d) => expect(describeUv(v)).toBe(d));

  it.each([
    [0, 'céu aberto'],
    [29, 'céu aberto'],
    [30, 'parcialmente nublado'],
    [70, 'parcialmente nublado'],
    [71, 'nublado'],
  ])('nuvens %i → %s', (v, d) => expect(describeSun(v)).toBe(d));
});

describe('factorValue e averageFactor', () => {
  it('lê o campo certo de cada fator', () => {
    const h = makeHour({
      apparentTemperature: 23,
      precipitationProbability: 5,
      windSpeedKmh: 9,
      uvIndex: 3,
      cloudCoverPct: 20,
    });
    expect(factorValue('thermal', h)).toBe(23);
    expect(factorValue('rain', h)).toBe(5);
    expect(factorValue('wind', h)).toBe(9);
    expect(factorValue('uv', h)).toBe(3);
    expect(factorValue('sun', h)).toBe(20);
  });
  it('faz média sobre as horas', () => {
    const hours = [makeHour({ apparentTemperature: 22 }), makeHour({ apparentTemperature: 24 })];
    expect(averageFactor('thermal', hours)).toBe(23);
    expect(averageFactor('thermal', [])).toBe(0);
  });
});
