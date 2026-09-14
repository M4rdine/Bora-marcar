import { ok, type Result } from '@/domain';

import type { City, LocationError, LocationProvider } from '../ports';

type Deps = { readonly location: LocationProvider };

export const resolveMyLocation =
  ({ location }: Deps) =>
  async (): Promise<Result<City, LocationError>> => {
    const fix = await location.current();
    return fix.ok ? ok(fix.value.city) : fix;
  };
