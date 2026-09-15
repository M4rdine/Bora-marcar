import { cityDtoSchema } from '@melhor-hora/contracts';
import { z } from 'zod';

import type { City, GeocodingProvider, ProviderError } from '@/application/ports';
import { err, ok, type Result } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

const LANGUAGE = 'pt';
const citiesSchema = z.array(cityDtoSchema);

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl: string };

export function createBffGeocoding({ fetchFn, baseUrl }: Deps): GeocodingProvider {
  return {
    async search(query, signal): Promise<Result<readonly City[], ProviderError>> {
      const params = new URLSearchParams({ q: query, lang: LANGUAGE });
      const raw = await fetchJson(
        fetchFn,
        `${baseUrl}/v1/cities?${params.toString()}`,
        signal ? { signal } : {},
      );
      if (!raw.ok) return raw;
      const parsed = citiesSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(parsed.data);
    },
  };
}
