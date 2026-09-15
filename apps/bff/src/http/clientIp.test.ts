import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { clientIp } from './clientIp';

const probe = (trustProxy: boolean, headers: Record<string, string> = {}) => {
  const app = new Hono();
  app.get('/', (c) => c.text(clientIp(c, trustProxy)));
  // `app.request()` devolve `Response` síncrono (não `Promise`) quando o handler não é async;
  // `Promise.resolve` normaliza os dois casos sem alterar o que é testado.
  return Promise.resolve(app.request('/', { headers })).then((r) => r.text());
};

describe('clientIp', () => {
  it('confia no X-Real-IP atrás do nginx', async () => {
    expect(await probe(true, { 'x-real-ip': '203.0.113.7' })).toBe('203.0.113.7');
  });
  it('ignora X-Forwarded-For mesmo com trustProxy', async () => {
    expect(await probe(true, { 'x-forwarded-for': '1.2.3.4' })).toBe('unknown');
  });
  it('ignora os cabeçalhos quando não confia no proxy', async () => {
    expect(await probe(false, { 'x-real-ip': '203.0.113.7' })).toBe('unknown');
  });
  it('sem cabeçalho e sem conexão real devolve unknown', async () => {
    expect(await probe(true)).toBe('unknown');
  });
});
