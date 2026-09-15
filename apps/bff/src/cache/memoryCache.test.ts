import { describe, expect, it } from 'vitest';

import { memoryCache } from './memoryCache';

describe('memoryCache', () => {
  it('guarda e expira pelo TTL usando o relógio injetado', async () => {
    const clock = { now: 1_000_000 };
    const cache = memoryCache(() => clock.now);
    await cache.set('k', 'v', 10);
    expect(await cache.get('k')).toBe('v');
    clock.now += 10_000;
    expect(await cache.get('k')).toBeNull();
  });

  it('conta hits numa janela deslizante', async () => {
    const clock = { now: 0 };
    const cache = memoryCache(() => clock.now);
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(1);
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(2);
    clock.now = 61_000;
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(1);
  });

  it('ping responde true', async () => {
    expect(await memoryCache(() => 0).ping()).toBe(true);
  });
});
