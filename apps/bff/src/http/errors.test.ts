import { describe, expect, it } from 'vitest';

import { AppError, errorBody } from './errors';

describe('errorBody', () => {
  it('monta o envelope padrão { error: { code, message } }', () => {
    expect(errorBody('bad_request', 'campo inválido')).toEqual({
      error: { code: 'bad_request', message: 'campo inválido' },
    });
  });
});

describe('AppError', () => {
  it('guarda status, code, message e headers opcionais', () => {
    const err = new AppError(429, 'rate_limited', 'devagar', { 'retry-after': '5' });
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limited');
    expect(err.message).toBe('devagar');
    expect(err.headers).toEqual({ 'retry-after': '5' });
  });

  it('headers tem padrão vazio quando omitido', () => {
    const err = new AppError(502, 'upstream_unavailable', 'fora do ar');
    expect(err.headers).toEqual({});
  });
});
