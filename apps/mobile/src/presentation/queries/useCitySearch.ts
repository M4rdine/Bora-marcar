import { useQuery } from '@tanstack/react-query';

import type { City, ProviderError } from '@/application/ports';
import { MIN_QUERY_LENGTH } from '@/application/useCases/searchCities';

import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';
import { CITIES_STALE_MS } from './queryClient';

export function useCitySearch(query: string) {
  const services = useServices();
  const debounced = useDebouncedValue(query.trim());
  const isActive = debounced.length >= MIN_QUERY_LENGTH;
  const q = useQuery<readonly City[], ProviderError>({
    queryKey: queryKeys.cities(debounced),
    enabled: isActive,
    staleTime: CITIES_STALE_MS,
    queryFn: async ({ signal }) => {
      const r = await services.searchCities(debounced, signal);
      if (!r.ok) throw r.error;
      return r.value;
    },
  });
  return {
    results: q.data ?? [],
    isSearching: isActive && q.isPending,
    error: q.error,
    isActive,
    retry: () => void q.refetch(),
  };
}
