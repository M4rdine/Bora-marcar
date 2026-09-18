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
  /**
   * As atividades escolhidas no primeiro acesso, na ordem em que a pessoa marcou.
   *
   * Antes a escolha do onboarding só definia qual aba abria selecionada e acabava ali: quem dizia
   * gostar de praia e piquenique continuava vendo caminhada, corrida e ciclismo primeiro. Agora
   * ela manda na ORDEM das abas, que é o único lugar onde a preferência tem como aparecer todo
   * dia.
   */
  readonly favoriteActivities: readonly ActivityId[];
  readonly favorites: readonly City[];
  readonly recents: readonly City[];
  readonly lastForecast: LastForecast | null;
  selectCity(city: City): void;
  selectActivity(activity: ActivityId): void;
  /** Guarda as preferidas e já seleciona a primeira delas. */
  selectFavoriteActivities(activities: readonly ActivityId[]): void;
  toggleFavorite(city: City): void;
  rememberForecast(forecast: Forecast): void;
};

export const PREFERENCES_KEY = 'prefs:v1';

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      city: null,
      activity: 'walk',
      favoriteActivities: [],
      favorites: [],
      recents: [],
      lastForecast: null,
      selectCity: (city) =>
        set((s) => ({ city, recents: addRecent(s.recents, city, s.favorites) })),
      selectActivity: (activity) => set({ activity }),
      selectFavoriteActivities: (favoriteActivities) =>
        set({
          favoriteActivities,
          ...(favoriteActivities[0] === undefined ? {} : { activity: favoriteActivities[0] }),
        }),
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
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 não tinha `lastForecast` e v2 não tinha `favoriteActivities`. Quem já usava o app
      // mantém a atividade escolhida como única preferida, para a ordem das abas não mudar
      // debaixo de alguém que nunca pediu isso.
      migrate: (persistedState: unknown) => {
        const anterior = persistedState as Partial<PreferencesState>;
        return {
          ...anterior,
          lastForecast: null,
          favoriteActivities:
            anterior.favoriteActivities ?? (anterior.activity ? [anterior.activity] : []),
        };
      },
    },
  ),
);
