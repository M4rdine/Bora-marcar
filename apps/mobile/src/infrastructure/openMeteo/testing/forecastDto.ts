import type { ForecastResponse } from '../forecastSchema';

const pad = (n: number): string => String(n).padStart(2, '0');

/** DTO no formato da Open-Meteo para os dias dados, 24 horas por dia, valores amenos. */
export function makeForecastDto(dates: readonly string[]): ForecastResponse {
  const time = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${pad(h)}:00`));
  const perHour = <T>(f: (h: number) => T): T[] =>
    dates.flatMap(() => Array.from({ length: 24 }, (_, h) => f(h)));
  return {
    timezone: 'America/Sao_Paulo',
    utc_offset_seconds: -10800,
    hourly: {
      time,
      temperature_2m: perHour(() => 22),
      apparent_temperature: perHour(() => 22),
      precipitation_probability: perHour(() => 5),
      precipitation: perHour(() => 0),
      wind_speed_10m: perHour(() => 10),
      wind_gusts_10m: perHour(() => 15),
      uv_index: perHour((h) => (h >= 6 && h < 18 ? 3 : 0)),
      cloud_cover: perHour(() => 20),
      weather_code: perHour(() => 1),
      is_day: perHour((h) => (h >= 6 && h < 18 ? 1 : 0)),
      relative_humidity_2m: perHour(() => 55),
    },
    daily: {
      time: [...dates],
      sunrise: dates.map((d) => `${d}T06:12`),
      sunset: dates.map((d) => `${d}T18:04`),
      weather_code: dates.map(() => 1),
      temperature_2m_max: dates.map(() => 26),
      temperature_2m_min: dates.map(() => 16),
    },
  };
}
