# Plano 2: Application, infraestrutura em modo direto e app mínimo funcional

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o app funcionar de ponta a ponta no Expo Go em modo `direct` (Open-Meteo direto): buscar cidade, escolher atividade, ver a recomendação de hoje, planejar/confirmar/registrar atividade e ver o progresso, com telas funcionais em texto (o visual "Céu vivo" é o Plano 3).

**Architecture:** Camadas hexagonais sobre o domínio do Plano 1. `application/` define ports (interfaces) e casos de uso como funções que recebem deps e devolvem `Result`. `infrastructure/` implementa um adapter por port (Open-Meteo com Zod e `fetch` injetado, AsyncStorage atrás de um port `KeyValueStorage`, expo-location, expo-notifications, relógio, ids, logger) e um composition root. `presentation/` liga tudo com TanStack Query (servidor), Zustand persistido (preferências), Expo Router (rotas em `src/app` que só re-exportam telas de `presentation/features`) e telas mínimas testadas com React Native Testing Library e serviços falsos.

**Tech Stack:** Expo SDK 57, Expo Router, TanStack Query v5, Zustand v5 (persist), Zod v4, `@react-native-async-storage/async-storage`, expo-location, expo-notifications, expo-crypto, `@testing-library/react-native`, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-09-13-melhor-hora-design.md` (seções 3.2, 3.3, 4.1, 4.6, 5.6, 6.1–6.4, 8.2) e pendências em `docs/superpowers/plans/2026-09-14-plano-1-pendencias.md`.

## Global Constraints

- Node 22 e pnpm. `pnpm --filter mobile exec expo install <pkg>` para dependências do app (versões compatíveis com o SDK 57).
- Regras de camada (ESLint boundaries, já ativas): `domain` só importa `domain`; `application` importa `domain` e `application`; `infrastructure` importa `domain`, `application`, `infrastructure`; `presentation` importa `domain`, `application`, `presentation`. Este plano adiciona o tipo `app` (`src/app/**`) que só importa `presentation`.
- Imutabilidade em todo o código; sem `console.*` fora do adapter de logger (uma única linha com `eslint-disable-next-line no-console` justificada).
- Casos de uso nunca lançam: devolvem `Result<T, E>` com erros como uniões discriminadas.
- Sem `any`; sem `istanbul ignore`; sem branches defensivos inalcançáveis (mesma regra do Plano 1).
- Textos de UI em `presentation/i18n/pt-BR.ts`; nomes de código em inglês.
- Cobertura: `domain` 100 %; global mínima 80 % (threshold do Jest). Adapters que envolvem módulos nativos (`expo-location`, `expo-notifications`, AsyncStorage, `expo-crypto`) são finos e ficam fora de `collectCoverageFrom` (lista explícita na Task 6).
- Testes de presentation usam serviços falsos via `ServicesProvider`, não MSW (decisão deste plano: evita depender do `fetch` global no Jest; MSW pode entrar no Plano 3 para os testes de tela completos).
- "Agora" é sempre `localNow(clock.now(), forecast.utcOffsetSeconds)`; nunca o fuso do aparelho.
- Commits em conventional commits, sem linha de atribuição.
- Todos os comandos assumem `cwd = /Users/raphaelmardine/programacao/Projetos Pessoais/melhor-hora`, branch de feature criada a partir de `feat/plano-1-dominio` (ou de `master` após merge).

---

## Mapa de arquivos

```
apps/mobile/
├── app.json                                   # scheme, plugins expo-router/location/notifications
├── package.json                               # main: expo-router/entry; deps novas; coverage excludes
├── eslint.config.js                           # + elemento "app"
└── src/
    ├── app/                                   # rotas Expo Router (só re-exportam telas)
    │   ├── _layout.tsx                        # providers + Stack
    │   └── (tabs)/_layout.tsx, index.tsx, cities.tsx, profile.tsx
    ├── application/
    │   ├── ports/city.ts                      # City, Coordinates
    │   ├── ports/providers.ts                 # GeocodingProvider, ForecastProvider, ProviderError
    │   ├── ports/location.ts                  # LocationProvider, LocationError
    │   ├── ports/storage.ts                   # KeyValueStorage, ProgressRepository, EngineConfigProvider
    │   ├── ports/system.ts                    # Clock, IdGenerator, NotificationScheduler, Logger
    │   ├── ports/index.ts
    │   ├── useCases/searchCities.ts (+test)
    │   ├── useCases/resolveMyLocation.ts (+test)
    │   ├── useCases/buildOverview.ts (+test)  # forecast + config + clock → Overview
    │   ├── useCases/planActivity.ts (+test)
    │   ├── useCases/confirmActivity.ts (+test)
    │   ├── useCases/logActivity.ts (+test)
    │   ├── useCases/cancelPlan.ts (+test)
    │   ├── useCases/recordBadWeatherDay.ts (+test)
    │   ├── useCases/getProgress.ts (+test)
    │   ├── services.ts                        # AppServices: o conjunto de casos de uso já ligados
    │   └── testing/fakes.ts                   # fakes de todos os ports
    ├── infrastructure/
    │   ├── openMeteo/http.ts (+test)          # fetchJson com timeout, fetch injetado
    │   ├── openMeteo/geocodingSchema.ts, geocodingClient.ts (+test), mapCity.ts
    │   ├── openMeteo/forecastSchema.ts, forecastClient.ts (+test), mapForecast.ts (+test)
    │   ├── openMeteo/fixtures/geocoding.json, forecast.json
    │   ├── storage/asyncStorageKeyValue.ts    # nativo, fora da cobertura
    │   ├── storage/memoryKeyValue.ts          # fake em memória (usado em testes e no container de teste)
    │   ├── storage/progressRepository.ts (+test)
    │   ├── config/embeddedEngineConfigProvider.ts
    │   ├── location/expoLocationProvider.ts   # nativo
    │   ├── notifications/expoNotificationScheduler.ts  # nativo
    │   ├── system/systemClock.ts, randomIdGenerator.ts, consoleLogger.ts
    │   ├── env.ts (+test)                     # lê EXPO_PUBLIC_*; valida com Zod
    │   └── container.ts                       # composition root: createServices(env)
    └── presentation/
        ├── i18n/pt-BR.ts
        ├── services/ServicesProvider.tsx      # contexto com AppServices
        ├── queries/queryClient.ts, keys.ts, useCitySearch.ts, useForecast.ts, useOverview.ts, useProgress.ts, useGamificationActions.ts
        ├── state/preferences.ts (+test)       # regras puras de recentes/favoritas
        ├── state/preferencesStore.ts          # Zustand persist (AsyncStorage)
        ├── hooks/useDebouncedValue.ts (+test), useNowTick.ts
        ├── features/home/HomeScreen.tsx (+test), components/HeroCard.tsx, HourlyList.tsx, NextDaysList.tsx, ActivityPicker.tsx
        ├── features/cities/CitiesScreen.tsx (+test)
        ├── features/profile/ProfileScreen.tsx (+test)
        └── testing/renderWithProviders.tsx
```

Fora deste plano (Plano 3): design system, `Sky`, animações, `/day/[date]`, estados visuais ricos. Fora (Plano 4): BFF, modo `bff`, config remota, CI/CD.

---

### Task 1: Ports da application e fakes de teste

**Files:**

- Create: `apps/mobile/src/application/ports/city.ts`, `providers.ts`, `location.ts`, `storage.ts`, `system.ts`, `index.ts`
- Create: `apps/mobile/src/application/testing/fakes.ts`
- Delete: `apps/mobile/src/application/.gitkeep`
- Modify: `apps/mobile/package.json` (adicionar `"!src/**/testing/**"` já existe; nada a mudar)

**Interfaces:**

- Produces (tipos consumidos por todas as tarefas seguintes):
  - `City = { id: string; name: string; admin1: string | null; country: string; countryCode: string; latitude: number; longitude: number; timezone: string }`
  - `Coordinates = { latitude: number; longitude: number }`
  - `ProviderError = { code: 'network' | 'http' | 'schema' | 'timeout'; message: string; status?: number }`
  - `GeocodingProvider = { search(query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>> }`
  - `ForecastProvider = { fetch(coords: Coordinates, signal?: AbortSignal): Promise<Result<Forecast, ProviderError>> }`
  - `LocationError = { code: 'denied' | 'unavailable' }`; `LocationFix = { coords: Coordinates; city: City }`
  - `LocationProvider = { current(): Promise<Result<LocationFix, LocationError>> }`
  - `KeyValueStorage = { getItem(key): Promise<string | null>; setItem(key, value): Promise<void>; removeItem(key): Promise<void> }`
  - `ProgressRepository = { load(): Promise<readonly GamificationEvent[]>; append(event: GamificationEvent): Promise<void> }`
  - `EngineConfigProvider = { get(): Promise<EngineConfig> }`
  - `Clock = { now(): number }`; `IdGenerator = { next(): string }`
  - `NotificationScheduler = { schedule(input: { id: string; title: string; body: string; atEpochMs: number }): Promise<void>; cancel(id: string): Promise<void> }`
  - `Logger = { info(message: string, meta?: Record<string, unknown>): void; warn(...): void; error(...): void }`
  - fakes: `fakeGeocoding(cities)`, `fakeForecast(forecast)`, `fakeLocation(result)`, `memoryStorage()`, `memoryProgressRepository(initial?)`, `fixedConfig()`, `fixedClock(epochMs)`, `sequentialIds()`, `recordingScheduler()`, `silentLogger()`

- [ ] **Step 1: `ports/city.ts`**

```ts
export type Coordinates = { readonly latitude: number; readonly longitude: number };

export type City = {
  readonly id: string;
  readonly name: string;
  readonly admin1: string | null;
  readonly country: string;
  readonly countryCode: string; // ISO-3166-1 alpha-2
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string; // IANA
};
```

- [ ] **Step 2: `ports/providers.ts`**

```ts
import type { Forecast, Result } from '@/domain';

import type { City, Coordinates } from './city';

export type ProviderErrorCode = 'network' | 'http' | 'schema' | 'timeout';
export type ProviderError = {
  readonly code: ProviderErrorCode;
  readonly message: string;
  readonly status?: number;
};

export type GeocodingProvider = {
  search(query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>>;
};

export type ForecastProvider = {
  fetch(coords: Coordinates, signal?: AbortSignal): Promise<Result<Forecast, ProviderError>>;
};
```

- [ ] **Step 3: `ports/location.ts`**

```ts
import type { Result } from '@/domain';

import type { City, Coordinates } from './city';

export type LocationError = { readonly code: 'denied' | 'unavailable' };
export type LocationFix = { readonly coords: Coordinates; readonly city: City };
export type LocationProvider = { current(): Promise<Result<LocationFix, LocationError>> };
```

- [ ] **Step 4: `ports/storage.ts`**

```ts
import type { EngineConfig, GamificationEvent } from '@/domain';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type ProgressRepository = {
  load(): Promise<readonly GamificationEvent[]>;
  append(event: GamificationEvent): Promise<void>;
};

export type EngineConfigProvider = { get(): Promise<EngineConfig> };
```

- [ ] **Step 5: `ports/system.ts`**

```ts
export type Clock = { now(): number };
export type IdGenerator = { next(): string };

export type NotificationInput = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly atEpochMs: number;
};
export type NotificationScheduler = {
  schedule(input: NotificationInput): Promise<void>;
  cancel(id: string): Promise<void>;
};

export type LogMeta = Readonly<Record<string, unknown>>;
export type Logger = {
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
};
```

- [ ] **Step 6: `ports/index.ts`**

```ts
export * from './city';
export * from './providers';
export * from './location';
export * from './storage';
export * from './system';
```

- [ ] **Step 7: `testing/fakes.ts`**

```ts
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
```

Observação: os fakes mutam estado interno próprio (`calls.push`, `state.events = […]`); isso é código de teste em `testing/`, fora da cobertura e fora da regra de imutabilidade do código de produção.

- [ ] **Step 8: Typecheck, lint, commit**

Run: `rm apps/mobile/src/application/.gitkeep && pnpm --filter mobile typecheck && pnpm --filter mobile lint`
Expected: sem erros (o alias `@/domain` resolve via `tsconfig` `paths` e `moduleNameMapper` do Jest; se o ESLint reclamar de `import/no-unresolved` para `@/domain`, confirme que `eslint-import-resolver-typescript` está instalado e configurado em `settings['import/resolver']` — foi na Task 3 do Plano 1).

```bash
git add -A apps/mobile/src/application
git commit -m "feat(application): ports da camada de aplicação e fakes de teste"
```

---

### Task 2: Casos de uso de busca, localização e visão geral

**Files:**

- Create: `apps/mobile/src/application/useCases/searchCities.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/resolveMyLocation.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/buildOverview.ts` (+ `.test.ts`)

**Interfaces:**

- Produces:
  - `searchCities(deps: { geocoding: GeocodingProvider }) => (query: string, signal?: AbortSignal) => Promise<Result<readonly City[], ProviderError>>` — normaliza (trim); menos de 2 caracteres devolve `ok([])` sem chamar o provider.
  - `resolveMyLocation(deps: { location: LocationProvider }) => () => Promise<Result<City, LocationError>>`
  - `buildOverview(deps: { clock: Clock }) => (input: { forecast: Forecast; activity: ActivityId; config: EngineConfig }) => { overview: Overview; now: LocalDateTime }` — função pura sobre o relógio injetado.
  - `MIN_QUERY_LENGTH = 2`

- [ ] **Step 1: Teste de `searchCities`**

`apps/mobile/src/application/useCases/searchCities.test.ts`:

```ts
import { err, ok } from '@/domain';

import { fakeGeocoding, saoPaulo } from '../testing/fakes';

import { searchCities } from './searchCities';

describe('searchCities', () => {
  it('com menos de 2 caracteres devolve vazio sem consultar o provider', async () => {
    const geocoding = fakeGeocoding();
    const result = await searchCities({ geocoding })(' s ');
    expect(result).toEqual(ok([]));
    expect(geocoding.calls).toEqual([]);
  });

  it('normaliza espaços e repassa a consulta', async () => {
    const geocoding = fakeGeocoding(ok([saoPaulo]));
    const result = await searchCities({ geocoding })('  São Paulo ');
    expect(result).toEqual(ok([saoPaulo]));
    expect(geocoding.calls).toEqual(['São Paulo']);
  });

  it('repassa erro do provider', async () => {
    const failure = err({ code: 'network' as const, message: 'offline' });
    const result = await searchCities({ geocoding: fakeGeocoding(failure) })('Rio');
    expect(result).toEqual(failure);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- searchCities`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar `searchCities.ts`**

```ts
import { ok, type Result } from '@/domain';

import type { City, GeocodingProvider, ProviderError } from '../ports';

export const MIN_QUERY_LENGTH = 2;

type Deps = { readonly geocoding: GeocodingProvider };

export const searchCities =
  ({ geocoding }: Deps) =>
  async (query: string, signal?: AbortSignal): Promise<Result<readonly City[], ProviderError>> => {
    const normalized = query.trim();
    if (normalized.length < MIN_QUERY_LENGTH) return ok([]);
    return geocoding.search(normalized, signal);
  };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter mobile test -- searchCities`
Expected: PASS, 3 testes.

- [ ] **Step 5: Teste de `resolveMyLocation`**

`apps/mobile/src/application/useCases/resolveMyLocation.test.ts`:

```ts
import { err, ok } from '@/domain';

import { fakeLocation, saoPaulo } from '../testing/fakes';

import { resolveMyLocation } from './resolveMyLocation';

describe('resolveMyLocation', () => {
  it('devolve a cidade do fix', async () => {
    const location = fakeLocation(
      ok({ coords: { latitude: -23.5, longitude: -46.6 }, city: saoPaulo }),
    );
    expect(await resolveMyLocation({ location })()).toEqual(ok(saoPaulo));
  });

  it('repassa negativa de permissão', async () => {
    expect(await resolveMyLocation({ location: fakeLocation(err({ code: 'denied' })) })()).toEqual(
      err({ code: 'denied' }),
    );
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- resolveMyLocation`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar `resolveMyLocation.ts`**

```ts
import { ok, type Result } from '@/domain';

import type { City, LocationError, LocationProvider } from '../ports';

type Deps = { readonly location: LocationProvider };

export const resolveMyLocation =
  ({ location }: Deps) =>
  async (): Promise<Result<City, LocationError>> => {
    const fix = await location.current();
    return fix.ok ? ok(fix.value.city) : fix;
  };
```

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter mobile test -- resolveMyLocation`
Expected: PASS, 2 testes.

- [ ] **Step 9: Teste de `buildOverview`**

`apps/mobile/src/application/useCases/buildOverview.test.ts`:

```ts
import { defaultEngineConfig } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { fixedClock } from '../testing/fakes';

import { buildOverview } from './buildOverview';

describe('buildOverview', () => {
  // 2026-09-13T17:00Z = 14:00 em São Paulo (UTC-3)
  const clock = fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0));
  const forecast = makeForecast(['2026-09-13', '2026-09-14', '2026-09-15']);

  it('usa o fuso da cidade para o agora e monta a visão geral', () => {
    const { overview, now } = buildOverview({ clock })({
      forecast,
      activity: 'walk',
      config: defaultEngineConfig,
    });
    expect(now).toMatchObject({ date: '2026-09-13', hour: 14, minute: 0 });
    expect(overview.today.date).toBe('2026-09-13');
    expect(overview.today.result.kind === 'window' && overview.today.result.window.startHour).toBe(
      14,
    );
    expect(overview.nextDays.map((d) => d.date)).toEqual(['2026-09-14', '2026-09-15']);
  });

  it('muda com a atividade', () => {
    const walk = buildOverview({ clock })({
      forecast,
      activity: 'walk',
      config: defaultEngineConfig,
    });
    const beach = buildOverview({ clock })({
      forecast,
      activity: 'beach',
      config: defaultEngineConfig,
    });
    expect(walk.overview.today.activityId).toBe('walk');
    expect(beach.overview.today.activityId).toBe('beach');
  });
});
```

Nota: o import de `@/domain/recommendation/testing/fixtures` é permitido em testes (o ESLint boundaries só governa código dentro de `src/**`, e fixtures são `testing/`). Se a regra acusar o import cruzado no arquivo de teste, adicione um override no `eslint.config.js` liberando `boundaries/dependencies` para arquivos `**/*.test.{ts,tsx}` — registre como desvio no relatório.

- [ ] **Step 10: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- buildOverview`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 11: Implementar `buildOverview.ts`**

```ts
import {
  localNow,
  recommendOverview,
  type ActivityId,
  type EngineConfig,
  type Forecast,
  type LocalDateTime,
  type Overview,
} from '@/domain';

import type { Clock } from '../ports';

type Deps = { readonly clock: Clock };
type Input = {
  readonly forecast: Forecast;
  readonly activity: ActivityId;
  readonly config: EngineConfig;
};
export type OverviewSnapshot = { readonly overview: Overview; readonly now: LocalDateTime };

export const buildOverview =
  ({ clock }: Deps) =>
  ({ forecast, activity, config }: Input): OverviewSnapshot => {
    const now = localNow(clock.now(), forecast.utcOffsetSeconds);
    const overview = recommendOverview(forecast, config.activities[activity], config, now);
    return { overview, now };
  };
```

- [ ] **Step 12: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- useCases && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS.

```bash
git add apps/mobile/src/application
git commit -m "feat(application): casos de uso de busca de cidade, localização e visão geral"
```

---

### Task 3: Casos de uso de gamificação e o objeto `AppServices`

**Files:**

- Create: `apps/mobile/src/application/useCases/localEpoch.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/planActivity.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/confirmActivity.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/logActivity.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/cancelPlan.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/recordBadWeatherDay.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/useCases/getProgress.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/application/services.ts`

**Interfaces:**

- Consumes: ports (Task 1), `deriveProgress`, `GamificationEvent`, `TimeWindow`, `isWithinWindow`, `defaultEngineConfig` do domínio.
- Produces:
  - `localEpochMs(date: string, hour: number, minute: number, utcOffsetSeconds: number): number`
  - `planActivity(deps) => (input: { city: City; activity: ActivityId; window: TimeWindow; windowScore: number; utcOffsetSeconds: number }) => Promise<Result<{ planId: string }, PlanError>>` com `PlanError = { code: 'alreadyPlanned' | 'alreadyDoneToday' }`; agenda lembrete 30 min antes (`REMINDER_MINUTES_BEFORE = 30`) com `id = planId`.
  - `confirmActivity(deps) => (input: { planId: string; date: string; hourLeft: number; hourScore: number }) => Promise<Result<{ eventId: string }, ConfirmError>>` com `ConfirmError = { code: 'planNotFound' | 'alreadyDoneToday' }`; cancela a notificação `planId`.
  - `logActivity(deps) => (input: { city: City; activity: ActivityId; date: string; hourLeft: number; hourScore: number }) => Promise<Result<{ eventId: string }, LogError>>` com `LogError = { code: 'alreadyDoneToday' }`.
  - `cancelPlan(deps) => (planId: string) => Promise<Result<void, CancelError>>` com `CancelError = { code: 'planNotFound' }`; cancela a notificação.
  - `recordBadWeatherDay(deps) => (input: { cityId: string; date: string; bestScore: number }) => Promise<void>` — idempotente por data.
  - `getProgress(deps) => (today: string) => Promise<Progress>`
  - `AppServices` (tipo) e `createAppServices(ports: AppPorts): AppServices`, com `AppPorts = { geocoding; forecast; location; progress; config; clock; ids; notifications; logger }`.

- [ ] **Step 1: Teste e implementação de `localEpoch`**

`localEpoch.test.ts`:

```ts
import { localEpochMs } from './localEpoch';

describe('localEpochMs', () => {
  it('converte hora local de São Paulo (UTC-3) para epoch', () => {
    expect(localEpochMs('2026-09-13', 17, 0, -10800)).toBe(Date.UTC(2026, 8, 13, 20, 0, 0));
  });
  it('converte hora local de Tóquio (UTC+9)', () => {
    expect(localEpochMs('2026-09-14', 2, 30, 32400)).toBe(Date.UTC(2026, 8, 13, 17, 30, 0));
  });
});
```

`localEpoch.ts`:

```ts
/** Epoch (ms) de um instante expresso em data/hora local de uma cidade com o offset dado. */
export function localEpochMs(
  date: string,
  hour: number,
  minute: number,
  utcOffsetSeconds: number,
): number {
  const asUtc = Date.parse(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
  );
  return asUtc - utcOffsetSeconds * 1000;
}
```

Run: `pnpm --filter mobile test -- localEpoch` → FAIL antes, PASS depois.

- [ ] **Step 2: Teste de `planActivity`**

`planActivity.test.ts`:

```ts
import { err, ok } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { planActivity } from './planActivity';

const window = { date: '2026-09-13', startHour: 17, endHour: 19 };
const base = {
  city: saoPaulo,
  activity: 'run' as const,
  window,
  windowScore: 84,
  utcOffsetSeconds: -10800,
};
const NOW = Date.UTC(2026, 8, 13, 11, 0, 0); // 08:00 em São Paulo

const setup = (initial: Parameters<typeof memoryProgressRepository>[0] = []) => {
  const progress = memoryProgressRepository(initial);
  const notifications = recordingScheduler();
  const run = planActivity({
    progress,
    notifications,
    clock: fixedClock(NOW),
    ids: sequentialIds('plan'),
  });
  return { progress, notifications, run };
};

describe('planActivity', () => {
  it('grava o evento planned e agenda lembrete 30 min antes no fuso da cidade', async () => {
    const { progress, notifications, run } = setup();
    const result = await run(base);
    expect(result).toEqual(ok({ planId: 'plan-1' }));
    expect(progress.events()).toEqual([
      {
        type: 'planned',
        id: 'plan-1',
        cityId: saoPaulo.id,
        activity: 'run',
        date: '2026-09-13',
        window,
        windowScore: 84,
        createdAt: NOW,
      },
    ]);
    expect(notifications.scheduled).toEqual([
      expect.objectContaining({ id: 'plan-1', atEpochMs: Date.UTC(2026, 8, 13, 19, 30, 0) }),
    ]);
  });

  it('recusa um segundo plano ativo para o mesmo dia', async () => {
    const { run } = setup();
    await run(base);
    expect(await run(base)).toEqual(err({ code: 'alreadyPlanned' }));
  });

  it('recusa planejar um dia que já tem atividade registrada', async () => {
    const { run } = setup([
      {
        type: 'logged',
        id: 'l1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 7,
        hourScore: 70,
        createdAt: NOW - 1000,
      },
    ]);
    expect(await run(base)).toEqual(err({ code: 'alreadyDoneToday' }));
  });

  it('permite planejar depois de cancelar', async () => {
    const { run, progress } = setup();
    const first = await run(base);
    if (!first.ok) throw new Error('esperava ok');
    await progress.append({
      type: 'planCancelled',
      id: 'c1',
      planId: first.value.planId,
      createdAt: NOW + 1,
    });
    expect(await run(base)).toEqual(ok({ planId: 'plan-2' }));
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- planActivity`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `planActivity.ts`**

```ts
import {
  defaultEngineConfig,
  deriveProgress,
  err,
  ok,
  type ActivityId,
  type Result,
  type TimeWindow,
} from '@/domain';

import type { City, Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

import { localEpochMs } from './localEpoch';

export const REMINDER_MINUTES_BEFORE = 30;

export type PlanError = { readonly code: 'alreadyPlanned' | 'alreadyDoneToday' };
export type PlanInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly window: TimeWindow;
  readonly windowScore: number;
  readonly utcOffsetSeconds: number;
};

type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

const reminderEpoch = (input: PlanInput): number =>
  localEpochMs(input.window.date, input.window.startHour, 0, input.utcOffsetSeconds) -
  REMINDER_MINUTES_BEFORE * 60_000;

export const planActivity =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (input: PlanInput): Promise<Result<{ planId: string }, PlanError>> => {
    const events = await progress.load();
    const current = deriveProgress(events, defaultEngineConfig, input.window.date);
    if (current.todayRecord !== null) return err({ code: 'alreadyDoneToday' });
    if (current.activePlan !== null) return err({ code: 'alreadyPlanned' });

    const planId = ids.next();
    await progress.append({
      type: 'planned',
      id: planId,
      cityId: input.city.id,
      activity: input.activity,
      date: input.window.date,
      window: input.window,
      windowScore: input.windowScore,
      createdAt: clock.now(),
    });
    await notifications.schedule({
      id: planId,
      title: 'Sua janela está chegando',
      body: `Melhor horário para sair começa às ${input.window.startHour}h.`,
      atEpochMs: reminderEpoch(input),
    });
    return ok({ planId });
  };
```

Nota: `deriveProgress` recebe `defaultEngineConfig` porque só usa `xp`, `levels` e `window.graceHoursAfterEnd`; quando a config remota existir (Plano 4), os casos de uso receberão `config` por dependência. Registre isso como comentário de uma linha acima da chamada.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter mobile test -- planActivity`
Expected: PASS, 4 testes.

- [ ] **Step 6: Testes de `confirmActivity`, `logActivity`, `cancelPlan`**

`confirmActivity.test.ts`:

```ts
import { err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { confirmActivity } from './confirmActivity';

const NOW = Date.UTC(2026, 8, 13, 20, 42, 0);
const plan: GamificationEvent = {
  type: 'planned',
  id: 'plan-1',
  cityId: saoPaulo.id,
  activity: 'run',
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour: 17, endHour: 19 },
  windowScore: 84,
  createdAt: NOW - 3600_000,
};
const setup = (initial: readonly GamificationEvent[]) => {
  const progress = memoryProgressRepository(initial);
  const notifications = recordingScheduler();
  const run = confirmActivity({
    progress,
    notifications,
    clock: fixedClock(NOW),
    ids: sequentialIds('evt'),
  });
  return { progress, notifications, run };
};

describe('confirmActivity', () => {
  it('grava confirmed e cancela o lembrete', async () => {
    const { progress, notifications, run } = setup([plan]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()[1]).toEqual({
      type: 'confirmed',
      id: 'evt-1',
      planId: 'plan-1',
      date: '2026-09-13',
      hourLeft: 17,
      hourScore: 86,
      createdAt: NOW,
    });
    expect(notifications.cancelled).toEqual(['plan-1']);
  });

  it('plano inexistente ou cancelado', async () => {
    const { run } = setup([
      plan,
      { type: 'planCancelled', id: 'c', planId: 'plan-1', createdAt: NOW - 1 },
    ]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(err({ code: 'planNotFound' }));
    expect(await run({ planId: 'nope', date: '2026-09-13', hourLeft: 17, hourScore: 86 })).toEqual(
      err({ code: 'planNotFound' }),
    );
  });

  it('dia que já tem registro', async () => {
    const logged: GamificationEvent = {
      type: 'logged',
      id: 'l',
      cityId: saoPaulo.id,
      activity: 'walk',
      date: '2026-09-13',
      hourLeft: 7,
      hourScore: 70,
      createdAt: NOW - 10,
    };
    const { run } = setup([plan, logged]);
    expect(
      await run({ planId: 'plan-1', date: '2026-09-13', hourLeft: 17, hourScore: 86 }),
    ).toEqual(err({ code: 'alreadyDoneToday' }));
  });
});
```

`logActivity.test.ts`:

```ts
import { err, ok } from '@/domain';

import { fixedClock, memoryProgressRepository, saoPaulo, sequentialIds } from '../testing/fakes';

import { logActivity } from './logActivity';

const NOW = Date.UTC(2026, 8, 13, 21, 0, 0);
const input = {
  city: saoPaulo,
  activity: 'walk' as const,
  date: '2026-09-13',
  hourLeft: 18,
  hourScore: 72,
};

describe('logActivity', () => {
  it('grava logged', async () => {
    const progress = memoryProgressRepository();
    const run = logActivity({ progress, clock: fixedClock(NOW), ids: sequentialIds('evt') });
    expect(await run(input)).toEqual(ok({ eventId: 'evt-1' }));
    expect(progress.events()).toEqual([
      {
        type: 'logged',
        id: 'evt-1',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 72,
        createdAt: NOW,
      },
    ]);
  });

  it('recusa segundo registro no mesmo dia', async () => {
    const progress = memoryProgressRepository();
    const run = logActivity({ progress, clock: fixedClock(NOW), ids: sequentialIds('evt') });
    await run(input);
    expect(await run(input)).toEqual(err({ code: 'alreadyDoneToday' }));
  });
});
```

`cancelPlan.test.ts`:

```ts
import { err, ok, type GamificationEvent } from '@/domain';

import {
  fixedClock,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
} from '../testing/fakes';

import { cancelPlan } from './cancelPlan';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);
const plan: GamificationEvent = {
  type: 'planned',
  id: 'plan-1',
  cityId: saoPaulo.id,
  activity: 'run',
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour: 17, endHour: 19 },
  windowScore: 84,
  createdAt: NOW - 1000,
};

describe('cancelPlan', () => {
  it('grava planCancelled e cancela a notificação', async () => {
    const progress = memoryProgressRepository([plan]);
    const notifications = recordingScheduler();
    const run = cancelPlan({
      progress,
      notifications,
      clock: fixedClock(NOW),
      ids: sequentialIds('evt'),
    });
    expect(await run('plan-1')).toEqual(ok(undefined));
    expect(progress.events()[1]).toEqual({
      type: 'planCancelled',
      id: 'evt-1',
      planId: 'plan-1',
      createdAt: NOW,
    });
    expect(notifications.cancelled).toEqual(['plan-1']);
  });

  it('plano desconhecido', async () => {
    const run = cancelPlan({
      progress: memoryProgressRepository([]),
      notifications: recordingScheduler(),
      clock: fixedClock(NOW),
      ids: sequentialIds(),
    });
    expect(await run('x')).toEqual(err({ code: 'planNotFound' }));
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- "confirmActivity|logActivity|cancelPlan"`
Expected: FAIL, módulos não encontrados.

- [ ] **Step 8: Implementar os três casos de uso**

`confirmActivity.ts`:

```ts
import { defaultEngineConfig, deriveProgress, err, ok, type Result } from '@/domain';

import type { Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type ConfirmError = { readonly code: 'planNotFound' | 'alreadyDoneToday' };
export type ConfirmInput = {
  readonly planId: string;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const confirmActivity =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (input: ConfirmInput): Promise<Result<{ eventId: string }, ConfirmError>> => {
    const events = await progress.load();
    const current = deriveProgress(events, defaultEngineConfig, input.date);
    if (current.activePlan === null || current.activePlan.planId !== input.planId)
      return err({ code: 'planNotFound' });
    if (current.todayRecord !== null) return err({ code: 'alreadyDoneToday' });
    const eventId = ids.next();
    await progress.append({
      type: 'confirmed',
      id: eventId,
      planId: input.planId,
      date: input.date,
      hourLeft: input.hourLeft,
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    await notifications.cancel(input.planId);
    return ok({ eventId });
  };
```

`logActivity.ts`:

```ts
import {
  defaultEngineConfig,
  deriveProgress,
  err,
  ok,
  type ActivityId,
  type Result,
} from '@/domain';

import type { City, Clock, IdGenerator, ProgressRepository } from '../ports';

export type LogError = { readonly code: 'alreadyDoneToday' };
export type LogInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const logActivity =
  ({ progress, clock, ids }: Deps) =>
  async (input: LogInput): Promise<Result<{ eventId: string }, LogError>> => {
    const events = await progress.load();
    if (deriveProgress(events, defaultEngineConfig, input.date).todayRecord !== null)
      return err({ code: 'alreadyDoneToday' });
    const eventId = ids.next();
    await progress.append({
      type: 'logged',
      id: eventId,
      cityId: input.city.id,
      activity: input.activity,
      date: input.date,
      hourLeft: input.hourLeft,
      hourScore: input.hourScore,
      createdAt: clock.now(),
    });
    return ok({ eventId });
  };
```

`cancelPlan.ts`:

```ts
import { err, ok, type Result } from '@/domain';

import type { Clock, IdGenerator, NotificationScheduler, ProgressRepository } from '../ports';

export type CancelError = { readonly code: 'planNotFound' };
type Deps = {
  readonly progress: ProgressRepository;
  readonly notifications: NotificationScheduler;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const cancelPlan =
  ({ progress, notifications, clock, ids }: Deps) =>
  async (planId: string): Promise<Result<void, CancelError>> => {
    const events = await progress.load();
    const exists = events.some((e) => e.type === 'planned' && e.id === planId);
    if (!exists) return err({ code: 'planNotFound' });
    await progress.append({
      type: 'planCancelled',
      id: ids.next(),
      planId,
      createdAt: clock.now(),
    });
    await notifications.cancel(planId);
    return ok(undefined);
  };
```

- [ ] **Step 9: Rodar e ver passar**

Run: `pnpm --filter mobile test -- "confirmActivity|logActivity|cancelPlan"`
Expected: PASS, 7 testes.

- [ ] **Step 10: Testes de `recordBadWeatherDay` e `getProgress`**

`recordBadWeatherDay.test.ts`:

```ts
import { fixedClock, memoryProgressRepository, sequentialIds } from '../testing/fakes';

import { recordBadWeatherDay } from './recordBadWeatherDay';

describe('recordBadWeatherDay', () => {
  it('grava uma vez por data', async () => {
    const progress = memoryProgressRepository();
    const run = recordBadWeatherDay({
      progress,
      clock: fixedClock(1000),
      ids: sequentialIds('bw'),
    });
    await run({ cityId: 'sp', date: '2026-09-16', bestScore: 22 });
    await run({ cityId: 'sp', date: '2026-09-16', bestScore: 30 });
    expect(progress.events()).toEqual([
      {
        type: 'badWeatherDay',
        id: 'bw-1',
        cityId: 'sp',
        date: '2026-09-16',
        bestScore: 22,
        createdAt: 1000,
      },
    ]);
  });
});
```

`getProgress.test.ts`:

```ts
import { memoryProgressRepository, saoPaulo } from '../testing/fakes';

import { getProgress } from './getProgress';

describe('getProgress', () => {
  it('deriva o progresso a partir do log', async () => {
    const progress = memoryProgressRepository([
      {
        type: 'logged',
        id: 'l',
        cityId: saoPaulo.id,
        activity: 'walk',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 80,
        createdAt: 1,
      },
    ]);
    const p = await getProgress({ progress })('2026-09-13');
    expect(p.totalXp).toBe(50 + 40 + 5);
    expect(p.streak).toBe(1);
  });
});
```

- [ ] **Step 11: Implementar os dois casos de uso**

`recordBadWeatherDay.ts`:

```ts
import type { Clock, IdGenerator, ProgressRepository } from '../ports';

export type BadWeatherInput = {
  readonly cityId: string;
  readonly date: string;
  readonly bestScore: number;
};
type Deps = {
  readonly progress: ProgressRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
};

export const recordBadWeatherDay =
  ({ progress, clock, ids }: Deps) =>
  async (input: BadWeatherInput): Promise<void> => {
    const events = await progress.load();
    const already = events.some((e) => e.type === 'badWeatherDay' && e.date === input.date);
    if (already) return;
    await progress.append({
      type: 'badWeatherDay',
      id: ids.next(),
      cityId: input.cityId,
      date: input.date,
      bestScore: input.bestScore,
      createdAt: clock.now(),
    });
  };
```

`getProgress.ts`:

```ts
import { defaultEngineConfig, deriveProgress, type Progress } from '@/domain';

import type { ProgressRepository } from '../ports';

type Deps = { readonly progress: ProgressRepository };

export const getProgress =
  ({ progress }: Deps) =>
  async (today: string): Promise<Progress> =>
    deriveProgress(await progress.load(), defaultEngineConfig, today);
```

- [ ] **Step 12: `services.ts`**

```ts
import type {
  Clock,
  EngineConfigProvider,
  ForecastProvider,
  GeocodingProvider,
  IdGenerator,
  LocationProvider,
  Logger,
  NotificationScheduler,
  ProgressRepository,
} from './ports';
import { buildOverview } from './useCases/buildOverview';
import { cancelPlan } from './useCases/cancelPlan';
import { confirmActivity } from './useCases/confirmActivity';
import { getProgress } from './useCases/getProgress';
import { logActivity } from './useCases/logActivity';
import { planActivity } from './useCases/planActivity';
import { recordBadWeatherDay } from './useCases/recordBadWeatherDay';
import { resolveMyLocation } from './useCases/resolveMyLocation';
import { searchCities } from './useCases/searchCities';

export type AppPorts = {
  readonly geocoding: GeocodingProvider;
  readonly forecast: ForecastProvider;
  readonly location: LocationProvider;
  readonly progress: ProgressRepository;
  readonly config: EngineConfigProvider;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly notifications: NotificationScheduler;
  readonly logger: Logger;
};

export type AppServices = {
  readonly ports: AppPorts;
  readonly searchCities: ReturnType<typeof searchCities>;
  readonly resolveMyLocation: ReturnType<typeof resolveMyLocation>;
  readonly buildOverview: ReturnType<typeof buildOverview>;
  readonly planActivity: ReturnType<typeof planActivity>;
  readonly confirmActivity: ReturnType<typeof confirmActivity>;
  readonly logActivity: ReturnType<typeof logActivity>;
  readonly cancelPlan: ReturnType<typeof cancelPlan>;
  readonly recordBadWeatherDay: ReturnType<typeof recordBadWeatherDay>;
  readonly getProgress: ReturnType<typeof getProgress>;
};

export function createAppServices(ports: AppPorts): AppServices {
  return {
    ports,
    searchCities: searchCities(ports),
    resolveMyLocation: resolveMyLocation(ports),
    buildOverview: buildOverview(ports),
    planActivity: planActivity(ports),
    confirmActivity: confirmActivity(ports),
    logActivity: logActivity(ports),
    cancelPlan: cancelPlan(ports),
    recordBadWeatherDay: recordBadWeatherDay(ports),
    getProgress: getProgress(ports),
  };
}
```

Adicione em `testing/fakes.ts` uma fábrica de serviços de teste (usada nas tarefas de presentation):

```ts
import { createAppServices, type AppPorts, type AppServices } from '../services';

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
```

- [ ] **Step 13: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- application && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS; cobertura de `src/application` ≥ 90 % (não há threshold específico; a global de 80 % vale).

```bash
git add apps/mobile/src/application
git commit -m "feat(application): casos de uso de gamificação e composição dos serviços"
```

---

### Task 4: HTTP com timeout e cliente de geocoding da Open-Meteo

**Files:**

- Create: `apps/mobile/src/infrastructure/openMeteo/http.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/openMeteo/geocodingSchema.ts`
- Create: `apps/mobile/src/infrastructure/openMeteo/mapCity.ts`
- Create: `apps/mobile/src/infrastructure/openMeteo/geocodingClient.ts` (+ `.test.ts`)
- Delete: `apps/mobile/src/infrastructure/.gitkeep`

**Interfaces:**

- Consumes: `ProviderError`, `GeocodingProvider`, `City` (Task 1); `Result`, `ok`, `err` do domínio.
- Produces:
  - `type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>`
  - `fetchJson(fetchFn: FetchLike, url: string, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<Result<unknown, ProviderError>>`; `DEFAULT_TIMEOUT_MS = 8000`
  - `geocodingResponseSchema` (Zod) e `GeocodingResponse`
  - `mapCity(dto: GeocodingResult): City`
  - `createOpenMeteoGeocoding(deps: { fetchFn: FetchLike; baseUrl?: string }): GeocodingProvider`; `GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com'`; parâmetros fixos `count=8`, `language=pt`, `format=json`.

- [ ] **Step 1: Instalar Zod**

Run: `pnpm --filter mobile add zod`
Expected: `zod` (v4) em `dependencies` de `apps/mobile/package.json`.

- [ ] **Step 2: Teste de `fetchJson`**

`apps/mobile/src/infrastructure/openMeteo/http.test.ts`:

```ts
import { err, ok } from '@/domain';

import { fetchJson, type FetchLike } from './http';

const respond =
  (status: number, body: unknown): FetchLike =>
  async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const hang: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('fetchJson', () => {
  it('devolve o JSON em caso de sucesso', async () => {
    expect(await fetchJson(respond(200, { a: 1 }), 'https://x')).toEqual(ok({ a: 1 }));
  });

  it('status HTTP fora de 2xx vira erro http com o status', async () => {
    expect(await fetchJson(respond(503, {}), 'https://x')).toEqual(
      err({ code: 'http', status: 503, message: 'HTTP 503' }),
    );
  });

  it('exceção do fetch vira erro network', async () => {
    const failing: FetchLike = async () => {
      throw new Error('offline');
    };
    expect(await fetchJson(failing, 'https://x')).toEqual(
      err({ code: 'network', message: 'offline' }),
    );
  });

  it('JSON inválido vira erro schema', async () => {
    const badJson: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad');
      },
    });
    expect(await fetchJson(badJson, 'https://x')).toEqual(err({ code: 'schema', message: 'bad' }));
  });

  it('estoura o timeout e devolve erro timeout', async () => {
    expect(await fetchJson(hang, 'https://x', { timeoutMs: 5 })).toEqual(
      err({ code: 'timeout', message: 'Tempo esgotado após 5 ms' }),
    );
  });

  it('cancelamento externo vira erro network', async () => {
    const controller = new AbortController();
    const pending = fetchJson(hang, 'https://x', { signal: controller.signal, timeoutMs: 1000 });
    controller.abort();
    expect(await pending).toEqual(err({ code: 'network', message: 'aborted' }));
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- openMeteo/http`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `http.ts`**

```ts
import { err, ok, type Result } from '@/domain';
import type { ProviderError } from '@/application/ports';

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const DEFAULT_TIMEOUT_MS = 8000;

type Options = { readonly signal?: AbortSignal; readonly timeoutMs?: number };

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function fetchJson(
  fetchFn: FetchLike,
  url: string,
  opts: Options = {},
): Promise<Result<unknown, ProviderError>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);
  opts.signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok)
      return err({ code: 'http', status: response.status, message: `HTTP ${response.status}` });
    try {
      return ok(await response.json());
    } catch (e) {
      return err({ code: 'schema', message: messageOf(e) });
    }
  } catch (e) {
    return state.timedOut
      ? err({ code: 'timeout', message: `Tempo esgotado após ${timeoutMs} ms` })
      : err({ code: 'network', message: messageOf(e) });
  } finally {
    clearTimeout(timer);
  }
}
```

Nota sobre a regra de imutabilidade: `state.timedOut = true` é o único jeito de saber, dentro do `catch`, se o abort veio do timer; é estado local de uma chamada, não compartilhado. Aceito.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter mobile test -- openMeteo/http`
Expected: PASS, 6 testes.

- [ ] **Step 6: Schema e mapper do geocoding**

`geocodingSchema.ts`:

```ts
import { z } from 'zod';

export const geocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
});

export const geocodingResponseSchema = z.object({
  results: z.array(geocodingResultSchema).optional(),
});

export type GeocodingResult = z.infer<typeof geocodingResultSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;
```

`mapCity.ts`:

```ts
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
```

- [ ] **Step 7: Teste do cliente de geocoding**

`geocodingClient.test.ts`:

```ts
import { err, ok } from '@/domain';

import { createOpenMeteoGeocoding } from './geocodingClient';
import type { FetchLike } from './http';

const sample = {
  results: [
    {
      id: 3448439,
      name: 'São Paulo',
      latitude: -23.5475,
      longitude: -46.63611,
      timezone: 'America/Sao_Paulo',
      country: 'Brasil',
      country_code: 'BR',
      admin1: 'São Paulo',
    },
    { id: 1, name: 'Sem país', latitude: 0, longitude: 0, timezone: 'UTC' },
  ],
};

const fetchWith = (body: unknown, status = 200): FetchLike & { urls: string[] } => {
  const urls: string[] = [];
  const fn: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status < 300, status, json: async () => body };
  };
  return Object.assign(fn, { urls });
};

describe('createOpenMeteoGeocoding', () => {
  it('monta a URL com count=8, language=pt e a consulta codificada', async () => {
    const fetchFn = fetchWith(sample);
    await createOpenMeteoGeocoding({ fetchFn }).search('São Paulo');
    expect(fetchFn.urls[0]).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=8&language=pt&format=json',
    );
  });

  it('mapeia resultados para City, com campos opcionais vazios', async () => {
    const result = await createOpenMeteoGeocoding({ fetchFn: fetchWith(sample) }).search('x');
    expect(result).toEqual(
      ok([
        {
          id: '3448439',
          name: 'São Paulo',
          admin1: 'São Paulo',
          country: 'Brasil',
          countryCode: 'BR',
          latitude: -23.5475,
          longitude: -46.63611,
          timezone: 'America/Sao_Paulo',
        },
        {
          id: '1',
          name: 'Sem país',
          admin1: null,
          country: '',
          countryCode: '',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
        },
      ]),
    );
  });

  it('sem results devolve lista vazia', async () => {
    expect(
      await createOpenMeteoGeocoding({ fetchFn: fetchWith({ generationtime_ms: 1 }) }).search(
        'zzz',
      ),
    ).toEqual(ok([]));
  });

  it('resposta fora do schema vira erro schema', async () => {
    const result = await createOpenMeteoGeocoding({
      fetchFn: fetchWith({ results: [{ id: 'x' }] }),
    }).search('x');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('schema');
  });

  it('repassa erro HTTP', async () => {
    expect(await createOpenMeteoGeocoding({ fetchFn: fetchWith({}, 500) }).search('x')).toEqual(
      err({ code: 'http', status: 500, message: 'HTTP 500' }),
    );
  });

  it('aceita baseUrl customizada', async () => {
    const fetchFn = fetchWith(sample);
    await createOpenMeteoGeocoding({ fetchFn, baseUrl: 'https://bff.local' }).search('a');
    expect(fetchFn.urls[0]?.startsWith('https://bff.local/v1/search?')).toBe(true);
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- geocodingClient`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 9: Implementar `geocodingClient.ts`**

```ts
import { err, ok, type Result } from '@/domain';
import type { City, GeocodingProvider, ProviderError } from '@/application/ports';

import { geocodingResponseSchema } from './geocodingSchema';
import { fetchJson, type FetchLike } from './http';
import { mapCity } from './mapCity';

export const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com';
const RESULT_COUNT = 8;
const LANGUAGE = 'pt';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function createOpenMeteoGeocoding({
  fetchFn,
  baseUrl = GEOCODING_BASE_URL,
}: Deps): GeocodingProvider {
  return {
    async search(query, signal): Promise<Result<readonly City[], ProviderError>> {
      const url = `${baseUrl}/v1/search?name=${encodeURIComponent(query)}&count=${RESULT_COUNT}&language=${LANGUAGE}&format=json`;
      const raw = await fetchJson(fetchFn, url, signal ? { signal } : {});
      if (!raw.ok) return raw;
      const parsed = geocodingResponseSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok((parsed.data.results ?? []).map(mapCity));
    },
  };
}
```

Nota `exactOptionalPropertyTypes`: `signal ? { signal } : {}` evita passar `signal: undefined`.

- [ ] **Step 10: Rodar, lint, commit**

Run: `rm -f apps/mobile/src/infrastructure/.gitkeep && pnpm --filter mobile test -- openMeteo && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS, 12 testes. Se `import/order` reclamar da ordem entre `@/domain` e `@/application/...`, siga a ordem alfabética que o linter pedir.

```bash
git add -A apps/mobile/src/infrastructure apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(infra): fetchJson com timeout e cliente de geocoding da Open-Meteo"
```

---

### Task 5: Cliente de previsão da Open-Meteo com schema e mapper

**Files:**

- Create: `apps/mobile/src/infrastructure/openMeteo/forecastSchema.ts`
- Create: `apps/mobile/src/infrastructure/openMeteo/mapForecast.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/openMeteo/forecastClient.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/openMeteo/testing/forecastDto.ts` (fixture)

**Interfaces:**

- Consumes: `fetchJson`, `FetchLike` (Task 4); `Forecast`, `HourlyConditions`, `DailySummary`, `parseLocalIso` do domínio; `ForecastProvider`, `Coordinates` (Task 1).
- Produces:
  - `forecastResponseSchema`, `ForecastResponse` — valida arrays paralelos com o mesmo comprimento de `hourly.time` e `daily.time`.
  - `mapForecast(dto: ForecastResponse): Forecast`
  - `createOpenMeteoForecast(deps: { fetchFn: FetchLike; baseUrl?: string }): ForecastProvider`; `FORECAST_BASE_URL = 'https://api.open-meteo.com'`; `FORECAST_DAYS = 5`; `HOURLY_VARS`, `DAILY_VARS` (listas fixas da seção 4.1).
  - fixture `makeForecastDto(dates: string[])`.

- [ ] **Step 1: `forecastSchema.ts`**

```ts
import { z } from 'zod';

const numbers = z.array(z.number());
const nullableNumbers = z.array(z.number().nullable());
const strings = z.array(z.string());

const hourlySchema = z
  .object({
    time: strings,
    temperature_2m: numbers,
    apparent_temperature: numbers,
    precipitation_probability: nullableNumbers,
    precipitation: nullableNumbers,
    wind_speed_10m: nullableNumbers,
    wind_gusts_10m: nullableNumbers,
    uv_index: nullableNumbers,
    cloud_cover: nullableNumbers,
    weather_code: nullableNumbers,
    is_day: nullableNumbers,
    relative_humidity_2m: nullableNumbers,
  })
  .refine((h) => Object.values(h).every((arr) => arr.length === h.time.length), {
    message: 'arrays horários com comprimentos diferentes',
  });

const dailySchema = z
  .object({
    time: strings,
    sunrise: strings,
    sunset: strings,
    weather_code: nullableNumbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
  })
  .refine((d) => Object.values(d).every((arr) => arr.length === d.time.length), {
    message: 'arrays diários com comprimentos diferentes',
  });

export const forecastResponseSchema = z.object({
  timezone: z.string(),
  utc_offset_seconds: z.number(),
  hourly: hourlySchema,
  daily: dailySchema,
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
```

- [ ] **Step 2: Fixture `testing/forecastDto.ts`**

```ts
import type { ForecastResponse } from '../forecastSchema';

const pad = (n: number): string => String(n).padStart(2, '0');

/** DTO no formato da Open-Meteo para os dias dados, 24 horas por dia, valores amenos. */
export function makeForecastDto(dates: readonly string[]): ForecastResponse {
  const time = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${pad(h)}:00`));
  const perHour = <T>(f: (h: number) => T): T[] =>
    dates.flatMap(() => Array.from({ length: 24 }, (_, h) => f(h)));
  return {
    timezone: 'America/Sao_Paulo',
    utc_offset_seconds: -10800,
    hourly: {
      time,
      temperature_2m: perHour(() => 22),
      apparent_temperature: perHour(() => 22),
      precipitation_probability: perHour(() => 5),
      precipitation: perHour(() => 0),
      wind_speed_10m: perHour(() => 10),
      wind_gusts_10m: perHour(() => 15),
      uv_index: perHour((h) => (h >= 6 && h < 18 ? 3 : 0)),
      cloud_cover: perHour(() => 20),
      weather_code: perHour(() => 1),
      is_day: perHour((h) => (h >= 6 && h < 18 ? 1 : 0)),
      relative_humidity_2m: perHour(() => 55),
    },
    daily: {
      time: [...dates],
      sunrise: dates.map((d) => `${d}T06:12`),
      sunset: dates.map((d) => `${d}T18:04`),
      weather_code: dates.map(() => 1),
      temperature_2m_max: dates.map(() => 26),
      temperature_2m_min: dates.map(() => 16),
    },
  };
}
```

- [ ] **Step 3: Teste de `mapForecast`**

`mapForecast.test.ts`:

```ts
import { forecastResponseSchema } from './forecastSchema';
import { mapForecast } from './mapForecast';
import { makeForecastDto } from './testing/forecastDto';

describe('mapForecast', () => {
  const dto = makeForecastDto(['2026-09-13', '2026-09-14']);

  it('converte arrays paralelos em objetos por hora', () => {
    const f = mapForecast(dto);
    expect(f.timezone).toBe('America/Sao_Paulo');
    expect(f.utcOffsetSeconds).toBe(-10800);
    expect(f.hourly).toHaveLength(48);
    expect(f.hourly[17]).toEqual({
      time: '2026-09-13T17:00',
      date: '2026-09-13',
      hour: 17,
      temperature: 22,
      apparentTemperature: 22,
      precipitationProbability: 5,
      precipitationMm: 0,
      windSpeedKmh: 10,
      windGustsKmh: 15,
      uvIndex: 3,
      cloudCoverPct: 20,
      weatherCode: 1,
      isDay: true,
      humidityPct: 55,
    });
    expect(f.hourly[20]?.isDay).toBe(false);
  });

  it('converte o diário', () => {
    expect(mapForecast(dto).daily[1]).toEqual({
      date: '2026-09-14',
      sunrise: '2026-09-14T06:12',
      sunset: '2026-09-14T18:04',
      weatherCode: 1,
      tempMax: 26,
      tempMin: 16,
    });
  });

  it('nulos viram 0 (e is_day nulo vira noite)', () => {
    const withNulls = {
      ...dto,
      hourly: {
        ...dto.hourly,
        precipitation_probability: dto.hourly.precipitation_probability.map(() => null),
        is_day: dto.hourly.is_day.map(() => null),
      },
    };
    const f = mapForecast(withNulls);
    expect(f.hourly[10]?.precipitationProbability).toBe(0);
    expect(f.hourly[10]?.isDay).toBe(false);
  });

  it('schema rejeita arrays de comprimentos diferentes', () => {
    const broken = { ...dto, hourly: { ...dto.hourly, uv_index: [1, 2, 3] } };
    expect(forecastResponseSchema.safeParse(broken).success).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- mapForecast`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 5: Implementar `mapForecast.ts`**

```ts
import { parseLocalIso, type DailySummary, type Forecast, type HourlyConditions } from '@/domain';

import type { ForecastResponse } from './forecastSchema';

// Os comprimentos são validados pelo schema (refine): `arr[i]` existe para todo i < time.length.
const at = <T>(arr: readonly T[], i: number): T => arr[i] as T;
const num = (v: number | null): number => v ?? 0;

const mapHour = (h: ForecastResponse['hourly'], i: number): HourlyConditions => {
  const time = at(h.time, i);
  const { date, hour } = parseLocalIso(time);
  return {
    time,
    date,
    hour,
    temperature: at(h.temperature_2m, i),
    apparentTemperature: at(h.apparent_temperature, i),
    precipitationProbability: num(at(h.precipitation_probability, i)),
    precipitationMm: num(at(h.precipitation, i)),
    windSpeedKmh: num(at(h.wind_speed_10m, i)),
    windGustsKmh: num(at(h.wind_gusts_10m, i)),
    uvIndex: num(at(h.uv_index, i)),
    cloudCoverPct: num(at(h.cloud_cover, i)),
    weatherCode: num(at(h.weather_code, i)),
    isDay: num(at(h.is_day, i)) === 1,
    humidityPct: num(at(h.relative_humidity_2m, i)),
  };
};

const mapDay = (d: ForecastResponse['daily'], i: number): DailySummary => ({
  date: at(d.time, i),
  sunrise: at(d.sunrise, i),
  sunset: at(d.sunset, i),
  weatherCode: num(at(d.weather_code, i)),
  tempMax: at(d.temperature_2m_max, i),
  tempMin: at(d.temperature_2m_min, i),
});

export const mapForecast = (dto: ForecastResponse): Forecast => ({
  timezone: dto.timezone,
  utcOffsetSeconds: dto.utc_offset_seconds,
  hourly: dto.hourly.time.map((_, i) => mapHour(dto.hourly, i)),
  daily: dto.daily.time.map((_, i) => mapDay(dto.daily, i)),
});
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter mobile test -- mapForecast`
Expected: PASS, 4 testes.

- [ ] **Step 7: Teste do cliente de previsão**

`forecastClient.test.ts`:

```ts
import { err } from '@/domain';

import { createOpenMeteoForecast } from './forecastClient';
import type { FetchLike } from './http';
import { makeForecastDto } from './testing/forecastDto';

const fetchWith = (body: unknown, status = 200): FetchLike & { urls: string[] } => {
  const urls: string[] = [];
  const fn: FetchLike = async (url) => {
    urls.push(url);
    return { ok: status < 300, status, json: async () => body };
  };
  return Object.assign(fn, { urls });
};

describe('createOpenMeteoForecast', () => {
  const coords = { latitude: -23.5475, longitude: -46.6361 };

  it('monta a URL com todas as variáveis, timezone=auto e forecast_days=5', async () => {
    const fetchFn = fetchWith(makeForecastDto(['2026-09-13']));
    await createOpenMeteoForecast({ fetchFn }).fetch(coords);
    const url = new URL(fetchFn.urls[0] ?? '');
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('-23.5475');
    expect(url.searchParams.get('longitude')).toBe('-46.6361');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    expect(url.searchParams.get('hourly')).toBe(
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover,weather_code,is_day,relative_humidity_2m',
    );
    expect(url.searchParams.get('daily')).toBe(
      'sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min',
    );
  });

  it('devolve o Forecast mapeado', async () => {
    const result = await createOpenMeteoForecast({
      fetchFn: fetchWith(makeForecastDto(['2026-09-13', '2026-09-14'])),
    }).fetch(coords);
    expect(result.ok && result.value.hourly.length).toBe(48);
    expect(result.ok && result.value.daily.map((d) => d.date)).toEqual([
      '2026-09-13',
      '2026-09-14',
    ]);
  });

  it('resposta fora do schema vira erro schema', async () => {
    const result = await createOpenMeteoForecast({ fetchFn: fetchWith({ timezone: 'x' }) }).fetch(
      coords,
    );
    expect(!result.ok && result.error.code).toBe('schema');
  });

  it('repassa erro HTTP', async () => {
    expect(await createOpenMeteoForecast({ fetchFn: fetchWith({}, 429) }).fetch(coords)).toEqual(
      err({ code: 'http', status: 429, message: 'HTTP 429' }),
    );
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- forecastClient`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 9: Implementar `forecastClient.ts`**

```ts
import { err, ok, type Forecast, type Result } from '@/domain';
import type { Coordinates, ForecastProvider, ProviderError } from '@/application/ports';

import { forecastResponseSchema } from './forecastSchema';
import { fetchJson, type FetchLike } from './http';
import { mapForecast } from './mapForecast';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com';
export const FORECAST_DAYS = 5;
export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'cloud_cover',
  'weather_code',
  'is_day',
  'relative_humidity_2m',
] as const;
export const DAILY_VARS = [
  'sunrise',
  'sunset',
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
] as const;

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function buildForecastUrl(baseUrl: string, coords: Coordinates): string {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `${baseUrl}/v1/forecast?${params.toString()}`;
}

export function createOpenMeteoForecast({
  fetchFn,
  baseUrl = FORECAST_BASE_URL,
}: Deps): ForecastProvider {
  return {
    async fetch(coords, signal): Promise<Result<Forecast, ProviderError>> {
      const raw = await fetchJson(
        fetchFn,
        buildForecastUrl(baseUrl, coords),
        signal ? { signal } : {},
      );
      if (!raw.ok) return raw;
      const parsed = forecastResponseSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(mapForecast(parsed.data));
    },
  };
}
```

Nota: `URLSearchParams` codifica vírgulas como `%2C`; `url.searchParams.get()` no teste decodifica de volta, então a asserção com vírgulas passa. A Open-Meteo aceita ambos.

- [ ] **Step 10: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- openMeteo && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS.

```bash
git add apps/mobile/src/infrastructure
git commit -m "feat(infra): cliente de previsão da Open-Meteo com schema Zod e mapper"
```

---

### Task 6: Storage, config embutida, adapters nativos, env e composition root

**Files:**

- Create: `apps/mobile/src/infrastructure/storage/memoryKeyValue.ts`
- Create: `apps/mobile/src/infrastructure/storage/asyncStorageKeyValue.ts` (nativo)
- Create: `apps/mobile/src/infrastructure/storage/eventSchema.ts`
- Create: `apps/mobile/src/infrastructure/storage/progressRepository.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/config/embeddedEngineConfigProvider.ts`
- Create: `apps/mobile/src/infrastructure/location/expoLocationProvider.ts` (nativo)
- Create: `apps/mobile/src/infrastructure/notifications/expoNotificationScheduler.ts` (nativo)
- Create: `apps/mobile/src/infrastructure/system/systemClock.ts`, `randomIdGenerator.ts` (nativo), `consoleLogger.ts`
- Create: `apps/mobile/src/infrastructure/env.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/container.ts`
- Modify: `apps/mobile/package.json` (deps; `collectCoverageFrom`)

**Interfaces:**

- Produces:
  - `memoryKeyValue(initial?): KeyValueStorage`; `asyncStorageKeyValue(): KeyValueStorage`
  - `gamificationEventSchema` (Zod discriminated union) e `storedProgressSchema` (`{ schemaVersion: 1, events }`)
  - `createProgressRepository(deps: { storage: KeyValueStorage; clock: Clock; logger: Logger }): ProgressRepository`; `PROGRESS_KEY = 'progress:v1'`; `RETENTION_DAYS = 365`
  - `embeddedEngineConfigProvider(): EngineConfigProvider`
  - `expoLocationProvider(): LocationProvider`
  - `expoNotificationScheduler(logger: Logger): NotificationScheduler`; `configureNotificationHandler(): void`
  - `systemClock(): Clock`; `randomIdGenerator(): IdGenerator`; `consoleLogger(): Logger`
  - `type AppEnv = { apiMode: 'direct' | 'bff'; bffUrl: string | null; assetsUrl: string | null }`; `parseEnv(raw: RawEnv): AppEnv`; `readEnv(): AppEnv`
  - `createServices(env: AppEnv, overrides?: Partial<AppPorts>): AppServices`

- [ ] **Step 1: Instalar dependências nativas**

Run:

```bash
pnpm --filter mobile exec expo install @react-native-async-storage/async-storage expo-location expo-notifications expo-crypto
```

Expected: os quatro pacotes em `dependencies` com versões do SDK 57.

- [ ] **Step 2: Ajustar `collectCoverageFrom` em `apps/mobile/package.json`**

Adicione às exclusões existentes:

```json
"!src/infrastructure/storage/asyncStorageKeyValue.ts",
"!src/infrastructure/location/**",
"!src/infrastructure/notifications/**",
"!src/infrastructure/system/**",
"!src/infrastructure/container.ts"
```

Justificativa (comentário não é possível em JSON; registre no relatório): adapters finos sobre módulos nativos e o composition root são verificados no smoke do dispositivo, não em Jest.

- [ ] **Step 3: `memoryKeyValue.ts` e `asyncStorageKeyValue.ts`**

`memoryKeyValue.ts`:

```ts
import type { KeyValueStorage } from '@/application/ports';

export function memoryKeyValue(initial: Readonly<Record<string, string>> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}
```

(O `Map` interno é o estado do adapter; é a única mutação e fica encapsulada.)

`asyncStorageKeyValue.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/application/ports';

export const asyncStorageKeyValue = (): KeyValueStorage => ({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});
```

- [ ] **Step 4: `eventSchema.ts`**

```ts
import { z } from 'zod';

import { ACTIVITY_IDS } from '@/domain';

const base = { id: z.string().min(1), createdAt: z.number() };
const activity = z.enum(ACTIVITY_IDS);
const window = z.object({
  date: z.string(),
  startHour: z.number().int(),
  endHour: z.number().int(),
});

export const gamificationEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('planned'),
    cityId: z.string(),
    activity,
    date: z.string(),
    window,
    windowScore: z.number(),
  }),
  z.object({
    ...base,
    type: z.literal('confirmed'),
    planId: z.string(),
    date: z.string(),
    hourLeft: z.number().int(),
    hourScore: z.number(),
  }),
  z.object({
    ...base,
    type: z.literal('logged'),
    cityId: z.string(),
    activity,
    date: z.string(),
    hourLeft: z.number().int(),
    hourScore: z.number(),
  }),
  z.object({ ...base, type: z.literal('planCancelled'), planId: z.string() }),
  z.object({
    ...base,
    type: z.literal('badWeatherDay'),
    cityId: z.string(),
    date: z.string(),
    bestScore: z.number(),
  }),
]);

export const storedProgressSchema = z.object({
  schemaVersion: z.literal(1),
  events: z.array(gamificationEventSchema),
});

export type StoredProgress = z.infer<typeof storedProgressSchema>;
```

- [ ] **Step 5: Teste do `progressRepository`**

`progressRepository.test.ts`:

```ts
import type { GamificationEvent } from '@/domain';
import { silentLogger } from '@/application/testing/fakes';

import { memoryKeyValue } from './memoryKeyValue';
import { PROGRESS_KEY, createProgressRepository } from './progressRepository';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);
const DAY = 86_400_000;
const logged = (id: string, createdAt: number): GamificationEvent => ({
  type: 'logged',
  id,
  cityId: 'sp',
  activity: 'walk',
  date: '2026-09-13',
  hourLeft: 8,
  hourScore: 70,
  createdAt,
});
const make = (initial?: Record<string, string>) => {
  const storage = memoryKeyValue(initial);
  const warnings: string[] = [];
  const logger = {
    ...silentLogger(),
    warn: (m: string) => {
      warnings.push(m);
    },
  };
  return {
    storage,
    warnings,
    repo: createProgressRepository({ storage, clock: { now: () => NOW }, logger }),
  };
};

describe('createProgressRepository', () => {
  it('vazio quando não há nada salvo', async () => {
    expect(await make().repo.load()).toEqual([]);
  });

  it('append persiste e load lê de volta', async () => {
    const { repo, storage } = make();
    await repo.append(logged('a', NOW));
    await repo.append(logged('b', NOW + 1));
    expect(await repo.load()).toEqual([logged('a', NOW), logged('b', NOW + 1)]);
    expect(JSON.parse((await storage.getItem(PROGRESS_KEY)) ?? '')).toMatchObject({
      schemaVersion: 1,
    });
  });

  it('JSON corrompido é tratado como vazio, com aviso', async () => {
    const { repo, warnings } = make({ [PROGRESS_KEY]: '{not json' });
    expect(await repo.load()).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('schema inválido ou versão desconhecida é tratado como vazio, com aviso', async () => {
    const { repo, warnings } = make({
      [PROGRESS_KEY]: JSON.stringify({ schemaVersion: 2, events: [] }),
    });
    expect(await repo.load()).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('poda eventos com mais de 365 dias ao gravar', async () => {
    const { repo } = make();
    await repo.append(logged('old', NOW - 366 * DAY));
    await repo.append(logged('edge', NOW - 365 * DAY));
    await repo.append(logged('new', NOW));
    expect((await repo.load()).map((e) => e.id)).toEqual(['edge', 'new']);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- progressRepository`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar `progressRepository.ts`**

```ts
import type { GamificationEvent } from '@/domain';
import type { Clock, KeyValueStorage, Logger, ProgressRepository } from '@/application/ports';

import { storedProgressSchema, type StoredProgress } from './eventSchema';

export const PROGRESS_KEY = 'progress:v1';
export const RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

type Deps = { readonly storage: KeyValueStorage; readonly clock: Clock; readonly logger: Logger };

function parseStored(raw: string | null, logger: Logger): readonly GamificationEvent[] {
  if (raw === null) return [];
  try {
    const parsed = storedProgressSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data.events;
    logger.warn('Progresso salvo com formato inesperado; começando do zero', {
      issues: parsed.error.issues.length,
    });
    return [];
  } catch (e) {
    logger.warn('Progresso salvo ilegível; começando do zero', {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

export function createProgressRepository({ storage, clock, logger }: Deps): ProgressRepository {
  const load = async (): Promise<readonly GamificationEvent[]> =>
    parseStored(await storage.getItem(PROGRESS_KEY), logger);
  return {
    load,
    async append(event) {
      const cutoff = clock.now() - RETENTION_DAYS * DAY_MS;
      const kept = (await load()).filter((e) => e.createdAt >= cutoff);
      const next: StoredProgress = { schemaVersion: 1, events: [...kept, event] };
      await storage.setItem(PROGRESS_KEY, JSON.stringify(next));
    },
  };
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter mobile test -- progressRepository`
Expected: PASS, 5 testes. Se o teste de import `@/application/testing/fakes` for barrado pelo boundaries (infra → application é permitido; `testing/` é subpasta de application), está ok; se acusar, use o override para `**/*.test.ts` descrito na Task 2.

- [ ] **Step 9: Config embutida, relógio, ids, logger**

`config/embeddedEngineConfigProvider.ts`:

```ts
import { defaultEngineConfig } from '@/domain';
import type { EngineConfigProvider } from '@/application/ports';

export const embeddedEngineConfigProvider = (): EngineConfigProvider => ({
  get: async () => defaultEngineConfig,
});
```

`system/systemClock.ts`:

```ts
import type { Clock } from '@/application/ports';

export const systemClock = (): Clock => ({ now: () => Date.now() });
```

`system/randomIdGenerator.ts`:

```ts
import * as Crypto from 'expo-crypto';

import type { IdGenerator } from '@/application/ports';

export const randomIdGenerator = (): IdGenerator => ({ next: () => Crypto.randomUUID() });
```

`system/consoleLogger.ts`:

```ts
import type { LogMeta, Logger } from '@/application/ports';

// Único ponto do app que fala com o console: os demais módulos recebem um Logger injetado.
const emit = (level: 'log' | 'warn' | 'error', message: string, meta?: LogMeta): void => {
  // eslint-disable-next-line no-console -- adapter de logger, ver comentário acima
  console[level](meta ? `${message} ${JSON.stringify(meta)}` : message);
};

export const consoleLogger = (): Logger => ({
  info: (m, meta) => emit('log', m, meta),
  warn: (m, meta) => emit('warn', m, meta),
  error: (m, meta) => emit('error', m, meta),
});
```

- [ ] **Step 10: Adapters nativos**

`location/expoLocationProvider.ts`:

```ts
import * as Location from 'expo-location';

import { err, ok } from '@/domain';
import type { City, Coordinates, LocationProvider } from '@/application/ports';

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
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return err({ code: 'denied' });
    try {
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
```

`notifications/expoNotificationScheduler.ts`:

```ts
import * as Notifications from 'expo-notifications';

import type { Logger, NotificationScheduler } from '@/application/ports';

/** Chamar uma vez na raiz do app: mostra a notificação mesmo com o app em primeiro plano. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const expoNotificationScheduler = (logger: Logger): NotificationScheduler => ({
  async schedule({ id, title, body, atEpochMs }) {
    if (atEpochMs <= Date.now()) {
      logger.info('Lembrete no passado; não agendado', { id });
      return;
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      logger.warn('Permissão de notificação negada; lembrete não agendado', { id });
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(atEpochMs) },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  },
});
```

Se o `typecheck` acusar que `handleNotification` exige outros campos (`shouldShowAlert` em versões antigas), use exatamente os campos que o tipo `NotificationBehavior` do SDK 57 pede; não use `as`.

- [ ] **Step 11: Teste e implementação de `env.ts`**

`env.test.ts`:

```ts
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('padrão é direct sem URLs', () => {
    expect(parseEnv({})).toEqual({ apiMode: 'direct', bffUrl: null, assetsUrl: null });
  });
  it('lê bff com URLs', () => {
    expect(
      parseEnv({
        apiMode: 'bff',
        bffUrl: 'https://api.example.com',
        assetsUrl: 'https://cdn.example.com',
      }),
    ).toEqual({
      apiMode: 'bff',
      bffUrl: 'https://api.example.com',
      assetsUrl: 'https://cdn.example.com',
    });
  });
  it('modo desconhecido ou URL inválida caem no padrão com aviso no retorno', () => {
    expect(parseEnv({ apiMode: 'weird', bffUrl: 'not a url' })).toEqual({
      apiMode: 'direct',
      bffUrl: null,
      assetsUrl: null,
    });
  });
});
```

`env.ts`:

```ts
import { z } from 'zod';

export type RawEnv = {
  readonly apiMode?: string;
  readonly bffUrl?: string;
  readonly assetsUrl?: string;
};
export type AppEnv = {
  readonly apiMode: 'direct' | 'bff';
  readonly bffUrl: string | null;
  readonly assetsUrl: string | null;
};

const schema = z.object({
  apiMode: z.enum(['direct', 'bff']).catch('direct'),
  bffUrl: z.url().nullable().catch(null),
  assetsUrl: z.url().nullable().catch(null),
});

export function parseEnv(raw: RawEnv): AppEnv {
  return schema.parse({
    apiMode: raw.apiMode,
    bffUrl: raw.bffUrl ?? null,
    assetsUrl: raw.assetsUrl ?? null,
  });
}

/** As variáveis EXPO_PUBLIC_* só são inlinadas quando acessadas literalmente. */
export const readEnv = (): AppEnv =>
  parseEnv({
    apiMode: process.env.EXPO_PUBLIC_API_MODE,
    bffUrl: process.env.EXPO_PUBLIC_BFF_URL,
    assetsUrl: process.env.EXPO_PUBLIC_ASSETS_URL,
  });
```

Se `z.url()` não existir na versão instalada do Zod, use `z.string().url()`.

- [ ] **Step 12: `container.ts`**

```ts
import { createAppServices, type AppPorts, type AppServices } from '@/application/services';

import { embeddedEngineConfigProvider } from './config/embeddedEngineConfigProvider';
import type { AppEnv } from './env';
import { expoLocationProvider } from './location/expoLocationProvider';
import { expoNotificationScheduler } from './notifications/expoNotificationScheduler';
import { createOpenMeteoForecast } from './openMeteo/forecastClient';
import { createOpenMeteoGeocoding } from './openMeteo/geocodingClient';
import type { FetchLike } from './openMeteo/http';
import { asyncStorageKeyValue } from './storage/asyncStorageKeyValue';
import { createProgressRepository } from './storage/progressRepository';
import { consoleLogger } from './system/consoleLogger';
import { randomIdGenerator } from './system/randomIdGenerator';
import { systemClock } from './system/systemClock';

const globalFetch: FetchLike = (url, init) => fetch(url, init);

export function createServices(env: AppEnv, overrides: Partial<AppPorts> = {}): AppServices {
  const logger = consoleLogger();
  const clock = systemClock();
  if (env.apiMode === 'bff')
    logger.warn('Modo bff ainda não disponível neste build; usando direct');
  return createAppServices({
    geocoding: createOpenMeteoGeocoding({ fetchFn: globalFetch }),
    forecast: createOpenMeteoForecast({ fetchFn: globalFetch }),
    location: expoLocationProvider(),
    progress: createProgressRepository({ storage: asyncStorageKeyValue(), clock, logger }),
    config: embeddedEngineConfigProvider(),
    clock,
    ids: randomIdGenerator(),
    notifications: expoNotificationScheduler(logger),
    logger,
    ...overrides,
  });
}
```

- [ ] **Step 13: Rodar, lint, commit**

Run: `pnpm --filter mobile test && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS; cobertura global ≥ 80 % (os adapters nativos estão excluídos); `src/domain` 100 %.

```bash
git add -A apps/mobile pnpm-lock.yaml
git commit -m "feat(infra): storage persistido, config embutida, adapters nativos, env e composition root"
```

---

### Task 7: Plumbing da apresentação: Expo Router, providers, queries, preferências e i18n

**Files:**

- Modify: `apps/mobile/package.json` (`main`, deps, `jest.setupFiles`), `apps/mobile/app.json`, `apps/mobile/eslint.config.js`
- Create: `apps/mobile/jest.setup.js`
- Delete: `apps/mobile/App.tsx`, `apps/mobile/index.ts`, `apps/mobile/src/presentation/.gitkeep`
- Create: `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/app/(tabs)/_layout.tsx`, `index.tsx`, `cities.tsx`, `profile.tsx`
- Create: `apps/mobile/src/presentation/i18n/pt-BR.ts`
- Create: `apps/mobile/src/presentation/services/ServicesProvider.tsx`
- Create: `apps/mobile/src/presentation/AppProviders.tsx`
- Create: `apps/mobile/src/presentation/queries/queryClient.ts`, `keys.ts`, `useCitySearch.ts`, `useForecast.ts`, `useEngineConfig.ts`, `useOverview.ts`, `useProgress.ts`, `useGamificationActions.ts`
- Create: `apps/mobile/src/presentation/hooks/useDebouncedValue.ts` (+ `.test.ts`), `useNowTick.ts`, `useAppFocusRefetch.ts`
- Create: `apps/mobile/src/presentation/state/preferences.ts` (+ `.test.ts`), `preferencesStore.ts`
- Create: `apps/mobile/src/presentation/testing/renderWithProviders.tsx`
- Create: telas placeholder `apps/mobile/src/presentation/features/home/HomeScreen.tsx`, `cities/CitiesScreen.tsx`, `profile/ProfileScreen.tsx` (texto mínimo; a Task 8 as implementa)

**Interfaces:**

- Produces:
  - `t` (objeto de textos PT-BR) com `t.tabs`, `t.labels` (`great/good/fair/poor`), `t.tips` (por `TipId`), `t.reasons` (por `FactorId | VetoId`), `t.home`, `t.cities`, `t.profile`, `t.errors` (por `ProviderErrorCode | LocationError['code'] | 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound'`), `t.badges` (por `BadgeId`), `t.activities` (por `ActivityId` → nome vem da config; aqui só rótulos auxiliares).
  - `ServicesProvider({ services, children })`, `useServices(): AppServices`
  - `AppProviders({ services, children })` — QueryClientProvider + ServicesProvider + refetch no foco
  - `createQueryClient(): QueryClient`
  - `queryKeys = { cities(q), forecast(cityId), engineConfig(), progress(today) }`
  - `useCitySearch(query: string)` → `{ results: readonly City[]; isSearching: boolean; error: ProviderError | null; isActive: boolean }`
  - `useForecast(city: City | null)` → resultado de `useQuery<Forecast, ProviderError>`
  - `useEngineConfig()` → `useQuery<EngineConfig>` com `staleTime: Infinity`
  - `useOverview(city: City | null, activity: ActivityId)` → `{ status: 'idle' | 'loading' | 'error' | 'ready'; snapshot: OverviewSnapshot | null; forecast: Forecast | null; error: ProviderError | null; refetch(): void }`
  - `useProgress(today: string | null)` → `useQuery<Progress>`
  - `useGamificationActions()` → `{ plan, confirm, log, cancel }` (mutations do TanStack; cada `mutateAsync` lança o erro tipado quando o `Result` falha) e invalida `['progress']`.
  - `useDebouncedValue<T>(value: T, delayMs: number): T`; `DEBOUNCE_MS = 300`
  - `useNowTick(intervalMs = 60_000): number` (epoch ms)
  - `addRecent(recents, city, favorites)`, `toggleFavorite(favorites, city)`, `isFavorite(favorites, city)`; `MAX_RECENTS = 5`, `MAX_FAVORITES = 20`
  - `usePreferences` (store Zustand) com `{ city, activity, favorites, recents, selectCity, selectActivity, toggleFavorite }`
  - `renderWithProviders(ui, opts?: { services?: AppServices })`

- [ ] **Step 1: Instalar dependências**

```bash
pnpm --filter mobile exec expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
pnpm --filter mobile add @tanstack/react-query zustand
pnpm --filter mobile add -D @testing-library/react-native
```

- [ ] **Step 2: `package.json`, `app.json`, `jest.setup.js`, ESLint**

`apps/mobile/package.json`: `"main": "expo-router/entry"`; em `jest` adicione `"setupFiles": ["<rootDir>/jest.setup.js"]`.

`apps/mobile/jest.setup.js`:

```js
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

`apps/mobile/app.json` (dentro de `expo`): `"scheme": "melhorhora"`, `"experiments": { "typedRoutes": true }`, e

```json
"plugins": [
  "expo-router",
  ["expo-location", { "locationWhenInUsePermission": "Usamos sua localização só para encontrar a previsão da sua cidade." }],
  "expo-notifications"
]
```

`apps/mobile/eslint.config.js`: acrescente o elemento `{ type: 'app', pattern: 'src/app/**' }` em `boundaries/elements` e, nas `policies` do `boundaries/dependencies`, uma política para `app` que permite `presentation`, `infrastructure` (somente para o composition root: aceite o elemento inteiro, a restrição fina fica por convenção e revisão) e módulos `external`/`core`. Mantenha as políticas existentes intactas.

Apague `apps/mobile/App.tsx` e `apps/mobile/index.ts`.

- [ ] **Step 3: `i18n/pt-BR.ts`**

```ts
import type { ActivityId, BadgeId, FactorId, ScoreLabel, TipId, VetoId } from '@/domain';
import type { LocationError, ProviderErrorCode } from '@/application/ports';

type UseCaseErrorCode = 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound';

export const t = {
  tabs: { home: 'Hoje', cities: 'Cidades', profile: 'Perfil' },
  labels: { great: 'Ótimo', good: 'Bom', fair: 'Razoável', poor: 'Ruim' } satisfies Record<
    ScoreLabel,
    string
  >,
  tips: {
    sunscreen: 'Use protetor',
    water: 'Leve água',
    cooling: 'Esfria',
    rain: 'Leve capa',
    coat: 'Leve casaco',
  } satisfies Record<TipId, string>,
  reasons: {
    thermal: 'temperatura fora do confortável',
    rain: 'chuva',
    wind: 'vento forte',
    uv: 'UV alto',
    sun: 'céu fechado',
    storm: 'trovoada',
    snow: 'neve',
  } satisfies Record<FactorId | VetoId, string>,
  activities: {
    walk: 'walk',
    run: 'run',
    cycle: 'cycle',
    beach: 'beach',
    picnic: 'picnic',
  } satisfies Record<ActivityId, string>,
  badges: {
    first: 'Primeira saída',
    early: 'Madrugador',
    owl: 'Coruja',
    explorer: 'Explorador',
    planner: 'Fiel ao plano',
    week: 'Semana cheia',
    multi: 'Multiatleta',
    perfect: 'Clima perfeito',
  } satisfies Record<BadgeId, string>,
  errors: {
    network: 'Sem conexão. Tente de novo.',
    http: 'O serviço de previsão respondeu com erro.',
    schema: 'Resposta inesperada do serviço de previsão.',
    timeout: 'Demorou demais para responder.',
    denied: 'Sem permissão de localização. Busque a cidade pelo nome.',
    unavailable: 'Não foi possível obter sua localização.',
    alreadyDoneToday: 'Você já registrou uma atividade hoje.',
    alreadyPlanned: 'Já existe um plano para hoje.',
    planNotFound: 'Plano não encontrado.',
  } satisfies Record<ProviderErrorCode | LocationError['code'] | UseCaseErrorCode, string>,
  home: {
    welcomeTitle: 'A melhor hora para sair, em uma frase.',
    welcomeBody: 'Escolha uma cidade e uma atividade. O resto é com a previsão.',
    searchCity: 'Buscar cidade',
    useLocation: 'Usar minha localização',
    bestToday: 'Melhor horário hoje',
    noWindow: 'Sem janela boa hoje',
    noWindowBecause: (reason: string) => `Motivo principal: ${reason}.`,
    now: 'Agora',
    plan: (activity: string, hour: number) => `Planejar ${activity} às ${hour}h`,
    planned: (hour: number) => `Planejado para as ${hour}h`,
    cancelPlan: 'Desfazer plano',
    confirm: 'Confirmar que fui',
    logOther: 'Saí em outro horário',
    done: (hour: number, minute: number) =>
      `Concluído às ${hour}h${String(minute).padStart(2, '0')}`,
    xpEarned: (xp: number) => `+${xp} XP`,
    hourly: 'Seu dia, hora a hora',
    nextDays: 'Próximos dias',
    tomorrowBetter: 'Amanhã é melhor que hoje',
    todayBest: 'Hoje é o melhor dia da semana',
    retry: 'Tentar de novo',
    loading: 'Carregando previsão…',
  },
  cities: {
    placeholder: 'Digite o nome da cidade',
    hint: 'Pelo menos 2 letras',
    noResults: (q: string) => `Nenhuma cidade encontrada para "${q}"`,
    favorites: 'Favoritas',
    recents: 'Recentes',
    favorite: 'Favoritar',
    unfavorite: 'Remover dos favoritos',
    searching: 'Buscando…',
  },
  profile: {
    title: 'Seu progresso',
    level: (n: number, name: string) => `Nível ${n} · ${name}`,
    xpToNext: (xp: number, name: string) => `${xp} XP para ${name}`,
    maxLevel: 'Nível máximo',
    streak: (n: number) => `${n} dias seguidos`,
    activities: (n: number) => `${n} atividades`,
    cities: (n: number) => `${n} cidades`,
    badges: (unlocked: number, total: number) => `Conquistas · ${unlocked} de ${total}`,
    history: 'Histórico',
    empty: 'Nenhuma atividade ainda.',
  },
} as const;
```

- [ ] **Step 4: `ServicesProvider.tsx` e `AppProviders.tsx`**

`services/ServicesProvider.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';

import type { AppServices } from '@/application/services';

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (services === null) throw new Error('ServicesProvider ausente na árvore');
  return services;
}
```

`AppProviders.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import type { AppServices } from '@/application/services';

import { useAppFocusRefetch } from './hooks/useAppFocusRefetch';
import { createQueryClient } from './queries/queryClient';
import { ServicesProvider } from './services/ServicesProvider';

export function AppProviders({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  useAppFocusRefetch();
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Query client, keys e hooks de foco/tempo**

`queries/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const FORECAST_STALE_MS = 15 * 60_000;
export const FORECAST_GC_MS = 2 * 60 * 60_000;
export const CITIES_STALE_MS = 24 * 60 * 60_000;

export const createQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } } });
```

`queries/keys.ts`:

```ts
export const queryKeys = {
  cities: (query: string) => ['cities', query] as const,
  forecast: (cityId: string) => ['forecast', cityId] as const,
  engineConfig: () => ['engineConfig'] as const,
  progress: (today: string) => ['progress', today] as const,
  progressPrefix: () => ['progress'] as const,
};
```

`hooks/useAppFocusRefetch.ts`:

```ts
import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const onChange = (status: AppStateStatus): void => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
};

export function useAppFocusRefetch(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
```

`hooks/useNowTick.ts`:

```ts
import { useEffect, useState } from 'react';

export function useNowTick(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

- [ ] **Step 6: Teste e implementação de `useDebouncedValue`**

`hooks/useDebouncedValue.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('só atualiza depois do atraso', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'ab' });
    expect(result.current).toBe('a');
    act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('reinicia o atraso a cada mudança', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'ab' });
    act(() => jest.advanceTimersByTime(200));
    rerender({ v: 'abc' });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('a');
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });
});
```

`hooks/useDebouncedValue.ts`:

```ts
import { useEffect, useState } from 'react';

export const DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

Run: `pnpm --filter mobile test -- useDebouncedValue` → FAIL antes, PASS depois.

- [ ] **Step 7: Hooks de dados**

`queries/useCitySearch.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { City, ProviderError } from '@/application/ports';
import { MIN_QUERY_LENGTH } from '@/application/useCases/searchCities';

import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';
import { CITIES_STALE_MS } from './queryClient';

export function useCitySearch(query: string) {
  const services = useServices();
  const debounced = useDebouncedValue(query.trim());
  const isActive = debounced.length >= MIN_QUERY_LENGTH;
  const q = useQuery<readonly City[], ProviderError>({
    queryKey: queryKeys.cities(debounced),
    enabled: isActive,
    staleTime: CITIES_STALE_MS,
    queryFn: async ({ signal }) => {
      const r = await services.searchCities(debounced, signal);
      if (!r.ok) throw r.error;
      return r.value;
    },
  });
  return { results: q.data ?? [], isSearching: isActive && q.isPending, error: q.error, isActive };
}
```

`queries/useForecast.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { Forecast } from '@/domain';
import type { City, ProviderError } from '@/application/ports';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';
import { FORECAST_GC_MS, FORECAST_STALE_MS } from './queryClient';

export function useForecast(city: City | null) {
  const services = useServices();
  return useQuery<Forecast, ProviderError>({
    queryKey: queryKeys.forecast(city?.id ?? 'none'),
    enabled: city !== null,
    staleTime: FORECAST_STALE_MS,
    gcTime: FORECAST_GC_MS,
    queryFn: async ({ signal }) => {
      if (city === null) throw { code: 'network', message: 'sem cidade' } satisfies ProviderError;
      const r = await services.ports.forecast.fetch(
        { latitude: city.latitude, longitude: city.longitude },
        signal,
      );
      if (!r.ok) throw r.error;
      return r.value;
    },
  });
}
```

`queries/useEngineConfig.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { EngineConfig } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

export function useEngineConfig() {
  const services = useServices();
  return useQuery<EngineConfig>({
    queryKey: queryKeys.engineConfig(),
    staleTime: Infinity,
    queryFn: () => services.ports.config.get(),
  });
}
```

`queries/useOverview.ts`:

```ts
import { useMemo } from 'react';

import type { ActivityId, Forecast } from '@/domain';
import type { City, ProviderError } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';

import { useNowTick } from '../hooks/useNowTick';
import { useServices } from '../services/ServicesProvider';

import { useEngineConfig } from './useEngineConfig';
import { useForecast } from './useForecast';

export type OverviewState = {
  readonly status: 'idle' | 'loading' | 'error' | 'ready';
  readonly snapshot: OverviewSnapshot | null;
  readonly forecast: Forecast | null;
  readonly error: ProviderError | null;
  readonly refetch: () => void;
};

export function useOverview(city: City | null, activity: ActivityId): OverviewState {
  const services = useServices();
  const forecast = useForecast(city);
  const config = useEngineConfig();
  const tick = useNowTick();
  const snapshot = useMemo(
    () =>
      forecast.data && config.data
        ? services.buildOverview({ forecast: forecast.data, activity, config: config.data })
        : null,
    // tick força recomputar o "agora" a cada minuto
    [services, forecast.data, config.data, activity, tick],
  );
  const status =
    city === null ? 'idle' : forecast.isError ? 'error' : snapshot === null ? 'loading' : 'ready';
  return {
    status,
    snapshot,
    forecast: forecast.data ?? null,
    error: forecast.error,
    refetch: () => void forecast.refetch(),
  };
}
```

`queries/useProgress.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import type { Progress } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

export function useProgress(today: string | null) {
  const services = useServices();
  return useQuery<Progress>({
    queryKey: queryKeys.progress(today ?? 'none'),
    enabled: today !== null,
    queryFn: () => services.getProgress(today ?? ''),
  });
}
```

`queries/useGamificationActions.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Result } from '@/domain';

import { useServices } from '../services/ServicesProvider';

import { queryKeys } from './keys';

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw r.error;
  return r.value;
};

export function useGamificationActions() {
  const services = useServices();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.progressPrefix() });
  const plan = useMutation({
    mutationFn: async (input: Parameters<typeof services.planActivity>[0]) =>
      unwrap(await services.planActivity(input)),
    onSuccess: invalidate,
  });
  const confirm = useMutation({
    mutationFn: async (input: Parameters<typeof services.confirmActivity>[0]) =>
      unwrap(await services.confirmActivity(input)),
    onSuccess: invalidate,
  });
  const log = useMutation({
    mutationFn: async (input: Parameters<typeof services.logActivity>[0]) =>
      unwrap(await services.logActivity(input)),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: async (planId: string) => unwrap(await services.cancelPlan(planId)),
    onSuccess: invalidate,
  });
  return { plan, confirm, log, cancel };
}
```

- [ ] **Step 8: Teste e implementação das regras de preferências**

`state/preferences.test.ts`:

```ts
import { saoPaulo } from '@/application/testing/fakes';

import { MAX_FAVORITES, MAX_RECENTS, addRecent, isFavorite, toggleFavorite } from './preferences';

const city = (id: string) => ({ ...saoPaulo, id, name: `Cidade ${id}` });

describe('preferências', () => {
  it('recente vai para o topo, sem duplicar e sem passar de 5', () => {
    const r1 = addRecent([], city('a'), []);
    const r2 = addRecent(r1, city('b'), []);
    const r3 = addRecent(r2, city('a'), []);
    expect(r3.map((c) => c.id)).toEqual(['a', 'b']);
    const many = ['1', '2', '3', '4', '5', '6'].reduce(
      (acc, id) => addRecent(acc, city(id), []),
      [] as readonly (typeof saoPaulo)[],
    );
    expect(many).toHaveLength(MAX_RECENTS);
    expect(many[0]?.id).toBe('6');
  });

  it('cidade favorita não entra nos recentes', () => {
    expect(addRecent([], city('a'), [city('a')])).toEqual([]);
  });

  it('toggleFavorite adiciona, remove e respeita o máximo', () => {
    const on = toggleFavorite([], city('a'));
    expect(isFavorite(on, city('a'))).toBe(true);
    expect(toggleFavorite(on, city('a'))).toEqual([]);
    const full = Array.from({ length: MAX_FAVORITES }, (_, i) => city(String(i)));
    expect(toggleFavorite(full, city('extra'))).toEqual(full);
  });
});
```

`state/preferences.ts`:

```ts
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
```

Run: `pnpm --filter mobile test -- preferences` → FAIL antes, PASS depois.

- [ ] **Step 9: `state/preferencesStore.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActivityId } from '@/domain';
import type { City } from '@/application/ports';

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
```

Regra de uso (Zustand v5): nas telas, selecione campos primitivos ou referências estáveis um a um (`usePreferences((s) => s.city)`), nunca um objeto novo por render, para não entrar em loop de re-render.

- [ ] **Step 10: Rotas, telas placeholder e `renderWithProviders`**

`src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useState } from 'react';

import { readEnv } from '@/infrastructure/env';
import { createServices } from '@/infrastructure/container';
import { configureNotificationHandler } from '@/infrastructure/notifications/expoNotificationScheduler';
import { AppProviders } from '@/presentation/AppProviders';

configureNotificationHandler();

export default function RootLayout() {
  const [services] = useState(() => createServices(readEnv()));
  return (
    <AppProviders services={services}>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
```

`src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

import { t } from '@/presentation/i18n/pt-BR';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="cities" options={{ title: t.tabs.cities }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile }} />
    </Tabs>
  );
}
```

`src/app/(tabs)/index.tsx`: `export { HomeScreen as default } from '@/presentation/features/home/HomeScreen';` — idem `cities.tsx` (`CitiesScreen`) e `profile.tsx` (`ProfileScreen`).

Telas placeholder (a Task 8 substitui), por exemplo `features/home/HomeScreen.tsx`:

```tsx
import { Text, View } from 'react-native';

import { t } from '../../i18n/pt-BR';

export function HomeScreen() {
  return (
    <View>
      <Text>{t.tabs.home}</Text>
    </View>
  );
}
```

`presentation/testing/renderWithProviders.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { AppServices } from '@/application/services';
import { fakeServices } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';

export function renderWithProviders(ui: ReactElement, opts: { services?: AppServices } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const services = opts.services ?? fakeServices();
  return {
    services,
    ...render(
      <QueryClientProvider client={client}>
        <ServicesProvider services={services}>{ui}</ServicesProvider>
      </QueryClientProvider>,
    ),
  };
}
```

- [ ] **Step 11: Verificar que o app abre**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile lint && pnpm --filter mobile test`
Expected: PASS. Depois, `pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export` (build JS sem simulador) deve terminar sem erro de resolução de módulos; apague `/tmp/mh-export`. Se `expo export` exigir algo não disponível, registre e siga: o smoke manual no Expo Go é a verificação final (Task 9).

- [ ] **Step 12: Commit**

```bash
git add -A apps/mobile pnpm-lock.yaml
git commit -m "feat(app): expo router, providers, queries, preferências persistidas e i18n"
```

---

### Task 8: Telas mínimas funcionais (Hoje, Cidades, Perfil) com testes de fluxo

**Files:**

- Create: `apps/mobile/src/presentation/features/home/heroState.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/presentation/features/home/useBadWeatherRecorder.ts`
- Create: `apps/mobile/src/presentation/features/home/components/ActivityPicker.tsx`, `HeroCard.tsx`, `HourlyList.tsx`, `NextDaysList.tsx`
- Modify: `apps/mobile/src/presentation/features/home/HomeScreen.tsx` (+ `HomeScreen.test.tsx`)
- Modify: `apps/mobile/src/presentation/features/cities/CitiesScreen.tsx` (+ `CitiesScreen.test.tsx`)
- Modify: `apps/mobile/src/presentation/features/profile/ProfileScreen.tsx` (+ `ProfileScreen.test.tsx`)

**Interfaces:**

- Consumes: hooks e store da Task 7; `deriveProgress`/`Progress`, `DayRecommendation`, `isWithinWindow`, `labelFor` do domínio; `t`.
- Produces:
  - `type HeroState = { kind: 'plan'; day: DayRecommendation; window: TimeWindow; score: number } | { kind: 'planned'; plan: ActivePlan } | { kind: 'confirm'; plan: ActivePlan; nowScore: number | null } | { kind: 'done'; record: ActivityRecord } | { kind: 'noWindow'; day: DayRecommendation }`
  - `deriveHeroState(input: { today: DayRecommendation; now: LocalDateTime; progress: Progress; graceHours: number }): HeroState`
  - Telas exportadas: `HomeScreen`, `CitiesScreen`, `ProfileScreen`. Estilo: `StyleSheet` mínimo (padding, fontes), sem design system (Plano 3).

- [ ] **Step 1: Teste de `deriveHeroState`**

`features/home/heroState.test.ts`:

```ts
import {
  defaultEngineConfig as cfg,
  deriveProgress,
  recommendDay,
  type LocalDateTime,
} from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';
import { badDay, confirmed, logged, planned } from '@/domain/gamification/testing/fixtures';

import { deriveHeroState } from './heroState';

const DATES = ['2026-09-13', '2026-09-14'];
const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const today = (now: LocalDateTime, rainy = false) =>
  recommendDay(
    makeForecast(DATES, () => (rainy ? { precipitationProbability: 95 } : {})),
    cfg.activities.walk,
    cfg,
    { date: now.date, now },
  );
const progressOf = (events: Parameters<typeof deriveProgress>[0]) =>
  deriveProgress(events, cfg, '2026-09-13');

describe('deriveHeroState', () => {
  it('sem plano e com janela → plan', () => {
    const now = at(8);
    const s = deriveHeroState({ today: today(now), now, progress: progressOf([]), graceHours: 2 });
    expect(s.kind).toBe('plan');
    expect(s.kind === 'plan' && s.window.startHour).toBe(8);
  });

  it('plano ativo antes da janela → planned; dentro da janela → confirm com score de agora', () => {
    const plan = planned('2026-09-13', { startHour: 17, endHour: 19 });
    const progress = progressOf([plan]);
    expect(deriveHeroState({ today: today(at(8)), now: at(8), progress, graceHours: 2 }).kind).toBe(
      'planned',
    );
    const s = deriveHeroState({
      today: today(at(17, 30)),
      now: at(17, 30),
      progress,
      graceHours: 2,
    });
    expect(s).toMatchObject({ kind: 'confirm', nowScore: 100 });
  });

  it('registro de hoje → done', () => {
    const plan = planned('2026-09-13', { startHour: 17 });
    const s = deriveHeroState({
      today: today(at(20)),
      now: at(20),
      progress: progressOf([plan, confirmed(plan)]),
      graceHours: 2,
    });
    expect(s.kind === 'done' && s.record.planFulfilled).toBe(true);
  });

  it('sem janela boa → noWindow, mesmo com dia de folga registrado', () => {
    const s = deriveHeroState({
      today: today(at(8), true),
      now: at(8),
      progress: progressOf([badDay('2026-09-13')]),
      graceHours: 2,
    });
    expect(s.kind).toBe('noWindow');
  });

  it('registro espontâneo também é done', () => {
    const s = deriveHeroState({
      today: today(at(20)),
      now: at(20),
      progress: progressOf([logged('2026-09-13')]),
      graceHours: 2,
    });
    expect(s.kind).toBe('done');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- heroState`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar `heroState.ts`**

```ts
import {
  isWithinWindow,
  type ActivePlan,
  type ActivityRecord,
  type DayRecommendation,
  type LocalDateTime,
  type Progress,
  type TimeWindow,
} from '@/domain';

export type HeroState =
  | {
      readonly kind: 'plan';
      readonly day: DayRecommendation;
      readonly window: TimeWindow;
      readonly score: number;
    }
  | { readonly kind: 'planned'; readonly plan: ActivePlan }
  | { readonly kind: 'confirm'; readonly plan: ActivePlan; readonly nowScore: number | null }
  | { readonly kind: 'done'; readonly record: ActivityRecord }
  | { readonly kind: 'noWindow'; readonly day: DayRecommendation };

type Input = {
  readonly today: DayRecommendation;
  readonly now: LocalDateTime;
  readonly progress: Progress;
  readonly graceHours: number;
};

export function deriveHeroState({ today, now, progress, graceHours }: Input): HeroState {
  if (progress.todayRecord !== null) return { kind: 'done', record: progress.todayRecord };
  const plan = progress.activePlan;
  if (plan !== null) {
    if (!isWithinWindow(plan.window, now, graceHours)) return { kind: 'planned', plan };
    const nowScore = today.hours.find((h) => h.hour.hour === now.hour)?.score ?? null;
    return { kind: 'confirm', plan, nowScore };
  }
  if (today.result.kind === 'window')
    return { kind: 'plan', day: today, window: today.result.window, score: today.result.score };
  return { kind: 'noWindow', day: today };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter mobile test -- heroState`
Expected: PASS, 5 testes.

- [ ] **Step 5: Componentes da Home**

`features/home/components/ActivityPicker.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ACTIVITY_IDS, type ActivityId, type EngineConfig } from '@/domain';

type Props = {
  readonly config: EngineConfig;
  readonly selected: ActivityId;
  readonly onSelect: (id: ActivityId) => void;
};

export function ActivityPicker({ config, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ACTIVITY_IDS.map((id) => {
        const p = config.activities[id];
        const active = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              style={active ? styles.chipTextActive : styles.chipText}
            >{`${p.emoji} ${p.name}`}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#eee' },
  chipActive: { backgroundColor: '#333' },
  chipText: { color: '#333' },
  chipTextActive: { color: '#fff' },
});
```

`features/home/components/HeroCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EngineConfig, LocalDateTime } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import type { HeroState } from '../heroState';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly now: LocalDateTime;
  readonly busy: boolean;
  readonly errorMessage: string | null;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: () => void;
};

function Body({ state, config, now }: Pick<Props, 'state' | 'config' | 'now'>) {
  switch (state.kind) {
    case 'plan':
      return (
        <>
          <Text style={styles.kicker}>{t.home.bestToday}</Text>
          <Text style={styles.big}>{`${state.window.startHour}h – ${state.window.endHour}h`}</Text>
          <Text>{`${t.labels[state.day.label ?? 'poor']} · ${state.score}`}</Text>
          {state.day.sentence ? <Text>{state.day.sentence}</Text> : null}
          {state.day.caveat ? <Text>{state.day.caveat}</Text> : null}
          {state.day.tips.length > 0 ? (
            <Text>{state.day.tips.map((tip) => tip.text).join(' · ')}</Text>
          ) : null}
        </>
      );
    case 'planned':
      return <Text style={styles.big}>{t.home.planned(state.plan.window.startHour)}</Text>;
    case 'confirm':
      return (
        <>
          <Text
            style={styles.big}
          >{`${state.plan.window.startHour}h – ${state.plan.window.endHour}h`}</Text>
          {state.nowScore !== null ? <Text>{`${t.home.now} · ${state.nowScore}`}</Text> : null}
        </>
      );
    case 'done':
      return (
        <>
          <Text style={styles.big}>{t.home.done(state.record.hourLeft, 0)}</Text>
          <Text>{t.home.xpEarned(state.record.xp.total)}</Text>
        </>
      );
    case 'noWindow': {
      const dominant = state.day.result.kind === 'none' ? state.day.result.dominant : null;
      return (
        <>
          <Text style={styles.big}>{t.home.noWindow}</Text>
          {dominant ? <Text>{t.home.noWindowBecause(t.reasons[dominant])}</Text> : null}
        </>
      );
    }
  }
}

function Actions({
  state,
  config,
  busy,
  onPlan,
  onCancel,
  onConfirm,
  onLogNow,
}: Omit<Props, 'now' | 'errorMessage'>) {
  const button = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={busy} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  switch (state.kind) {
    case 'plan':
      return button(
        t.home.plan(config.activities[state.day.activityId].name, state.window.startHour),
        onPlan,
      );
    case 'planned':
      return button(t.home.cancelPlan, onCancel);
    case 'confirm':
      return (
        <>
          {button(t.home.confirm, onConfirm)}
          {button(t.home.logOther, onLogNow)}
        </>
      );
    case 'noWindow':
      return button(t.home.logOther, onLogNow);
    case 'done':
      return null;
  }
}

export function HeroCard(props: Props) {
  return (
    <View style={styles.card} accessibilityLabel="hero">
      <Body state={props.state} config={props.config} now={props.now} />
      <Actions {...props} />
      {props.errorMessage ? <Text style={styles.error}>{props.errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, backgroundColor: '#f4f4f4', gap: 8 },
  kicker: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  big: { fontSize: 32, fontWeight: '700' },
  button: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020' },
});
```

`features/home/components/HourlyList.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import type { HourScore } from '@/domain';

import { t } from '../../../i18n/pt-BR';

export function HourlyList({
  hours,
  nowHour,
}: {
  readonly hours: readonly HourScore[];
  readonly nowHour: number | null;
}) {
  return (
    <View>
      <Text style={styles.title}>{t.home.hourly}</Text>
      {hours.map((h) => (
        <Text key={h.hour.time} style={h.hour.hour === nowHour ? styles.now : undefined}>
          {`${String(h.hour.hour).padStart(2, '0')}h · ${h.score} · ${t.labels[h.label]}`}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginTop: 16 },
  now: { fontWeight: '700' },
});
```

`features/home/components/NextDaysList.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import type { Comparison, DayRecommendation } from '@/domain';

import { t } from '../../../i18n/pt-BR';

type Props = {
  readonly days: readonly DayRecommendation[];
  readonly comparison: Comparison;
  readonly bestDate: string | null;
};

const line = (d: DayRecommendation): string =>
  d.result.kind === 'window'
    ? `${d.date} · ${d.result.window.startHour}h – ${d.result.window.endHour}h · ${d.result.score}`
    : `${d.date} · ${t.home.noWindow}`;

export function NextDaysList({ days, comparison, bestDate }: Props) {
  return (
    <View>
      <Text style={styles.title}>{t.home.nextDays}</Text>
      {comparison === 'tomorrowBetter' ? <Text>{t.home.tomorrowBetter}</Text> : null}
      {comparison === 'todayBestOfWeek' ? <Text>{t.home.todayBest}</Text> : null}
      {days.map((d) => (
        <Text key={d.date} style={d.date === bestDate ? styles.best : undefined}>
          {line(d)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginTop: 16 },
  best: { fontWeight: '700' },
});
```

- [ ] **Step 6: `useBadWeatherRecorder.ts`**

```ts
import { useEffect } from 'react';

import type { DayRecommendation } from '@/domain';

import { useServices } from '../../services/ServicesProvider';

/** Registra "dia de folga por mau tempo" quando hoje não tem janela boa (idempotente no caso de uso). */
export function useBadWeatherRecorder(
  cityId: string | null,
  today: DayRecommendation | null,
): void {
  const services = useServices();
  const noWindow = today !== null && today.result.kind === 'none' && today.hours.length > 0;
  const bestScore = today?.score ?? 0;
  const date = today?.date ?? null;
  useEffect(() => {
    if (!noWindow || cityId === null || date === null) return;
    void services.recordBadWeatherDay({ cityId, date, bestScore });
  }, [services, noWindow, cityId, date, bestScore]);
}
```

- [ ] **Step 7: `HomeScreen.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ProviderErrorCode } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useGamificationActions } from '../../queries/useGamificationActions';
import { useOverview } from '../../queries/useOverview';
import { useProgress } from '../../queries/useProgress';
import { usePreferences } from '../../state/preferencesStore';
import { useServices } from '../../services/ServicesProvider';

import { ActivityPicker } from './components/ActivityPicker';
import { HeroCard } from './components/HeroCard';
import { HourlyList } from './components/HourlyList';
import { NextDaysList } from './components/NextDaysList';
import { deriveHeroState } from './heroState';
import { useBadWeatherRecorder } from './useBadWeatherRecorder';

type ActionErrorCode = 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound';
const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  typeof (e as { code: unknown }).code === 'string';

function Welcome() {
  const router = useRouter();
  const services = useServices();
  const selectCity = usePreferences((s) => s.selectCity);
  const [error, setError] = useState<string | null>(null);
  const useLocation = async () => {
    const r = await services.resolveMyLocation();
    if (r.ok) selectCity(r.value);
    else setError(t.errors[r.error.code]);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.home.welcomeTitle}</Text>
      <Text>{t.home.welcomeBody}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => router.push('/cities')}
      >
        <Text style={styles.buttonText}>{t.home.searchCity}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void useLocation()}
      >
        <Text style={styles.buttonText}>{t.home.useLocation}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function HomeScreen() {
  const city = usePreferences((s) => s.city);
  const activity = usePreferences((s) => s.activity);
  const selectActivity = usePreferences((s) => s.selectActivity);
  const router = useRouter();
  const config = useEngineConfig();
  const overview = useOverview(city, activity);
  const today = overview.snapshot?.overview.today ?? null;
  const progress = useProgress(overview.snapshot?.now.date ?? null);
  const actions = useGamificationActions();
  const [actionError, setActionError] = useState<string | null>(null);
  useBadWeatherRecorder(city?.id ?? null, today);

  if (city === null) return <Welcome />;
  if (!config.data) return <Text style={styles.container}>{t.home.loading}</Text>;

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(isActionError(e) ? t.errors[e.code] : t.errors.network);
    }
  };

  const snapshot = overview.snapshot;
  const hero =
    snapshot && progress.data
      ? deriveHeroState({
          today: snapshot.overview.today,
          now: snapshot.now,
          progress: progress.data,
          graceHours: config.data.window.graceHoursAfterEnd,
        })
      : null;
  const busy =
    actions.plan.isPending ||
    actions.confirm.isPending ||
    actions.log.isPending ||
    actions.cancel.isPending;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/cities')}>
        <Text style={styles.title}>{`${city.name}${city.admin1 ? `, ${city.admin1}` : ''}`}</Text>
      </Pressable>
      <ActivityPicker config={config.data} selected={activity} onSelect={selectActivity} />

      {overview.status === 'error' && overview.error ? (
        <View>
          <Text style={styles.error}>{t.errors[overview.error.code as ProviderErrorCode]}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={overview.refetch}>
            <Text style={styles.buttonText}>{t.home.retry}</Text>
          </Pressable>
        </View>
      ) : null}
      {overview.status === 'loading' ? <Text>{t.home.loading}</Text> : null}

      {snapshot && hero ? (
        <>
          <HeroCard
            state={hero}
            config={config.data}
            now={snapshot.now}
            busy={busy}
            errorMessage={actionError}
            onPlan={() =>
              hero.kind === 'plan' &&
              void run(() =>
                actions.plan.mutateAsync({
                  city,
                  activity,
                  window: hero.window,
                  windowScore: hero.score,
                  utcOffsetSeconds: snapshot.now.utcOffsetSeconds,
                }),
              )
            }
            onCancel={() =>
              (hero.kind === 'planned' || hero.kind === 'confirm') &&
              void run(() => actions.cancel.mutateAsync(hero.plan.planId))
            }
            onConfirm={() =>
              hero.kind === 'confirm' &&
              void run(() =>
                actions.confirm.mutateAsync({
                  planId: hero.plan.planId,
                  date: snapshot.now.date,
                  hourLeft: snapshot.now.hour,
                  hourScore: hero.nowScore ?? 0,
                }),
              )
            }
            onLogNow={() =>
              void run(() =>
                actions.log.mutateAsync({
                  city,
                  activity,
                  date: snapshot.now.date,
                  hourLeft: snapshot.now.hour,
                  hourScore: snapshot.overview.now?.score ?? 0,
                }),
              )
            }
          />
          <HourlyList hours={snapshot.overview.today.hours} nowHour={snapshot.now.hour} />
          <NextDaysList
            days={snapshot.overview.nextDays}
            comparison={snapshot.overview.comparison}
            bestDate={snapshot.overview.bestDate}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020' },
});
```

Se o `HomeScreen.tsx` passar de 300 linhas, extraia `Welcome` para `components/Welcome.tsx` e os handlers para `useHeroActions.ts` — mantendo as assinaturas.

- [ ] **Step 8: Teste da Home**

`features/home/HomeScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { err, ok } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';
import { fakeForecast, fakeServices, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { HomeScreen } from './HomeScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const goodServices = () => fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) });

beforeEach(() =>
  usePreferences.setState({ city: null, activity: 'walk', favorites: [], recents: [] }),
);

describe('HomeScreen', () => {
  it('sem cidade mostra as boas-vindas', () => {
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    expect(screen.getByText('A melhor hora para sair, em uma frase.')).toBeTruthy();
    expect(screen.getByText('Buscar cidade')).toBeTruthy();
  });

  it('com cidade mostra a janela de hoje e permite planejar e confirmar', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    // relógio falso: 14:00 em São Paulo → janela 14h–17h
    await screen.findByText('14h – 17h');
    expect(screen.getByText('Ótimo · 100')).toBeTruthy();
    fireEvent.press(screen.getByText('Planejar Caminhada às 14h'));
    // 14:00 está dentro da janela → estado "confirm"
    await screen.findByText('Confirmar que fui');
    fireEvent.press(screen.getByText('Confirmar que fui'));
    await screen.findByText('Concluído às 14h00');
    expect(screen.getByText('+130 XP')).toBeTruthy(); // 50 + 50 (score 100) + 25 (plano) + 5 (1 dia)
  });

  it('erro de rede mostra mensagem e botão de tentar de novo', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({ forecast: fakeForecast(err({ code: 'network', message: 'x' })) }),
    });
    await screen.findByText('Sem conexão. Tente de novo.');
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
  });

  it('lista as 24 horas e os próximos dias', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Seu dia, hora a hora');
    expect(screen.getByText('17h · 100 · Ótimo')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/2026-09-14 · 6h – 9h · 100/)).toBeTruthy());
  });
});
```

Notas: (1) `fakeServices` usa `fixedClock(2026-09-13T17:00Z)` = 14:00 em São Paulo; `makeForecast` tem UTC-3, então o "agora" cai em 14h e a janela de hoje é 14h–17h. (2) `useNowTick` usa `Date.now()` só para disparar recomputação; o valor do "agora" vem do relógio injetado. (3) `expo-router` é mockado porque não há árvore de rotas no teste.

- [ ] **Step 9: Rodar a Home**

Run: `pnpm --filter mobile test -- HomeScreen`
Expected: PASS, 4 testes. Se `findByText('14h – 17h')` falhar por timing das queries, aumente o `timeout` do `findBy` para 3000 ms antes de suspeitar da lógica; se o valor da janela divergir, confira o relógio (14:00 local) e a fixture.

- [ ] **Step 10: `CitiesScreen.tsx` e teste**

`features/cities/CitiesScreen.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { City } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useCitySearch } from '../../queries/useCitySearch';
import { useServices } from '../../services/ServicesProvider';
import { isFavorite } from '../../state/preferences';
import { usePreferences } from '../../state/preferencesStore';

const cityLabel = (c: City): string =>
  [c.name, c.admin1, c.country].filter((x): x is string => Boolean(x)).join(', ');

function CityRow({
  city,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  city: City;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onSelect} style={styles.rowMain}>
        <Text>{cityLabel(city)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? t.cities.unfavorite : t.cities.favorite}
        onPress={onToggleFavorite}
      >
        <Text>{favorite ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

export function CitiesScreen() {
  const router = useRouter();
  const services = useServices();
  const [query, setQuery] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const search = useCitySearch(query);
  const favorites = usePreferences((s) => s.favorites);
  const recents = usePreferences((s) => s.recents);
  const selectCity = usePreferences((s) => s.selectCity);
  const toggleFavorite = usePreferences((s) => s.toggleFavorite);

  const choose = (city: City) => {
    selectCity(city);
    router.push('/');
  };
  const useLocation = async () => {
    setLocationError(null);
    const r = await services.resolveMyLocation();
    if (r.ok) choose(r.value);
    else setLocationError(t.errors[r.error.code]);
  };

  const section = (title: string, cities: readonly City[]) =>
    cities.length === 0 ? null : (
      <View>
        <Text style={styles.section}>{title}</Text>
        {cities.map((c) => (
          <CityRow
            key={c.id}
            city={c}
            favorite={isFavorite(favorites, c)}
            onSelect={() => choose(c)}
            onToggleFavorite={() => toggleFavorite(c)}
          />
        ))}
      </View>
    );

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel={t.cities.placeholder}
        placeholder={t.cities.placeholder}
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        autoCorrect={false}
      />
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void useLocation()}
      >
        <Text style={styles.buttonText}>{t.home.useLocation}</Text>
      </Pressable>
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      {search.isSearching ? <Text>{t.cities.searching}</Text> : null}
      {search.error ? <Text style={styles.error}>{t.errors[search.error.code]}</Text> : null}
      {search.isActive && !search.isSearching && !search.error && search.results.length === 0 ? (
        <Text>{t.cities.noResults(query.trim())}</Text>
      ) : null}
      <FlatList
        data={search.results}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CityRow
            city={item}
            favorite={isFavorite(favorites, item)}
            onSelect={() => choose(item)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListFooterComponent={
          <>
            {section(t.cities.favorites, favorites)}
            {section(t.cities.recents, recents)}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12 },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowMain: { flex: 1 },
  section: { fontWeight: '700', marginTop: 16 },
  error: { color: '#b00020' },
});
```

`features/cities/CitiesScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { err, ok } from '@/domain';
import { fakeGeocoding, fakeLocation, fakeServices, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { CitiesScreen } from './CitiesScreen';

const push = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
  usePreferences.setState({ city: null, activity: 'walk', favorites: [], recents: [] });
});

describe('CitiesScreen', () => {
  it('busca depois de 2 letras, mostra resultado e seleciona a cidade', async () => {
    const geocoding = fakeGeocoding(ok([saoPaulo]));
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding }) });
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'São');
    await screen.findByText('São Paulo, São Paulo, Brasil', {}, { timeout: 2000 });
    expect(geocoding.calls).toEqual(['São']);
    fireEvent.press(screen.getByText('São Paulo, São Paulo, Brasil'));
    expect(usePreferences.getState().city?.id).toBe(saoPaulo.id);
    expect(usePreferences.getState().recents.map((c) => c.id)).toEqual([saoPaulo.id]);
    expect(push).toHaveBeenCalledWith('/');
  });

  it('sem resultados mostra a mensagem', async () => {
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ geocoding: fakeGeocoding(ok([])) }),
    });
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'zzz');
    await screen.findByText('Nenhuma cidade encontrada para "zzz"', {}, { timeout: 2000 });
  });

  it('usa a localização quando permitida e mostra erro quando negada', async () => {
    const fix = { coords: { latitude: -23.5, longitude: -46.6 }, city: saoPaulo };
    const { unmount } = renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(ok(fix)) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await waitFor(() => expect(usePreferences.getState().city?.id).toBe(saoPaulo.id));
    unmount();
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(err({ code: 'denied' })) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await screen.findByText('Sem permissão de localização. Busque a cidade pelo nome.');
  });

  it('favorita e lista em Favoritas; recente some ao virar favorita', async () => {
    usePreferences.setState({ recents: [saoPaulo] });
    renderWithProviders(<CitiesScreen />, { services: fakeServices() });
    expect(screen.getByText('Recentes')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Favoritar'));
    await screen.findByText('Favoritas');
    expect(screen.queryByText('Recentes')).toBeNull();
  });
});
```

Run: `pnpm --filter mobile test -- CitiesScreen` → PASS, 4 testes.

- [ ] **Step 11: `ProfileScreen.tsx` e teste**

`features/profile/ProfileScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { defaultEngineConfig, localNow, type Progress } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { useProgress } from '../../queries/useProgress';
import { useServices } from '../../services/ServicesProvider';
import { usePreferences } from '../../state/preferencesStore';

function Level({ progress }: { progress: Progress }) {
  const l = progress.level;
  return (
    <View>
      <Text style={styles.big}>{t.profile.level(l.level, l.name)}</Text>
      <Text>
        {l.nextLevelXp === null
          ? t.profile.maxLevel
          : t.profile.xpToNext(l.xpToNext ?? 0, nextName(l.level))}
      </Text>
    </View>
  );
}
const nextName = (level: number): string =>
  defaultEngineConfig.levels.find((x) => x.level === level + 1)?.name ?? '';

export function ProfileScreen() {
  const services = useServices();
  const city = usePreferences((s) => s.city);
  // Sem cidade, usa o fuso do aparelho como aproximação para "hoje" (só afeta a contagem de streak exibida).
  const offset = city ? -new Date().getTimezoneOffset() * 60 : -new Date().getTimezoneOffset() * 60;
  const today = localNow(services.ports.clock.now(), offset).date;
  const progress = useProgress(today);

  if (!progress.data) return <Text style={styles.container}>{t.home.loading}</Text>;
  const p = progress.data;
  const unlocked = p.badges.filter((b) => b.unlocked).length;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t.profile.title}</Text>
      <Level progress={p} />
      <Text>{`${t.profile.streak(p.streak)} · ${t.profile.activities(p.records.length)} · ${t.profile.cities(p.citiesCount)}`}</Text>
      <Text style={styles.section}>{t.profile.badges(unlocked, p.badges.length)}</Text>
      {p.badges.map((b) => (
        <Text
          key={b.id}
        >{`${b.unlocked ? '🏅' : '🔒'} ${t.badges[b.id]}${b.progress ? ` (${b.progress.current}/${b.progress.target})` : ''}`}</Text>
      ))}
      <Text style={styles.section}>{t.profile.history}</Text>
      {p.records.length === 0 ? <Text>{t.profile.empty}</Text> : null}
      {[...p.records].reverse().map((r) => (
        <Text
          key={r.id}
        >{`${r.date} · ${defaultEngineConfig.activities[r.activity].name} · ${r.hourLeft}h · +${r.xp.total} XP`}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  big: { fontSize: 24, fontWeight: '700' },
  section: { fontWeight: '700', marginTop: 16 },
});
```

Nota de escopo: o "hoje" do Perfil usa o fuso do aparelho porque não há previsão carregada nesta tela; a Home usa o fuso da cidade. Registre como pendência para o Plano 3 (guardar o `utcOffsetSeconds` da última previsão nas preferências). O `offset` acima tem a mesma expressão nos dois ramos de propósito: simplifique para uma linha sem o ternário.

`features/profile/ProfileScreen.test.tsx`:

```tsx
import { screen } from '@testing-library/react-native';

import { fakeServices, memoryProgressRepository, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen', () => {
  it('mostra nível, números, conquistas e histórico', async () => {
    usePreferences.setState({ city: saoPaulo });
    const progress = memoryProgressRepository([
      {
        type: 'logged',
        id: 'a',
        cityId: 'sp',
        activity: 'walk',
        date: '2026-09-12',
        hourLeft: 6,
        hourScore: 100,
        createdAt: 1,
      },
      {
        type: 'logged',
        id: 'b',
        cityId: 'rj',
        activity: 'run',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 80,
        createdAt: 2,
      },
    ]);
    renderWithProviders(<ProfileScreen />, { services: fakeServices({ progress }) });
    await screen.findByText('Nível 2 · Garoa');
    expect(screen.getByText(/2 dias seguidos · 2 atividades · 2 cidades/)).toBeTruthy();
    expect(screen.getByText(/🏅 Primeira saída/)).toBeTruthy();
    expect(screen.getByText(/🏅 Madrugador/)).toBeTruthy();
    expect(screen.getByText(/🔒 Explorador \(2\/5\)/)).toBeTruthy();
    expect(screen.getByText('2026-09-13 · Corrida · 18h · +100 XP')).toBeTruthy();
  });

  it('sem registros mostra o vazio', async () => {
    renderWithProviders(<ProfileScreen />, { services: fakeServices() });
    await screen.findByText('Nenhuma atividade ainda.');
  });
});
```

Contas do teste: dia 1 (score 100, streak 1) = 50 + 50 + 5 = 105; dia 2 (score 80, streak 2) = 50 + 40 + 10 = 100; total 205 → nível 2 (Garoa, 100 ≤ 205 < 400). O "hoje" do teste depende do fuso da máquina: o relógio falso é 2026-09-13T17:00Z, que é 13/09 em qualquer fuso entre UTC-17 e UTC+6; se a CI rodar em fuso mais a leste, a streak exibida pode variar — por isso a asserção usa regex e o teste da streak exata fica no domínio.

Run: `pnpm --filter mobile test -- ProfileScreen` → PASS, 2 testes.

- [ ] **Step 12: Suíte completa, lint, commit**

Run: `pnpm --filter mobile test && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS; global ≥ 80 %; `src/domain` 100 %.

```bash
git add -A apps/mobile/src
git commit -m "feat(app): telas mínimas de Hoje, Cidades e Perfil com fluxo completo"
```

---

### Task 9: Verificação no dispositivo, README e pendências

**Files:**

- Modify: `README.md`
- Create: `docs/superpowers/plans/2026-09-14-plano-2-pendencias.md`

- [ ] **Step 1: Suíte e lint finais**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: tudo verde.

- [ ] **Step 2: Smoke no Expo Go (manual, humano)**

Run: `pnpm --filter mobile start` e abra no Expo Go. Roteiro: (1) tela de boas-vindas → "Buscar cidade" → digitar "São Paulo" → escolher; (2) Hoje mostra janela, frase, lista horária e próximos dias; (3) trocar atividade muda a janela; (4) "Planejar" → estado Planejado (ou Confirmar, se dentro da janela); (5) "Confirmar que fui" → Concluído com XP; (6) Perfil mostra nível, streak 1 e badge "Primeira saída"; (7) "Usar minha localização" pede permissão e seleciona; (8) fechar e reabrir o app mantém cidade e progresso. Anote o resultado no relatório da tarefa. Este passo é executado pelo humano; o subagente registra "pendente de smoke manual".

- [ ] **Step 3: README**

Substitua a seção "Estado" e "Rodar" do `README.md` por:

````markdown
## Estado

Plano 2 concluído: o app funciona de ponta a ponta no Expo Go em modo `direct` (Open-Meteo direto),
com telas funcionais em texto. O visual "Céu vivo" (Plano 3) e o BFF com cache (Plano 4) vêm a seguir.

## Rodar

```bash
pnpm install
pnpm --filter mobile start   # QR code para o Expo Go (iOS/Android)
pnpm test                    # testes com cobertura (domínio 100 %)
pnpm lint && pnpm typecheck
```
````

Variáveis de ambiente (opcionais, `apps/mobile/.env`): `EXPO_PUBLIC_API_MODE=direct|bff`,
`EXPO_PUBLIC_BFF_URL`, `EXPO_PUBLIC_ASSETS_URL`. Sem nada configurado, o app usa a Open-Meteo direto.

## Arquitetura

- `src/domain` — regras puras (motor de recomendação e gamificação), 100 % testadas.
- `src/application` — ports (interfaces) e casos de uso que devolvem `Result`.
- `src/infrastructure` — adapters: Open-Meteo (Zod), AsyncStorage, expo-location, expo-notifications, relógio, ids, logger; `container.ts` monta tudo.
- `src/presentation` — TanStack Query, Zustand persistido, telas por feature; `src/app` só re-exporta telas para o Expo Router.

````

Crie `apps/mobile/.env.example` com as três variáveis comentadas.

- [ ] **Step 4: Pendências para o Plano 3**

`docs/superpowers/plans/2026-09-14-plano-2-pendencias.md` com: "hoje" do Perfil usa fuso do aparelho (guardar `utcOffsetSeconds` da última previsão nas preferências); `/day/[date]` e planejar amanhã (`activePlanFor(date)` no domínio); MSW para testes de tela com HTTP real; memoização de `deriveProgress` (hoje roda por query, não por render — ok); qualquer item que a revisão final apontar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: README do Plano 2 e pendências para o Plano 3"
````

---

## Self-review (feito ao escrever o plano)

**Cobertura do spec (seções deste plano):** 3.2 telas (versão mínima em texto: Hoje, Cidades, Perfil) → T7/T8; `/day/[date]` → adiado ao Plano 3 (registrado em T9). 3.3 estados do herói (plan, planned, confirm, done, noWindow) → T8 `deriveHeroState`; "Registrar sem plano" → botão "Saí em outro horário". 4.1 variáveis e `timezone=auto` → T5. 4.6 config como parâmetro com cópia embutida → T6 (`embeddedEngineConfigProvider`); download remoto → Plano 4. 5.6 notificação local 30 min antes → T3 (`planActivity`) + T6 (adapter). 6.1 camadas e composition root → T1–T7. 6.2 Result, ports pequenos, query keys, Zustand só para preferências, ErrorBoundary → ErrorBoundary NÃO está neste plano (adiado ao Plano 3 junto do design system; registrar em T9). 6.3 persistência: `progress:v1` com schemaVersion e poda de 365 dias → T6; `prefs:v1` → T7; cache de config → Plano 4. 6.4 modos `direct|bff` → T6 `env.ts` (bff cai em direct com aviso até o Plano 4). 8.2 testes: application com ports falsos → T2/T3; infra com fixtures reais (DTO gerado) → T4–T6; presentation com RNTL e serviços falsos → T8 (MSW adiado, decisão documentada).

**Consistência de nomes:** `City`/`Coordinates`/`ProviderError` (T1) usados em T4–T8; `FetchLike`/`fetchJson` (T4) em T5/T6; `createOpenMeteoGeocoding`/`createOpenMeteoForecast` (T4/T5) em T6; `createProgressRepository` (T6) em T6 container; `AppServices`/`createAppServices`/`fakeServices` (T3) em T6/T7/T8; `useOverview` devolve `snapshot: OverviewSnapshot` (T2 `buildOverview`) usado em T8; `queryKeys.progressPrefix` (T7) em `useGamificationActions`; `t.errors` cobre `ProviderErrorCode | 'denied' | 'unavailable' | 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound'` (T7) conforme os erros dos casos de uso (T2/T3).

**Riscos conhecidos:** `expo-router` mockado nos testes de tela; `z.url()` pode variar por versão do Zod (fallback indicado); campos de `setNotificationHandler` podem variar no SDK (indicado usar o tipo do SDK); o "hoje" do Perfil usa fuso do aparelho (pendência explícita).
