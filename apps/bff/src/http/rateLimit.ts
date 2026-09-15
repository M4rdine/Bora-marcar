import type { MiddlewareHandler } from 'hono';

import type { AppDeps } from '../app';
import { RATE_WINDOW_MS, rateKey } from '../cache/keys';

import { clientIp } from './clientIp';
import { AppError } from './errors';
import type { AppEnv } from './requestLog';

const RETRY_AFTER_S = String(RATE_WINDOW_MS / 1000);

/** Janela deslizante de 60 s por IP (spec 7.2). Com o Redis fora, `slidingCount` devolve 0 e não bloqueia. */
export const rateLimit =
  (deps: AppDeps): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const limit = deps.env.RATE_LIMIT_PER_MIN;
    const ip = clientIp(c, deps.env.TRUST_PROXY);
    const count = await deps.cache.slidingCount(rateKey(ip), deps.now(), RATE_WINDOW_MS);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    if (count > limit) {
      throw new AppError(429, 'rate_limited', 'Muitas requisições; tente de novo em um minuto', {
        'Retry-After': RETRY_AFTER_S,
      });
    }
    await next();
  };
