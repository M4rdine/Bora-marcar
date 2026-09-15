import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

describe('loadEnv', () => {
  it('aplica os padrões do spec 7.5', () => {
    const env = loadEnv({});
    expect(env).toMatchObject({
      PORT: 8080,
      REDIS_URL: undefined,
      ALLOWED_ORIGINS: [],
      OPEN_METEO_BASE_URL: 'https://api.open-meteo.com',
      GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
      RATE_LIMIT_PER_MIN: 60,
      UPSTREAM_TIMEOUT_MS: 5000,
      LOG_LEVEL: 'info',
      TRUST_PROXY: true,
    });
  });

  it('separa ALLOWED_ORIGINS por vírgula e ignora vazios', () => {
    expect(loadEnv({ ALLOWED_ORIGINS: 'https://a.com, https://b.com,,' }).ALLOWED_ORIGINS).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('falha alto com valor inválido', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadEnv({ REDIS_URL: 'not-a-url' })).toThrow(/REDIS_URL/);
    expect(() => loadEnv({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});
