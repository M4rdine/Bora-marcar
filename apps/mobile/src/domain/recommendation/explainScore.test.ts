import { ACTIVITY_IDS } from '../activities/types';
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { explainScore } from './explainScore';
import { scoreHour } from './scoreHour';
import { makeHour } from './testing/fixtures';

/** Um leque de horas que cobre bom tempo, chuva, tempestade, neve, calor, frio, nevoeiro e noite. */
const HORAS = [
  makeHour(),
  makeHour({ apparentTemperature: 38, uvIndex: 11, cloudCoverPct: 0 }),
  makeHour({ apparentTemperature: -4, windSpeedKmh: 40, windGustsKmh: 70 }),
  makeHour({ precipitationProbability: 90, precipitationMm: 3 }),
  makeHour({ weatherCode: 95 }),
  makeHour({ weatherCode: 75 }),
  makeHour({ weatherCode: 45 }),
  makeHour({ isDay: false, uvIndex: 0, cloudCoverPct: 80 }),
  makeHour({ cloudCoverPct: 100, precipitationProbability: 50, precipitationMm: 0.4 }),
];

describe('explainScore', () => {
  /**
   * O teste que faz a explicação valer alguma coisa.
   *
   * Uma tela que abre a conta da nota é pior que nenhuma se a conta não for A conta: ela passa a
   * afirmar, com números, algo que o motor não fez. Aqui a soma é confrontada com `scoreHour`
   * para toda atividade e toda hora do leque.
   */
  it('a conta fecha com a nota que o motor dá, em toda atividade e toda condição', () => {
    for (const id of ACTIVITY_IDS) {
      const profile = cfg.activities[id];
      for (const h of HORAS) {
        expect(explainScore(h, profile).total).toBe(scoreHour(h, profile, cfg).score);
      }
    }
  });

  it('sem nenhum corte, a nota é a soma dos fatores arredondada', () => {
    const h = makeHour();
    const e = explainScore(h, cfg.activities.walk);
    if (e.adjustments.length === 0) expect(e.total).toBe(Math.round(e.subtotal));
  });

  it('os cinco fatores aparecem sempre, mesmo os que não atrapalham', () => {
    const e = explainScore(makeHour(), cfg.activities.walk);
    expect(e.factors).toHaveLength(5);
    expect(new Set(e.factors.map((f) => f.id)).size).toBe(5);
  });

  it('os fatores vêm do que mais vale nesta atividade para o que menos vale', () => {
    const pesos = explainScore(makeHour(), cfg.activities.cycle).factors.map((f) => f.maxPoints);
    expect([...pesos].sort((a, b) => b - a)).toEqual(pesos);
  });

  /** O que o painel promete ao mostrar "peso": os pesos somam a nota máxima possível, 100. */
  it('os pesos de cada perfil somam cem pontos', () => {
    for (const id of ACTIVITY_IDS) {
      const e = explainScore(makeHour(), cfg.activities[id]);
      expect(e.factors.reduce((acc, f) => acc + f.maxPoints, 0)).toBeCloseTo(100, 6);
    }
  });

  it('nenhum fator entrega mais pontos do que o seu peso permite', () => {
    for (const id of ACTIVITY_IDS) {
      for (const h of HORAS) {
        for (const f of explainScore(h, cfg.activities[id]).factors) {
          expect(f.points).toBeLessThanOrEqual(f.maxPoints + 1e-9);
          expect(f.points).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  });

  it('a leitura mostrada é a que o céu mediu, não uma derivada', () => {
    const h = makeHour({ apparentTemperature: 23.5, windSpeedKmh: 17, windGustsKmh: 33 });
    const e = explainScore(h, cfg.activities.run);
    expect(e.factors.find((f) => f.id === 'thermal')?.reading).toBe(23.5);
    const vento = e.factors.find((f) => f.id === 'wind');
    expect(vento?.reading).toBe(17);
    expect(vento?.secondary).toBe(33);
  });

  it('tempestade aparece como veto, com o teto que ela impõe', () => {
    const e = explainScore(makeHour({ weatherCode: 95 }), cfg.activities.run);
    const veto = e.adjustments.find((a) => a.kind === 'veto');
    expect(veto).toEqual({ kind: 'veto', id: 'storm', cap: 0 });
    expect(e.total).toBe(0);
  });

  it('hora noturna declara o corte da noite', () => {
    const e = explainScore(makeHour({ isDay: false }), cfg.activities.run);
    expect(e.adjustments.some((a) => a.kind === 'night')).toBe(true);
  });

  it('nevoeiro corta o ciclismo e não corta a caminhada', () => {
    const fog = makeHour({ weatherCode: 45 });
    expect(explainScore(fog, cfg.activities.cycle).adjustments.some((a) => a.kind === 'fog')).toBe(
      true,
    );
    expect(explainScore(fog, cfg.activities.walk).adjustments.some((a) => a.kind === 'fog')).toBe(
      false,
    );
  });
});
