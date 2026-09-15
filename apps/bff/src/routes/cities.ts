import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDeps } from '../app';
import { GEO_TTL_S, geoKey } from '../cache/keys';
import type { AppEnv } from '../http/requestLog';

import { cachedJson, parseQuery, upstreamUnavailable } from './shared';

const querySchema = z.object({
  q: z.string().trim().min(2).max(64),
  lang: z.enum(['pt', 'en']).default('pt'),
});

export function citiesRoute(deps: AppDeps) {
  const route = new Hono<AppEnv>();
  route.get('/', async (c) => {
    const { q, lang } = parseQuery(querySchema, c.req.query());
    return cachedJson(c, deps, {
      key: geoKey(lang, q),
      ttlSeconds: GEO_TTL_S,
      cacheControl: 'public, max-age=300',
      load: async () => {
        const r = await deps.upstream.searchCities(q, lang);
        if (!r.ok) throw upstreamUnavailable(c, deps, r.error);
        return r.value;
      },
    });
  });
  return route;
}
