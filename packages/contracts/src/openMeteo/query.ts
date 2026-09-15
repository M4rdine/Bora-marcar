export const FORECAST_DAYS = 5;
export const GEOCODING_COUNT = 8;
export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'cloud_cover',
  'weather_code',
  'is_day',
  'relative_humidity_2m',
] as const;
export const DAILY_VARS = [
  'sunrise',
  'sunset',
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
] as const;

export function buildForecastUrl(baseUrl: string, latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `${baseUrl}/v1/forecast?${params.toString()}`;
}

export function buildGeocodingUrl(
  baseUrl: string,
  query: string,
  lang: string,
  count: number,
): string {
  const params = new URLSearchParams({
    name: query,
    count: String(count),
    language: lang,
    format: 'json',
  });
  return `${baseUrl}/v1/search?${params.toString()}`;
}
