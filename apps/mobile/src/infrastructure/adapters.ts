import type {
  Clock,
  EngineConfigProvider,
  ForecastProvider,
  GeocodingProvider,
  KeyValueStorage,
  Logger,
} from '@/application/ports';
import { defaultEngineConfig } from '@/domain';

import { createBffForecast } from './bff/bffForecastClient';
import { createBffGeocoding } from './bff/bffGeocodingClient';
import { embeddedEngineConfigProvider } from './config/embeddedEngineConfigProvider';
import { createRemoteEngineConfigProvider } from './config/remoteEngineConfigProvider';
import type { AppEnv } from './env';
import { createOpenMeteoForecast } from './openMeteo/forecastClient';
import { createOpenMeteoGeocoding } from './openMeteo/geocodingClient';
import type { FetchLike } from './openMeteo/http';

type Deps = {
  readonly fetchFn: FetchLike;
  readonly storage: KeyValueStorage;
  readonly clock: Clock;
  readonly logger: Logger;
};
export type SelectedAdapters = {
  readonly geocoding: GeocodingProvider;
  readonly forecast: ForecastProvider;
  readonly config: EngineConfigProvider;
  readonly kind: {
    readonly geocoding: 'open-meteo' | 'bff';
    readonly forecast: 'open-meteo' | 'bff';
    readonly config: 'embedded' | 'remote';
  };
};

/** Spec 6.4: o mesmo port com dois adapters; o avaliador roda em `direct` sem configurar nada. */
export function selectAdapters(env: AppEnv, deps: Deps): SelectedAdapters {
  if (env.apiMode === 'direct') {
    return {
      geocoding: createOpenMeteoGeocoding({ fetchFn: deps.fetchFn }),
      forecast: createOpenMeteoForecast({ fetchFn: deps.fetchFn }),
      config: embeddedEngineConfigProvider(),
      kind: { geocoding: 'open-meteo', forecast: 'open-meteo', config: 'embedded' },
    };
  }
  return {
    geocoding: createBffGeocoding({ fetchFn: deps.fetchFn, baseUrl: env.bffUrl }),
    forecast: createBffForecast({ fetchFn: deps.fetchFn, baseUrl: env.bffUrl }),
    config: createRemoteEngineConfigProvider({
      ...deps,
      assetsUrl: env.assetsUrl,
      embedded: defaultEngineConfig,
    }),
    kind: { geocoding: 'bff', forecast: 'bff', config: 'remote' },
  };
}
