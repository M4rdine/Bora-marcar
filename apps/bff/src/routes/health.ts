import { Hono } from 'hono';

import type { AppDeps } from '../app';
import type { AppEnv } from '../http/requestLog';

export function healthRoute(deps: AppDeps) {
  const route = new Hono<AppEnv>();
  route.get('/', async (c) => {
    const redis =
      deps.env.REDIS_URL === undefined ? 'disabled' : (await deps.cache.ping()) ? 'ok' : 'down';
    return c.json({
      status: 'ok',
      version: deps.env.APP_VERSION,
      uptimeSeconds: Math.round((deps.now() - deps.startedAt) / 1000),
      redis,
      cache: deps.meter.snapshot(),
    });
  });
  return route;
}
