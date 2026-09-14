import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { City } from '@/application/ports';
import type { ActivityId } from '@/domain';

import { addRecent, toggleFavorite } from './preferences';

export type PreferencesState = {
  readonly city: City | null;
  readonly activity: ActivityId;
  readonly favorites: readonly City[];
  readonly recents: readonly City[];
  selectCity(city: City): void;
  selectActivity(activity: ActivityId): void;
  toggleFavorite(city: City): void;
};

export const PREFERENCES_KEY = 'prefs:v1';

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      city: null,
      activity: 'walk',
      favorites: [],
      recents: [],
      selectCity: (city) =>
        set((s) => ({ city, recents: addRecent(s.recents, city, s.favorites) })),
      selectActivity: (activity) => set({ activity }),
      toggleFavorite: (city) =>
        set((s) => {
          const favorites = toggleFavorite(s.favorites, city);
          return {
            favorites,
            recents: s.recents.filter((c) => !favorites.some((f) => f.id === c.id)),
          };
        }),
    }),
    { name: PREFERENCES_KEY, version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
