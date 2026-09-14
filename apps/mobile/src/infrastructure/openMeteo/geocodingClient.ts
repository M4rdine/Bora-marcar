import type { City, GeocodingProvider, ProviderError } from '@/application/ports';
import { err, ok, type Result } from '@/domain';

import { geocodingResponseSchema } from './geocodingSchema';
import { fetchJson, type FetchLike } from './http';
import { mapCity } from './mapCity';

export const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com';
const RESULT_COUNT = 8;
const LANGUAGE = 'pt';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function createOpenMeteoGeocoding({
  fetchFn,
  baseUrl = GEOCODING_BASE_URL,
}: Deps): GeocodingProvider {
  return {
    async search(query, signal): Promise<Result<readonly City[], ProviderError>> {
      const url = `${baseUrl}/v1/search?name=${encodeURIComponent(query)}&count=${RESULT_COUNT}&language=${LANGUAGE}&format=json`;
      const raw = await fetchJson(fetchFn, url, signal ? { signal } : {});
      if (!raw.ok) return raw;
      const parsed = geocodingResponseSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok((parsed.data.results ?? []).map(mapCity));
    },
  };
}
