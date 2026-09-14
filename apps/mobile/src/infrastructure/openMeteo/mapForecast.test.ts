import { forecastResponseSchema } from './forecastSchema';
import { mapForecast } from './mapForecast';
import { makeForecastDto } from './testing/forecastDto';

describe('mapForecast', () => {
  const dto = makeForecastDto(['2026-09-13', '2026-09-14']);

  it('converte arrays paralelos em objetos por hora', () => {
    const f = mapForecast(dto);
    expect(f.timezone).toBe('America/Sao_Paulo');
    expect(f.utcOffsetSeconds).toBe(-10800);
    expect(f.hourly).toHaveLength(48);
    expect(f.hourly[17]).toEqual({
      time: '2026-09-13T17:00',
      date: '2026-09-13',
      hour: 17,
      temperature: 22,
      apparentTemperature: 22,
      precipitationProbability: 5,
      precipitationMm: 0,
      windSpeedKmh: 10,
      windGustsKmh: 15,
      uvIndex: 3,
      cloudCoverPct: 20,
      weatherCode: 1,
      isDay: true,
      humidityPct: 55,
    });
    expect(f.hourly[20]?.isDay).toBe(false);
  });

  it('converte o diário', () => {
    expect(mapForecast(dto).daily[1]).toEqual({
      date: '2026-09-14',
      sunrise: '2026-09-14T06:12',
      sunset: '2026-09-14T18:04',
      weatherCode: 1,
      tempMax: 26,
      tempMin: 16,
    });
  });

  it('nulos viram 0 (e is_day nulo vira noite)', () => {
    const withNulls = {
      ...dto,
      hourly: {
        ...dto.hourly,
        precipitation_probability: dto.hourly.precipitation_probability.map(() => null),
        is_day: dto.hourly.is_day.map(() => null),
      },
    };
    const f = mapForecast(withNulls);
    expect(f.hourly[10]?.precipitationProbability).toBe(0);
    expect(f.hourly[10]?.isDay).toBe(false);
  });

  it('schema rejeita arrays de comprimentos diferentes', () => {
    const broken = { ...dto, hourly: { ...dto.hourly, uv_index: [1, 2, 3] } };
    expect(forecastResponseSchema.safeParse(broken).success).toBe(false);
  });
});
