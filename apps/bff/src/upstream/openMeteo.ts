import {
  buildForecastUrl,
  buildGeocodingUrl,
  GEOCODING_COUNT,
  mapCity,
  mapForecast,
  openMeteoForecastSchema,
  openMeteoGeocodingSchema,
} from '@melhor-hora/contracts';
import type { z } from 'zod';

import type { Upstream, UpstreamError, UpstreamResult } from './types';

export type FetchLike = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Deps = {
  readonly fetchFn: FetchLike;
  readonly forecastBaseUrl: string;
  readonly geocodingBaseUrl: string;
  readonly timeoutMs: number;
};

const fail = <T>(code: UpstreamError['code'], message: string): UpstreamResult<T> => ({
  ok: false,
  error: { code, message },
});
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function fetchValidated<S extends z.ZodType>(
  deps: Deps,
  url: string,
  schema: S,
): Promise<UpstreamResult<z.infer<S>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  try {
    const response = await deps.fetchFn(url, { signal: controller.signal });
    if (!response.ok) return fail('upstream_http', `Open-Meteo respondeu HTTP ${response.status}`);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) return fail('upstream_schema', 'Resposta da Open-Meteo fora do schema');
    return { ok: true, value: parsed.data };
  } catch (e) {
    return controller.signal.aborted
      ? fail('upstream_timeout', `Open-Meteo não respondeu em ${deps.timeoutMs} ms`)
      : fail('upstream_network', messageOf(e));
  } finally {
    clearTimeout(timer);
  }
}

export function createOpenMeteoUpstream(deps: Deps): Upstream {
  return {
    async searchCities(query, lang) {
      const url = buildGeocodingUrl(deps.geocodingBaseUrl, query, lang, GEOCODING_COUNT);
      const r = await fetchValidated(deps, url, openMeteoGeocodingSchema);
      return r.ok ? { ok: true, value: (r.value.results ?? []).map(mapCity) } : r;
    },
    async fetchForecast(latitude, longitude) {
      const url = buildForecastUrl(deps.forecastBaseUrl, latitude, longitude);
      const r = await fetchValidated(deps, url, openMeteoForecastSchema);
      return r.ok ? { ok: true, value: mapForecast(r.value) } : r;
    },
  };
}
