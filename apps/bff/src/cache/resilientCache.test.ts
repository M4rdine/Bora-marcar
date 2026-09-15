import { describe, expect, it } from 'vitest';

import type { Cache } from './cache';
import { silentLogger } from '../logger';
import { resilientCache } from './resilientCache';

const broken: Cache = {
  get: async () => {
    throw new Error('ECONNREFUSED');
  },
  set: async () => {
    throw new Error('ECONNREFUSED');
  },
  slidingCount: async () => {
    throw new Error('ECONNREFUSED');
  },
  ping: async () => {
    throw new Error('ECONNREFUSED');
  },
};

const brokenWithClose: Cache = {
  ...broken,
  close: async () => {
    throw new Error('ECONNREFUSED');
  },
};

describe('resilientCache', () => {
  it('sem Redis: get é miss, set é no-op, contagem é 0, ping false — nunca lança', async () => {
    const cache = resilientCache(broken, silentLogger());
    await expect(cache.get('k')).resolves.toBeNull();
    await expect(cache.set('k', 'v', 10)).resolves.toBeUndefined();
    await expect(cache.slidingCount('k', 0, 1000)).resolves.toBe(0);
    await expect(cache.ping()).resolves.toBe(false);
  });

  it('sem close no primário: o cache resiliente não expõe close', () => {
    const cache = resilientCache(broken, silentLogger());
    expect(cache.close).toBeUndefined();
  });

  it('close do primário rejeitando: nunca lança, nunca deixa promise rejeitada escapar', async () => {
    const cache = resilientCache(brokenWithClose, silentLogger());
    await expect(cache.close?.()).resolves.toBeUndefined();
  });
});
