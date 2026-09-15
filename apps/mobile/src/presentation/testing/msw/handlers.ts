import { http, HttpResponse } from 'msw';

import forecastFixture from '@/infrastructure/openMeteo/testing/fixtures/forecast-sao-paulo.json';
import geocodingFixture from '@/infrastructure/openMeteo/testing/fixtures/geocoding-sao-paulo.json';

/**
 * Handlers padrão para os testes ponta a ponta com adapters reais: devolvem as fixtures gravadas
 * de uma resposta real da Open-Meteo. Cada teste que precisa de um cenário de erro sobrescreve o
 * handler de previsão localmente com `server.use(...)`.
 */
export const handlers = [
  http.get('https://geocoding-api.open-meteo.com/v1/search', () =>
    HttpResponse.json(geocodingFixture),
  ),
  http.get('https://api.open-meteo.com/v1/forecast', ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    return HttpResponse.json(forecastFixture);
  }),
];
