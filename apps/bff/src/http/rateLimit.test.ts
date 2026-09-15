import { forecastSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';
import { testDeps } from '../testing/deps';
import { fakeFetch } from '../testing/fakeFetch';
import { createOpenMeteoUpstream } from '../upstream/openMeteo';

const appWithLimit = (limit: number) => {
  const { fetchFn } = fakeFetch({ body: forecastSaoPaulo });
  return createApp(
    testDeps({
      env: { RATE_LIMIT_PER_MIN: limit },
      upstream: createOpenMeteoUpstream({
        fetchFn,
        forecastBaseUrl: 'https://fc.test',
        geocodingBaseUrl: 'https://geo.test',
        timeoutMs: 1000,
      }),
    }),
  );
};
const get = (app: ReturnType<typeof createApp>, ip: string) =>
  app.request('/v1/forecast?lat=0&lon=0', { headers: { 'x-real-ip': ip } });

describe('rateLimit', () => {
  it('bloqueia a requisição seguinte ao limite com 429 e Retry-After', async () => {
    const app = appWithLimit(3);
    for (let i = 0; i < 3; i += 1) expect((await get(app, '1.1.1.1')).status).toBe(200);
    const blocked = await get(app, '1.1.1.1');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect(blocked.headers.get('x-ratelimit-limit')).toBe('3');
    expect(blocked.headers.get('x-ratelimit-remaining')).toBe('0');
    expect((await blocked.json()).error.code).toBe('rate_limited');
  });

  it('isola por IP e expõe os cabeçalhos de limite', async () => {
    const app = appWithLimit(1);
    const a = await get(app, '1.1.1.1');
    expect(a.headers.get('x-ratelimit-limit')).toBe('1');
    expect(a.headers.get('x-ratelimit-remaining')).toBe('0');
    expect((await get(app, '2.2.2.2')).status).toBe(200);
    expect((await get(app, '1.1.1.1')).status).toBe(429);
  });

  it('/health não é limitado', async () => {
    const app = appWithLimit(1);
    await get(app, '1.1.1.1');
    expect((await app.request('/health', { headers: { 'x-real-ip': '1.1.1.1' } })).status).toBe(
      200,
    );
  });
});
