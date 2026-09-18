import type { FactorId } from '../activities/types';
import type { HourlyConditions } from '../forecast/types';

type Band = readonly [max: number, label: string];

const pick = (bands: readonly Band[], value: number, fallback: string): string =>
  bands.find(([max]) => value < max)?.[1] ?? fallback;

export const describeThermal = (apparent: number): string =>
  pick(
    [
      [8, 'gelado'],
      [15, 'frio'],
      [19, 'fresco'],
      [27, 'agradável'],
      [32, 'quente'],
    ],
    apparent,
    'muito quente',
  );

export const describeRain = (pct: number): string =>
  pick(
    [
      [10, 'sem chuva'],
      [31, 'baixa chance de chuva'],
      [61, 'chance de chuva'],
    ],
    pct,
    'chuva provável',
  );

export const describeWind = (kmh: number): string =>
  pick(
    [
      [8, 'calmo'],
      [20, 'leve'],
      [35, 'moderado'],
    ],
    kmh,
    'forte',
  );

export const describeUv = (uv: number): string =>
  pick(
    [
      [3, 'baixo'],
      [6, 'moderado'],
      [8, 'alto'],
    ],
    uv,
    'muito alto',
  );

export const describeSun = (cloudPct: number): string =>
  pick(
    [
      [30, 'céu aberto'],
      [71, 'parcialmente nublado'],
    ],
    cloudPct,
    'nublado',
  );

export function factorValue(f: FactorId, h: HourlyConditions): number {
  switch (f) {
    case 'thermal':
      return h.apparentTemperature;
    case 'rain':
      return h.precipitationProbability;
    case 'wind':
      return h.windSpeedKmh;
    case 'uv':
      return h.uvIndex;
    case 'sun':
      return h.cloudCoverPct;
    case 'pressure':
      // A tendência, não o valor: é ela que o motor pontua.
      return h.pressureTrendHpa;
  }
}

export function averageFactor(f: FactorId, hours: readonly HourlyConditions[]): number {
  if (hours.length === 0) return 0;
  return hours.reduce((acc, h) => acc + factorValue(f, h), 0) / hours.length;
}

/**
 * A tendência da pressão em palavras.
 *
 * Só a pesca pesa este fator, então a frase é escrita do ponto de vista de quem pesca: pressão
 * caindo é boa notícia, subindo é má.
 */
export const describePressure = (trendHpa: number): string =>
  pick(
    [
      [-2, 'pressão em queda'],
      [-0.5, 'pressão caindo de leve'],
      [0.5, 'pressão estável'],
    ],
    trendHpa,
    'pressão subindo',
  );
