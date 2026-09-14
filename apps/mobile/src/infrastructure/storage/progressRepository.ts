import type { Clock, KeyValueStorage, Logger, ProgressRepository } from '@/application/ports';
import type { GamificationEvent } from '@/domain';

import { storedProgressSchema, type StoredProgress } from './eventSchema';

export const PROGRESS_KEY = 'progress:v1';
export const RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

type Deps = { readonly storage: KeyValueStorage; readonly clock: Clock; readonly logger: Logger };

function parseStored(raw: string | null, logger: Logger): readonly GamificationEvent[] {
  if (raw === null) return [];
  try {
    const parsed = storedProgressSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data.events;
    logger.warn('Progresso salvo com formato inesperado; começando do zero', {
      issues: parsed.error.issues.length,
    });
    return [];
  } catch (e) {
    logger.warn('Progresso salvo ilegível; começando do zero', {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

export function createProgressRepository({ storage, clock, logger }: Deps): ProgressRepository {
  const load = async (): Promise<readonly GamificationEvent[]> =>
    parseStored(await storage.getItem(PROGRESS_KEY), logger);
  return {
    load,
    async append(event) {
      const cutoff = clock.now() - RETENTION_DAYS * DAY_MS;
      const kept = (await load()).filter((e) => e.createdAt >= cutoff);
      const next: StoredProgress = { schemaVersion: 1, events: [...kept, event] };
      await storage.setItem(PROGRESS_KEY, JSON.stringify(next));
    },
  };
}
