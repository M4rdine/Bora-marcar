import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Result } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw r.error;
  return r.value;
};

export function useGamificationActions() {
  const services = useServices();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.progressPrefix() });
  const plan = useMutation({
    mutationFn: async (input: Parameters<typeof services.planActivity>[0]) =>
      unwrap(await services.planActivity(input)),
    onSuccess: invalidate,
  });
  const confirm = useMutation({
    mutationFn: async (input: Parameters<typeof services.confirmActivity>[0]) =>
      unwrap(await services.confirmActivity(input)),
    onSuccess: invalidate,
  });
  const log = useMutation({
    mutationFn: async (input: Parameters<typeof services.logActivity>[0]) =>
      unwrap(await services.logActivity(input)),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: async (planId: string) => unwrap(await services.cancelPlan(planId)),
    onSuccess: invalidate,
  });
  return { plan, confirm, log, cancel };
}
