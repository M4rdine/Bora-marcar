import type { City } from '@/application/ports';

import type { GeocodingResult } from './geocodingSchema';

export const mapCity = (dto: GeocodingResult): City => ({
  id: String(dto.id),
  name: dto.name,
  admin1: dto.admin1 ?? null,
  country: dto.country ?? '',
  countryCode: (dto.country_code ?? '').toUpperCase(),
  latitude: dto.latitude,
  longitude: dto.longitude,
  timezone: dto.timezone,
});
