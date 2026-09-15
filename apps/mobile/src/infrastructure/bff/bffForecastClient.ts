import { forecastDtoSchema } from '@melhor-hora/contracts';

import type { Coordinates, ForecastProvider, ProviderError } from '@/application/ports';
import { err, ok, type Forecast, type Result } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl: string };

export function createBffForecast({ fetchFn, baseUrl }: Deps): ForecastProvider {
  return {
    async fetch(coords: Coordinates, signal): Promise<Result<Forecast, ProviderError>> {
      const params = new URLSearchParams({
        lat: String(coords.latitude),
        lon: String(coords.longitude),
      });
      const raw = await fetchJson(
        fetchFn,
        `${baseUrl}/v1/forecast?${params.toString()}`,
        signal ? { signal } : {},
      );
      if (!raw.ok) return raw;
      const parsed = forecastDtoSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(parsed.data);
    },
  };
}
