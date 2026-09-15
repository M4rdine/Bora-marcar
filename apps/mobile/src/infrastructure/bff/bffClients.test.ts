import { mapCity, mapForecast } from '@bora-marcar/contracts';
import { forecastSaoPaulo, geocodingSaoPaulo } from '@bora-marcar/contracts/testing';

import type { FetchLike } from '../openMeteo/http';

import { createBffForecast } from './bffForecastClient';
import { createBffGeocoding } from './bffGeocodingClient';

const replying = (status: number, body: unknown) => {
  const calls: string[] = [];
  const fetchFn: FetchLike = async (url) => {
    calls.push(url);
    return { ok: status < 400, status, json: async () => body };
  };
  return { fetchFn, calls };
};

describe('clients do BFF', () => {
  it('cidades: chama /v1/cities com q e lang e devolve City[]', async () => {
    const cities = (geocodingSaoPaulo.results ?? []).map(mapCity);
    const { fetchFn, calls } = replying(200, cities);
    const r = await createBffGeocoding({ fetchFn, baseUrl: 'https://bff.test' }).search(
      'São Paulo',
    );
    expect(r.ok && r.value[0]?.name).toBe('São Paulo');
    expect(calls[0]).toBe('https://bff.test/v1/cities?q=S%C3%A3o+Paulo&lang=pt');
  });

  it('previsão: chama /v1/forecast e devolve Forecast', async () => {
    const { fetchFn, calls } = replying(200, mapForecast(forecastSaoPaulo));
    const r = await createBffForecast({ fetchFn, baseUrl: 'https://bff.test' }).fetch({
      latitude: -23.5475,
      longitude: -46.63611,
    });
    expect(r.ok && r.value.hourly).toHaveLength(120);
    expect(calls[0]).toBe('https://bff.test/v1/forecast?lat=-23.5475&lon=-46.63611');
  });

  it('corpo fora do contrato vira erro schema; HTTP 502 vira erro http com status', async () => {
    const bad = await createBffForecast({
      ...replying(200, { nope: 1 }),
      baseUrl: 'https://bff.test',
    }).fetch({
      latitude: 0,
      longitude: 0,
    });
    expect(!bad.ok && bad.error.code).toBe('schema');
    const down = await createBffGeocoding({
      ...replying(502, {}),
      baseUrl: 'https://bff.test',
    }).search('rio');
    expect(!down.ok && down.error).toMatchObject({ code: 'http', status: 502 });
  });
});
