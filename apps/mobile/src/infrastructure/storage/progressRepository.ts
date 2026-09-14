import type { Clock, KeyValueStorage, Logger, ProgressRepository } from '@/application/ports';
import type { GamificationEvent } from '@/domain';

import { storedProgressSchema, type StoredEvent, type StoredProgress } from './eventSchema';

export const PROGRESS_KEY = 'progress:v1';
export const RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

type Deps = { readonly storage: KeyValueStorage; readonly clock: Clock; readonly logger: Logger };

// O zod tipa campos `.optional()` como `T | undefined`, que não é atribuível a `minuteLeft?: number`
// sob `exactOptionalPropertyTypes`. Reconstruímos o evento omitindo a chave quando ausente.
function normalizeEvent(e: StoredEvent): GamificationEvent {
  if (e.type === 'confirmed' || e.type === 'logged') {
    const { minuteLeft, ...rest } = e;
    return { ...rest, ...(minuteLeft === undefined ? {} : { minuteLeft }) };
  }
  return e;
}

function parseStored(raw: string | null, logger: Logger): readonly GamificationEvent[] {
  if (raw === null) return [];
  try {
    const parsed = storedProgressSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data.events.map(normalizeEvent);
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
  const load = async (): Promise<readonly GamificationEvent[]> => {
    try {
      return parseStored(await storage.getItem(PROGRESS_KEY), logger);
    } catch (e) {
      logger.warn('Falha ao ler o progresso', {
        error: e instanceof Error ? e.message : String(e),
      });
      return [];
    }
  };
  return {
    load,
    async append(event) {
      const cutoff = clock.now() - RETENTION_DAYS * DAY_MS;
      const kept = (await load()).filter((e) => e.createdAt >= cutoff);
      const next: StoredProgress = { schemaVersion: 1, events: [...kept, event] };
      try {
        await storage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch (e) {
        logger.error('Falha ao gravar o progresso', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
  };
}
