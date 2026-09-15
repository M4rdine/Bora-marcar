import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRedisCache } from './redisCache';

const url = process.env.REDIS_URL;
const READY_WAIT_MS = 20;
const READY_WAIT_ATTEMPTS = 50;

describe.skipIf(!url)('redisCache (integração)', () => {
  const cache = createRedisCache(url ?? '', () => undefined);
  const prefix = `test:${Date.now()}:`;
  afterAll(() => cache.close());
  // ioredis conecta de forma assíncrona; com enableOfflineQueue:false (proposital, ver redisCache.ts)
  // um comando emitido antes do handshake terminar falha na hora. Só aqui no setup do teste de
  // integração, esperamos a conexão ficar pronta antes de exercitar os casos abaixo.
  beforeAll(async () => {
    for (let attempt = 0; attempt < READY_WAIT_ATTEMPTS; attempt += 1) {
      try {
        if (await cache.ping()) return;
      } catch {
        // ainda conectando; tenta de novo
      }
      await new Promise((resolve) => setTimeout(resolve, READY_WAIT_MS));
    }
    throw new Error('Redis não ficou pronto em 1 s');
  });

  it('set/get com TTL', async () => {
    await cache.set(`${prefix}a`, '1', 60);
    expect(await cache.get(`${prefix}a`)).toBe('1');
    expect(await cache.get(`${prefix}nada`)).toBeNull();
  });

  it('janela deslizante conta e esquece', async () => {
    const key = `${prefix}rl`;
    const now = Date.now();
    expect(await cache.slidingCount(key, now, 1000)).toBe(1);
    expect(await cache.slidingCount(key, now + 10, 1000)).toBe(2);
    expect(await cache.slidingCount(key, now + 2000, 1000)).toBe(1);
  });

  it('ping', async () => {
    expect(await cache.ping()).toBe(true);
  });
});
