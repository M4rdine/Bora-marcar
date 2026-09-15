import { memoryCache } from '../cache/memoryCache';
import { createMeter } from '../cache/meter';
import { loadEnv, type Env } from '../config/env';
import { silentLogger } from '../logger';
import type { Upstream } from '../upstream/types';
import type { AppDeps } from '../app';

export const unusedUpstream: Upstream = {
  searchCities: async () => ({
    ok: false,
    error: { code: 'upstream_network', message: 'não usado' },
  }),
  fetchForecast: async () => ({
    ok: false,
    error: { code: 'upstream_network', message: 'não usado' },
  }),
};

export function testDeps(
  overrides: { env?: Partial<Env> } & Partial<Omit<AppDeps, 'env'>> = {},
): AppDeps {
  const clock = { now: 1_700_000_000_000 };
  return {
    logger: silentLogger(),
    cache: memoryCache(() => clock.now),
    upstream: unusedUpstream,
    meter: createMeter(),
    now: () => clock.now,
    startedAt: clock.now,
    ...overrides,
    // `env` vem por último de propósito: o spread de `...overrides` acima também carrega uma
    // chave `env` (o Partial<Env> bruto), que precisa ser substituída pelo merge com os
    // padrões de loadEnv({}) — caso contrário os defaults seriam perdidos quando só um
    // subconjunto de campos é sobrescrito. O `as Env` é necessário porque o TS (com
    // exactOptionalPropertyTypes) infere o merge de um Env completo com um Partial<Env>
    // como parcialmente opcional, embora em runtime o resultado seja sempre um Env completo.
    env: { ...loadEnv({}), ...overrides.env } as Env,
  };
}
