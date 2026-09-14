import type { FactorId } from '../../activities/types';
import type { Forecast, HourlyConditions } from '../../forecast/types';
import type { HourScore, ScoreLabel } from '../scoreHour';
import type { VetoId } from '../vetoes';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Hora "perfeita" para caminhada: 22°, seco, vento leve, UV 3, céu aberto, dia. */
export function makeHour(overrides: Partial<HourlyConditions> = {}): HourlyConditions {
  const hour = overrides.hour ?? 10;
  const date = overrides.date ?? '2026-09-13';
  return {
    time: `${date}T${pad(hour)}:00`,
    date,
    hour,
    temperature: 22,
    apparentTemperature: 22,
    precipitationProbability: 5,
    precipitationMm: 0,
    windSpeedKmh: 10,
    windGustsKmh: 15,
    uvIndex: 3,
    cloudCoverPct: 20,
    weatherCode: 1,
    isDay: true,
    humidityPct: 55,
    ...overrides,
  };
}

/** Gera as 24 horas de um dia a partir de um transformador por hora. */
export function makeDay(
  date: string,
  perHour: (hour: number) => Partial<HourlyConditions> = () => ({}),
): HourlyConditions[] {
  return Array.from({ length: 24 }, (_, hour) =>
    makeHour({ date, hour, isDay: hour >= 6 && hour < 18, ...perHour(hour) }),
  );
}

const labelOf = (score: number): ScoreLabel =>
  score >= 80 ? 'great' : score >= 65 ? 'good' : score >= 45 ? 'fair' : 'poor';

/** `HourScore` de teste com conforto perfeito (1) em todos os fatores por padrão. */
export function makeHourScore(
  hour: number,
  score: number,
  overrides: { comforts?: Partial<Record<FactorId, number>>; veto?: VetoId | null } = {},
): HourScore {
  return {
    hour: makeHour({ hour }),
    score,
    comforts: { thermal: 1, rain: 1, wind: 1, uv: 1, sun: 1, ...overrides.comforts },
    veto: overrides.veto ?? null,
    label: labelOf(score),
  };
}

/** Previsão de teste com dias inteiros e resumo diário coerente. */
export function makeForecast(
  dates: readonly string[],
  perHour: (date: string, hour: number) => Partial<HourlyConditions> = () => ({}),
): Forecast {
  return {
    timezone: 'America/Sao_Paulo',
    utcOffsetSeconds: -10800,
    hourly: dates.flatMap((date) => makeDay(date, (hour) => perHour(date, hour))),
    daily: dates.map((date) => ({
      date,
      sunrise: `${date}T06:12`,
      sunset: `${date}T18:04`,
      weatherCode: 1,
      tempMax: 26,
      tempMin: 16,
    })),
  };
}
