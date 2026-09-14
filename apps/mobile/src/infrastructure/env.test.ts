import { parseEnv } from './env';

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
  it('modo desconhecido ou URL inválida caem no padrão com aviso no retorno', () => {
    expect(parseEnv({ apiMode: 'weird', bffUrl: 'not a url' })).toEqual({
      apiMode: 'direct',
      bffUrl: null,
      assetsUrl: null,
    });
  });
});
