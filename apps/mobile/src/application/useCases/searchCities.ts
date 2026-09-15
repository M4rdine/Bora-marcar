import { ok, type Result } from '@/domain';

import type { City, GeocodingProvider, ProviderError } from '../ports';

export const MIN_QUERY_LENGTH = 2;

type Deps = { readonly geocoding: GeocodingProvider };

/** ~11 km: colapsa o mesmo ponto devolvido duas vezes, mas preserva homônimos distantes. */
const COORD_DECIMALS = 1;

const cityKey = (c: City): string =>
  [
    c.name,
    c.admin1 ?? '',
    c.countryCode,
    c.latitude.toFixed(COORD_DECIMALS),
    c.longitude.toFixed(COORD_DECIMALS),
  ]
    .join('|')
    .toLowerCase();

/** O Open-Meteo devolve a mesma localidade com feature codes diferentes; fica a primeira. */
export const dedupeCities = (cities: readonly City[]): readonly City[] =>
  cities.filter((c, i, all) => all.findIndex((o) => cityKey(o) === cityKey(c)) === i);

export const searchCities =
  ({ geocoding }: Deps) =>
  async (query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>> => {
    const normalized = query.trim();
    if (normalized.length < MIN_QUERY_LENGTH) return ok([]);
    const result = await geocoding.search(normalized, signal);
    return result.ok ? ok(dedupeCities(result.value)) : result;
  };
