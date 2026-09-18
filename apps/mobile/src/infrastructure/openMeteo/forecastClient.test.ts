import { err } from '@/domain';

import { createOpenMeteoForecast } from './forecastClient';
import type { FetchLike } from './http';
import { makeForecastDto } from './testing/forecastDto';

const fetchWith = (body: unknown, status = 200): FetchLike & { urls: string[] } => {
  const urls: string[] = [];
  const fn: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status < 300, status, json: async () => body };
  };
  return Object.assign(fn, { urls });
};

describe('createOpenMeteoForecast', () => {
  const coords = { latitude: -23.5475, longitude: -46.6361 };

  it('monta a URL com todas as variáveis, timezone=auto e forecast_days=5', async () => {
    const fetchFn = fetchWith(makeForecastDto(['2026-09-13']));
    await createOpenMeteoForecast({ fetchFn }).fetch(coords);
    const url = new URL(fetchFn.urls[0] ?? '');
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('-23.5475');
    expect(url.searchParams.get('longitude')).toBe('-46.6361');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    expect(url.searchParams.get('hourly')).toBe(
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover,weather_code,is_day,relative_humidity_2m,pressure_msl',
    );
    expect(url.searchParams.get('daily')).toBe(
      'sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min',
    );
  });

  it('devolve o Forecast mapeado', async () => {
    const result = await createOpenMeteoForecast({
      fetchFn: fetchWith(makeForecastDto(['2026-09-13', '2026-09-14'])),
    }).fetch(coords);
    expect(result.ok && result.value.hourly.length).toBe(48);
    expect(result.ok && result.value.daily.map((d) => d.date)).toEqual([
      '2026-09-13',
      '2026-09-14',
    ]);
  });

  it('resposta fora do schema vira erro schema', async () => {
    const result = await createOpenMeteoForecast({ fetchFn: fetchWith({ timezone: 'x' }) }).fetch(
      coords,
    );
    expect(!result.ok && result.error.code).toBe('schema');
  });

  it('repassa erro HTTP', async () => {
    expect(await createOpenMeteoForecast({ fetchFn: fetchWith({}, 429) }).fetch(coords)).toEqual(
      err({ code: 'http', status: 429, message: 'HTTP 429' }),
    );
  });
});
