export const GEO_TTL_S = 86_400;
export const FORECAST_TTL_S = 900;
export const RATE_WINDOW_MS = 60_000;
const COORD_DECIMALS = 2;

const normalizeQuery = (q: string): string =>
  q.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export const geoKey = (lang: string, query: string): string =>
  `geo:v1:${lang}:${normalizeQuery(query)}`;
export const forecastKey = (lat: number, lon: number): string =>
  `fc:v1:${lat.toFixed(COORD_DECIMALS)}:${lon.toFixed(COORD_DECIMALS)}`;
export const rateKey = (ip: string): string => `rl:v1:${ip}`;
