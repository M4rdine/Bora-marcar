import { forecastSaoPaulo, geocodingSaoPaulo } from '@bora-marcar/contracts/testing';
import { http, HttpResponse } from 'msw';

/**
 * Handlers padrão para os testes ponta a ponta com adapters reais: devolvem as fixtures gravadas
 * de uma resposta real da Open-Meteo. Cada teste que precisa de um cenário de erro sobrescreve o
 * handler de previsão localmente com `server.use(...)`.
 */
export const handlers = [
  http.get('https://geocoding-api.open-meteo.com/v1/search', () =>
    HttpResponse.json(geocodingSaoPaulo),
  ),
  http.get('https://api.open-meteo.com/v1/forecast', () => HttpResponse.json(forecastSaoPaulo)),
];
