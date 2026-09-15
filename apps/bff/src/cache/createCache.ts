import type { Env } from '../config/env';
import type { Logger } from '../logger';

import type { Cache } from './cache';
import { memoryCache } from './memoryCache';
import { createRedisCache } from './redisCache';
import { resilientCache } from './resilientCache';

export function createCache(env: Env, logger: Logger): Cache {
  if (env.REDIS_URL === undefined) {
    logger.warn(
      'REDIS_URL ausente: cache em memória do processo (sem compartilhamento entre réplicas)',
    );
    return memoryCache(() => Date.now());
  }
  const redis = createRedisCache(env.REDIS_URL, (e) => logger.warn({ err: e.message }, 'redis'));
  return resilientCache(redis, logger);
}
