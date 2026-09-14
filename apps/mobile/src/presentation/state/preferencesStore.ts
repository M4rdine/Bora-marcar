import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { City } from '@/application/ports';
import type { ActivityId, Forecast } from '@/domain';

import { addRecent, toggleFavorite } from './preferences';

export type LastForecast = { readonly utcOffsetSeconds: number; readonly timezone: string };

export type PreferencesState = {
  readonly city: City | null;
  readonly activity: ActivityId;
  readonly favorites: readonly City[];
  readonly recents: readonly City[];
  readonly lastForecast: LastForecast | null;
  selectCity(city: City): void;
  selectActivity(activity: ActivityId): void;
  toggleFavorite(city: City): void;
  rememberForecast(forecast: Forecast): void;
};

export const PREFERENCES_KEY = 'prefs:v1';

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      city: null,
      activity: 'walk',
      favorites: [],
      recents: [],
      lastForecast: null,
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
      rememberForecast: (forecast) =>
        set({
          lastForecast: {
            utcOffsetSeconds: forecast.utcOffsetSeconds,
            timezone: forecast.timezone,
          },
        }),
    }),
    {
      name: PREFERENCES_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 não tinha `lastForecast`; ao migrar de `prefs:v1`, começa sem previsão lembrada.
      migrate: (persistedState: unknown) => ({
        ...(persistedState as Partial<PreferencesState>),
        lastForecast: null,
      }),
    },
  ),
);
