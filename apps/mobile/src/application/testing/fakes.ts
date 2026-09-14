import {
  defaultEngineConfig,
  err,
  ok,
  type EngineConfig,
  type Forecast,
  type GamificationEvent,
  type Result,
} from '@/domain';

import type {
  City,
  Clock,
  EngineConfigProvider,
  ForecastProvider,
  GeocodingProvider,
  IdGenerator,
  KeyValueStorage,
  LocationError,
  LocationFix,
  LocationProvider,
  Logger,
  NotificationInput,
  NotificationScheduler,
  ProgressRepository,
  ProviderError,
} from '../ports';
import { createAppServices, type AppPorts, type AppServices } from '../services';

export const saoPaulo: City = {
  id: '3448439',
  name: 'São Paulo',
  admin1: 'São Paulo',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -23.5475,
  longitude: -46.6361,
  timezone: 'America/Sao_Paulo',
};

export const fakeGeocoding = (
  result: Result<readonly City[], ProviderError> = ok([saoPaulo]),
): GeocodingProvider & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    search: async (query) => {
      calls.push(query);
      return result;
    },
  };
};

export const fakeForecast = (
  result: Result<Forecast, ProviderError>,
): ForecastProvider & { calls: number } => {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    fetch: async () => {
      state.calls += 1;
      return result;
    },
  };
};

export const fakeLocation = (
  result: Result<LocationFix, LocationError> = err({ code: 'denied' }),
): LocationProvider => ({ current: async () => result });

export const memoryStorage = (
  initial: Readonly<Record<string, string>> = {},
): KeyValueStorage & { dump(): Record<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
};

export const memoryProgressRepository = (
  initial: readonly GamificationEvent[] = [],
): ProgressRepository & { events(): readonly GamificationEvent[] } => {
  const state = { events: initial };
  return {
    load: async () => state.events,
    append: async (event) => {
      state.events = [...state.events, event];
    },
    events: () => state.events,
  };
};

export const fixedConfig = (config: EngineConfig = defaultEngineConfig): EngineConfigProvider => ({
  get: async () => config,
});

export const fixedClock = (epochMs: number): Clock => ({ now: () => epochMs });

export const sequentialIds = (prefix = 'id'): IdGenerator => {
  const state = { n: 0 };
  return {
    next: () => {
      state.n += 1;
      return `${prefix}-${state.n}`;
    },
  };
};

export const recordingScheduler = (): NotificationScheduler & {
  scheduled: NotificationInput[];
  cancelled: string[];
} => {
  const scheduled: NotificationInput[] = [];
  const cancelled: string[] = [];
  return {
    scheduled,
    cancelled,
    schedule: async (input) => {
      scheduled.push(input);
    },
    cancel: async (id) => {
      cancelled.push(id);
    },
  };
};

export const silentLogger = (): Logger => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

export const fakeServices = (overrides: Partial<AppPorts> = {}): AppServices =>
  createAppServices({
    geocoding: fakeGeocoding(),
    forecast: fakeForecast(err({ code: 'network', message: 'sem forecast configurado' })),
    location: fakeLocation(),
    progress: memoryProgressRepository(),
    config: fixedConfig(),
    clock: fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0)),
    ids: sequentialIds(),
    notifications: recordingScheduler(),
    logger: silentLogger(),
    ...overrides,
  });
