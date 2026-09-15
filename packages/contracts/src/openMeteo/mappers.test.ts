import { describe, expect, it } from 'vitest';

import { mapCity } from './mapCity';
import { mapForecast } from './mapForecast';

// Casos de borda que a fixture real de São Paulo não exercita (todos os resultados de geocoding
// e horários dela têm os campos opcionais preenchidos), necessários para a cobertura de branch
// do pacote (piso 90%).
describe('mapCity — campos opcionais ausentes', () => {
  it('usa os valores padrão quando admin1/country/country_code não vêm na resposta', () => {
    const dto = mapCity({ id: 1, name: 'Sem país', latitude: 0, longitude: 0, timezone: 'UTC' });
    expect(dto).toEqual({
      id: '1',
      name: 'Sem país',
      admin1: null,
      country: '',
      countryCode: '',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    });
  });
});

describe('mapForecast — horário sem separador T', () => {
  it('usa a string inteira como data e hora 0', () => {
    const f = mapForecast({
      timezone: 'UTC',
      utc_offset_seconds: 0,
      hourly: {
        time: ['2026-09-13'],
        temperature_2m: [20],
        apparent_temperature: [20],
        precipitation_probability: [0],
        precipitation: [0],
        wind_speed_10m: [0],
        wind_gusts_10m: [0],
        uv_index: [0],
        cloud_cover: [0],
        weather_code: [0],
        is_day: [1],
        relative_humidity_2m: [50],
      },
      daily: {
        time: ['2026-09-13'],
        sunrise: ['2026-09-13T06:00'],
        sunset: ['2026-09-13T18:00'],
        weather_code: [0],
        temperature_2m_max: [25],
        temperature_2m_min: [15],
      },
    });
    expect(f.hourly[0]).toMatchObject({ date: '2026-09-13', hour: 0 });
  });
});
