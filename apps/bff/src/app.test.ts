import { forecastSaoPaulo } from '@bora-marcar/contracts/testing';
import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import { AppError } from './http/errors';
import { testDeps } from './testing/deps';
import { fakeFetch } from './testing/fakeFetch';
import { createOpenMeteoUpstream } from './upstream/openMeteo';

describe('createApp', () => {
  it('GET /health responde estado, versão, cache e redis', async () => {
    const { fetchFn } = fakeFetch({ body: forecastSaoPaulo });
    const app = createApp(
      testDeps({
        env: { APP_VERSION: 'abc123' },
        upstream: createOpenMeteoUpstream({
          fetchFn,
          forecastBaseUrl: 'https://fc.test',
          geocodingBaseUrl: 'https://geo.test',
          timeoutMs: 1000,
        }),
      }),
    );
    await app.request('/v1/forecast?lat=0&lon=0');
    await app.request('/v1/forecast?lat=0&lon=0');
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      version: 'abc123',
      uptimeSeconds: expect.any(Number),
      redis: 'disabled',
      cache: { hits: 1, misses: 1, hitRate: 0.5 },
    });
  });

  it('rota desconhecida devolve 404 no formato padrão', async () => {
    const res = await createApp(testDeps()).request('/nada');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'Rota não encontrada' },
    });
  });

  it('cabeçalhos de segurança presentes', async () => {
    const res = await createApp(testDeps()).request('/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('CORS só para origens configuradas', async () => {
    const app = createApp(testDeps({ env: { ALLOWED_ORIGINS: ['https://ok.example'] } }));
    const allowed = await app.request('/health', { headers: { origin: 'https://ok.example' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://ok.example');
    const denied = await app.request('/health', { headers: { origin: 'https://evil.example' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('erro inesperado vira 500 padronizado sem vazar detalhes', async () => {
    const app = createApp(testDeps());
    app.get('/boom', () => {
      throw new Error('segredo');
    });
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'internal', message: 'Erro interno' } });
  });

  it('AppError conhecido preserva status, código e headers', async () => {
    const app = createApp(testDeps());
    app.get('/limite', () => {
      throw new AppError(429, 'rate_limited', 'devagar', { 'retry-after': '5' });
    });
    const res = await app.request('/limite');
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('5');
    expect(await res.json()).toEqual({ error: { code: 'rate_limited', message: 'devagar' } });
  });

  it('/health reporta redis "ok" quando REDIS_URL está configurada', async () => {
    const app = createApp(testDeps({ env: { REDIS_URL: 'redis://localhost:6379' } }));
    const res = await app.request('/health');
    expect((await res.json()).redis).toBe('ok');
  });
});
