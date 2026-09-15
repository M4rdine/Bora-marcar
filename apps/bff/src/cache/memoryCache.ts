import type { Cache } from './cache';

type Entry = { readonly value: string; readonly expiresAt: number };

/** Cache do processo: usado nos testes e como fallback quando REDIS_URL está ausente. */
export function memoryCache(now: () => number): Cache {
  const entries = new Map<string, Entry>();
  const windows = new Map<string, readonly number[]>();
  return {
    async get(key) {
      const e = entries.get(key);
      if (!e) return null;
      if (e.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return e.value;
    },
    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },
    async slidingCount(key, nowMs, windowMs) {
      const kept = (windows.get(key) ?? []).filter((t) => t > nowMs - windowMs);
      const next = [...kept, nowMs];
      windows.set(key, next);
      return next.length;
    },
    async ping() {
      return true;
    },
  };
}
