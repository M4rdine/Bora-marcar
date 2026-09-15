import { describe, expect, it } from 'vitest';

import { forecastSaoPaulo, geocodingSaoPaulo } from '../testing';

import { openMeteoForecastSchema } from './forecastSchema';
import { openMeteoGeocodingSchema } from './geocodingSchema';
import { mapForecast } from './mapForecast';
import { buildForecastUrl, buildGeocodingUrl, DAILY_VARS, HOURLY_VARS } from './query';

describe('schemas brutos da Open-Meteo', () => {
  it('geocoding real passa e traz São Paulo', () => {
    const parsed = openMeteoGeocodingSchema.safeParse(geocodingSaoPaulo);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.results?.some((r) => r.name === 'São Paulo')).toBe(true);
  });

  it('forecast real passa e mapeia 5 dias × 24 horas com fuso e offset', () => {
    const parsed = openMeteoForecastSchema.safeParse(forecastSaoPaulo);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const f = mapForecast(parsed.data);
    expect(f.hourly).toHaveLength(120);
    expect(f.daily).toHaveLength(5);
    expect(f.timezone).toBe('America/Sao_Paulo');
    expect(f.utcOffsetSeconds).toBe(-10800);
  });

  it('arrays horários de tamanhos diferentes são rejeitados', () => {
    const broken = {
      ...forecastSaoPaulo,
      hourly: { ...forecastSaoPaulo.hourly, uv_index: forecastSaoPaulo.hourly.uv_index.slice(1) },
    };
    expect(openMeteoForecastSchema.safeParse(broken).success).toBe(false);
  });

  it('valores nulos viram 0 e is_day vira boolean', () => {
    const raw = openMeteoForecastSchema.parse(forecastSaoPaulo);
    const patched = {
      ...raw,
      hourly: {
        ...raw.hourly,
        precipitation_probability: raw.hourly.precipitation_probability.map(() => null),
        is_day: raw.hourly.is_day.map((_, i) => (i % 2 === 0 ? 1 : 0)),
      },
    };
    const f = mapForecast(patched);
    expect(f.hourly[0]?.precipitationProbability).toBe(0);
    expect(f.hourly[0]?.isDay).toBe(true);
    expect(f.hourly[1]?.isDay).toBe(false);
  });

  it('monta as URLs com os parâmetros fixos do spec 4.1', () => {
    const url = new URL(buildForecastUrl('https://api.open-meteo.com', -23.5475, -46.63611));
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('hourly')).toBe(HOURLY_VARS.join(','));
    expect(url.searchParams.get('daily')).toBe(DAILY_VARS.join(','));
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    const geo = new URL(
      buildGeocodingUrl('https://geocoding-api.open-meteo.com', 'São Paulo', 'pt', 8),
    );
    expect(geo.pathname).toBe('/v1/search');
    expect(geo.searchParams.get('name')).toBe('São Paulo');
    expect(geo.searchParams.get('count')).toBe('8');
    expect(geo.searchParams.get('language')).toBe('pt');
    expect(geo.searchParams.get('format')).toBe('json');
  });
});
