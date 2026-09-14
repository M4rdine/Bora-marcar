import type { Result } from '@/domain';

import type { City, Coordinates } from './city';

export type LocationError = { readonly code: 'denied' | 'unavailable' };
export type LocationFix = { readonly coords: Coordinates; readonly city: City };
export type LocationProvider = { current(): Promise<Result<LocationFix, LocationError>> };
