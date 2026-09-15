import type { CityDto } from '../dto';

import type { OpenMeteoGeocodingResult } from './geocodingSchema';

export const mapCity = (dto: OpenMeteoGeocodingResult): CityDto => ({
  id: String(dto.id),
  name: dto.name,
  admin1: dto.admin1 ?? null,
  country: dto.country ?? '',
  countryCode: (dto.country_code ?? '').toUpperCase(),
  latitude: dto.latitude,
  longitude: dto.longitude,
  timezone: dto.timezone,
});
