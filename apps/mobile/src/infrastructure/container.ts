import { createAppServices, type AppPorts, type AppServices } from '@/application/services';

import { selectAdapters } from './adapters';
import type { AppEnv } from './env';
import { expoLocationProvider } from './location/expoLocationProvider';
import { expoNotificationScheduler } from './notifications/expoNotificationScheduler';
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
  const storage = asyncStorageKeyValue();
  const adapters = selectAdapters(env, { fetchFn: globalFetch, storage, clock, logger });
  logger.info('Adapters', adapters.kind);
  return createAppServices({
    geocoding: adapters.geocoding,
    forecast: adapters.forecast,
    location: expoLocationProvider(),
    progress: createProgressRepository({ storage, clock, logger }),
    config: adapters.config,
    clock,
    ids: randomIdGenerator(),
    notifications: expoNotificationScheduler(logger),
    logger,
    ...overrides,
  });
}
