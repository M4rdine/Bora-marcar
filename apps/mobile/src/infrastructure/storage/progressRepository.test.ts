import type { KeyValueStorage } from '@/application/ports';
import { silentLogger } from '@/application/testing/fakes';
import type { GamificationEvent } from '@/domain';

import { memoryKeyValue } from './memoryKeyValue';
import { PROGRESS_KEY, createProgressRepository } from './progressRepository';

const rejectingStorage = (): KeyValueStorage => ({
  getItem: async () => {
    throw new Error('getItem indisponível');
  },
  setItem: async () => {
    throw new Error('setItem indisponível');
  },
  removeItem: async () => {
    throw new Error('removeItem indisponível');
  },
});

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);
const DAY = 86_400_000;
const logged = (id: string, createdAt: number): GamificationEvent => ({
  type: 'logged',
  id,
  cityId: 'sp',
  activity: 'walk',
  date: '2026-09-13',
  hourLeft: 8,
  hourScore: 70,
  createdAt,
});
const make = (initial?: Record<string, string>) => {
  const storage = memoryKeyValue(initial);
  const warnings: string[] = [];
  const logger = {
    ...silentLogger(),
    warn: (m: string) => {
      warnings.push(m);
    },
  };
  return {
    storage,
    warnings,
    repo: createProgressRepository({ storage, clock: { now: () => NOW }, logger }),
  };
};

describe('createProgressRepository', () => {
  it('vazio quando não há nada salvo', async () => {
    expect(await make().repo.load()).toEqual([]);
  });

  it('append persiste e load lê de volta', async () => {
    const { repo, storage } = make();
    await repo.append(logged('a', NOW));
    await repo.append(logged('b', NOW + 1));
    expect(await repo.load()).toEqual([logged('a', NOW), logged('b', NOW + 1)]);
    expect(JSON.parse((await storage.getItem(PROGRESS_KEY)) ?? '')).toMatchObject({
      schemaVersion: 1,
    });
  });

  it('JSON corrompido é tratado como vazio, com aviso', async () => {
    const { repo, warnings } = make({ [PROGRESS_KEY]: '{not json' });
    expect(await repo.load()).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('schema inválido ou versão desconhecida é tratado como vazio, com aviso', async () => {
    const { repo, warnings } = make({
      [PROGRESS_KEY]: JSON.stringify({ schemaVersion: 2, events: [] }),
    });
    expect(await repo.load()).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('poda eventos com mais de 365 dias ao gravar', async () => {
    const { repo } = make();
    await repo.append(logged('old', NOW - 366 * DAY));
    await repo.append(logged('edge', NOW - 365 * DAY));
    await repo.append(logged('new', NOW));
    expect((await repo.load()).map((e) => e.id)).toEqual(['edge', 'new']);
  });

  it('load trata falha do storage como vazio, com aviso', async () => {
    const storage = rejectingStorage();
    const warnings: string[] = [];
    const logger = { ...silentLogger(), warn: (m: string) => warnings.push(m) };
    const repo = createProgressRepository({ storage, clock: { now: () => NOW }, logger });
    expect(await repo.load()).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('append tolera falha ao gravar e registra erro', async () => {
    const storage = rejectingStorage();
    const errors: string[] = [];
    const logger = {
      ...silentLogger(),
      warn: () => undefined,
      error: (m: string) => errors.push(m),
    };
    const repo = createProgressRepository({ storage, clock: { now: () => NOW }, logger });
    await expect(repo.append(logged('a', NOW))).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });
});
