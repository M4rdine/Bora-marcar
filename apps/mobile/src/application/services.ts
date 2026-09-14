import type {
  Clock,
  EngineConfigProvider,
  ForecastProvider,
  GeocodingProvider,
  IdGenerator,
  LocationProvider,
  Logger,
  NotificationScheduler,
  ProgressRepository,
} from './ports';
import { buildOverview } from './useCases/buildOverview';
import { cancelPlan } from './useCases/cancelPlan';
import { confirmActivity } from './useCases/confirmActivity';
import { getProgress } from './useCases/getProgress';
import { logActivity } from './useCases/logActivity';
import { planActivity } from './useCases/planActivity';
import { recordBadWeatherDay } from './useCases/recordBadWeatherDay';
import { resolveMyLocation } from './useCases/resolveMyLocation';
import { searchCities } from './useCases/searchCities';

export type AppPorts = {
  readonly geocoding: GeocodingProvider;
  readonly forecast: ForecastProvider;
  readonly location: LocationProvider;
  readonly progress: ProgressRepository;
  readonly config: EngineConfigProvider;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly notifications: NotificationScheduler;
  readonly logger: Logger;
};

export type AppServices = {
  readonly ports: AppPorts;
  readonly searchCities: ReturnType<typeof searchCities>;
  readonly resolveMyLocation: ReturnType<typeof resolveMyLocation>;
  readonly buildOverview: ReturnType<typeof buildOverview>;
  readonly planActivity: ReturnType<typeof planActivity>;
  readonly confirmActivity: ReturnType<typeof confirmActivity>;
  readonly logActivity: ReturnType<typeof logActivity>;
  readonly cancelPlan: ReturnType<typeof cancelPlan>;
  readonly recordBadWeatherDay: ReturnType<typeof recordBadWeatherDay>;
  readonly getProgress: ReturnType<typeof getProgress>;
};

export function createAppServices(ports: AppPorts): AppServices {
  return {
    ports,
    searchCities: searchCities(ports),
    resolveMyLocation: resolveMyLocation(ports),
    buildOverview: buildOverview(ports),
    planActivity: planActivity(ports),
    confirmActivity: confirmActivity(ports),
    logActivity: logActivity(ports),
    cancelPlan: cancelPlan(ports),
    recordBadWeatherDay: recordBadWeatherDay(ports),
    getProgress: getProgress(ports),
  };
}
