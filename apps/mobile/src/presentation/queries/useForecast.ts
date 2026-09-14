import { useQuery } from '@tanstack/react-query';

import type { City, ProviderError } from '@/application/ports';
import type { Forecast } from '@/domain';

import { useServices } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';

import { queryKeys } from './keys';
import { FORECAST_GC_MS, FORECAST_STALE_MS } from './queryClient';

export function useForecast(city: City | null) {
  const services = useServices();
  return useQuery<Forecast, ProviderError>({
    queryKey: queryKeys.forecast(city?.id ?? 'none'),
    enabled: city !== null,
    staleTime: FORECAST_STALE_MS,
    gcTime: FORECAST_GC_MS,
    queryFn: async ({ signal }) => {
      if (city === null) throw { code: 'network', message: 'sem cidade' } satisfies ProviderError;
      const r = await services.ports.forecast.fetch(
        { latitude: city.latitude, longitude: city.longitude },
        signal,
      );
      if (!r.ok) throw r.error;
      usePreferences.getState().rememberForecast(r.value);
      return r.value;
    },
  });
}
