import type { Forecast, Result } from '@/domain';

import type { City, Coordinates } from './city';

export type ProviderErrorCode = 'network' | 'http' | 'schema' | 'timeout';
export type ProviderError = {
  readonly code: ProviderErrorCode;
  readonly message: string;
  readonly status?: number;
};

export type GeocodingProvider = {
  search(query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>>;
};

export type ForecastProvider = {
  fetch(coords: Coordinates, signal?: AbortSignal): Promise<Result<Forecast, ProviderError>>;
};
