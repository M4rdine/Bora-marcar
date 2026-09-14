# Plano 3: Apresentação "Céu vivo" — design system, telas ricas, /day/[date], animações

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar as telas funcionais em texto do Plano 2 na interface aprovada nos mockups "Céu vivo" (gradiente por fase do dia, cartão-herói rico, linha do dia com arco do sol, próximos dias, Perfil com calendário e conquistas, Cidades com bandeiras), adicionar a rota `/day/[date]` com planejamento de amanhã, o seletor de hora no registro, animações com movimento reduzido respeitado, e um teste de tela ponta a ponta com MSW.

**Architecture:** Um design system em `presentation/ui/` (tokens + primitivos + `Sky`) sobre o qual as features são reescritas. Toda lógica nova de apresentação é função pura testada (`windowFacts`, `weekStrip`, `monthGrid`, `countryFlag`, `weatherGlyph`, `xpReceipt`). O domínio ganha `plansByDate` e minuto no registro; as preferências guardam o fuso da última previsão. Animações com Reanimated, sempre condicionadas a `useReducedMotion`. Nenhuma mudança de contrato de ports.

**Tech Stack:** Expo SDK 57, `expo-linear-gradient`, `react-native-reanimated` + `react-native-worklets`, `react-native-safe-area-context`, MSW v2 (`msw/node`), RNTL 13.x, Jest.

**Spec:** `docs/superpowers/specs/2026-09-13-melhor-hora-design.md` (seções 3.2, 3.3, 3.5, 4.5, 5.5) e mockups aprovados `docs/superpowers/mockups/home-rich-v3.html` (referência visual obrigatória: cores, raios, espaçamentos, hierarquia). Pendências: `docs/superpowers/plans/2026-09-14-plano-2-pendencias.md` e `2026-09-14-plano-1-pendencias.md`.

## Global Constraints

- Node 22 e pnpm; `pnpm --filter mobile exec expo install <pkg>` para dependências do app.
- Camadas (lint): `domain` puro; `application` → `domain`; `infrastructure` → `domain`, `application`; `presentation` → `domain`, `application`, `presentation`; `app` → `presentation`, `infrastructure`. `no-restricted-imports` já proíbe React/Expo em `domain`/`application`.
- Imutabilidade; sem `console.*` fora do logger; sem `any`; sem `istanbul ignore`; sem branches defensivos inalcançáveis; arquivos < 300 linhas; funções de componente < 50 linhas (extrair subcomponentes); strings de UI só em `presentation/i18n/pt-BR.ts`.
- Tokens obrigatórios (spec 3.5 + mockup): espaçamento múltiplos de 4 (`space.1 = 4 … space.8 = 32`); raios `radius.hero = 24`, `radius.card = 16`, `radius.inner = 12`, `radius.pill = 999`; cores de score `great #8FF0B6`, `fair #FFD66B`, `poor #FF9B8A` com texto escuro (`#0A4A2A`, `#5A3F00`, `#5A1A0F`); superfícies translúcidas brancas 12–16 % com borda 28 %; texto branco sobre o céu. Gradientes por fase (do mockup): `dawn` `#F6C9A0 → #E8927A → #8E6AA6 → #4C4477`, `day` `#9FD3F5 → #5AA2E0 → #3D6FC0`, `dusk` `#F7B388 → #E58AA0 → #7D63B8 → #2C2C5E`, `night` `#3B3F7A → #23264F → #101230`, `rainy` `#B6BCC8 → #7C8597 → #444B5A`. Nunca hardcodar cor/raio/espaço em tela: só via `ui/tokens`.
- Emoji como ícone é permitido e desejado (atividades, fatores, badges, glifos de tempo, abas). Tom factual: sem exclamação, sem "Boa!", sem toast, sem adesivo torto (regra do usuário).
- Acessibilidade: todo toque com `accessibilityRole`/`accessibilityLabel`; cor de score sempre com texto ou número; animações desligam com `useReducedMotion()`; tamanhos de fonte escalam (`allowFontScaling` padrão).
- Testes: RNTL com serviços falsos como no Plano 2; funções puras com Jest; MSW só na Task 11. Cobertura global ≥ 80 %, `src/domain` 100 %. Os testes existentes de tela devem continuar passando; quando um texto mudar de propósito, o teste é atualizado na mesma tarefa com justificativa.
- Conventional commits, sem trailers (hook rejeita). Branch `feat/plano-3-ceu-vivo` a partir de `master`.
- Todos os comandos assumem `cwd = /Users/raphaelmardine/programacao/Projetos Pessoais/melhor-hora`.

---

## Mapa de arquivos

```
apps/mobile/src/
├── domain/gamification/deriveProgress.ts        # + plansByDate; ActivityRecord.minuteLeft
├── domain/gamification/events.ts, records.ts    # minuteLeft opcional
├── application/useCases/confirmActivity.ts, logActivity.ts   # minuteLeft
├── infrastructure/storage/eventSchema.ts        # minuteLeft opcional
├── presentation/
│   ├── ui/tokens.ts                             # cores, espaços, raios, tipografia, gradientes
│   ├── ui/Sky.tsx (+test)                       # gradiente por fase com transição
│   ├── ui/skyPhase.ts (+test)                   # phaseFor(now, daily, isBadDay) → SkyPhase
│   ├── ui/Text.tsx, Surface.tsx, Button.tsx, Chip.tsx, Pill.tsx, SectionHeader.tsx, Emoji.tsx
│   ├── ui/useReducedMotion.ts                   # wrapper do Reanimated
│   ├── ui/motion.ts                             # durações e curvas
│   ├── i18n/pt-BR.ts                            # + weather, day names, facts, receipt, picker
│   ├── i18n/weatherGlyph.ts (+test)             # weatherCode → emoji + resumo curto
│   ├── i18n/countryFlag.ts (+test)              # ISO2 → emoji de bandeira
│   ├── i18n/dates.ts (+test)                    # nomes de dias/meses PT-BR, "Amanhã", "Sábado, 13 set"
│   ├── hooks/useToday.ts                        # data local pela última previsão
│   ├── state/preferencesStore.ts                # + lastForecast { utcOffsetSeconds, timezone, at }
│   ├── features/home/
│   │   ├── HomeScreen.tsx (orquestra; < 50 linhas por função)
│   │   ├── components/HomeHeader.tsx, LevelOrb.tsx, StreakBar.tsx, ActivityPicker.tsx
│   │   ├── components/HeroCard.tsx, HeroBody.tsx, HeroActions.tsx, FactsRow.tsx, TipsRow.tsx, XpReceipt.tsx, UnlockCard.tsx
│   │   ├── components/HourlyTimeline.tsx, SunArc.tsx, NextDaysList.tsx, DayRow.tsx
│   │   ├── components/HourPicker.tsx, Welcome.tsx
│   │   ├── windowFacts.ts (+test), weekStrip.ts (+test), xpReceipt.ts (+test), countdown.ts (+test)
│   │   ├── useHeroActions.ts                    # handlers plan/confirm/log/cancel
│   │   └── heroState.ts (+test)                 # + minuteLeft/unlocked today
│   ├── features/day/DayScreen.tsx (+test)       # /day/[date]
│   ├── features/profile/ProfileScreen.tsx, components/LevelCard.tsx, StatsRow.tsx, MonthCalendar.tsx, BadgeGrid.tsx, HistoryList.tsx, monthGrid.ts (+test)
│   ├── features/cities/CitiesScreen.tsx, components/CityRow.tsx, SearchField.tsx
│   ├── AppErrorBoundary.tsx                     # visual sobre Sky
│   └── testing/msw/handlers.ts, server.ts       # Task 11
└── app/(tabs)/_layout.tsx (tab bar), app/day/[date].tsx
```

---

### Task 1: Domínio e application — `plansByDate`, minuto no registro

**Files:**

- Modify: `apps/mobile/src/domain/gamification/events.ts` (`minuteLeft?: number` em `ConfirmedEvent` e `LoggedEvent`)
- Modify: `apps/mobile/src/domain/gamification/records.ts` (`readonly minuteLeft: number`)
- Modify: `apps/mobile/src/domain/gamification/deriveProgress.ts` (+ `plansByDate`; `activePlan = plansByDate.get(today) ?? null`; drafts carregam `minuteLeft ?? 0`)
- Modify: `apps/mobile/src/domain/gamification/deriveProgress.test.ts`, `badges.test.ts` (se construírem `ActivityRecord` literal)
- Modify: `apps/mobile/src/domain/gamification/testing/fixtures.ts` (`confirmed`/`logged` aceitam `minuteLeft`)
- Modify: `apps/mobile/src/application/useCases/confirmActivity.ts`, `logActivity.ts` (+ `minuteLeft` no input, gravado no evento) e testes
- Modify: `apps/mobile/src/infrastructure/storage/eventSchema.ts` (`minuteLeft: z.number().int().min(0).max(59).optional()` nos dois eventos) e `progressRepository.test.ts` (round-trip com e sem `minuteLeft`)
- Modify: `apps/mobile/src/presentation/features/home/HomeScreen.tsx` (passa `minuteLeft: snapshot.now.minute`) e `HeroCard.tsx` (`t.home.done(record.hourLeft, record.minuteLeft)`)

**Interfaces:**

- Produces:
  - `Progress.plansByDate: ReadonlyMap<string, ActivePlan>` — planos não cancelados e não confirmados, o mais recente por data.
  - `ActivityRecord.minuteLeft: number` (0–59; 0 para eventos antigos sem o campo).
  - `ConfirmInput.minuteLeft?: number`, `LogInput.minuteLeft?: number` (omitido → não gravado; domínio lê como 0).

- [ ] **Step 1: Testes de domínio (RED)**

Em `deriveProgress.test.ts` adicione:

```ts
it('plansByDate expõe o plano ativo de cada data e activePlan é o de hoje', () => {
  const today = planned(TODAY, { startHour: 17 });
  const tomorrow = planned('2026-09-14', { startHour: 7 });
  const cancelledPlan = planned('2026-09-15', { startHour: 9 });
  const p = deriveProgress([today, tomorrow, cancelledPlan, cancelled(cancelledPlan)], cfg, TODAY);
  expect([...p.plansByDate.keys()].sort()).toEqual([TODAY, '2026-09-14']);
  expect(p.plansByDate.get('2026-09-14')?.window.startHour).toBe(7);
  expect(p.activePlan?.planId).toBe(today.id);
});

it('plano confirmado sai de plansByDate', () => {
  const plan = planned(TODAY, { startHour: 17 });
  const p = deriveProgress([plan, confirmed(plan)], cfg, TODAY);
  expect(p.plansByDate.size).toBe(0);
});

it('minuteLeft entra no registro e vale 0 quando ausente', () => {
  const plan = planned(TODAY, { startHour: 17 });
  const p = deriveProgress(
    [plan, confirmed(plan, { hourLeft: 17, minuteLeft: 42 }), logged('2026-09-12')],
    cfg,
    TODAY,
  );
  expect(p.records.find((r) => r.date === TODAY)?.minuteLeft).toBe(42);
  expect(p.records.find((r) => r.date === '2026-09-12')?.minuteLeft).toBe(0);
});
```

Atualize as fixtures `confirmed(plan, { hourLeft?, hourScore?, minuteLeft? })` e `logged(date, { …, minuteLeft? })` para gravar `minuteLeft` quando informado.

Run: `pnpm --filter mobile test -- deriveProgress` → FAIL (`plansByDate` indefinido, `minuteLeft` ausente).

- [ ] **Step 2: Implementar no domínio**

`events.ts`: adicione `readonly minuteLeft?: number;` a `ConfirmedEvent` e `LoggedEvent` (após `hourLeft`).
`records.ts`: adicione `readonly minuteLeft: number;` após `hourLeft`.
`deriveProgress.ts`:

```ts
export type Progress = {
  // ...campos existentes...
  readonly plansByDate: ReadonlyMap<string, ActivePlan>;
  readonly activePlan: ActivePlan | null;
  readonly todayRecord: ActivityRecord | null;
};

const toActivePlan = (plan: PlannedEvent): ActivePlan => ({
  planId: plan.id,
  cityId: plan.cityId,
  activity: plan.activity,
  date: plan.date,
  window: plan.window,
  windowScore: plan.windowScore,
});

/** Último plano não cancelado e não confirmado de cada data. */
function buildPlansByDate(sorted: readonly GamificationEvent[]): ReadonlyMap<string, ActivePlan> {
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const confirmedIds = new Set(sorted.flatMap((e) => (e.type === 'confirmed' ? [e.planId] : [])));
  return sorted
    .filter(
      (e): e is PlannedEvent =>
        e.type === 'planned' && !cancelled.has(e.id) && !confirmedIds.has(e.id),
    )
    .reduce(
      (map, plan) => new Map(map).set(plan.date, toActivePlan(plan)),
      new Map<string, ActivePlan>(),
    );
}
```

Remova `findActivePlan`; em `deriveProgress`: `const plansByDate = buildPlansByDate(sorted);` e `activePlan: plansByDate.get(today) ?? null`. Em `draftFromConfirmed` e `draftFromLogged` inclua `minuteLeft: e.minuteLeft ?? 0`. O `reduce` com `new Map(map)` mantém imutabilidade; o custo é O(n²) em planos, aceitável (poucos planos).

Run: `pnpm --filter mobile test -- gamification` → PASS; `src/domain` 100 % (o `?? 0` tem os dois lados cobertos pelo teste do Step 1).

- [ ] **Step 3: Application e storage (RED → GREEN)**

`confirmActivity.ts`: `ConfirmInput` ganha `readonly minuteLeft?: number`; ao gravar: `...(input.minuteLeft === undefined ? {} : { minuteLeft: input.minuteLeft })` (respeita `exactOptionalPropertyTypes`). Idem `logActivity.ts`/`LogInput`. Testes: em `confirmActivity.test.ts` o caso feliz passa `minuteLeft: 42` e espera o evento com `minuteLeft: 42`; adicione um caso sem `minuteLeft` esperando o evento sem a chave. Idem em `logActivity.test.ts`.

`eventSchema.ts`: nos objetos `confirmed` e `logged` adicione `minuteLeft: z.number().int().min(0).max(59).optional()`. Em `progressRepository.test.ts` adicione um round-trip com `minuteLeft: 7` e outro sem o campo (ambos devem carregar iguais ao gravado).

`HomeScreen.tsx`: nos `mutateAsync` de confirm e log, passe `minuteLeft: snapshot.now.minute`. `HeroCard.tsx` (estado `done`): `t.home.done(state.record.hourLeft, state.record.minuteLeft)`. Os testes de tela existentes esperam `Concluído às 14h00` e `20h00` com o relógio falso em minuto 0: continuam válidos.

Run: `pnpm --filter mobile test && pnpm lint && pnpm typecheck` → tudo verde.

- [ ] **Step 4: Commit**

```bash
git add -A apps/mobile/src
git commit -m "feat(domain): planos por data e minuto no registro de atividade"
```

---

### Task 2: Preferências guardam o fuso da última previsão; `useToday`

**Files:**

- Modify: `apps/mobile/src/presentation/state/preferencesStore.ts` (+ `lastForecast`, `rememberForecast`)
- Modify: `apps/mobile/src/presentation/queries/useForecast.ts` (ao sucesso, `rememberForecast`)
- Create: `apps/mobile/src/presentation/hooks/useToday.ts`
- Modify: `apps/mobile/src/presentation/features/profile/ProfileScreen.tsx` (usa `useToday`)
- Create: `apps/mobile/src/presentation/hooks/useToday.test.ts`

**Interfaces:**

- Produces: `PreferencesState.lastForecast: { utcOffsetSeconds: number; timezone: string } | null`, `rememberForecast(f: Forecast): void`; `useToday(): { date: string; utcOffsetSeconds: number | null }` (usa o fuso da última previsão; sem previsão, cai no fuso do aparelho com `utcOffsetSeconds: null`).

- [ ] **Step 1: Teste de `useToday` (RED)**

```ts
import { renderHook } from '@testing-library/react-native';

import { fakeServices, fixedClock } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';

import { useToday } from './useToday';

const wrapper =
  (services: ReturnType<typeof fakeServices>) =>
  ({ children }: { children: React.ReactNode }) => <ServicesProvider services={services}>{children}</ServicesProvider>;

describe('useToday', () => {
  beforeEach(() => usePreferences.setState({ lastForecast: null }));

  it('usa o fuso da última previsão', () => {
    usePreferences.setState({ lastForecast: { utcOffsetSeconds: 9 * 3600, timezone: 'Asia/Tokyo' } });
    // 2026-09-13T17:00Z → 14/09 02:00 em Tóquio
    const services = fakeServices({ clock: fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0)) });
    const { result } = renderHook(() => useToday(), { wrapper: wrapper(services) });
    expect(result.current).toEqual({ date: '2026-09-14', utcOffsetSeconds: 32400 });
  });

  it('sem previsão usa o fuso do aparelho (TZ=UTC nos testes)', () => {
    const services = fakeServices({ clock: fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0)) });
    const { result } = renderHook(() => useToday(), { wrapper: wrapper(services) });
    expect(result.current).toEqual({ date: '2026-09-13', utcOffsetSeconds: null });
  });
});
```

(O arquivo é `.test.tsx` por causa do JSX do wrapper.)

- [ ] **Step 2: Implementar**

`preferencesStore.ts`: tipo `LastForecast = { readonly utcOffsetSeconds: number; readonly timezone: string }`; estado inicial `lastForecast: null`; ação `rememberForecast: (f) => set({ lastForecast: { utcOffsetSeconds: f.utcOffsetSeconds, timezone: f.timezone } })`; `version: 2` com `migrate: (persisted) => ({ ...(persisted as object), lastForecast: null })` para o `prefs:v1` antigo (documente em comentário).

`useForecast.ts`: dentro do `queryFn`, após `r.ok`, chame `usePreferences.getState().rememberForecast(r.value)` antes de devolver (fora de render; sem hook).

`useToday.ts`:

```ts
import { localNow } from '@/domain';

import { useServices } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';

const deviceOffsetSeconds = (): number => -new Date().getTimezoneOffset() * 60;

/** "Hoje" no fuso da cidade da última previsão; sem previsão, no fuso do aparelho. */
export function useToday(): { date: string; utcOffsetSeconds: number | null } {
  const services = useServices();
  const last = usePreferences((s) => s.lastForecast);
  const offset = last?.utcOffsetSeconds ?? deviceOffsetSeconds();
  return {
    date: localNow(services.ports.clock.now(), offset).date,
    utcOffsetSeconds: last?.utcOffsetSeconds ?? null,
  };
}
```

`ProfileScreen.tsx`: substitua o cálculo local por `const { date: today } = useToday();`.

Run: `pnpm --filter mobile test -- "useToday|ProfileScreen|preferences"` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A apps/mobile/src
git commit -m "feat(app): fuso da última previsão nas preferências e useToday"
```

---

### Task 3: Design system — tokens, `Sky`, primitivos, movimento reduzido

**Files:**

- Modify: `apps/mobile/package.json` (deps), `apps/mobile/jest.setup.js` (Reanimated), `apps/mobile/app.json` (`userInterfaceStyle: "light"` mantido; `splash`/`backgroundColor` do céu)
- Create: `apps/mobile/src/presentation/ui/tokens.ts`, `motion.ts`, `useReducedMotion.ts`
- Create: `apps/mobile/src/presentation/ui/skyPhase.ts` (+ `.test.ts`), `Sky.tsx` (+ `.test.tsx`)
- Create: `apps/mobile/src/presentation/ui/Text.tsx`, `Surface.tsx`, `Button.tsx`, `Chip.tsx`, `Pill.tsx`, `SectionHeader.tsx`, `Emoji.tsx`, `index.ts`
- Modify: `apps/mobile/src/presentation/i18n/dates.ts` (Create, + `.test.ts`)

**Interfaces:**

- Produces:
  - `tokens = { color: { text, textMuted, surface, surfaceStrong, border, ink, score: { great, good, fair, poor }, scoreInk: {…}, accent, accentInk, mint, mintInk, gold, goldInk, danger }, space: { 1:4 … 8:32, 10:40 }, radius: { hero:24, card:16, inner:12, pill:999 }, font: { display: 52, xp: 56, title: 20, body: 14, small: 12, micro: 10 }, gradients: Record<SkyPhase, readonly [string, string, ...string[]]> }`
  - `type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'rainy'`; `phaseFor(input: { now: LocalDateTime; daily: DailySummary | null; isBadDay: boolean }): SkyPhase`
  - `<Sky phase>` — `LinearGradient` de tela cheia com crossfade de 600 ms (Reanimated) ao trocar `phase`; sem animação com movimento reduzido.
  - `<AppText variant="display|xp|title|body|small|micro|kicker" tone="default|muted|ink" tabular>`; `<Surface strength="soft|strong" radius="hero|card|inner">`; `<Button kind="primary|mint|quiet" label subtext? onPress disabled accessibilityLabel?>`; `<Chip label emoji? active score? onPress>`; `<Pill label tone="great|good|fair|poor|neutral">`; `<SectionHeader title aside?>`; `<Emoji symbol size? label>` (com `accessibilityLabel`).
  - `motion = { fast: 150, normal: 300, sky: 600, easing }`; `useReducedMotion(): boolean` (reexporta o do Reanimated).
  - `dates.ts`: `weekdayShort(date)`, `formatDayTitle(date, today)` ('Hoje', 'Amanhã', 'Sábado, 13 set'), `monthTitle(year, month)`; PT-BR sem `Intl` (arrays fixos), testados.

- [ ] **Step 1: Dependências e setup de teste**

```bash
pnpm --filter mobile exec expo install expo-linear-gradient react-native-reanimated react-native-worklets
```

`apps/mobile/jest.setup.js` — acrescente ao final: `require('react-native-reanimated').setUpTests();`. Se o `setUpTests` não existir na versão instalada, use `jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));` e registre o desvio. `babel-preset-expo` já inclui o plugin do Reanimated (não crie `babel.config.js` a menos que o `expo export` reclame; se criar, use `module.exports = (api) => { api.cache(true); return { presets: ['babel-preset-expo'] }; };`).

Run: `pnpm --filter mobile test -- result` → continua verde (setup carrega sem erro).

- [ ] **Step 2: `tokens.ts` e `motion.ts`**

```ts
// tokens.ts
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'rainy';

export const tokens = {
  color: {
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.78)',
    surface: 'rgba(255,255,255,0.14)',
    surfaceStrong: 'rgba(255,255,255,0.22)',
    border: 'rgba(255,255,255,0.28)',
    ink: '#2C2C5E',
    accent: '#FFFFFF',
    accentInk: '#4B3FB5',
    mint: '#8FF0B6',
    mintInk: '#0A4A2A',
    gold: '#FFD66B',
    goldInk: '#5A3F00',
    danger: '#FF9B8A',
    dangerInk: '#5A1A0F',
    score: { great: '#8FF0B6', good: '#8FF0B6', fair: '#FFD66B', poor: '#FF9B8A' },
    scoreInk: { great: '#0A4A2A', good: '#0A4A2A', fair: '#5A3F00', poor: '#5A1A0F' },
    shade: 'rgba(0,0,0,0.16)',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  radius: { hero: 24, card: 16, inner: 12, pill: 999 },
  font: { display: 52, xp: 56, title: 20, subtitle: 16, body: 14, small: 12, micro: 10 },
  gradients: {
    dawn: ['#F6C9A0', '#E8927A', '#8E6AA6', '#4C4477'],
    day: ['#9FD3F5', '#5AA2E0', '#3D6FC0'],
    dusk: ['#F7B388', '#E58AA0', '#7D63B8', '#2C2C5E'],
    night: ['#3B3F7A', '#23264F', '#101230'],
    rainy: ['#B6BCC8', '#7C8597', '#444B5A'],
  } satisfies Record<SkyPhase, readonly [string, string, ...string[]]>,
} as const;

export type ScoreTone = keyof typeof tokens.color.score;
```

```ts
// motion.ts
import { Easing } from 'react-native-reanimated';

export const motion = {
  fast: 150,
  normal: 300,
  sky: 600,
  count: 900,
  easing: Easing.out(Easing.cubic),
} as const;
```

```ts
// useReducedMotion.ts
export { useReducedMotion } from 'react-native-reanimated';
```

- [ ] **Step 3: `skyPhase.ts` com teste (RED → GREEN)**

Teste:

```ts
import type { DailySummary, LocalDateTime } from '@/domain';

import { phaseFor } from './skyPhase';

const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const daily: DailySummary = {
  date: '2026-09-13',
  sunrise: '2026-09-13T06:12',
  sunset: '2026-09-13T18:04',
  weatherCode: 1,
  tempMax: 26,
  tempMin: 16,
};

describe('phaseFor', () => {
  it.each([
    [at(5, 30), 'dawn'],
    [at(12), 'day'],
    [at(18, 30), 'dusk'],
    [at(22), 'night'],
  ] as const)('%o → %s', (now, phase) => {
    expect(phaseFor({ now, daily, isBadDay: false })).toBe(phase);
  });
  it('dia ruim vira rainy em qualquer hora', () => {
    expect(phaseFor({ now: at(12), daily, isBadDay: true })).toBe('rainy');
  });
  it('sem resumo diário assume 06:00–18:00', () => {
    expect(phaseFor({ now: at(12), daily: null, isBadDay: false })).toBe('day');
    expect(phaseFor({ now: at(23), daily: null, isBadDay: false })).toBe('night');
  });
});
```

Implementação:

```ts
import { dayPhase, minutesOfDay, type DailySummary, type LocalDateTime } from '@/domain';

import type { SkyPhase } from './tokens';

const DEFAULT_SUNRISE = 6 * 60;
const DEFAULT_SUNSET = 18 * 60;

export function phaseFor(input: {
  now: LocalDateTime;
  daily: DailySummary | null;
  isBadDay: boolean;
}): SkyPhase {
  if (input.isBadDay) return 'rainy';
  const sunrise = input.daily ? minutesOfDay(input.daily.sunrise) : DEFAULT_SUNRISE;
  const sunset = input.daily ? minutesOfDay(input.daily.sunset) : DEFAULT_SUNSET;
  return dayPhase(input.now.hour * 60 + input.now.minute, sunrise, sunset);
}
```

(`minutesOfDay` e `dayPhase` já existem no domínio e estão no barrel.)

- [ ] **Step 4: `Sky.tsx` com teste**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from './motion';
import { tokens, type SkyPhase } from './tokens';
import { useReducedMotion } from './useReducedMotion';

type Props = ViewProps & { readonly phase: SkyPhase };

/**
 * Fundo de tela cheia. Troca de fase com crossfade: o gradiente anterior fica por baixo e o novo
 * entra com opacidade 0 → 1. Com movimento reduzido a troca é imediata.
 */
export function Sky({ phase, style, children, ...rest }: Props) {
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState<SkyPhase>(phase);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (phase === previous) return;
    if (reduced) {
      setPrevious(phase);
      return;
    }
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: motion.sky, easing: motion.easing }, (done) => {
      if (done) runOnJS(setPrevious)(phase);
    });
  }, [phase, previous, reduced, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.fill, style]} {...rest}>
      <LinearGradient colors={tokens.gradients[previous]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
        <LinearGradient colors={tokens.gradients[phase]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
```

Importe `runOnJS` de `react-native-reanimated` (Reanimated 4: `runOnJS` continua exportado; se o typecheck acusar, use `scheduleOnRN` de `react-native-worklets` e registre). Teste (`Sky.test.tsx`): renderiza com `phase="day"` e um filho com texto; `rerender` com `phase="night"`; asserta que o filho continua renderizado e que dois `LinearGradient` existem (por `UNSAFE_getAllByType(LinearGradient)`). Não teste a animação em si.

- [ ] **Step 5: Primitivos**

`Text.tsx`:

```tsx
import { StyleSheet, Text, type TextProps } from 'react-native';

import { tokens } from './tokens';

type Variant = 'display' | 'xp' | 'title' | 'subtitle' | 'body' | 'small' | 'micro' | 'kicker';
type Tone = 'default' | 'muted' | 'ink';
type Props = TextProps & {
  readonly variant?: Variant;
  readonly tone?: Tone;
  readonly tabular?: boolean;
  readonly weight?: '400' | '600' | '700' | '800' | '900';
};

export function AppText({
  variant = 'body',
  tone = 'default',
  tabular = false,
  weight,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        styles[variant],
        styles[`tone_${tone}`],
        tabular && styles.tabular,
        weight && { fontWeight: weight },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: tokens.color.text },
  display: {
    fontSize: tokens.font.display,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: tokens.font.display,
  },
  xp: {
    fontSize: tokens.font.xp,
    fontWeight: '900',
    letterSpacing: -2.5,
    lineHeight: tokens.font.xp,
  },
  title: { fontSize: tokens.font.title, fontWeight: '700' },
  subtitle: { fontSize: tokens.font.subtitle, fontWeight: '700' },
  body: { fontSize: tokens.font.body, lineHeight: 20 },
  small: { fontSize: tokens.font.small, lineHeight: 16 },
  micro: { fontSize: tokens.font.micro, lineHeight: 14 },
  kicker: {
    fontSize: tokens.font.small,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  tone_default: {},
  tone_muted: { color: tokens.color.textMuted },
  tone_ink: { color: tokens.color.ink },
  tabular: { fontVariant: ['tabular-nums'] },
});
```

`Surface.tsx`: `View` com `backgroundColor` `surface`/`surfaceStrong`/`shade`, `borderWidth: 1`, `borderColor: border` (só em `strength="strong"`), `borderRadius` por prop, `padding` por prop (`space` key), `gap` por prop.
`Button.tsx`: `Pressable` com `accessibilityRole="button"`, `kind` `primary` (fundo branco, texto `accentInk`, sombra leve), `mint` (fundo `mint`, texto `mintInk`), `quiet` (fundo `surface`, texto branco); `label` em `subtitle`/`weight 800` e `subtext` opcional em `small` `muted`; `disabled` → `opacity 0.6`; `pressed` → `opacity 0.85`.
`Chip.tsx`: `Pressable` pílula; `active` → fundo branco + texto `accentInk` + `score` numa mini-pílula `mint` à direita; inativo → `surface` + texto branco; `accessibilityState={{ selected: active }}`.
`Pill.tsx`: fundo `tokens.color.score[tone]` (ou `surface` se `neutral`), texto `scoreInk[tone]` `weight 800` `small`.
`SectionHeader.tsx`: linha com `title` (`subtitle`) à esquerda e `aside` (`small muted`) à direita.
`Emoji.tsx`: `Text` com `fontSize={size ?? 16}`, `accessibilityLabel={label}`, `accessible`.
`index.ts` reexporta tudo.

Adicione um teste `ui/primitives.test.tsx` que renderiza cada primitivo com props mínimas e asserta textos/labels (cobertura dos ramos `active`/`disabled`/`tone`).

- [ ] **Step 6: `i18n/dates.ts` com teste**

```ts
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;
export const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;
export const MONTHS_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const parts = (date: string): { y: number; m: number; d: number } => {
  const [y, m, d] = date.split('-').map(Number);
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
};

/** 0 = domingo … 6 = sábado, sem depender do fuso do aparelho. */
export function weekdayIndex(date: string): number {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const weekdayShort = (date: string): string => WEEKDAYS_SHORT[weekdayIndex(date)] ?? '';
export const weekdayLong = (date: string): string => WEEKDAYS_LONG[weekdayIndex(date)] ?? '';

/** 'Hoje' | 'Amanhã' | 'Sábado, 13 set' */
export function formatDayTitle(date: string, today: string, tomorrow: string): string {
  if (date === today) return 'Hoje';
  if (date === tomorrow) return 'Amanhã';
  const { m, d } = parts(date);
  return `${weekdayLong(date)}, ${d} ${MONTHS_SHORT[m - 1] ?? ''}`;
}

/** 'Sábado, 13 de setembro' */
export function formatLongDate(date: string): string {
  const { m, d } = parts(date);
  return `${weekdayLong(date)}, ${d} de ${(MONTHS_LONG[m - 1] ?? '').toLowerCase()}`;
}

export const monthTitle = (year: number, month: number): string =>
  `${MONTHS_LONG[month - 1] ?? ''} ${year}`;
```

Os `?? ''`/`?? 0` são alcançáveis com datas malformadas: teste `weekdayShort('')`, `formatDayTitle('2026-13-01', …)` (mês 13 → `''`) e `parts('x')` via `formatLongDate('x')` para cobrir. Testes: 2026-09-13 é sábado (`'sáb'`, `'Sábado'`); `formatDayTitle` nos três casos; `formatLongDate('2026-09-13')` = `'Sábado, 13 de setembro'`; `monthTitle(2026, 9)` = `'Setembro 2026'`.

- [ ] **Step 7: Verificar e commitar**

Run: `pnpm --filter mobile test && pnpm lint && pnpm typecheck` → verde; `pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export && rm -rf /tmp/mh-export` → bundle ok (Reanimated e LinearGradient resolvem).

```bash
git add -A apps/mobile pnpm-lock.yaml
git commit -m "feat(ui): design system céu vivo com tokens, Sky, primitivos e datas PT-BR"
```

---

### Task 4: Home — cabeçalho, anel de nível, faixa de streak, chips e cartão-herói rico

**Files:**

- Create: `apps/mobile/src/presentation/features/home/windowFacts.ts` (+ `.test.ts`), `weekStrip.ts` (+ `.test.ts`), `xpReceipt.ts` (+ `.test.ts`), `countdown.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/presentation/features/home/components/HomeHeader.tsx`, `LevelOrb.tsx`, `StreakBar.tsx`, `HeroBody.tsx`, `HeroActions.tsx`, `FactsRow.tsx`, `TipsRow.tsx`, `XpReceipt.tsx`, `UnlockCard.tsx`, `Welcome.tsx`
- Modify: `apps/mobile/src/presentation/features/home/components/HeroCard.tsx`, `ActivityPicker.tsx`
- Create: `apps/mobile/src/presentation/features/home/useHeroActions.ts`
- Modify: `apps/mobile/src/presentation/features/home/HomeScreen.tsx` (usa `Sky`, `HomeHeader`, `StreakBar`, `useHeroActions`; funções < 50 linhas)
- Modify: `apps/mobile/src/presentation/i18n/pt-BR.ts` (+ `facts`, `receipt`, `unlock`, `streak`, `level`)
- Modify: `apps/mobile/src/presentation/features/home/HomeScreen.test.tsx` (novas asserções; as existentes mantidas)

**Interfaces:**

- Produces:
  - `windowFacts(hours: readonly HourScore[]): { apparent: number; rainPct: number; windKmh: number; uv: number }` — médias arredondadas sobre as horas da janela.
  - `weekStrip(input: { today: string; activeDates: ReadonlySet<string>; restDates: ReadonlySet<string> }): readonly { date: string; label: string; state: 'done' | 'today' | 'rest' | 'todayDone' | 'none' }[]` — 7 dias, de segunda a domingo da semana de `today`.
  - `xpReceipt(record: ActivityRecord): readonly { key: 'base' | 'hour' | 'plan' | 'streak'; label: string; value: string }[]` + `total`.
  - `countdown(now: LocalDateTime, startHour: number): { hours: number; minutes: number } | null` (null se já começou).
  - `useHeroActions({ city, activity, snapshot, hero }) → { onPlan, onCancel, onConfirm, onLogNow(hour, minute), busy, errorMessage }`.
  - `HeroCard` props: `{ state, config, now, actions: ReturnType<typeof useHeroActions>, unlockedToday: readonly BadgeState[] }`.

- [ ] **Step 1: Funções puras com testes (RED → GREEN)**

`windowFacts.test.ts`:

```ts
import { makeHourScore } from '@/domain/recommendation/testing/fixtures';

import { windowFacts } from './windowFacts';

it('faz a média arredondada dos fatores da janela', () => {
  const a = makeHourScore(17, 90);
  const b = makeHourScore(18, 96);
  const hours = [
    {
      ...a,
      hour: {
        ...a.hour,
        apparentTemperature: 22.4,
        precipitationProbability: 5,
        windSpeedKmh: 9,
        uvIndex: 3,
      },
    },
    {
      ...b,
      hour: {
        ...b.hour,
        apparentTemperature: 23.4,
        precipitationProbability: 7,
        windSpeedKmh: 11,
        uvIndex: 4,
      },
    },
  ];
  expect(windowFacts(hours)).toEqual({ apparent: 23, rainPct: 6, windKmh: 10, uv: 4 });
});
it('lista vazia devolve zeros', () => {
  expect(windowFacts([])).toEqual({ apparent: 0, rainPct: 0, windKmh: 0, uv: 0 });
});
```

```ts
import type { HourScore } from '@/domain';

export type WindowFacts = {
  readonly apparent: number;
  readonly rainPct: number;
  readonly windKmh: number;
  readonly uv: number;
};

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

export const windowFacts = (hours: readonly HourScore[]): WindowFacts => ({
  apparent: mean(hours.map((h) => h.hour.apparentTemperature)),
  rainPct: mean(hours.map((h) => h.hour.precipitationProbability)),
  windKmh: mean(hours.map((h) => h.hour.windSpeedKmh)),
  uv: mean(hours.map((h) => h.hour.uvIndex)),
});
```

`weekStrip.test.ts`: `today = '2026-09-13'` (sábado) com `activeDates {09-08, 09-09, 09-10, 09-11, 09-12}` e `restDates {09-07}` → 7 itens de `2026-09-07` (seg) a `2026-09-13` (dom) com labels `['seg','ter','qua','qui','sex','sáb','dom']` e estados `['rest','done','done','done','done','done','today']`; com `today` em `activeDates` → `'todayDone'`; dias futuros → `'none'`. Implementação: usa `weekdayIndex` e `addDays` (domínio) para achar a segunda-feira (`offset = (weekdayIndex + 6) % 7`), mapeia 7 datas, estado por prioridade `todayDone > today > done > rest > none`.
`xpReceipt.test.ts`: para um `ActivityRecord` com `xp { base 50, hourBonus 43, planBonus 25, streakBonus 35, total 153 }`, `hourScore 86`, `streakDays 7`, `planFulfilled true` → linhas `[{ key:'base', label:'Atividade registrada', value:'50' }, { key:'hour', label:'Saiu com score 86', value:'+43' }, { key:'plan', label:'Cumpriu o plano', value:'+25' }, { key:'streak', label:'7 dias seguidos', value:'+35' }]` e `total 153`; sem plano → sem a linha `plan`; `streakBonus 0` → sem a linha `streak`. Labels vêm de `t.receipt`.
`countdown.test.ts`: `now 08:15`, `startHour 17` → `{ hours: 8, minutes: 45 }`; `now 17:00` → `null`; `now 16:59` → `{ hours: 0, minutes: 1 }`.

- [ ] **Step 2: Componentes**

`LevelOrb.tsx`: anel de progresso sem SVG — `View` circular 34 px com borda 3 px `gold` e, por cima, um segundo `View` semicircular girado (`transform: rotate`) para simular o preenchimento por `progress` em 8 passos (0, 12.5 %…). Simplificação aceita: usar dois arcos de 180° com rotação proporcional (técnica CSS clássica). Dentro, círculo `ink` com o número do nível em `small weight 800`. `accessibilityLabel={t.level.aria(level, name, progressPct)}`.
`HomeHeader.tsx`: linha com cidade (`subtitle` + chevron `⌄`, toque → `/cities`, `accessibilityRole="button"`) e data/hora local (`small muted`, `formatLongDate(now.date)` + ` · ${hour}h`), à direita `Surface` pílula com `LevelOrb` + "Nível N" `micro muted` + nome `small 700`.
`StreakBar.tsx`: `Surface card` com `🔥 N dias seguidos` à esquerda e 7 quadradinhos 18×18 (`radius inner`, fundo por estado: `done`/`todayDone` mint com letra `mintInk`, `today` gold com contorno branco, `rest` tracejado `border`, `none` surface) com a inicial do dia; `accessibilityLabel` por quadrado (`'sábado: atividade feita'` etc., de `t.streak.state`).
`ActivityPicker.tsx`: usa `Chip` com `emoji`, `label` do perfil e `score` (só no ativo: melhor janela de hoje para aquela atividade — recebe `scoreFor?: (id) => number | null`; a Home passa uma função que roda `recommendDay` só para o ativo; para os inativos não mostra score).
`FactsRow.tsx`: 4 `Surface shade` iguais (`flex: 1`) com emoji (🌡 💧 🍃 ☀️), valor `subtitle tabular` e legenda `micro muted` (`t.facts`).
`TipsRow.tsx`: chips `surface` pequenos com o texto das dicas (`tip.text` + emoji por `TipId` em `t.tipEmoji`), quebra de linha.
`XpReceipt.tsx`: `Surface shade` com linhas do `xpReceipt` (label esquerda, valor `tabular` direita, separador tracejado) e total em `weight 800`.
`UnlockCard.tsx`: `Surface` dourado (fundo `gold` 25 %, borda `gold` 50 %) com ícone 52 px (emoji da badge em `t.badgeEmoji`), kicker `Nova conquista`, nome e descrição (`t.badgeDescription`).
`HeroBody.tsx`: por `state.kind` — `plan`: kicker `Melhor horário hoje` + `Pill` (`labels[label] · score`), `display` `17h – 19h`, `sentence` (`body`), `caveat` (`small muted`), `FactsRow(windowFacts(result.hours))`, `TipsRow`; `planned`: kicker `Planejado`, `display` `17h`, `countdown` (`Começa em 3 h 12 min`), lembrete (`Lembrete às 16h30`), previsão para a hora (`FactsRow` das horas da janela); `confirm`: kicker `Sua janela começou`, `display` janela, `Pill agora · score`; `done`: kicker `Concluído às 17h42`, `xp` `+153 XP` (animado na Task 10), `XpReceipt`, barra de nível (`Surface` + `View` largura % — reusa `LevelBar` criado aqui: `LevelBar.tsx` com `progress`, `label` esquerda/direita), `UnlockCard` para cada `unlockedToday`; `logNoPlan`: kicker `Sua janela de hoje já passou` (+ plano expirado); `noWindow`: `display` menor (`title`) `Sem janela boa hoje`, motivo, `Pill poor · score`.
`HeroActions.tsx`: mesmo mapeamento de botões de hoje, com `Button` (`primary` para planejar/confirmar, `mint` para confirmar, `quiet` para desfazer/registrar) e subtexto `+50 XP base · +25 se cumprir` no planejar (`t.home.planSubtext`).
`HeroCard.tsx`: `Surface strong hero` com um "brilho" decorativo (`View` circular 160 px `gold` 35 % posicionado no canto, `pointerEvents="none"`) + `HeroBody` + `HeroActions` + erro.
`Welcome.tsx`: extraído da Home (mesmo conteúdo, sobre `Sky dusk`, `display` menor e dois `Button`).
`useHeroActions.ts`: move `run`, `isActionError`, `cancellablePlanId` e os quatro handlers da Home; `onLogNow(hour, minute)` recebe a hora escolhida (Task 7) — por ora a Home passa `snapshot.now.hour/minute`.

- [ ] **Step 3: `HomeScreen.tsx` reescrito**

Estrutura: `Sky phase={phaseFor({ now, daily: today.daily, isBadDay })}` envolvendo `SafeAreaView` + `ScrollView`; `HomeHeader`; `StreakBar` (dados de `progress.data`); `ActivityPicker`; erro/carregando (`Surface` com texto e `Button quiet` de tentar de novo); `HeroCard`; `HourlyTimeline` (Task 5; até lá mantém `HourlyList`); `NextDaysList`. `isBadDay = today.bestScoreOfDay !== null && today.bestScoreOfDay < config.scores.fair`. `unlockedToday = progress.badges.filter((b) => b.unlockedOn === snapshot.now.date)`. Cada função de componente < 50 linhas: extraia `HomeContent` (recebe `city`, `config`, `overview`, `progress`) e `OverviewStatus`.

Textos novos em `pt-BR.ts` (`t.home.planSubtext`, `t.home.plannedKicker`, `t.home.startsIn(h, m)`, `t.home.reminderAt(h, m)`, `t.home.windowStarted`, `t.facts { apparent:'sensação', rain:'chuva', wind:'km/h', uv:'UV' }`, `t.receipt { base:'Atividade registrada', hour:(s)=>`Saiu com score ${s}`, plan:'Cumpriu o plano', streak:(n)=>`${n} dias seguidos`, total:'Total' }`, `t.unlock { kicker:'Nova conquista', count:(u,t)=>`${u} de ${t} conquistas` }`, `t.badgeEmoji` (🏅 🌅 🦉 🧭 🎯 📅 🤸 ☀️ por `BadgeId`), `t.badgeDescription` por `BadgeId` (frase do spec 5.5), `t.tipEmoji` por `TipId` (🧴 💧 🧥 ☔ 🧥), `t.streak { days:(n)=>`${n} dias seguidos`, state: { done:'atividade feita', today:'hoje', todayDone:'hoje, atividade feita', rest:'folga por mau tempo', none:'sem atividade' } }`, `t.level { short:(n)=>`Nível ${n}`, aria:(n,name,pct)=>`Nível ${n}, ${name}, ${pct}% para o próximo` }`).

- [ ] **Step 4: Testes de tela**

Mantenha os 7 testes existentes verdes (textos: `'14h – 17h'`, `'Ótimo · 100'`, `'Planejar Caminhada às 14h'`, `'Confirmar que fui'`, `'Concluído às 14h00'`, `'+130 XP'`, `'Planejado para as 17h'`, `'Desfazer plano'`, `'Sem janela boa hoje'`, `'Motivo principal: chuva.'`, `'Saí em outro horário'`, `'Sua janela de hoje já passou'`, `'Registrar atividade'`). Se `Pill` renderizar `Ótimo · 100` em dois `Text`, junte num só `Text` para o teste continuar válido. Adicione: (a) a faixa de streak mostra `'0 dias seguidos'` sem histórico e `'1 dias seguidos'`… não: com 1 registro ontem mostra `'1 dias seguidos'` — use `t.streak.days` com plural correto: `n === 1 ? '1 dia seguido' : `${n} dias seguidos``; ajuste `t.profile.streak` igual e o teste do Perfil (`/2 dias seguidos/` continua válido). (b) no estado `done`, o recibo mostra `'Cumpriu o plano'` e `'+25'`. (c) o cabeçalho mostra `'São Paulo, São Paulo'` e `'Nível 1'`. (d) o `FactsRow` mostra `'23°'`… com a fixture padrão sensação 22 → `'22°'` e `'5%'`.

Run: `pnpm --filter mobile test -- HomeScreen` e depois a suíte completa, lint, typecheck.

- [ ] **Step 5: Commit**

```bash
git add -A apps/mobile/src
git commit -m "feat(app): tela Hoje com céu, cabeçalho, streak, chips e cartão-herói rico"
```

---

### Task 5: Linha do dia com arco do sol e próximos dias com glifos

**Files:**

- Create: `apps/mobile/src/presentation/i18n/weatherGlyph.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/presentation/features/home/components/HourlyTimeline.tsx`, `SunArc.tsx`, `DayRow.tsx`
- Modify: `apps/mobile/src/presentation/features/home/components/NextDaysList.tsx`
- Delete: `apps/mobile/src/presentation/features/home/components/HourlyList.tsx`
- Modify: `HomeScreen.tsx`, `HomeScreen.test.tsx`, `pt-BR.ts`

**Interfaces:**

- Produces:
  - `weatherGlyph(code: number): { emoji: string; summary: string }` — WMO: 0 `☀️ céu limpo`; 1–2 `🌤 poucas nuvens`; 3 `☁️ nublado`; 45/48 `🌫 nevoeiro`; 51–57 `🌦 garoa`; 61–67 `🌧 chuva`; 71–77/85/86 `🌨 neve`; 80–82 `🌧 pancadas`; 95–99 `⛈ trovoada`; outro `🌡 sem dados`.
  - `<HourlyTimeline hours nowHour sunrise sunset>`; `<SunArc sunrise sunset nowMinutes>`; `<DayRow day title glyph isBest onPress>`; `NextDaysList` recebe `today`/`tomorrow` para títulos e `onOpenDay(date)`.

- [ ] **Step 1: `weatherGlyph` com teste** — tabela `it.each` cobrindo um código de cada faixa e o fallback.

- [ ] **Step 2: Componentes**

`SunArc.tsx`: `View` de 34 px de altura com borda superior tracejada e cantos arredondados (arco), rótulos `06:12`/`18:04` nas pontas (`micro muted`), e o emoji ☀️ posicionado em `left: ${pct}%` onde `pct = (nowMinutes − sunrise) / (sunset − sunrise)` limitado a [0, 1]; à noite mostra 🌙 no canto correspondente.
`HourlyTimeline.tsx`: `Surface card` com `SectionHeader` (`Seu dia, hora a hora` / `Agora: Razoável · 52`), `SunArc`, 24 barras (`View` `flex: 1`, altura `4 + score * 0.44` px, cor `tokens.color.score[label]`, contorno branco na hora atual), eixo `0h 6h 12h 18h 24h`, legenda (Ótimo/Ok/Evite). Cada barra com `accessibilityLabel={`${hour}h: ${score}, ${t.labels[label]}`}` e o conjunto com `accessibilityRole="list"`. Mantém um texto oculto por hora? Não: para o teste existente `'17h · 100 · Ótimo'`, troque a asserção para `getByLabelText('17h: 100, Ótimo')`.
`DayRow.tsx`: `Surface card` (borda mint e kicker `melhor da semana` quando `isBest`), grade: título (`formatDayTitle`) `weight 700`, glifo, resumo (`7h – 9h · 19°, seco` → `${start}h – ${end}h · ${tempMax}°`+`weatherGlyph.summary`), `Pill` do score; toque abre o dia (`accessibilityRole="button"`).
`NextDaysList.tsx`: `SectionHeader` (`Próximos dias`/ comparativo) +`DayRow`por dia; a Home passa`onOpenDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}`(rota criada na Task 6; até lá o`push`aponta para uma rota inexistente apenas em tipo — crie a rota mínima na Task 6 e, nesta tarefa, mantenha`onOpenDay` sem uso na Home para o typecheck passar, ligando na Task 6).

- [ ] **Step 3: Testes** — atualize `'lista as 24 horas e os próximos dias'`: `getByLabelText('17h: 100, Ótimo')` e `getByText(/Amanhã/)` + `getByText(/6h – 9h/)`. Adicione teste de `weatherGlyph`. Suíte, lint, typecheck verdes.

- [ ] **Step 4: Commit**

```bash
git add -A apps/mobile/src
git commit -m "feat(app): linha do dia com arco do sol e próximos dias com glifos"
```

---

### Task 6: Rota `/day/[date]` e planejar amanhã

**Files:**

- Create: `apps/mobile/src/app/day/[date].tsx` (re-export de `DayScreen`)
- Create: `apps/mobile/src/presentation/features/day/DayScreen.tsx` (+ `.test.tsx`), `dayHeroState.ts` (+ `.test.ts`)
- Modify: `apps/mobile/src/app/_layout.tsx` (Stack: `day/[date]` com `presentation: 'card'`, header oculto)
- Modify: `HomeScreen.tsx` (liga `onOpenDay`), `pt-BR.ts` (`t.day.back`, `t.day.planTomorrow(activity, hour)`, `t.day.viewOnly`)

**Interfaces:**

- Produces:
  - `dayHeroState(input: { day: DayRecommendation; date: string; today: string; tomorrow: string; plan: ActivePlan | null }): { kind: 'plan'; window; score } | { kind: 'planned'; plan } | { kind: 'viewOnly' } | { kind: 'noWindow' }` — só amanhã pode ser planejado (spec 4.3); hoje redireciona para a Home; outros dias são `viewOnly`.
  - `DayScreen` lê `date` de `useLocalSearchParams<'/day/[date]'>()`, usa `useOverview` para obter `nextDays.find(d => d.date === date)` (ou `today` quando `date === today`), `useProgress(today)` para `plansByDate.get(date)`, e `useHeroActions` para planejar/desfazer (reaproveitando `planActivity`, que já aceita qualquer `window.date`).

- [ ] **Step 1: `dayHeroState` com testes** — amanhã com janela e sem plano → `plan`; amanhã com plano em `plansByDate` → `planned`; depois de amanhã → `viewOnly` mesmo com janela; dia sem janela → `noWindow`; `date === today` → `viewOnly` (a tela redireciona antes).

- [ ] **Step 2: `DayScreen.tsx`**

`Sky` com fase calculada para o meio-dia daquele dia (`phaseFor({ now: { ...now, hour: 12 }, daily: day.daily, isBadDay })`); cabeçalho com botão voltar (`router.back()`, `accessibilityLabel={t.day.back}`), título `formatDayTitle(date, today, tomorrow)` + `formatLongDate(date)`; `HeroCard`-like reduzido: reutilize `HeroBody` para `plan`/`noWindow` passando um `HeroState` sintético (`{ kind: 'plan', day, window, score }`) e `HeroActions` com `onPlan` (label `t.day.planTomorrow(name, hour)`) ou, em `planned`, o `Button quiet` de desfazer; em `viewOnly` mostre `t.day.viewOnly` ('Planejamento disponível só para amanhã') em `small muted`. Abaixo, `HourlyTimeline` do dia (sem `nowHour`) e `FactsRow` da janela. Se `date === today`, `router.replace('/')`. Se o dia não existir na previsão, `Surface` com `t.day.notFound` e botão voltar.

`app/_layout.tsx`: `<Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="day/[date]" options={{ presentation: 'card' }} /></Stack>`.

- [ ] **Step 3: Teste de tela** — mocke `expo-router` com `useLocalSearchParams: () => ({ date: '2026-09-14' })`, `useRouter: () => ({ back: mockBack, replace: mockReplace })`; com `goodServices()` e cidade selecionada: `findByText('Amanhã')`, `getByText(/6h – 9h/)`, `press('Planejar Caminhada às 6h')` → `waitFor(() => progress.events().some(e => e.type === 'planned' && e.date === '2026-09-14'))` e `findByText('Desfazer plano')`; segundo teste com `date: '2026-09-15'` → `getByText('Planejamento disponível só para amanhã')` e nenhum botão de planejar.

- [ ] **Step 4: Ligar na Home e commitar** — `NextDaysList onOpenDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}`; o mock de `expo-router` do `HomeScreen.test.tsx` ganha `push: mockPush` e um teste `press` na linha de amanhã → `mockPush` chamado com `{ pathname: '/day/[date]', params: { date: '2026-09-14' } }`.

```bash
git add -A apps/mobile/src
git commit -m "feat(app): tela do dia com planejamento de amanhã"
```

---

### Task 7: Seletor de hora no registro sem plano

**Files:**

- Create: `apps/mobile/src/presentation/features/home/components/HourPicker.tsx`
- Create: `apps/mobile/src/presentation/features/home/pickableHours.ts` (+ `.test.ts`)
- Modify: `HeroActions.tsx`, `HeroBody.tsx` (`logNoPlan`/`noWindow`/`confirm` "saí em outro horário"), `useHeroActions.ts`, `HomeScreen.test.tsx`, `pt-BR.ts`

**Interfaces:**

- Produces:
  - `pickableHours(today: DayRecommendation, now: LocalDateTime): readonly { hour: number; score: number; label: ScoreLabel }[]` — horas de 0 até `now.hour` inclusive, com o score da hora.
  - `<HourPicker options selected onSelect>` — chips horizontais `'6h'`, `'7h'`… com `Pill` do score; o selecionado em destaque.
  - Fluxo: em `logNoPlan`, `noWindow` e no link "Saí em outro horário" do `confirm`, o botão principal passa a abrir o `HourPicker` inline (estado local `pickingHour`), com `Button mint` `t.home.confirmHour(hour)` ('Registrar às 7h') que chama `onLogNow(hour, minute = 0 se hour < now.hour, senão now.minute)` com `hourScore` = score da hora escolhida.

- [ ] **Step 1: `pickableHours` com testes** — `now 14:30` → 15 opções (0–14) com scores das horas; `now 0:05` → 1 opção.

- [ ] **Step 2: UI e ações** — `useHeroActions.onLogNow(hour, minute, hourScore)`; `HeroActions` mantém `pickingHour` em `useState`; ao abrir, mostra `HourPicker` com `selected` inicial = `now.hour` e o botão de confirmar; `Button quiet` `t.home.cancelPick` ('Cancelar') fecha. Texto do botão de abrir continua `'Registrar atividade'`/`'Saí em outro horário'`.

- [ ] **Step 3: Testes** — atualize os testes existentes que pressionam `'Registrar atividade'`/`'Saí em outro horário'`: após o toque, `press('Registrar às 14h')` (relógio 14:00) ou `'Registrar às 20h'` (praia às 20:00) e as asserções de `'Concluído às …'` seguem. Adicione: escolher `'7h'` e registrar → `'Concluído às 7h00'` e o evento `logged` com `hourLeft: 7` e `hourScore` da hora 7 (`progress.events()`).

- [ ] **Step 4: Commit** — `feat(app): seletor de hora ao registrar atividade sem plano`

---

### Task 8: Perfil — nível, números, calendário do mês, conquistas e histórico

**Files:**

- Create: `apps/mobile/src/presentation/features/profile/monthGrid.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/presentation/features/profile/components/LevelCard.tsx`, `StatsRow.tsx`, `MonthCalendar.tsx`, `BadgeGrid.tsx`, `BadgeDetail.tsx`, `HistoryList.tsx`
- Modify: `ProfileScreen.tsx`, `ProfileScreen.test.tsx`, `pt-BR.ts`

**Interfaces:**

- Produces:
  - `monthGrid(input: { year: number; month: number; activeDates; restDates; today: string }): { title: string; weekdays: readonly string[]; cells: readonly ({ date: string; day: number; state: 'done' | 'rest' | 'today' | 'todayDone' | 'future' | 'none' } | null)[] }` — semana começa na segunda; células `null` no preenchimento; `title` via `monthTitle`.
  - `LevelCard` (orb grande 64 px + nome + `Nível N`, `xp atual`, `faltam N para {próximo}`, `LevelBar`), `StatsRow` (🔥 dias seguidos, 🏃 atividades, 🧭 cidades — três `Surface` iguais), `MonthCalendar` (7 colunas, células 8 px de raio, cores por estado, legenda), `BadgeGrid` (4 colunas, ícone 58 px, desbloqueada dourada, bloqueada cinza 35 % com progresso; toque abre `BadgeDetail` — `Surface` inline abaixo da grade com nome, descrição e critério), `HistoryList` (linhas `Surface` com emoji da atividade, `Corrida · São Paulo`? não há nome da cidade no registro, só `cityId` — mostre `Corrida · 17h42` e a data por `formatDayTitle`; `+153 XP` em `gold`).

- [ ] **Step 1: `monthGrid` com testes** — setembro/2026 começa na terça (1/9 é terça): `cells[0]` é `null` (segunda), `cells[1].day === 1`; 30 dias; `today = '2026-09-13'` marca `today`/`todayDone`; `activeDates` → `done`; `restDates` → `rest`; datas após hoje → `future`; `title === 'Setembro 2026'`; `weekdays === ['seg','ter','qua','qui','sex','sáb','dom']`.

- [ ] **Step 2: Componentes e tela** — `ProfileScreen`: `Sky dusk` fixo (spec 3.5), `SafeAreaView`, `ScrollView`; título `t.profile.title` + `t.profile.since(date)` ('Desde 20 de agosto', a data do primeiro registro, ou `t.profile.noHistory`); `LevelCard`; `StatsRow`; `SectionHeader(monthTitle, `${ativos} dias ativos · ${folgas} folgas por chuva`)` + `MonthCalendar` do mês de `today`; `SectionHeader('Conquistas', 'N de 8')` + `BadgeGrid`; `SectionHeader('Histórico')` + `HistoryList` (últimos 20) ou vazio. Cada função < 50 linhas.

- [ ] **Step 3: Testes** — mantenha os dois testes existentes (ajuste `'2026-09-13 · Corrida · 18h · +100 XP'` para as novas partes: `getByText('Corrida · 18h00')` e `getByText('+100 XP')`; `'Nível 2 · Garoa'` continua). Adicione: calendário mostra `'Setembro 2026'` e a célula de hoje com `accessibilityLabel` `'13: hoje, atividade feita'`; tocar em `'Explorador'` mostra a descrição.

- [ ] **Step 4: Commit** — `feat(app): perfil com nível, calendário do mês, conquistas e histórico`

---

### Task 9: Cidades — busca com bandeiras, favoritas e recentes sobre o céu

**Files:**

- Create: `apps/mobile/src/presentation/i18n/countryFlag.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/presentation/features/cities/components/SearchField.tsx`, `CityRow.tsx`, `CitySection.tsx`
- Modify: `CitiesScreen.tsx`, `CitiesScreen.test.tsx`, `pt-BR.ts`

**Interfaces:**

- Produces: `countryFlag(iso2: string): string` — regional indicators (`'BR'` → 🇧🇷; vazio/inválido → `'🏳️'`).

- [ ] **Step 1: `countryFlag` com testes** — `'BR'`, `'br'`, `'PT'`, `''`, `'B'`, `'123'`.

- [ ] **Step 2: Tela** — `Sky night` fixo (busca é foco; céu escuro dá contraste ao campo claro); `SearchField` (`Surface strong` com 🔍, `TextInput` branco, botão limpar); `Button quiet` de localização; estados (`hint`, `searching`, erro, `noResults`) em `Surface`; `CityRow` (`Surface card`: bandeira 22 px, nome `subtitle`, `admin1, país` `small muted`, estrela `★/☆` com `accessibilityLabel`); `CitySection` para Favoritas/Recentes. Mantenha os `accessibilityLabel` e textos que os testes usam (`'Digite o nome da cidade'`, `'São Paulo, São Paulo, Brasil'` como `accessibilityLabel` da linha, `'Favoritar'`, `'Recentes'`, `'Favoritas'`, `'Pelo menos 2 letras'`). O texto visível da linha pode ser dividido em dois `Text`; então os testes passam a usar `getByLabelText('São Paulo, São Paulo, Brasil')` para a linha — atualize-os.

- [ ] **Step 3: Testes verdes e commit** — `feat(app): tela de cidades com bandeiras e seções sobre o céu`

---

### Task 10: Animações e abas

**Files:**

- Create: `apps/mobile/src/presentation/ui/CountUp.tsx` (+ `.test.tsx`), `ui/LevelBar.tsx` (mover da Task 4 se ainda não estiver em `ui/`), `ui/Reveal.tsx`
- Modify: `HeroBody.tsx` (XP com `CountUp`, `UnlockCard` com `Reveal`), `HourlyTimeline.tsx` (marcador "agora" pulsando), `app/(tabs)/_layout.tsx` (tab bar), `HomeScreen.tsx` (`Sky` já anima)

**Interfaces:**

- `<CountUp value duration?>`: anima de 0 até `value` com `withTiming` e `useDerivedValue` + `useAnimatedProps`? Simplifique: `useSharedValue` + `useAnimatedReaction` → `runOnJS(setShown)` a cada frame é caro; use `Animated.Text` com `useAnimatedProps({ text })` via `TextInput` não editável (técnica padrão do Reanimated) OU, mais simples e testável, um `useEffect` com `requestAnimationFrame` que interpola em JS por `motion.count` ms e respeita `useReducedMotion` (mostra o valor final direto). Ruling: a versão JS com `requestAnimationFrame`, testada com `jest.useFakeTimers` avançando o tempo e checando o texto final. `Reveal`: `Animated.View entering={FadeInDown.duration(motion.normal)}` ou sem animação com movimento reduzido. `LevelBar`: largura animada com `withTiming`.
- Tab bar: `tabBarStyle` translúcido escuro (`rgba(0,0,0,0.22)` sobre o céu, raio 22, margem 12), `tabBarIcon` com emoji (🌤 🔍 🏅), `tabBarActiveTintColor` branco, `tabBarInactiveTintColor` `textMuted`, `tabBarLabelStyle` `micro`. Como as abas ficam fora do `Sky` de cada tela, dê ao `Tabs` um `sceneStyle: { backgroundColor: tokens.gradients.dusk[3] }` para não piscar branco.

- [ ] **Step 1: `CountUp` com teste** (fake timers; `+0 XP` → `+153 XP` após `motion.count` ms; com `useReducedMotion` mockado como `true` mostra `+153 XP` já no primeiro render).
- [ ] **Step 2: Integrar** nas telas; `HomeScreen.test.tsx` com `jest.mock('react-native-reanimated', …)`? Não: `setUpTests()` já roda animações no Jest de forma síncrona; o teste `'+130 XP'` deve continuar passando — se falhar por timing, mocke `useReducedMotion` para `true` em `jest.setup.js` via `jest.mock('../src/presentation/ui/useReducedMotion', () => ({ useReducedMotion: () => true }))` e teste o `CountUp` isoladamente com o mock invertido.
- [ ] **Step 3: Commit** — `feat(app): animações de XP, nível e conquista; barra de abas sobre o céu`

---

### Task 11: Teste de tela ponta a ponta com MSW contra os adapters reais

**Files:**

- Create: `apps/mobile/src/presentation/testing/msw/handlers.ts`, `server.ts`
- Create: `apps/mobile/src/presentation/features/home/HomeScreen.msw.test.tsx`
- Modify: `apps/mobile/package.json` (devDep `msw`), `jest.setup.js` (nada global; o server é por arquivo)

- [ ] **Step 1: Instalar** — `pnpm --filter mobile add -D msw`. Se o ambiente Jest (`jest-expo`, jsdom-like) não tiver `fetch`/`Response`, use `undici` (`pnpm --filter mobile add -D undici`) e no teste `globalThis.fetch = undici.fetch` etc.; registre.

- [ ] **Step 2: Handlers** — `http.get('https://geocoding-api.open-meteo.com/v1/search', ({ request }) => HttpResponse.json(geocodingFixture))` e `http.get('https://api.open-meteo.com/v1/forecast', ({ request }) => { const url = new URL(request.url); expect(url.searchParams.get('timezone')).toBe('auto'); return HttpResponse.json(forecastFixture); })` usando os JSON reais de `infrastructure/openMeteo/testing/fixtures`. `server.ts`: `setupServer(...handlers)` e helpers `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(resetHandlers)`, `afterAll(close)`.

- [ ] **Step 3: Teste** — `createAppServices` com `createOpenMeteoGeocoding({ fetchFn: fetch })`, `createOpenMeteoForecast({ fetchFn: fetch })`, `memoryProgressRepository`, `fixedConfig`, `fixedClock` (um instante dentro do intervalo do fixture real, p.ex. o primeiro dia às 14:00 São Paulo), demais fakes; `renderWithProviders(<HomeScreen />, { services })` com a cidade `saoPaulo`; `findByText(/h – \d+h/)` e a linha do dia presente; segundo caso: handler devolvendo `HttpResponse.json({}, { status: 503 })` → `'O serviço de previsão respondeu com erro.'` e o botão de tentar de novo; terceiro: JSON fora do schema → `'Resposta inesperada do serviço de previsão.'`.

- [ ] **Step 4: Commit** — `test(app): tela Hoje ponta a ponta com MSW e adapters reais`

---

### Task 12: Fechamento — pendências herdadas, README, verificação

**Files:**

- Modify: `apps/mobile/tsconfig.json` (remover `baseUrl` e `ignoreDeprecations`; manter `paths`; validar `expo export`)
- Modify: `apps/mobile/src/presentation/AppErrorBoundary.tsx` (`ErrorScreen` sobre `Sky rainy` com `Surface`)
- Modify: `README.md` (seção "Estado" → Plano 3; screenshots placeholder; seção "Design"), `docs/superpowers/plans/2026-09-14-plano-3-pendencias.md` (criar)
- Modify: `docs/superpowers/plans/2026-09-14-plano-2-pendencias.md` (marcar resolvidos)

- [ ] **Step 1: tsconfig** — remova as duas chaves; `pnpm typecheck` e `pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export` devem passar (o alias `@/` resolve por `paths` + `babel-preset-expo`/Metro `tsconfigPaths`). Se o export falhar por alias, reverta e registre em pendências.
- [ ] **Step 2: ErrorScreen visual** — teste existente continua.
- [ ] **Step 3: Suíte completa, lint, typecheck** verdes; cobertura global ≥ 80 %, domínio 100 %.
- [ ] **Step 4: README e pendências** — README: "Plano 3 concluído: interface Céu vivo…", lista do que ver no app, nota do smoke manual (roteiro: os 8 passos do Plano 2 + abrir amanhã, planejar amanhã, registrar com hora escolhida, ver calendário e conquistas). `plano-3-pendencias.md`: o que a revisão final apontar + itens para o Plano 4 (BFF, config remota injetada nos casos de uso de gamificação, CI com lint dos configs, `env` falhar alto).
- [ ] **Step 5: Commit** — `docs: README do Plano 3 e pendências para o Plano 4`

---

## Self-review (feito ao escrever o plano)

**Cobertura do spec:** 3.2 Hoje (cabeçalho com anel de nível, faixa de streak com 7 dias, chips com score, herói, linha do dia com arco/barras/marcador/legenda, próximos dias com glifo/melhor da semana/comparativo, toque → `/day/[date]`) → T4, T5, T6. 3.2 Cidades (bandeira, favoritas/recentes, estados) → T9. 3.2 Perfil (nível/barra, três números, calendário com folgas, conquistas com progresso e descrição ao tocar, histórico) → T8. 3.2 Detalhe do dia (mesma visão, planejar só amanhã) → T6. 3.2 Primeira abertura → `Welcome` em T4. 3.3 estados (incl. "Registrar sem plano" com seletor de hora, "Concluído às 17h42" com minuto, recibo de XP, conquista desbloqueada) → T1, T4, T7. 3.5 Sky por fase + rainy, tokens, tipografia, movimento (XP, barra, conquista, marcador, transição do céu) com reduzir movimento, acessibilidade → T3, T10. 4.5 glifo/resumo por `weatherCode` → T5. 5.5 badges com progresso e descrição → T8. Pendências do Plano 2: fuso do Perfil → T2; `/day/[date]` e `plansByDate` → T1/T6; guard do recorder → já feito no Plano 2 (final fix); branches de `HeroCard`/`NextDaysList` → testes de T4/T5; seletor de hora → T7; minutos → T1; funções > 50 linhas → T4/T8/T9; MSW → T11; `tsconfig` → T12. Fora deste plano (Plano 4): BFF, config remota, CI, `env` falhar alto.

**Consistência de nomes:** `plansByDate`/`ActivePlan` (T1) usados em T6; `minuteLeft` (T1) em `t.home.done` (T1/T4) e T7; `useToday` (T2) em T8; `tokens`, `Sky`, `phaseFor`, primitivos (T3) em T4–T10; `windowFacts`/`weekStrip`/`xpReceipt`/`countdown` (T4) em `HeroBody`/`StreakBar`; `useHeroActions.onLogNow(hour, minute, hourScore)` (T4, assinatura final em T7); `HourlyTimeline` (T5) em T6; `weatherGlyph` (T5) em `DayRow`; `formatDayTitle`/`formatLongDate`/`monthTitle`/`weekdayIndex` (T3) em T4–T8; `countryFlag` (T9); `CountUp`/`Reveal`/`LevelBar` (T10; `LevelBar` criado em T4 dentro de `ui/`).

**Riscos:** Reanimated 4 no Jest (`setUpTests`) e no Expo Go (suportado no SDK 57); `runOnJS` vs `scheduleOnRN` (fallback indicado); `expo-linear-gradient` em testes (renderiza como View no jest-expo); `tsconfig` sem `baseUrl` pode exigir ajuste no Metro (fallback: reverter e registrar); tamanho das tarefas 4 e 8 (dividir em dois commits se o implementer pedir).
