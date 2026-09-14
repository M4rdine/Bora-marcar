import type { KeyValueStorage } from '@/application/ports';
import { silentLogger } from '@/application/testing/fakes';
import type { BadWeatherDayEvent, ConfirmedEvent, LoggedEvent, PlannedEvent } from '@/domain';

import { storedProgressSchema } from './eventSchema';
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
const logged = (id: string, createdAt: number, minuteLeft?: number): LoggedEvent => ({
  type: 'logged',
  id,
  cityId: 'sp',
  activity: 'walk',
  date: '2026-09-13',
  hourLeft: 8,
  ...(minuteLeft === undefined ? {} : { minuteLeft }),
  hourScore: 70,
  createdAt,
});
const confirmed = (id: string, createdAt: number, minuteLeft?: number): ConfirmedEvent => ({
  type: 'confirmed',
  id,
  planId: 'plan-1',
  date: '2026-09-13',
  hourLeft: 17,
  ...(minuteLeft === undefined ? {} : { minuteLeft }),
  hourScore: 86,
  createdAt,
});
const planned = (id: string, createdAt: number): PlannedEvent => ({
  type: 'planned',
  id,
  cityId: 'sp',
  activity: 'run',
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour: 17, endHour: 19 },
  windowScore: 84,
  createdAt,
});
const badWeatherDay = (id: string, createdAt: number): BadWeatherDayEvent => ({
  type: 'badWeatherDay',
  id,
  cityId: 'sp',
  date: '2026-09-13',
  bestScore: 22,
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

  it('round-trip de minuteLeft, com e sem o campo', async () => {
    const { repo } = make();
    const withMinute = logged('a', NOW, 7);
    const withoutMinute = logged('b', NOW + 1);
    await repo.append(withMinute);
    await repo.append(withoutMinute);
    expect(await repo.load()).toEqual([withMinute, withoutMinute]);
  });

  it('round-trip de confirmed com minuteLeft', async () => {
    const { repo } = make();
    const event = confirmed('c', NOW, 42);
    await repo.append(event);
    expect(await repo.load()).toEqual([event]);
  });

  it('round-trip de confirmed sem minuteLeft: a chave não volta no objeto carregado', async () => {
    const { repo } = make();
    await repo.append(confirmed('c', NOW));
    const loaded = await repo.load();
    expect(loaded[0]).not.toHaveProperty('minuteLeft');
  });

  it('round-trip de planned e badWeatherDay (ramo de passagem, sem minuteLeft)', async () => {
    const { repo } = make();
    const p = planned('p', NOW);
    const b = badWeatherDay('bw', NOW + 1);
    await repo.append(p);
    await repo.append(b);
    expect(await repo.load()).toEqual([p, b]);
  });

  it('minuteLeft fora de 0–59 é rejeitado pelo schema; 59 é aceito', () => {
    const withValue = (minuteLeft: number) => ({
      schemaVersion: 1,
      events: [{ ...logged('a', NOW), minuteLeft }],
    });
    expect(storedProgressSchema.safeParse(withValue(60)).success).toBe(false);
    expect(storedProgressSchema.safeParse(withValue(-1)).success).toBe(false);
    expect(storedProgressSchema.safeParse(withValue(59)).success).toBe(true);
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
