import type { Logger } from '../logger';

import type { Cache } from './cache';

const LOG_EVERY_MS = 60_000;

/** Se o Redis cair, o BFF segue sem cache e loga (spec 7.2): toda falha vira miss/no-op. */
export function resilientCache(
  primary: Cache,
  logger: Logger,
  now: () => number = Date.now,
): Cache {
  let lastLoggedAt = -Infinity;
  const note = (op: string, e: unknown) => {
    if (now() - lastLoggedAt < LOG_EVERY_MS) return;
    lastLoggedAt = now();
    logger.warn(
      { op, err: e instanceof Error ? e.message : String(e) },
      'cache indisponível; seguindo sem cache',
    );
  };
  const guard = async <T>(op: string, fallback: T, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (e) {
      note(op, e);
      return fallback;
    }
  };
  return {
    get: (key) => guard('get', null, () => primary.get(key)),
    set: (key, value, ttl) => guard('set', undefined, () => primary.set(key, value, ttl)),
    slidingCount: (key, nowMs, windowMs) =>
      guard('slidingCount', 0, () => primary.slidingCount(key, nowMs, windowMs)),
    ping: () => guard('ping', false, () => primary.ping()),
    ...(primary.close
      ? { close: () => guard('close', undefined, () => primary.close?.() ?? Promise.resolve()) }
      : {}),
  };
}
