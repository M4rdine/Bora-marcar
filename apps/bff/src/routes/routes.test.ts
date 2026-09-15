import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';
import { FORECAST_TTL_S, GEO_TTL_S } from '../cache/keys';
import { testDeps } from '../testing/deps';
import { fakeFetch } from '../testing/fakeFetch';
import { createOpenMeteoUpstream } from '../upstream/openMeteo';

const appWith = (reply: Parameters<typeof fakeFetch>[0]) => {
  const { fetchFn, calls } = fakeFetch(reply);
  const deps = testDeps({
    upstream: createOpenMeteoUpstream({
      fetchFn,
      forecastBaseUrl: 'https://fc.test',
      geocodingBaseUrl: 'https://geo.test',
      timeoutMs: 1000,
    }),
  });
  return { app: createApp(deps), deps, calls };
};

describe('GET /v1/cities', () => {
  it('miss consulta a Open-Meteo, cacheia por 24 h e o segundo pedido é hit sem chamar upstream', async () => {
    const { app, deps, calls } = appWith({ body: geocodingSaoPaulo });
    const first = await app.request('/v1/cities?q=S%C3%A3o%20Paulo');
    expect(first.status).toBe(200);
    expect(first.headers.get('x-cache')).toBe('MISS');
    expect(first.headers.get('cache-control')).toBe('public, max-age=300');
    const cached = await deps.cache.get('geo:v1:pt:são paulo');
    expect(cached).not.toBeNull();
    const second = await app.request('/v1/cities?q=%20s%C3%A3o%20%20paulo%20');
    expect(second.headers.get('x-cache')).toBe('HIT');
    expect(await second.json()).toEqual(await first.json());
    expect(calls).toHaveLength(1);
    expect(deps.meter.snapshot()).toEqual({ hits: 1, misses: 1, hitRate: 0.5 });
  });

  it('valida a query: q curta ou lang desconhecida → 400', async () => {
    const { app } = appWith({ body: geocodingSaoPaulo });
    expect((await app.request('/v1/cities?q=a')).status).toBe(400);
    const res = await app.request('/v1/cities?q=rio&lang=xx');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('bad_request');
  });

  it('upstream fora → 502 e nada entra no cache', async () => {
    const { app, deps } = appWith({ status: 500 });
    const res = await app.request('/v1/cities?q=rio');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: { code: 'upstream_unavailable', message: expect.stringContaining('upstream_http') },
    });
    expect(await deps.cache.get('geo:v1:pt:rio')).toBeNull();
  });

  it('resposta upstream fora do schema nunca é cacheada', async () => {
    const { app, deps } = appWith({ body: { results: [{ id: 'x' }] } });
    expect((await app.request('/v1/cities?q=rio')).status).toBe(502);
    expect(await deps.cache.get('geo:v1:pt:rio')).toBeNull();
  });
});

describe('GET /v1/forecast', () => {
  it('miss → hit com chave de 2 casas e TTL de 15 min', async () => {
    const { app, deps, calls } = appWith({ body: forecastSaoPaulo });
    const first = await app.request('/v1/forecast?lat=-23.5475&lon=-46.63611');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('public, max-age=60');
    expect(await deps.cache.get('fc:v1:-23.55:-46.64')).not.toBeNull();
    const second = await app.request('/v1/forecast?lat=-23.549&lon=-46.641');
    expect(second.headers.get('x-cache')).toBe('HIT');
    expect(calls).toHaveLength(1);
  });

  it('lat/lon fora da faixa → 400', async () => {
    const { app } = appWith({ body: forecastSaoPaulo });
    expect((await app.request('/v1/forecast?lat=91&lon=0')).status).toBe(400);
    expect((await app.request('/v1/forecast?lat=0')).status).toBe(400);
  });
});

it('TTLs do spec', () => {
  expect(GEO_TTL_S).toBe(24 * 60 * 60);
  expect(FORECAST_TTL_S).toBe(15 * 60);
});
