import type { City } from '@/application/ports';

export const MAX_RECENTS = 5;
export const MAX_FAVORITES = 20;

export const isFavorite = (favorites: readonly City[], city: City): boolean =>
  favorites.some((c) => c.id === city.id);

export function addRecent(
  recents: readonly City[],
  city: City,
  favorites: readonly City[],
): readonly City[] {
  if (isFavorite(favorites, city)) return recents.filter((c) => c.id !== city.id);
  return [city, ...recents.filter((c) => c.id !== city.id)].slice(0, MAX_RECENTS);
}

export function toggleFavorite(favorites: readonly City[], city: City): readonly City[] {
  if (isFavorite(favorites, city)) return favorites.filter((c) => c.id !== city.id);
  if (favorites.length >= MAX_FAVORITES) return favorites;
  return [...favorites, city];
}
