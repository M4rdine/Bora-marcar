import type { Context } from 'hono';
import type { z } from 'zod';

import type { AppDeps } from '../app';
import { AppError } from '../http/errors';
import type { AppEnv } from '../http/requestLog';

export function parseQuery<S extends z.ZodType>(
  schema: S,
  query: Record<string, string>,
): z.infer<S> {
  const parsed = schema.safeParse(query);
  if (parsed.success) return parsed.data;
  const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new AppError(400, 'bad_request', `Parâmetros inválidos — ${detail}`);
}

type Options<T> = {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly cacheControl: string;
  readonly load: () => Promise<T>;
};

const JSON_TYPE = 'application/json; charset=utf-8';

/** Cache-aside: hit devolve o corpo serializado guardado; miss carrega, valida (no `load`) e só então grava. */
export async function cachedJson<T>(
  c: Context<AppEnv>,
  deps: AppDeps,
  opts: Options<T>,
): Promise<Response> {
  const hit = await deps.cache.get(opts.key);
  if (hit !== null) {
    deps.meter.hit();
    c.set('cacheHit', true);
    return c.body(hit, 200, {
      'Content-Type': JSON_TYPE,
      'X-Cache': 'HIT',
      'Cache-Control': opts.cacheControl,
    });
  }
  const value = await opts.load();
  const body = JSON.stringify(value);
  await deps.cache.set(opts.key, body, opts.ttlSeconds);
  deps.meter.miss();
  c.set('cacheHit', false);
  return c.body(body, 200, {
    'Content-Type': JSON_TYPE,
    'X-Cache': 'MISS',
    'Cache-Control': opts.cacheControl,
  });
}
