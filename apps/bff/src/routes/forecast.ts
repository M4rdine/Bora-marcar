import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDeps } from '../app';
import { FORECAST_TTL_S, forecastKey } from '../cache/keys';
import { AppError } from '../http/errors';
import type { AppEnv } from '../http/requestLog';

import { cachedJson, parseQuery } from './shared';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export function forecastRoute(deps: AppDeps) {
  const route = new Hono<AppEnv>();
  route.get('/', async (c) => {
    const { lat, lon } = parseQuery(querySchema, c.req.query());
    return cachedJson(c, deps, {
      key: forecastKey(lat, lon),
      ttlSeconds: FORECAST_TTL_S,
      cacheControl: 'public, max-age=60',
      load: async () => {
        const r = await deps.upstream.fetchForecast(lat, lon);
        if (!r.ok)
          throw new AppError(502, 'upstream_unavailable', `${r.error.code}: ${r.error.message}`);
        return r.value;
      },
    });
  });
  return route;
}
