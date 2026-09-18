import type { Limit, ThermalRange } from '../activities/types';

export type Point = readonly [number, number];

/**
 * Interpolação linear por partes; satura fora do intervalo dos pontos.
 * Pré-condição: `points` deve estar ordenado de forma crescente por x. A curva
 * térmica vem da config (ver `thermalComfort` abaixo), então o schema Zod do
 * Plano 3 precisa garantir `tolMin < idealMin <= idealMax < tolMax`, além de
 * `levels` não vazio e todos os `sizes` de janela >= 1 — sem isso, `piecewise`
 * e o restante do motor recebem entradas fora do domínio esperado.
 * As asserções `as` no ramo interior são seguras: os retornos antecipados
 * garantem `first[0] < x < last[0]`, e como os pontos estão ordenados por x,
 * sempre existe um par consecutivo com `pa[0] < x <= pb[0]`.
 */
export function piecewise(points: readonly Point[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  const pairs = points.slice(1).map((b, i): readonly [Point, Point] => [points[i] as Point, b]);
  const [a, b] = pairs.find(([pa, pb]) => pa[0] < x && x <= pb[0]) as readonly [Point, Point];
  const t = (x - a[0]) / (b[0] - a[0]);
  return a[1] + (b[1] - a[1]) * t;
}

export function thermalComfort(apparent: number, r: ThermalRange): number {
  return piecewise(
    [
      [r.tolMin, 0],
      [r.idealMin, 1],
      [r.idealMax, 1],
      [r.tolMax, 0],
    ],
    apparent,
  );
}

const RAIN_PROB_CURVE: readonly Point[] = [
  [20, 1],
  [50, 0.5],
  [80, 0.1],
];
const RAIN_PROB_ZERO = 80; // >= 80 % o conforto é 0 (e o veto limita o score a 20)
const LIGHT_RAIN_MIN_MM = 0.2;
const LIGHT_RAIN_PENALTY = 0.6;

export function rainComfort(probabilityPct: number, mm: number): number {
  if (probabilityPct >= RAIN_PROB_ZERO) return 0;
  const base = piecewise(RAIN_PROB_CURVE, probabilityPct);
  return mm >= LIGHT_RAIN_MIN_MM ? base * LIGHT_RAIN_PENALTY : base;
}

const GUST_RATIO = 1.3;
const GUST_PENALTY = 0.7;

export function windComfort(speedKmh: number, gustsKmh: number, limit: Limit): number {
  const base = piecewise(
    [
      [limit.ok, 1],
      [limit.max, 0],
    ],
    speedKmh,
  );
  return gustsKmh > limit.max * GUST_RATIO ? base * GUST_PENALTY : base;
}

const UV_FLOOR = 0.2;
const UV_AT_MAX = 0.3;

export function uvComfort(uv: number, limit: Limit): number {
  if (uv > limit.max) return UV_FLOOR;
  return piecewise(
    [
      [limit.ok, 1],
      [limit.max, UV_AT_MAX],
    ],
    uv,
  );
}

const SUN_CURVE: readonly Point[] = [
  [30, 1],
  [100, 0.3],
];

export function sunComfort(cloudCoverPct: number): number {
  return piecewise(SUN_CURVE, cloudCoverPct);
}

/**
 * Conforto da TENDÊNCIA de pressão, e não do valor.
 *
 * 1013 hPa não diz nada sozinho; caindo três hectopascais em três horas diz que uma frente está
 * chegando, e é aí que o peixe sobe para se alimentar. Pressão subindo depois da frente é o pior
 * cenário — o peixe desce e para de comer.
 *
 * A curva não depende do perfil, como a do sol: quem decide se isso importa é o PESO da
 * atividade, e para todas menos a pesca esse peso é zero.
 */
const PRESSURE_CURVE: readonly Point[] = [
  [-6, 0.55],
  [-3, 1],
  [-1, 0.9],
  [0, 0.7],
  [2, 0.4],
  [6, 0.25],
];

export function pressureComfort(trendHpa: number): number {
  return piecewise(PRESSURE_CURVE, trendHpa);
}
