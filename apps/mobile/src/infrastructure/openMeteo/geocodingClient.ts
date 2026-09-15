import {
  buildGeocodingUrl,
  GEOCODING_COUNT,
  mapCity,
  openMeteoGeocodingSchema,
} from '@bora-marcar/contracts';

import type { City, GeocodingProvider, ProviderError } from '@/application/ports';
import { err, ok, type Result } from '@/domain';

import { fetchJson, type FetchLike } from './http';

export const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com';
const LANGUAGE = 'pt';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function createOpenMeteoGeocoding({
  fetchFn,
  baseUrl = GEOCODING_BASE_URL,
}: Deps): GeocodingProvider {
  return {
    async search(query, signal): Promise<Result<readonly City[], ProviderError>> {
      const url = buildGeocodingUrl(baseUrl, query, LANGUAGE, GEOCODING_COUNT);
      const raw = await fetchJson(fetchFn, url, signal ? { signal } : {});
      if (!raw.ok) return raw;
      const parsed = openMeteoGeocodingSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok((parsed.data.results ?? []).map(mapCity));
    },
  };
}
