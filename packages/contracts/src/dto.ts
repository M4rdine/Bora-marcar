import { z } from 'zod';

const HOURS = 23;

export const cityDtoSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    admin1: z.string().nullable(),
    country: z.string(),
    countryCode: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(1),
  })
  .strict();

export const hourlyDtoSchema = z
  .object({
    time: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hour: z.number().int().min(0).max(HOURS),
    temperature: z.number(),
    apparentTemperature: z.number(),
    precipitationProbability: z.number(),
    precipitationMm: z.number(),
    windSpeedKmh: z.number(),
    windGustsKmh: z.number(),
    uvIndex: z.number(),
    cloudCoverPct: z.number(),
    weatherCode: z.number(),
    isDay: z.boolean(),
    humidityPct: z.number(),
    pressureHpa: z.number(),
    /** Variação da pressão nas últimas três horas. Negativo = caindo. */
    pressureTrendHpa: z.number(),
  })
  .strict();

export const dailyDtoSchema = z
  .object({
    date: z.string(),
    sunrise: z.string(),
    sunset: z.string(),
    weatherCode: z.number(),
    tempMax: z.number(),
    tempMin: z.number(),
  })
  .strict();

export const forecastDtoSchema = z
  .object({
    timezone: z.string().min(1),
    utcOffsetSeconds: z.number(),
    // .readonly(): o Forecast do domínio do app declara `hourly`/`daily` como arrays somente
    // leitura; sem isso o DTO não seria atribuível ao tipo do domínio nos dois sentidos (mesma
    // ideia aplicada a `EngineConfigDto` na Task 1).
    hourly: z.array(hourlyDtoSchema).readonly(),
    daily: z.array(dailyDtoSchema).readonly(),
  })
  .strict();

export type CityDto = z.infer<typeof cityDtoSchema>;
export type HourlyDto = z.infer<typeof hourlyDtoSchema>;
export type DailyDto = z.infer<typeof dailyDtoSchema>;
export type ForecastDto = z.infer<typeof forecastDtoSchema>;
