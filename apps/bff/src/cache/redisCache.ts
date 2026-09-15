import { Redis } from 'ioredis';

import type { Cache } from './cache';

const CONNECT_TIMEOUT_MS = 2000;

/** Adapter ioredis. Não trata falhas: isso é papel do `resilientCache`, que o envolve. */
export function createRedisCache(
  url: string,
  onError: (e: Error) => void,
): Cache & { close(): Promise<void> } {
  const redis = new Redis(url, {
    connectTimeout: CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // comando com Redis fora falha na hora em vez de enfileirar
  });
  redis.on('error', onError);
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    },
    async slidingCount(key, nowMs, windowMs) {
      const member = `${nowMs}-${Math.random().toString(36).slice(2)}`;
      const results = await redis
        .multi()
        .zremrangebyscore(key, 0, nowMs - windowMs)
        .zadd(key, nowMs, member)
        .zcard(key)
        .pexpire(key, windowMs)
        .exec();
      const card = results?.[2]?.[1];
      return typeof card === 'number' ? card : 0;
    },
    ping: async () => (await redis.ping()) === 'PONG',
    close: async () => {
      await redis.quit();
    },
  };
}
