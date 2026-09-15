import { buildForecastUrl, mapForecast, openMeteoForecastSchema } from '@bora-marcar/contracts';

import type { Coordinates, ForecastProvider, ProviderError } from '@/application/ports';
import { err, ok, type Forecast, type Result } from '@/domain';

import { fetchJson, type FetchLike } from './http';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function createOpenMeteoForecast({
  fetchFn,
  baseUrl = FORECAST_BASE_URL,
}: Deps): ForecastProvider {
  return {
    async fetch(coords: Coordinates, signal): Promise<Result<Forecast, ProviderError>> {
      const url = buildForecastUrl(baseUrl, coords.latitude, coords.longitude);
      const raw = await fetchJson(fetchFn, url, signal ? { signal } : {});
      if (!raw.ok) return raw;
      const parsed = openMeteoForecastSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(mapForecast(parsed.data));
    },
  };
}
