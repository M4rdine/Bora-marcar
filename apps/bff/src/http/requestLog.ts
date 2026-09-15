import type { MiddlewareHandler } from 'hono';

import type { Logger } from '../logger';

export type AppVariables = { cacheHit: boolean | null };
export type AppEnv = { Variables: AppVariables };

/** Uma linha por requisição: rota, status, latência e se veio do cache (spec 7.2). */
export const requestLog =
  (logger: Logger): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const start = performance.now();
    c.set('cacheHit', null);
    await next();
    logger.info(
      {
        method: c.req.method,
        route: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - start),
        cacheHit: c.get('cacheHit'),
      },
      'request',
    );
  };
