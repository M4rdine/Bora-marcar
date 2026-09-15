import { EnvError, parseEnv } from './env';

describe('parseEnv', () => {
  it('padrão é direct sem URLs', () => {
    expect(parseEnv({})).toEqual({ apiMode: 'direct', bffUrl: null, assetsUrl: null });
  });
  it('lê bff com URLs', () => {
    expect(
      parseEnv({
        apiMode: 'bff',
        bffUrl: 'https://api.example.com',
        assetsUrl: 'https://cdn.example.com',
      }),
    ).toEqual({
      apiMode: 'bff',
      bffUrl: 'https://api.example.com',
      assetsUrl: 'https://cdn.example.com',
    });
  });
  it('modo desconhecido cai em direct', () => {
    expect(parseEnv({ apiMode: 'weird' })).toEqual({
      apiMode: 'direct',
      bffUrl: null,
      assetsUrl: null,
    });
  });

  it('modo bff sem URLs válidas falha alto, em vez de degradar em silêncio', () => {
    expect(() => parseEnv({ apiMode: 'bff' })).toThrow(EnvError);
    expect(() =>
      parseEnv({ apiMode: 'bff', bffUrl: 'not a url', assetsUrl: 'https://a.test' }),
    ).toThrow(/EXPO_PUBLIC_BFF_URL/);
    expect(() => parseEnv({ apiMode: 'bff', bffUrl: 'https://a.test' })).toThrow(
      /EXPO_PUBLIC_ASSETS_URL/,
    );
  });
});
