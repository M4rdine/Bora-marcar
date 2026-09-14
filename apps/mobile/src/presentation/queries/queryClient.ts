import { QueryClient } from '@tanstack/react-query';

export const FORECAST_STALE_MS = 15 * 60_000;
export const FORECAST_GC_MS = 2 * 60 * 60_000;
export const CITIES_STALE_MS = 24 * 60 * 60_000;

export const createQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } } });
