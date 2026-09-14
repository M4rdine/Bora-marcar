import { forecastResponseSchema } from './forecastSchema';
import { geocodingResponseSchema } from './geocodingSchema';
import { mapForecast } from './mapForecast';
import forecast from './testing/fixtures/forecast-sao-paulo.json';
import geocoding from './testing/fixtures/geocoding-sao-paulo.json';

describe('fixtures reais da Open-Meteo', () => {
  it('geocoding real passa no schema e traz São Paulo', () => {
    const parsed = geocodingResponseSchema.safeParse(geocoding);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.results?.some((r) => r.name === 'São Paulo')).toBe(true);
  });
  it('forecast real passa no schema e mapeia 5 dias × 24 horas', () => {
    const parsed = forecastResponseSchema.safeParse(forecast);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const f = mapForecast(parsed.data);
    expect(f.hourly).toHaveLength(120);
    expect(f.daily).toHaveLength(5);
    expect(f.timezone).toBe('America/Sao_Paulo');
  });
});
