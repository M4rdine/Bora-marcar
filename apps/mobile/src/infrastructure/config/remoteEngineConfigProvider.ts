import { engineConfigSchema } from '@bora-marcar/contracts';
import { z } from 'zod';

import type { Clock, EngineConfigProvider, KeyValueStorage, Logger } from '@/application/ports';
import type { EngineConfig } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

export const ENGINE_CONFIG_KEY = 'engineConfig:v1';
export const ENGINE_CONFIG_TTL_MS = 24 * 60 * 60_000;
export const ENGINE_CONFIG_PATH = '/config/v1/engine.json';
export const ENGINE_CONFIG_RETRY_MS = 5 * 60_000;

const storedSchema = z.object({ fetchedAt: z.number(), config: engineConfigSchema });
type Stored = z.infer<typeof storedSchema>;

type Deps = {
  readonly fetchFn: FetchLike;
  readonly assetsUrl: string;
  readonly storage: KeyValueStorage;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly embedded: EngineConfig;
};

async function readStored(storage: KeyValueStorage): Promise<Stored | null> {
  try {
    const raw = await storage.getItem(ENGINE_CONFIG_KEY);
    if (raw === null) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Spec 4.6: baixa `engine.json` com cache de 24 h, valida, guarda a última cópia válida; sem rede
 * ou schema inválido usa a cópia guardada e, sem cópia, a embutida. O domínio só vê o resultado.
 * Cache negativo: uma falha de rede/schema evita nova tentativa por `ENGINE_CONFIG_RETRY_MS`, e
 * chamadas concorrentes que precisam ir à rede compartilham a mesma requisição em voo — sem isso,
 * cada chamada de caso de uso (todas chamam `config.get()`) reabriria o timeout de 8 s do
 * `fetchJson` enquanto a config remota estiver fora do ar. */
export function createRemoteEngineConfigProvider(deps: Deps): EngineConfigProvider {
  let lastFailedAt: number | null = null;
  let inflight: Promise<EngineConfig | null> | null = null;

  const fetchRemote = async (): Promise<EngineConfig | null> => {
    const raw = await fetchJson(deps.fetchFn, `${deps.assetsUrl}${ENGINE_CONFIG_PATH}`);
    if (!raw.ok) {
      deps.logger.warn('Config remota indisponível', { code: raw.error.code });
      return null;
    }
    const parsed = engineConfigSchema.safeParse(raw.value);
    if (!parsed.success) {
      deps.logger.warn('Config remota fora do schema; ignorada', {
        issues: parsed.error.issues.length,
      });
      return null;
    }
    return parsed.data;
  };

  const fetchRemoteShared = (): Promise<EngineConfig | null> => {
    if (inflight === null) {
      inflight = fetchRemote().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };

  return {
    async get() {
      const now = deps.clock.now();
      const stored = await readStored(deps.storage);
      if (stored !== null && now - stored.fetchedAt < ENGINE_CONFIG_TTL_MS) return stored.config;
      if (lastFailedAt !== null && now - lastFailedAt < ENGINE_CONFIG_RETRY_MS) {
        return stored?.config ?? deps.embedded;
      }
      const fresh = await fetchRemoteShared();
      if (fresh === null) {
        lastFailedAt = now;
        return stored?.config ?? deps.embedded;
      }
      lastFailedAt = null;
      try {
        await deps.storage.setItem(
          ENGINE_CONFIG_KEY,
          JSON.stringify({ fetchedAt: now, config: fresh }),
        );
      } catch (e) {
        deps.logger.warn('Falha ao guardar a config remota', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return fresh;
    },
  };
}
