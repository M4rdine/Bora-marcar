import { fixedClock, silentLogger } from '@/application/testing/fakes';

import { selectAdapters } from './adapters';
import { parseEnv } from './env';
import { memoryKeyValue } from './storage/memoryKeyValue';

const deps = {
  fetchFn: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  storage: memoryKeyValue(),
  clock: fixedClock(0),
  logger: silentLogger(),
};

describe('selectAdapters', () => {
  it('direct: Open-Meteo direto e config embutida', () => {
    const a = selectAdapters(parseEnv({}), deps);
    expect(a.kind).toEqual({ geocoding: 'open-meteo', forecast: 'open-meteo', config: 'embedded' });
  });
  it('bff: clients do BFF e config remota', () => {
    const env = parseEnv({
      apiMode: 'bff',
      bffUrl: 'https://bff.test',
      assetsUrl: 'https://assets.test',
    });
    const a = selectAdapters(env, deps);
    expect(a.kind).toEqual({ geocoding: 'bff', forecast: 'bff', config: 'remote' });
  });
});
