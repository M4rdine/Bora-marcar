import * as Location from 'expo-location';

import type { City, Coordinates, LocationProvider } from '@/application/ports';
import { err, ok } from '@/domain';

const FALLBACK_NAME = 'Minha localização';

function cityFrom(coords: Coordinates, place: Location.LocationGeocodedAddress | undefined): City {
  return {
    id: `gps:${coords.latitude.toFixed(2)}:${coords.longitude.toFixed(2)}`,
    name: place?.city ?? place?.subregion ?? place?.region ?? FALLBACK_NAME,
    admin1: place?.region ?? null,
    country: place?.country ?? '',
    countryCode: (place?.isoCountryCode ?? '').toUpperCase(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone: 'auto',
  };
}

export const expoLocationProvider = (): LocationProvider => ({
  async current() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return err({ code: 'denied' });
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const places = await Location.reverseGeocodeAsync(coords).catch(() => []);
      return ok({ coords, city: cityFrom(coords, places[0]) });
    } catch {
      return err({ code: 'unavailable' });
    }
  },
});
