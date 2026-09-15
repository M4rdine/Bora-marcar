import { defaultEngineConfig } from '../config/defaultEngineConfig';

import { makeHour } from './testing/fixtures';
import { applyVetoes } from './vetoes';

const walk = defaultEngineConfig.activities.walk;
const cycle = defaultEngineConfig.activities.cycle;

describe('applyVetoes', () => {
  it('sem veto devolve o score base', () => {
    expect(applyVetoes(makeHour(), walk, 88)).toEqual({ score: 88, veto: null });
  });

  it.each([95, 96, 99])('trovoada (código %i) zera', (code) => {
    expect(applyVetoes(makeHour({ weatherCode: code }), walk, 88)).toEqual({
      score: 0,
      veto: 'storm',
    });
  });

  it('chuva provável (>= 80%) limita a 20', () => {
    expect(applyVetoes(makeHour({ precipitationProbability: 80 }), walk, 88)).toEqual({
      score: 20,
      veto: 'rain',
    });
  });

  it('volume >= 1 mm limita a 20', () => {
    expect(applyVetoes(makeHour({ precipitationMm: 1 }), walk, 88)).toEqual({
      score: 20,
      veto: 'rain',
    });
  });

  it.each([71, 75, 77, 85, 86])('neve (código %i) limita a 20', (code) => {
    expect(applyVetoes(makeHour({ weatherCode: code }), walk, 88)).toEqual({
      score: 20,
      veto: 'snow',
    });
  });

  it('sensação fora da tolerância limita a 30', () => {
    expect(applyVetoes(makeHour({ apparentTemperature: 7 }), walk, 88)).toEqual({
      score: 30,
      veto: 'thermal',
    });
    expect(applyVetoes(makeHour({ apparentTemperature: 34 }), walk, 88)).toEqual({
      score: 30,
      veto: 'thermal',
    });
  });

  it('nevoeiro multiplica por 0,6 só para ciclismo, sem marcar veto', () => {
    expect(applyVetoes(makeHour({ weatherCode: 45 }), cycle, 80)).toEqual({
      score: 48,
      veto: null,
    });
    expect(applyVetoes(makeHour({ weatherCode: 48 }), walk, 80)).toEqual({ score: 80, veto: null });
  });

  it.each([0, 4])('madrugada (%ih) limita a 20 mesmo com tempo perfeito', (hour) => {
    expect(applyVetoes(makeHour({ hour, isDay: false }), walk, 88)).toEqual({
      score: 20,
      veto: 'night',
    });
  });

  it('a partir das 5h a madrugada deixa de vetar', () => {
    expect(applyVetoes(makeHour({ hour: 5, isDay: false }), walk, 88)).toEqual({
      score: 88,
      veto: null,
    });
  });

  it('o menor limite vence quando há mais de um veto', () => {
    const h = makeHour({ weatherCode: 71, apparentTemperature: 40 });
    expect(applyVetoes(h, walk, 88)).toEqual({ score: 20, veto: 'snow' });
  });

  it('score base já abaixo do limite não sobe', () => {
    expect(applyVetoes(makeHour({ precipitationMm: 2 }), walk, 10)).toEqual({
      score: 10,
      veto: 'rain',
    });
  });
});
