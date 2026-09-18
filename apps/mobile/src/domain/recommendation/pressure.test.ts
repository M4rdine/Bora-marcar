import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { pressureComfort } from './comfort';
import { explainScore } from './explainScore';
import { scoreHour } from './scoreHour';
import { makeHour } from './testing/fixtures';

describe('pressureComfort', () => {
  /**
   * O que o fator existe para dizer: pressão CAINDO é boa notícia. Frente chegando é quando o
   * peixe sobe para se alimentar; pressão subindo depois da frente é o pior cenário.
   */
  it('caindo vale mais que estável, e estável vale mais que subindo', () => {
    expect(pressureComfort(-3)).toBeGreaterThan(pressureComfort(0));
    expect(pressureComfort(0)).toBeGreaterThan(pressureComfort(3));
  });

  it('a queda ideal é o topo da curva', () => {
    expect(pressureComfort(-3)).toBe(1);
  });

  /** Despencar não é melhor ainda: queda violenta é tempestade, e o veto cuida do resto. */
  it('queda violenta vale menos que a queda ideal', () => {
    expect(pressureComfort(-6)).toBeLessThan(pressureComfort(-3));
  });

  it('nunca sai da faixa de zero a um', () => {
    for (let t = -20; t <= 20; t += 0.5) {
      expect(pressureComfort(t)).toBeGreaterThanOrEqual(0);
      expect(pressureComfort(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe('a pressão só mexe com quem pesa ela', () => {
  const caindo = makeHour({ pressureTrendHpa: -3 });
  const subindo = makeHour({ pressureTrendHpa: 3 });

  it('a nota da pesca muda com a tendência', () => {
    const boa = scoreHour(caindo, cfg.activities.fish, cfg).score;
    const ruim = scoreHour(subindo, cfg.activities.fish, cfg).score;
    expect(boa).toBeGreaterThan(ruim);
  });

  /** O contrato do peso zero: as outras cinco não podem ter sido afetadas pela mudança. */
  it('a nota das outras atividades não muda', () => {
    for (const id of ['walk', 'run', 'cycle', 'beach', 'picnic'] as const) {
      const p = cfg.activities[id];
      expect(scoreHour(caindo, p, cfg).score).toBe(scoreHour(subindo, p, cfg).score);
    }
  });

  it('a explicação da pesca mostra a pressão valendo pontos, e a da caminhada não', () => {
    const pesca = explainScore(caindo, cfg.activities.fish).factors.find(
      (f) => f.id === 'pressure',
    );
    const caminhada = explainScore(caindo, cfg.activities.walk).factors.find(
      (f) => f.id === 'pressure',
    );
    expect(pesca?.maxPoints).toBeGreaterThan(0);
    expect(caminhada?.maxPoints).toBe(0);
  });

  it('a leitura mostrada é a tendência, com o valor atual ao lado', () => {
    const hora = makeHour({ pressureTrendHpa: -2.4, pressureHpa: 1009 });
    const f = explainScore(hora, cfg.activities.fish).factors.find((x) => x.id === 'pressure');
    expect(f?.reading).toBe(-2.4);
    expect(f?.secondary).toBe(1009);
  });
});

describe('o perfil da pesca é de fato distinto', () => {
  const fish = cfg.activities.fish;

  it('é a única que pesa pressão', () => {
    for (const id of ['walk', 'run', 'cycle', 'beach', 'picnic'] as const) {
      expect(cfg.activities[id].weights.pressure).toBe(0);
    }
    expect(fish.weights.pressure).toBeGreaterThan(0);
  });

  it('é indiferente ao sol e a que menos tolera vento', () => {
    expect(fish.weights.sun).toBe(0);
    for (const id of ['walk', 'run', 'cycle', 'beach', 'picnic'] as const) {
      expect(fish.wind.max).toBeLessThanOrEqual(cfg.activities[id].wind.max);
    }
  });

  /** Pescar de madrugada é comum; correr às três da manhã, não. */
  it('a noite quase não penaliza a pesca', () => {
    for (const id of ['walk', 'run', 'cycle', 'beach', 'picnic'] as const) {
      expect(fish.nightFactor).toBeGreaterThan(cfg.activities[id].nightFactor);
    }
  });
});
