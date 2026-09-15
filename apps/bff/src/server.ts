import { serve } from '@hono/node-server';

import { createApp } from './app';
import { createCache } from './cache/createCache';
import { createMeter } from './cache/meter';
import { loadEnv } from './config/env';
import { createLogger } from './logger';
import { unusedUpstream } from './testing/deps';

const env = loadEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const cache = createCache(env, logger);
const app = createApp({
  env,
  logger,
  cache,
  upstream: unusedUpstream, // Task 5 troca pelo cliente da Open-Meteo
  meter: createMeter(),
  now: () => Date.now(),
  startedAt: Date.now(),
});

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) =>
  logger.info({ port: info.port, version: env.APP_VERSION }, 'bff no ar'),
);

const shutdown = () => {
  logger.info('encerrando');
  void cache.close?.();
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
