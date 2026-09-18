import { z } from 'zod';

const numbers = z.array(z.number());
const nullableNumbers = z.array(z.number().nullable());
const strings = z.array(z.string());

const hourlySchema = z
  .object({
    time: strings,
    temperature_2m: numbers,
    apparent_temperature: numbers,
    precipitation_probability: nullableNumbers,
    precipitation: nullableNumbers,
    wind_speed_10m: nullableNumbers,
    wind_gusts_10m: nullableNumbers,
    uv_index: nullableNumbers,
    cloud_cover: nullableNumbers,
    weather_code: nullableNumbers,
    is_day: nullableNumbers,
    relative_humidity_2m: nullableNumbers,
    pressure_msl: nullableNumbers,
  })
  .refine((h) => Object.values(h).every((arr) => arr.length === h.time.length), {
    message: 'arrays horários com comprimentos diferentes',
  });

const dailySchema = z
  .object({
    time: strings,
    sunrise: strings,
    sunset: strings,
    weather_code: nullableNumbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
  })
  .refine((d) => Object.values(d).every((arr) => arr.length === d.time.length), {
    message: 'arrays diários com comprimentos diferentes',
  });

export const openMeteoForecastSchema = z.object({
  timezone: z.string(),
  utc_offset_seconds: z.number(),
  hourly: hourlySchema,
  daily: dailySchema,
});

export type OpenMeteoForecast = z.infer<typeof openMeteoForecastSchema>;
