import { fixedClock, silentLogger } from '@/application/testing/fakes';
import { defaultEngineConfig } from '@/domain';

import type { FetchLike } from '../openMeteo/http';
import { memoryKeyValue } from '../storage/memoryKeyValue';

import {
  createRemoteEngineConfigProvider,
  ENGINE_CONFIG_KEY,
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

const make = (fetchFn: FetchLike, storage = memoryKeyValue(), nowMs = T0) =>
  createRemoteEngineConfigProvider({
    fetchFn,
    assetsUrl: 'https://assets.test',
    storage,
    clock: fixedClock(nowMs),
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
});
