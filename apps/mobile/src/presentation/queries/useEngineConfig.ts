import { useQuery } from '@tanstack/react-query';

import type { EngineConfig } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

export function useEngineConfig() {
  const services = useServices();
  return useQuery<EngineConfig>({
    queryKey: queryKeys.engineConfig(),
    staleTime: Infinity,
    queryFn: () => services.ports.config.get(),
  });
}
