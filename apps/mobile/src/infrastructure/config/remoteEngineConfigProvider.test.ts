import type { Clock } from '@/application/ports';
import { fixedClock, silentLogger } from '@/application/testing/fakes';
import { defaultEngineConfig } from '@/domain';

import type { FetchLike } from '../openMeteo/http';
import { memoryKeyValue } from '../storage/memoryKeyValue';

import {
  createRemoteEngineConfigProvider,
  ENGINE_CONFIG_KEY,
  ENGINE_CONFIG_RETRY_MS,
  ENGINE_CONFIG_TTL_MS,
} from './remoteEngineConfigProvider';

const remote = { ...defaultEngineConfig, xp: { ...defaultEngineConfig.xp, base: 60 } };
const T0 = Date.UTC(2026, 8, 15, 12, 0, 0);

const fetching = (status: number, body: unknown) => {
  let calls = 0;
  const fetchFn: FetchLike = async () => {
    calls += 1;
    return { ok: status < 400, status, json: async () => body };
  };
  return { fetchFn, calls: () => calls };
};

/** Relógio mutável: permite avançar o tempo entre chamadas de `get()` dentro de um mesmo teste. */
const mutableClock = (start = T0): Clock & { advance(ms: number): void } => {
  let nowMs = start;
  return {
    now: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
};

const make = (fetchFn: FetchLike, storage = memoryKeyValue(), clock: Clock = fixedClock(T0)) =>
  createRemoteEngineConfigProvider({
    fetchFn,
    assetsUrl: 'https://assets.test',
    storage,
    clock,
    logger: silentLogger(),
    embedded: defaultEngineConfig,
  });

describe('remoteEngineConfigProvider', () => {
  it('sem cópia local baixa, valida, guarda e devolve a config remota', async () => {
    const storage = memoryKeyValue();
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(JSON.parse((await storage.getItem(ENGINE_CONFIG_KEY)) ?? '{}')).toEqual({
      fetchedAt: T0,
      config: remote,
    });
  });

  it('cópia fresca (< 24 h) não vai à rede', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(
      ENGINE_CONFIG_KEY,
      JSON.stringify({ fetchedAt: T0 - 1000, config: remote }),
    );
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(f.calls()).toBe(0);
  });

  it('cópia vencida revalida; se a rede falhar, mantém a última cópia válida', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(
      ENGINE_CONFIG_KEY,
      JSON.stringify({ fetchedAt: T0 - ENGINE_CONFIG_TTL_MS - 1, config: remote }),
    );
    const f = fetching(503, {});
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(f.calls()).toBe(1);
  });

  it('schema inválido nunca entra: usa a embutida e não grava', async () => {
    const storage = memoryKeyValue();
    const f = fetching(200, { ...remote, schemaVersion: 2 });
    expect(await make(f.fetchFn, storage).get()).toEqual(defaultEngineConfig);
    expect(await storage.getItem(ENGINE_CONFIG_KEY)).toBeNull();
  });

  it('cópia local corrompida é ignorada e substituída', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(ENGINE_CONFIG_KEY, '{not json');
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
  });

  it('falha de rede não é repetida dentro de 5 min', async () => {
    const storage = memoryKeyValue();
    const f = fetching(503, {});
    const provider = make(f.fetchFn, storage);
    expect(await provider.get()).toEqual(defaultEngineConfig);
    expect(await provider.get()).toEqual(defaultEngineConfig);
    expect(f.calls()).toBe(1);
  });

  it('depois de 5 min tenta de novo', async () => {
    const storage = memoryKeyValue();
    const f = fetching(503, {});
    const clock = mutableClock();
    const provider = make(f.fetchFn, storage, clock);
    expect(await provider.get()).toEqual(defaultEngineConfig);
    clock.advance(ENGINE_CONFIG_RETRY_MS);
    expect(await provider.get()).toEqual(defaultEngineConfig);
    expect(f.calls()).toBe(2);
  });

  it('chamadas simultâneas compartilham um único fetch', async () => {
    const storage = memoryKeyValue();
    let calls = 0;
    const fetchFn: FetchLike = async () => {
      calls += 1;
      await Promise.resolve();
      return { ok: true, status: 200, json: async () => remote };
    };
    const provider = make(fetchFn, storage);
    const results = await Promise.all([provider.get(), provider.get(), provider.get()]);
    expect(results).toEqual([remote, remote, remote]);
    expect(calls).toBe(1);
  });
});
