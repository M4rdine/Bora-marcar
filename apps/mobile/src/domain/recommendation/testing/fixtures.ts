import type { HourlyConditions } from '../../forecast/types';

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
