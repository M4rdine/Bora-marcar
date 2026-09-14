import { createAppServices, type AppPorts, type AppServices } from '@/application/services';

import { embeddedEngineConfigProvider } from './config/embeddedEngineConfigProvider';
import type { AppEnv } from './env';
import { expoLocationProvider } from './location/expoLocationProvider';
import { expoNotificationScheduler } from './notifications/expoNotificationScheduler';
import { createOpenMeteoForecast } from './openMeteo/forecastClient';
import { createOpenMeteoGeocoding } from './openMeteo/geocodingClient';
import type { FetchLike } from './openMeteo/http';
import { asyncStorageKeyValue } from './storage/asyncStorageKeyValue';
import { createProgressRepository } from './storage/progressRepository';
import { consoleLogger } from './system/consoleLogger';
import { randomIdGenerator } from './system/randomIdGenerator';
import { systemClock } from './system/systemClock';

const globalFetch: FetchLike = (url, init) => fetch(url, init);

export function createServices(env: AppEnv, overrides: Partial<AppPorts> = {}): AppServices {
  const logger = consoleLogger();
  const clock = systemClock();
  if (env.apiMode === 'bff')
    logger.warn('Modo bff ainda não disponível neste build; usando direct');
  return createAppServices({
    geocoding: createOpenMeteoGeocoding({ fetchFn: globalFetch }),
    forecast: createOpenMeteoForecast({ fetchFn: globalFetch }),
    location: expoLocationProvider(),
    progress: createProgressRepository({ storage: asyncStorageKeyValue(), clock, logger }),
    config: embeddedEngineConfigProvider(),
    clock,
    ids: randomIdGenerator(),
    notifications: expoNotificationScheduler(logger),
    logger,
    ...overrides,
  });
}
