import type { DailyDto, ForecastDto, HourlyDto } from '../dto';

import type { OpenMeteoForecast } from './forecastSchema';

const parseLocalIso = (iso: string): { date: string; hour: number } => {
  const t = iso.indexOf('T');
  const date = t === -1 ? iso : iso.slice(0, t);
  const hour = t === -1 ? 0 : Number(iso.slice(t + 1, t + 3));
  return { date, hour };
};

// Os comprimentos são validados pelo schema (refine): `arr[i]` existe para todo i < time.length.
const at = <T>(arr: readonly T[], i: number): T => arr[i] as T;
const num = (v: number | null): number => v ?? 0;

const mapHour = (h: OpenMeteoForecast['hourly'], i: number): HourlyDto => {
  const time = at(h.time, i);
  const { date, hour } = parseLocalIso(time);
  return {
    time,
    date,
    hour,
    temperature: at(h.temperature_2m, i),
    apparentTemperature: at(h.apparent_temperature, i),
    precipitationProbability: num(at(h.precipitation_probability, i)),
    precipitationMm: num(at(h.precipitation, i)),
    windSpeedKmh: num(at(h.wind_speed_10m, i)),
    windGustsKmh: num(at(h.wind_gusts_10m, i)),
    uvIndex: num(at(h.uv_index, i)),
    cloudCoverPct: num(at(h.cloud_cover, i)),
    weatherCode: num(at(h.weather_code, i)),
    isDay: num(at(h.is_day, i)) === 1,
    humidityPct: num(at(h.relative_humidity_2m, i)),
  };
};

const mapDay = (d: OpenMeteoForecast['daily'], i: number): DailyDto => ({
  date: at(d.time, i),
  sunrise: at(d.sunrise, i),
  sunset: at(d.sunset, i),
  weatherCode: num(at(d.weather_code, i)),
  tempMax: at(d.temperature_2m_max, i),
  tempMin: at(d.temperature_2m_min, i),
});

export const mapForecast = (dto: OpenMeteoForecast): ForecastDto => ({
  timezone: dto.timezone,
  utcOffsetSeconds: dto.utc_offset_seconds,
  hourly: dto.hourly.time.map((_, i) => mapHour(dto.hourly, i)),
  daily: dto.daily.time.map((_, i) => mapDay(dto.daily, i)),
});
