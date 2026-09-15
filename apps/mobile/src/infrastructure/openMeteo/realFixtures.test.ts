import {
  mapForecast,
  openMeteoForecastSchema,
  openMeteoGeocodingSchema,
} from '@melhor-hora/contracts';
import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';

describe('fixtures reais da Open-Meteo', () => {
  it('geocoding real passa no schema e traz São Paulo', () => {
    const parsed = openMeteoGeocodingSchema.safeParse(geocodingSaoPaulo);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.results?.some((r) => r.name === 'São Paulo')).toBe(true);
  });
  it('forecast real passa no schema e mapeia 5 dias × 24 horas', () => {
    const parsed = openMeteoForecastSchema.safeParse(forecastSaoPaulo);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const f = mapForecast(parsed.data);
    expect(f.hourly).toHaveLength(120);
    expect(f.daily).toHaveLength(5);
    expect(f.timezone).toBe('America/Sao_Paulo');
  });
});
