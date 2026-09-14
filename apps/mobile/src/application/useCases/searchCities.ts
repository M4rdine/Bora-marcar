import { ok, type Result } from '@/domain';

import type { City, GeocodingProvider, ProviderError } from '../ports';

export const MIN_QUERY_LENGTH = 2;

type Deps = { readonly geocoding: GeocodingProvider };

export const searchCities =
  ({ geocoding }: Deps) =>
  async (query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>> => {
    const normalized = query.trim();
    if (normalized.length < MIN_QUERY_LENGTH) return ok([]);
    return geocoding.search(normalized, signal);
  };
