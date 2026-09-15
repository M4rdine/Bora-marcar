import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import type { Cache } from './cache/cache';
import type { Meter } from './cache/meter';
import type { Env } from './config/env';
import { AppError, errorBody, errorResponse } from './http/errors';
import { requestLog, type AppEnv } from './http/requestLog';
import type { Logger } from './logger';
import { citiesRoute } from './routes/cities';
import { forecastRoute } from './routes/forecast';
import { healthRoute } from './routes/health';
import type { Upstream } from './upstream/types';

export type AppDeps = {
  readonly env: Env;
  readonly logger: Logger;
  readonly cache: Cache;
  readonly upstream: Upstream;
  readonly meter: Meter;
  readonly now: () => number;
  readonly startedAt: number;
};

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  const allowed = new Set(deps.env.ALLOWED_ORIGINS);

  app.use('*', requestLog(deps.logger));
  app.use('*', secureHeaders({ xFrameOptions: 'DENY' }));
  app.use('*', cors({ origin: (origin) => (allowed.has(origin) ? origin : null) }));

  app.route('/health', healthRoute(deps));
  app.route('/v1/cities', citiesRoute(deps));
  app.route('/v1/forecast', forecastRoute(deps));

  app.notFound((c) => c.json(errorBody('not_found', 'Rota não encontrada'), 404));
  app.onError((e, c) => {
    if (e instanceof AppError) return errorResponse(c, e);
    deps.logger.error({ err: e, route: c.req.path }, 'erro inesperado');
    return c.json(errorBody('internal', 'Erro interno'), 500);
  });
  return app;
}
