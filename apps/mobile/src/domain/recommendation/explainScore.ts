import { FACTOR_IDS, type ActivityProfile, type FactorId } from '../activities/types';
import type { HourlyConditions } from '../forecast/types';

import { comfortsFor } from './scoreHour';
import { applyVetoes, VETO_CAPS, type VetoId } from './vetoes';

/**
 * A conta de um fator dentro da nota da hora.
 *
 * `reading` é o que o céu mediu; `comfort` é o quanto essa medida serve PARA ESTA ATIVIDADE;
 * `weight` é o quanto ela importa no perfil; e `points` é o que sobra dos `maxPoints` possíveis.
 * Vento a 11 km/h é confortável para uma caminhada e caro para uma pedalada — a mesma leitura,
 * dois pesos, duas contas.
 */
export type FactorAccount = {
  readonly id: FactorId;
  readonly reading: number;
  /** Segunda leitura do mesmo fator quando ela existe: milímetros de chuva, rajada de vento. */
  readonly secondary: number | null;
  readonly comfort: number;
  readonly weight: number;
  /** Pontos conquistados: peso × conforto × 100. */
  readonly points: number;
  /** Pontos que o fator valeria com conforto perfeito: peso × 100. */
  readonly maxPoints: number;
  /**
   * O critério: a faixa em que o fator entrega tudo, e aquela em que ele deixa de entregar.
   *
   * Sem isto, "0 de 35" numa sensação de 33° parece defeito. Com isto, lê-se que o piquenique
   * tem conforto pleno entre 19 e 27 graus e chega a zero em 33 — e o zero passa a ser uma
   * consequência visível do perfil, não um número caído do céu.
   */
  readonly comfortBand: readonly [number, number];
  readonly toleranceBand: readonly [number, number];
};

/** Um corte aplicado depois da soma dos fatores. */
export type ScoreAdjustment =
  | { readonly kind: 'night'; readonly factor: number }
  | { readonly kind: 'fog'; readonly factor: number }
  | { readonly kind: 'veto'; readonly id: VetoId; readonly cap: number };

/**
 * A nota de uma hora, aberta parcela por parcela.
 *
 * Existe porque um motor que pontua precisa PRESTAR CONTAS. A tela dizia "nenhum fator atrapalha
 * esta hora" e mais nada — o que é uma não-resposta: não diz o que foi medido, nem quanto cada
 * coisa pesou, nem como se chegou ao número. Aqui a conta aparece inteira e fecha: `total` é o
 * mesmo valor que `scoreHour` devolve, e há teste garantindo isso para todo perfil e toda hora.
 */
export type ScoreExplanation = {
  /** Os cinco fatores, do que mais vale nesta atividade para o que menos vale. */
  readonly factors: readonly FactorAccount[];
  /** Soma dos pontos dos fatores, antes de qualquer corte. */
  readonly subtotal: number;
  /** Os cortes aplicados depois da soma, na ordem em que o motor os aplica. */
  readonly adjustments: readonly ScoreAdjustment[];
  /** A nota final. Igual à de `scoreHour` — é o que faz a explicação ser verdadeira. */
  readonly total: number;
};

const PERCENT = 100;
/** Códigos WMO de nevoeiro, e o desconto que ele impõe ao ciclismo. Espelha `vetoes.ts`. */
const FOG_CODES = new Set([45, 48]);
const FOG_CYCLING_FACTOR = 0.6;

type Reading = {
  readonly reading: number;
  readonly secondary: number | null;
  readonly comfortBand: readonly [number, number];
  readonly toleranceBand: readonly [number, number];
};

/** Limiares fixos das curvas de chuva e de sol, que não dependem do perfil. Espelha `comfort.ts`. */
const RAIN_IDEAL_PCT = 20;
const RAIN_ZERO_PCT = 80;
const SUN_IDEAL_CLOUD_PCT = 30;
const SUN_MAX_CLOUD_PCT = 100;
/** Limiares da curva de pressão. Espelha `PRESSURE_CURVE` em `comfort.ts`. */
const PRESSURE_IDEAL_FALL = -3;
const PRESSURE_SOFT_FALL = -1;
const PRESSURE_MIN_TREND = -6;
const PRESSURE_MAX_TREND = 6;

function readingsOf(h: HourlyConditions, p: ActivityProfile): Readonly<Record<FactorId, Reading>> {
  return {
    thermal: {
      reading: h.apparentTemperature,
      secondary: null,
      comfortBand: [p.thermal.idealMin, p.thermal.idealMax],
      toleranceBand: [p.thermal.tolMin, p.thermal.tolMax],
    },
    rain: {
      reading: h.precipitationProbability,
      secondary: h.precipitationMm,
      comfortBand: [0, RAIN_IDEAL_PCT],
      toleranceBand: [0, RAIN_ZERO_PCT],
    },
    wind: {
      reading: h.windSpeedKmh,
      secondary: h.windGustsKmh,
      comfortBand: [0, p.wind.ok],
      toleranceBand: [0, p.wind.max],
    },
    uv: {
      reading: h.uvIndex,
      secondary: null,
      comfortBand: [0, p.uv.ok],
      toleranceBand: [0, p.uv.max],
    },
    sun: {
      reading: h.cloudCoverPct,
      secondary: null,
      comfortBand: [0, SUN_IDEAL_CLOUD_PCT],
      toleranceBand: [0, SUN_MAX_CLOUD_PCT],
    },
    pressure: {
      reading: h.pressureTrendHpa,
      secondary: h.pressureHpa,
      comfortBand: [PRESSURE_IDEAL_FALL, PRESSURE_SOFT_FALL],
      toleranceBand: [PRESSURE_MIN_TREND, PRESSURE_MAX_TREND],
    },
  };
}

export function explainScore(h: HourlyConditions, profile: ActivityProfile): ScoreExplanation {
  const comforts = comfortsFor(h, profile);
  const readings = readingsOf(h, profile);

  const factors = FACTOR_IDS.map((id): FactorAccount => {
    const weight = profile.weights[id];
    const comfort = comforts[id];
    return {
      id,
      ...readings[id],
      comfort,
      weight,
      points: weight * comfort * PERCENT,
      maxPoints: weight * PERCENT,
    };
  })
    .slice()
    .sort((a, b) => b.maxPoints - a.maxPoints);

  // A soma é escrita EXATAMENTE como em `scoreHour` — `100 × Σ(peso × conforto)`, e não
  // `Σ(peso × conforto × 100)`. As duas são a mesma conta na álgebra e não em ponto flutuante:
  // com a segunda, uma hora em 50,5 arredondava para 51 aqui e 50 lá, e a explicação passava a
  // afirmar um número que o motor não deu.
  const weighted = FACTOR_IDS.reduce((acc, id) => acc + profile.weights[id] * comforts[id], 0);
  const subtotal = PERCENT * weighted;

  // A ordem aqui não é estética: é a mesma de `scoreHour`, porque cada corte incide sobre o
  // resultado do anterior. Trocar a ordem mudaria o número e a explicação deixaria de fechar.
  const light = h.isDay ? 1 : profile.nightFactor;
  const base = Math.round(PERCENT * weighted * light);
  const fogged = profile.id === 'cycle' && FOG_CODES.has(h.weatherCode);
  const { score, veto } = applyVetoes(h, profile, base);

  const adjustments: readonly ScoreAdjustment[] = [
    ...(h.isDay ? [] : [{ kind: 'night', factor: light } as const]),
    ...(fogged ? [{ kind: 'fog', factor: FOG_CYCLING_FACTOR } as const] : []),
    ...(veto === null ? [] : [{ kind: 'veto', id: veto, cap: VETO_CAPS[veto] } as const]),
  ];

  return { factors, subtotal, adjustments, total: score };
}
