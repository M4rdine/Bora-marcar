import type { Coordinates, ForecastProvider, ProviderError } from '@/application/ports';
import { err, ok, type Forecast, type Result } from '@/domain';

import { forecastResponseSchema } from './forecastSchema';
import { fetchJson, type FetchLike } from './http';
import { mapForecast } from './mapForecast';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com';
export const FORECAST_DAYS = 5;
export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'cloud_cover',
  'weather_code',
  'is_day',
  'relative_humidity_2m',
] as const;
export const DAILY_VARS = [
  'sunrise',
  'sunset',
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
] as const;

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function buildForecastUrl(baseUrl: string, coords: Coordinates): string {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `${baseUrl}/v1/forecast?${params.toString()}`;
}

export function createOpenMeteoForecast({
  fetchFn,
  baseUrl = FORECAST_BASE_URL,
}: Deps): ForecastProvider {
  return {
    async fetch(coords, signal): Promise<Result<Forecast, ProviderError>> {
      const raw = await fetchJson(
        fetchFn,
        buildForecastUrl(baseUrl, coords),
        signal ? { signal } : {},
      );
      if (!raw.ok) return raw;
      const parsed = forecastResponseSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(mapForecast(parsed.data));
    },
  };
}
