import { useQuery } from '@tanstack/react-query';

import type { Progress } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

export function useProgress(today: string | null) {
  const services = useServices();
  return useQuery<Progress>({
    queryKey: queryKeys.progress(today ?? 'none'),
    enabled: today !== null,
    queryFn: () => services.getProgress(today ?? ''),
  });
}
