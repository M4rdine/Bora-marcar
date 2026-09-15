import type { CityDto, ForecastDto } from '@bora-marcar/contracts';

export type UpstreamErrorCode =
  'upstream_timeout' | 'upstream_http' | 'upstream_schema' | 'upstream_network';
export type UpstreamError = { readonly code: UpstreamErrorCode; readonly message: string };
export type UpstreamResult<T> = { ok: true; value: T } | { ok: false; error: UpstreamError };

export type Upstream = {
  searchCities(query: string, lang: string): Promise<UpstreamResult<readonly CityDto[]>>;
  fetchForecast(latitude: number, longitude: number): Promise<UpstreamResult<ForecastDto>>;
};
