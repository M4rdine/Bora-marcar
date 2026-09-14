import { err, ok } from '@/domain';

import { createOpenMeteoGeocoding } from './geocodingClient';
import type { FetchLike } from './http';

const sample = {
  results: [
    {
      id: 3448439,
      name: 'São Paulo',
      latitude: -23.5475,
      longitude: -46.63611,
      timezone: 'America/Sao_Paulo',
      country: 'Brasil',
      country_code: 'BR',
      admin1: 'São Paulo',
    },
    { id: 1, name: 'Sem país', latitude: 0, longitude: 0, timezone: 'UTC' },
  ],
};

const fetchWith = (body: unknown, status = 200): FetchLike & { urls: string[] } => {
  const urls: string[] = [];
  const fn: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status < 300, status, json: async () => body };
  };
  return Object.assign(fn, { urls });
};

describe('createOpenMeteoGeocoding', () => {
  it('monta a URL com count=8, language=pt e a consulta codificada', async () => {
    const fetchFn = fetchWith(sample);
    await createOpenMeteoGeocoding({ fetchFn }).search('São Paulo');
    expect(fetchFn.urls[0]).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=8&language=pt&format=json',
    );
  });

  it('mapeia resultados para City, com campos opcionais vazios', async () => {
    const result = await createOpenMeteoGeocoding({ fetchFn: fetchWith(sample) }).search('x');
    expect(result).toEqual(
      ok([
        {
          id: '3448439',
          name: 'São Paulo',
          admin1: 'São Paulo',
          country: 'Brasil',
          countryCode: 'BR',
          latitude: -23.5475,
          longitude: -46.63611,
          timezone: 'America/Sao_Paulo',
        },
        {
          id: '1',
          name: 'Sem país',
          admin1: null,
          country: '',
          countryCode: '',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
        },
      ]),
    );
  });

  it('sem results devolve lista vazia', async () => {
    expect(
      await createOpenMeteoGeocoding({ fetchFn: fetchWith({ generationtime_ms: 1 }) }).search(
        'zzz',
      ),
    ).toEqual(ok([]));
  });

  it('resposta fora do schema vira erro schema', async () => {
    const result = await createOpenMeteoGeocoding({
      fetchFn: fetchWith({ results: [{ id: 'x' }] }),
    }).search('x');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('schema');
  });

  it('repassa erro HTTP', async () => {
    expect(await createOpenMeteoGeocoding({ fetchFn: fetchWith({}, 500) }).search('x')).toEqual(
      err({ code: 'http', status: 500, message: 'HTTP 500' }),
    );
  });

  it('aceita baseUrl customizada', async () => {
    const fetchFn = fetchWith(sample);
    await createOpenMeteoGeocoding({ fetchFn, baseUrl: 'https://bff.local' }).search('a');
    expect(fetchFn.urls[0]?.startsWith('https://bff.local/v1/search?')).toBe(true);
  });
});
