import { useMemo } from 'react';

import type { City, ProviderError } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import type { ActivityId, Forecast } from '@/domain';

import { useNowTick } from '../hooks/useNowTick';
import { useServices } from '../services/ServicesProvider';

import { useEngineConfig } from './useEngineConfig';
import { useForecast } from './useForecast';

export type OverviewState = {
  readonly status: 'idle' | 'loading' | 'error' | 'ready';
  readonly snapshot: OverviewSnapshot | null;
  readonly forecast: Forecast | null;
  readonly error: ProviderError | null;
  readonly refetch: () => void;
};

export function useOverview(city: City | null, activity: ActivityId): OverviewState {
  const services = useServices();
  const forecast = useForecast(city);
  const config = useEngineConfig();
  // `services.ports.clock.now` é injetado no hook para que telas testadas com o relógio falso
  // (fixedClock) computem um "agora" determinístico em vez do relógio real da máquina de teste.
  const tick = useNowTick(services.ports.clock.now);
  const snapshot = useMemo(
    () =>
      forecast.data && config.data
        ? services.buildOverview({
            forecast: forecast.data,
            activity,
            config: config.data,
            nowEpochMs: tick,
          })
        : null,
    [services, forecast.data, config.data, activity, tick],
  );
  const status =
    city === null ? 'idle' : forecast.isError ? 'error' : snapshot === null ? 'loading' : 'ready';
  return {
    status,
    snapshot,
    forecast: forecast.data ?? null,
    error: forecast.error,
    refetch: () => void forecast.refetch(),
  };
}
