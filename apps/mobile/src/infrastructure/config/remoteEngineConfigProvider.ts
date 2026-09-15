import { engineConfigSchema } from '@melhor-hora/contracts';
import { z } from 'zod';

import type { Clock, EngineConfigProvider, KeyValueStorage, Logger } from '@/application/ports';
import type { EngineConfig } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

export const ENGINE_CONFIG_KEY = 'engineConfig:v1';
export const ENGINE_CONFIG_TTL_MS = 24 * 60 * 60_000;
export const ENGINE_CONFIG_PATH = '/config/v1/engine.json';

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
 * ou schema inválido usa a cópia guardada e, sem cópia, a embutida. O domínio só vê o resultado. */
export function createRemoteEngineConfigProvider(deps: Deps): EngineConfigProvider {
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
  return {
    async get() {
      const now = deps.clock.now();
      const stored = await readStored(deps.storage);
      if (stored !== null && now - stored.fetchedAt < ENGINE_CONFIG_TTL_MS) return stored.config;
      const fresh = await fetchRemote();
      if (fresh === null) return stored?.config ?? deps.embedded;
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
