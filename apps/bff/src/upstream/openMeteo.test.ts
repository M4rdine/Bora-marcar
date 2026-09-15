import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { fakeFetch } from '../testing/fakeFetch';

import { createOpenMeteoUpstream } from './openMeteo';

const make = (fetchFn: ReturnType<typeof fakeFetch>['fetchFn'], timeoutMs = 5000) =>
  createOpenMeteoUpstream({
    fetchFn,
    forecastBaseUrl: 'https://fc.test',
    geocodingBaseUrl: 'https://geo.test',
    timeoutMs,
  });

describe('createOpenMeteoUpstream', () => {
  it('busca cidades e devolve CityDto[] validados', async () => {
    const { fetchFn, calls } = fakeFetch({ body: geocodingSaoPaulo });
    const r = await make(fetchFn).searchCities('São Paulo', 'pt');
    expect(r.ok && r.value[0]?.name).toBe('São Paulo');
    expect(calls[0]).toContain(
      'https://geo.test/v1/search?name=S%C3%A3o+Paulo&count=8&language=pt',
    );
  });

  it('previsão passa pelo schema bruto e vira ForecastDto', async () => {
    const { fetchFn, calls } = fakeFetch({ body: forecastSaoPaulo });
    const r = await make(fetchFn).fetchForecast(-23.5475, -46.63611);
    expect(r.ok && r.value.hourly).toHaveLength(120);
    expect(calls[0]).toContain('forecast_days=5');
  });

  it.each([
    ['http', { status: 503 }, 'upstream_http'],
    ['schema', { body: { nope: true } }, 'upstream_schema'],
    ['network', { throws: new Error('ECONNRESET') }, 'upstream_network'],
    ['timeout', { delayMs: 50, body: forecastSaoPaulo }, 'upstream_timeout'],
  ])('falha %s vira erro tipado', async (_, reply, code) => {
    const { fetchFn } = fakeFetch(reply);
    const r = await make(fetchFn, 10).fetchForecast(0, 0);
    expect(!r.ok && r.error.code).toBe(code);
  });
});
