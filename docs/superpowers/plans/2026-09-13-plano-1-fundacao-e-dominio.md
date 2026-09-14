# Plano 1: Fundação do monorepo e domínio (motor + gamificação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o monorepo pnpm com o app Expo (SDK 57) já equipado com tooling de qualidade, e implementar o domínio completo (motor de recomendação e gamificação) em TypeScript puro com 100 % de cobertura.

**Architecture:** O domínio vive em `apps/mobile/src/domain` e não importa nada de fora (nem React, nem Expo). Tudo é função pura sobre tipos imutáveis; erros são valores (`Result`). A config do motor (perfis, pesos, limiares, XP) é um objeto `EngineConfig` passado como parâmetro, com uma cópia embutida em `domain/config/defaultEngineConfig.ts`. O app abre com uma tela placeholder; telas reais vêm no Plano 2.

**Tech Stack:** pnpm workspaces (nodeLinker hoisted), Expo SDK 57 (React Native 0.86, React 19.2), TypeScript strict, jest-expo, ESLint flat config (eslint-config-expo, eslint-plugin-boundaries, eslint-plugin-import), Prettier, Husky, lint-staged, commitlint.

**Spec:** `docs/superpowers/specs/2026-09-13-melhor-hora-design.md` (seções 3.1, 4, 5, 6.1, 6.2, 8.1, 8.2)

## Global Constraints

- Node 22 e pnpm. Nunca npm ou yarn dentro do repositório.
- Expo SDK 57 (`expo@~57`), template `blank-typescript@sdk-57`. Expo Router entra no Plano 2.
- TypeScript `strict: true` e `noUncheckedIndexedAccess: true`.
- `apps/mobile/src/domain/**` não importa nada fora de `domain`. Imposto por ESLint boundaries.
- Imutabilidade: nunca mutar objetos ou arrays; usar spread, `map`, `filter`, `reduce`.
- Sem `console.*` em código de produção (regra ESLint `no-console: error`).
- Arquivos abaixo de 300 linhas; funções abaixo de 50 linhas.
- Textos de UI e descritores em PT-BR. Nomes de código em inglês.
- Commits em conventional commits (`feat:`, `test:`, `chore:`, `docs:`), sem linha de atribuição.
- Cobertura: `domain` 100 % (linhas, branches, funções); global mínima 80 %.
- Cada tarefa segue TDD: teste falhando → implementação mínima → teste passando → commit.
- Todos os comandos abaixo assumem `cwd = /Users/raphaelmardine/programacao/Projetos Pessoais/melhor-hora` salvo indicação.

---

## Mapa de arquivos do plano

```
melhor-hora/
├── package.json                     # raiz: scripts agregadores, husky, lint-staged, commitlint
├── pnpm-workspace.yaml              # apps/*, packages/*, nodeLinker hoisted
├── .npmrc
├── .editorconfig
├── .prettierrc / .prettierignore
├── commitlint.config.cjs
├── .husky/pre-commit, .husky/commit-msg
└── apps/mobile/
    ├── package.json                 # scripts: start, test, lint, typecheck; jest config
    ├── tsconfig.json                # strict + noUncheckedIndexedAccess + alias @/
    ├── eslint.config.js             # expo + prettier + boundaries + import/order + no-console
    ├── App.tsx                      # placeholder
    └── src/domain/
        ├── shared/result.ts                      # Result<T,E>, ok, err
        ├── forecast/types.ts                     # HourlyConditions, DailySummary, Forecast
        ├── time/localDateTime.ts                 # LocalDateTime, localNow, parseLocalIso, addDays
        ├── time/dayPhase.ts                      # dayPhase()
        ├── activities/types.ts                   # ActivityId, FactorId, ActivityProfile
        ├── config/types.ts                       # EngineConfig
        ├── config/defaultEngineConfig.ts         # cópia embutida (seção 3.1 + limiares)
        ├── recommendation/comfort.ts             # curvas de conforto por fator
        ├── recommendation/vetoes.ts              # vetos por weather_code, chuva, neve, térmico, nevoeiro
        ├── recommendation/scoreHour.ts           # scoreHour(), labelFor()
        ├── recommendation/windows.ts             # findBestWindow()
        ├── recommendation/descriptors.ts         # descritores PT-BR por fator
        ├── recommendation/sentence.ts            # buildSentence(), buildCaveat()
        ├── recommendation/tips.ts                # preparationTips()
        ├── recommendation/recommendDay.ts        # recommendDay()
        ├── recommendation/overview.ts            # recommendOverview() (hoje, próximos dias, agora, comparativo)
        ├── gamification/events.ts                # tipos de evento
        ├── gamification/xp.ts                    # computeXp()
        ├── gamification/levels.ts                # levelFor(), LEVELS
        ├── gamification/streak.ts                # computeStreak()
        ├── gamification/badges.ts                # evaluateBadges()
        └── gamification/deriveProgress.ts        # deriveProgress()
```

Testes ficam ao lado de cada arquivo como `*.test.ts`.

---

### Task 1: Raiz do monorepo

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.editorconfig`, `.prettierrc`, `.prettierignore`, `commitlint.config.cjs`

**Interfaces:**
- Produces: scripts raiz `pnpm lint`, `pnpm typecheck`, `pnpm test` que delegam a todos os workspaces.

- [ ] **Step 1: Criar `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
nodeLinker: hoisted
```

- [ ] **Step 2: Criar `.npmrc`**

```
engine-strict=true
auto-install-peers=true
```

- [ ] **Step 3: Criar `package.json` da raiz**

```json
{
  "name": "melhor-hora",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@10.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.8.0",
    "@commitlint/config-conventional": "^19.8.0",
    "husky": "^9.1.7",
    "lint-staged": "^16.1.0",
    "prettier": "^3.6.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,cjs,mjs}": ["prettier --write", "eslint --fix --no-warn-ignored"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

Se `pnpm --version` local for diferente de 10.15.0, ajuste `packageManager` para a versão instalada (`pnpm --version`).

- [ ] **Step 4: Criar `.editorconfig`, `.prettierrc`, `.prettierignore`**

`.editorconfig`:
```
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

`.prettierignore`:
```
node_modules
.expo
coverage
dist
pnpm-lock.yaml
docs/superpowers/mockups
```

- [ ] **Step 5: Criar `commitlint.config.cjs`**

```js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

- [ ] **Step 6: Instalar e verificar**

Run: `pnpm install && pnpm format:check`
Expected: instala sem erro; `format:check` termina com "All matched files use Prettier code style!" (ou lista só arquivos que você acabou de criar; rode `pnpm format` e repita).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: raiz do monorepo pnpm com prettier e commitlint"
```

---

### Task 2: App Expo com TypeScript estrito e Jest

**Files:**
- Create: `apps/mobile/` via create-expo-app
- Modify: `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, `apps/mobile/App.tsx`
- Create: `apps/mobile/src/domain/shared/result.ts`, `apps/mobile/src/domain/shared/result.test.ts`

**Interfaces:**
- Produces: `Result<T, E>`, `ok(value)`, `err(error)`, `isOk(r)`, `isErr(r)` em `@/domain/shared/result`.

- [ ] **Step 1: Criar o app**

Run: `pnpm create expo-app --template blank-typescript@sdk-57 apps/mobile`
Expected: pasta `apps/mobile` com `App.tsx`, `app.json`, `package.json`, `tsconfig.json`. Se o comando instalar dependências com outro gerenciador, apague `apps/mobile/node_modules` e qualquer lockfile dentro de `apps/mobile`, depois rode `pnpm install` na raiz.

- [ ] **Step 2: Ajustar `apps/mobile/package.json`**

Deixe `name` como `mobile`, e garanta os scripts e a config de Jest abaixo (mantenha as dependências que o template gerou):

```json
{
  "name": "mobile",
  "version": "0.1.0",
  "main": "expo/AppEntry.js",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "jest-expo",
    "roots": ["<rootDir>/src"],
    "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" },
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.test.{ts,tsx}",
      "!src/**/index.ts"
    ],
    "coverageThreshold": {
      "global": { "branches": 80, "functions": 80, "lines": 80, "statements": 80 },
      "./src/domain/": { "branches": 100, "functions": 100, "lines": 100, "statements": 100 }
    },
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 3: Instalar Jest**

Run: `pnpm --filter mobile exec expo install jest-expo jest @types/jest -- --dev`
Expected: `jest-expo`, `jest`, `@types/jest` em `devDependencies` de `apps/mobile/package.json`.

- [ ] **Step 4: `apps/mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["jest"]
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "coverage"]
}
```

- [ ] **Step 5: Escrever o teste do `Result`**

`apps/mobile/src/domain/shared/result.test.ts`:
```ts
import { err, isErr, isOk, ok } from './result';

describe('Result', () => {
  it('ok carrega o valor e é reconhecido por isOk', () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
  });

  it('err carrega o erro e é reconhecido por isErr', () => {
    const r = err({ code: 'boom' as const });
    expect(r).toEqual({ ok: false, error: { code: 'boom' } });
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- result`
Expected: FAIL com "Cannot find module './result'".

- [ ] **Step 7: Implementar `result.ts`**

`apps/mobile/src/domain/shared/result.ts`:
```ts
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;
```

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter mobile test -- result`
Expected: PASS, 2 testes. A cobertura global vai falhar o threshold porque `App.tsx` não é coberto; isso é esperado até o fim do plano (o `collectCoverageFrom` só olha `src/`, então `App.tsx` fica fora e o threshold deve passar; se falhar, confira o `roots`).

- [ ] **Step 9: Typecheck e placeholder de App**

`apps/mobile/App.tsx`:
```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Melhor Hora</Text>
      <Text>Domínio em construção. Telas chegam no Plano 2.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
});
```

Run: `pnpm --filter mobile typecheck`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: app Expo SDK 57 com TypeScript estrito, Jest e Result type"
```

---

### Task 3: ESLint com fronteiras de camada, Husky e lint-staged

**Files:**
- Create: `apps/mobile/eslint.config.js`, `.husky/pre-commit`, `.husky/commit-msg`
- Create: `apps/mobile/src/application/.gitkeep`, `apps/mobile/src/infrastructure/.gitkeep`, `apps/mobile/src/presentation/.gitkeep`

**Interfaces:**
- Produces: `pnpm lint` falha se `domain` importar de fora de `domain`.

- [ ] **Step 1: Instalar ESLint e plugins**

Run:
```bash
pnpm --filter mobile exec expo install eslint eslint-config-expo eslint-config-prettier eslint-plugin-prettier -- --dev
pnpm --filter mobile add -D eslint-plugin-boundaries eslint-plugin-import
```

- [ ] **Step 2: Criar `apps/mobile/eslint.config.js`**

```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
      ],
    },
    rules: {
      'no-console': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain'] },
            { from: 'application', allow: ['domain', 'application'] },
            { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure'] },
            { from: 'presentation', allow: ['domain', 'application', 'presentation'] },
          ],
        },
      ],
      'boundaries/no-unknown-files': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
```

- [ ] **Step 3: Instalar o resolver TypeScript e criar as pastas de camada**

Run:
```bash
pnpm --filter mobile add -D eslint-import-resolver-typescript
mkdir -p apps/mobile/src/application apps/mobile/src/infrastructure apps/mobile/src/presentation
touch apps/mobile/src/application/.gitkeep apps/mobile/src/infrastructure/.gitkeep apps/mobile/src/presentation/.gitkeep
```

- [ ] **Step 4: Provar que a fronteira funciona**

Crie temporariamente `apps/mobile/src/domain/shared/forbidden.ts`:
```ts
import { View } from 'react-native';

export const x = View;
```

Run: `pnpm --filter mobile lint`
Expected: erro `boundaries/element-types` apontando para `forbidden.ts` (domain importando external). Se em vez disso aparecer só erro de `import/no-unresolved`, o `element-types` com `default: 'disallow'` ainda deve acusar; confirme que a mensagem cita "boundaries".

Depois apague o arquivo: `rm apps/mobile/src/domain/shared/forbidden.ts`.

Run: `pnpm --filter mobile lint`
Expected: sem erros.

- [ ] **Step 5: Husky**

Run: `pnpm exec husky init`

Substitua o conteúdo de `.husky/pre-commit` por:
```sh
pnpm exec lint-staged
```

Crie `.husky/commit-msg`:
```sh
pnpm exec commitlint --edit "$1"
```

Run: `chmod +x .husky/pre-commit .husky/commit-msg`

- [ ] **Step 6: Testar os hooks**

Run: `git add -A && git commit -m "mensagem invalida"`
Expected: commit rejeitado pelo commitlint ("subject may not be empty" / "type may not be empty").

Run: `git commit -m "chore: eslint com fronteiras de camada, husky e lint-staged"`
Expected: lint-staged roda e o commit passa.

---

### Task 4: Tipos de previsão e data/hora local

**Files:**
- Create: `apps/mobile/src/domain/forecast/types.ts`
- Create: `apps/mobile/src/domain/time/localDateTime.ts`, `apps/mobile/src/domain/time/localDateTime.test.ts`
- Create: `apps/mobile/src/domain/time/dayPhase.ts`, `apps/mobile/src/domain/time/dayPhase.test.ts`

**Interfaces:**
- Produces:
  - `HourlyConditions`, `DailySummary`, `Forecast` (tipos)
  - `localNow(epochMs: number, utcOffsetSeconds: number): LocalDateTime`
  - `parseLocalIso(iso: string): { date: string; hour: number; minute: number }`
  - `addDays(date: string, n: number): string`
  - `minutesOfDay(hhmm: string): number` (aceita `"2026-09-13T06:12"` ou `"06:12"`)
  - `dayPhase(nowMinutes: number, sunriseMinutes: number, sunsetMinutes: number): DayPhase`

- [ ] **Step 1: Criar `forecast/types.ts`** (só tipos, sem teste)

```ts
export type HourlyConditions = {
  readonly time: string; // ISO local sem fuso, ex.: "2026-09-13T17:00"
  readonly date: string; // "2026-09-13"
  readonly hour: number; // 0–23
  readonly temperature: number;
  readonly apparentTemperature: number;
  readonly precipitationProbability: number; // 0–100
  readonly precipitationMm: number;
  readonly windSpeedKmh: number;
  readonly windGustsKmh: number;
  readonly uvIndex: number;
  readonly cloudCoverPct: number; // 0–100
  readonly weatherCode: number; // WMO
  readonly isDay: boolean;
  readonly humidityPct: number;
};

export type DailySummary = {
  readonly date: string;
  readonly sunrise: string; // ISO local, ex.: "2026-09-13T06:12"
  readonly sunset: string;
  readonly weatherCode: number;
  readonly tempMax: number;
  readonly tempMin: number;
};

export type Forecast = {
  readonly timezone: string;
  readonly utcOffsetSeconds: number;
  readonly hourly: readonly HourlyConditions[];
  readonly daily: readonly DailySummary[];
};
```

- [ ] **Step 2: Teste de `localDateTime`**

`apps/mobile/src/domain/time/localDateTime.test.ts`:
```ts
import { addDays, localNow, minutesOfDay, parseLocalIso } from './localDateTime';

describe('localNow', () => {
  // 2026-09-13T17:30:00Z
  const epoch = Date.UTC(2026, 8, 13, 17, 30, 0);

  it('converte para São Paulo (UTC-3)', () => {
    expect(localNow(epoch, -3 * 3600)).toEqual({
      date: '2026-09-13',
      hour: 14,
      minute: 30,
      epochMs: epoch,
      utcOffsetSeconds: -10800,
    });
  });

  it('converte para Tóquio (UTC+9) atravessando a meia-noite', () => {
    expect(localNow(epoch, 9 * 3600)).toMatchObject({ date: '2026-09-14', hour: 2, minute: 30 });
  });

  it('converte para Lisboa (UTC+1 no verão)', () => {
    expect(localNow(epoch, 3600)).toMatchObject({ date: '2026-09-13', hour: 18, minute: 30 });
  });
});

describe('parseLocalIso', () => {
  it('lê data, hora e minuto de um ISO local', () => {
    expect(parseLocalIso('2026-09-13T06:12')).toEqual({ date: '2026-09-13', hour: 6, minute: 12 });
  });
});

describe('addDays', () => {
  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-09-13', 4)).toBe('2026-09-17');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('minutesOfDay', () => {
  it('aceita ISO local e HH:mm', () => {
    expect(minutesOfDay('2026-09-13T06:12')).toBe(372);
    expect(minutesOfDay('18:04')).toBe(1084);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- localDateTime`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `localDateTime.ts`**

```ts
export type LocalDateTime = {
  readonly date: string;
  readonly hour: number;
  readonly minute: number;
  readonly epochMs: number;
  readonly utcOffsetSeconds: number;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const toDateString = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function localNow(epochMs: number, utcOffsetSeconds: number): LocalDateTime {
  const shifted = new Date(epochMs + utcOffsetSeconds * 1000);
  return {
    date: toDateString(shifted),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    epochMs,
    utcOffsetSeconds,
  };
}

export function parseLocalIso(iso: string): { date: string; hour: number; minute: number } {
  const [date = '', time = '00:00'] = iso.split('T');
  const [h = '0', m = '0'] = time.split(':');
  return { date, hour: Number(h), minute: Number(m) };
}

export function addDays(date: string, n: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d + n));
  return toDateString(base);
}

export function minutesOfDay(value: string): number {
  const time = value.includes('T') ? (value.split('T')[1] ?? '00:00') : value;
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter mobile test -- localDateTime`
Expected: PASS, 7 testes.

- [ ] **Step 6: Teste de `dayPhase`**

`apps/mobile/src/domain/time/dayPhase.test.ts`:
```ts
import { dayPhase } from './dayPhase';

// nascer 06:12 (372), pôr 18:04 (1084)
const sunrise = 372;
const sunset = 1084;

describe('dayPhase', () => {
  it.each([
    [5 * 60 + 11, 'night'], // 05:11, antes da janela do amanhecer
    [5 * 60 + 12, 'dawn'], // 05:12, uma hora antes do nascer
    [7 * 60 + 12, 'dawn'], // 07:12, uma hora depois do nascer
    [7 * 60 + 13, 'day'],
    [14 * 60, 'day'],
    [17 * 60 + 4, 'dusk'],
    [19 * 60 + 4, 'dusk'],
    [19 * 60 + 5, 'night'],
    [23 * 60, 'night'],
    [0, 'night'],
  ])('%i minutos → %s', (minutes, expected) => {
    expect(dayPhase(minutes, sunrise, sunset)).toBe(expected);
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- dayPhase`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 8: Implementar `dayPhase.ts`**

```ts
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

const TWILIGHT_MINUTES = 60;

export function dayPhase(nowMinutes: number, sunriseMinutes: number, sunsetMinutes: number): DayPhase {
  const inDawn =
    nowMinutes >= sunriseMinutes - TWILIGHT_MINUTES && nowMinutes <= sunriseMinutes + TWILIGHT_MINUTES;
  if (inDawn) return 'dawn';
  const inDusk =
    nowMinutes >= sunsetMinutes - TWILIGHT_MINUTES && nowMinutes <= sunsetMinutes + TWILIGHT_MINUTES;
  if (inDusk) return 'dusk';
  if (nowMinutes > sunriseMinutes && nowMinutes < sunsetMinutes) return 'day';
  return 'night';
}
```

- [ ] **Step 9: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- time && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS em todos.

```bash
git add apps/mobile/src/domain/forecast apps/mobile/src/domain/time
git commit -m "feat(domain): tipos de previsão, data/hora local por fuso e fase do dia"
```

---

### Task 5: Perfis de atividade e config embutida do motor

**Files:**
- Create: `apps/mobile/src/domain/activities/types.ts`
- Create: `apps/mobile/src/domain/config/types.ts`
- Create: `apps/mobile/src/domain/config/defaultEngineConfig.ts`, `apps/mobile/src/domain/config/defaultEngineConfig.test.ts`

**Interfaces:**
- Produces:
  - `ActivityId = 'walk' | 'run' | 'cycle' | 'beach' | 'picnic'`
  - `FactorId = 'thermal' | 'rain' | 'wind' | 'uv' | 'sun'`
  - `ActivityProfile`, `EngineConfig`, `ACTIVITY_IDS`, `FACTOR_IDS`
  - `defaultEngineConfig: EngineConfig`

- [ ] **Step 1: `activities/types.ts`**

```ts
export const ACTIVITY_IDS = ['walk', 'run', 'cycle', 'beach', 'picnic'] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const FACTOR_IDS = ['thermal', 'rain', 'wind', 'uv', 'sun'] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export type ThermalRange = {
  readonly idealMin: number;
  readonly idealMax: number;
  readonly tolMin: number;
  readonly tolMax: number;
};

export type Limit = { readonly ok: number; readonly max: number };

export type ActivityProfile = {
  readonly id: ActivityId;
  readonly name: string; // PT-BR
  readonly emoji: string;
  readonly thermal: ThermalRange;
  readonly wind: Limit; // km/h
  readonly uv: Limit;
  readonly nightFactor: number; // 0–1
  readonly weights: Readonly<Record<FactorId, number>>; // somam 1
};
```

- [ ] **Step 2: `config/types.ts`**

```ts
import type { ActivityId, ActivityProfile } from '../activities/types';

export type ScoreThresholds = {
  readonly great: number; // >= great → 'great'
  readonly good: number;
  readonly fair: number; // < fair → 'poor'
};

export type WindowRules = {
  readonly sizes: readonly number[]; // horas contíguas testadas
  readonly minHourScore: number; // nenhuma hora da janela abaixo disto
  readonly lengthBonus: number; // pontos de ranking por hora adicional (não altera o score exibido)
  readonly minRemainingMinutes: number; // inclui a hora atual se faltam >= isto
  readonly graceHoursAfterEnd: number; // "é agora" até N h depois do fim
};

export type TipThresholds = {
  readonly uvProtect: number;
  readonly waterApparent: number;
  readonly coolDropDeg: number;
  readonly rainNextPct: number;
  readonly coatApparent: number;
};

export type XpRules = {
  readonly base: number;
  readonly planBonus: number;
  readonly streakPerDay: number;
  readonly streakMaxDays: number;
};

export type LevelDef = { readonly level: number; readonly xp: number; readonly name: string };

export type EngineConfig = {
  readonly schemaVersion: 1;
  readonly activities: Readonly<Record<ActivityId, ActivityProfile>>;
  readonly scores: ScoreThresholds;
  readonly window: WindowRules;
  readonly tips: TipThresholds;
  readonly xp: XpRules;
  readonly levels: readonly LevelDef[];
};
```

- [ ] **Step 3: Teste da config embutida**

`apps/mobile/src/domain/config/defaultEngineConfig.test.ts`:
```ts
import { ACTIVITY_IDS, FACTOR_IDS } from '../activities/types';

import { defaultEngineConfig } from './defaultEngineConfig';

describe('defaultEngineConfig', () => {
  it('tem as cinco atividades', () => {
    expect(Object.keys(defaultEngineConfig.activities).sort()).toEqual([...ACTIVITY_IDS].sort());
  });

  it.each(ACTIVITY_IDS)('pesos de %s somam 1', (id) => {
    const sum = FACTOR_IDS.reduce((acc, f) => acc + defaultEngineConfig.activities[id].weights[f], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it.each(ACTIVITY_IDS)('faixa térmica de %s é coerente', (id) => {
    const t = defaultEngineConfig.activities[id].thermal;
    expect(t.tolMin).toBeLessThan(t.idealMin);
    expect(t.idealMin).toBeLessThan(t.idealMax);
    expect(t.idealMax).toBeLessThan(t.tolMax);
  });

  it('níveis crescem em XP e começam em 0', () => {
    const xps = defaultEngineConfig.levels.map((l) => l.xp);
    expect(xps[0]).toBe(0);
    expect(xps).toEqual([...xps].sort((a, b) => a - b));
    expect(defaultEngineConfig.levels).toHaveLength(8);
  });

  it('limiares de score são decrescentes', () => {
    const { great, good, fair } = defaultEngineConfig.scores;
    expect(great).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(fair);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- defaultEngineConfig`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 5: Implementar `defaultEngineConfig.ts`** (valores da seção 3.1, 4.2, 4.3, 4.4, 5.2, 5.3 do spec)

```ts
import type { EngineConfig } from './types';

export const defaultEngineConfig: EngineConfig = {
  schemaVersion: 1,
  activities: {
    walk: {
      id: 'walk',
      name: 'Caminhada',
      emoji: '🚶',
      thermal: { idealMin: 17, idealMax: 26, tolMin: 8, tolMax: 33 },
      wind: { ok: 20, max: 45 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.7,
      weights: { thermal: 0.4, rain: 0.3, wind: 0.15, uv: 0.1, sun: 0.05 },
    },
    run: {
      id: 'run',
      name: 'Corrida',
      emoji: '🏃',
      thermal: { idealMin: 12, idealMax: 21, tolMin: 3, tolMax: 29 },
      wind: { ok: 20, max: 45 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.6,
      weights: { thermal: 0.45, rain: 0.25, wind: 0.15, uv: 0.15, sun: 0 },
    },
    cycle: {
      id: 'cycle',
      name: 'Ciclismo',
      emoji: '🚴',
      thermal: { idealMin: 15, idealMax: 25, tolMin: 6, tolMax: 32 },
      wind: { ok: 15, max: 35 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.3,
      weights: { thermal: 0.3, rain: 0.3, wind: 0.3, uv: 0.1, sun: 0 },
    },
    beach: {
      id: 'beach',
      name: 'Praia',
      emoji: '🏖',
      thermal: { idealMin: 25, idealMax: 32, tolMin: 20, tolMax: 38 },
      wind: { ok: 15, max: 35 },
      uv: { ok: 6, max: 10 },
      nightFactor: 0,
      weights: { thermal: 0.3, rain: 0.25, wind: 0.15, uv: 0.1, sun: 0.2 },
    },
    picnic: {
      id: 'picnic',
      name: 'Piquenique',
      emoji: '🧺',
      thermal: { idealMin: 19, idealMax: 27, tolMin: 12, tolMax: 33 },
      wind: { ok: 15, max: 40 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.2,
      weights: { thermal: 0.35, rain: 0.35, wind: 0.15, uv: 0.05, sun: 0.1 },
    },
  },
  scores: { great: 80, good: 65, fair: 45 },
  window: { sizes: [1, 2, 3], minHourScore: 45, lengthBonus: 3, minRemainingMinutes: 30, graceHoursAfterEnd: 2 },
  tips: { uvProtect: 6, waterApparent: 28, coolDropDeg: 4, rainNextPct: 40, coatApparent: 14 },
  xp: { base: 50, planBonus: 25, streakPerDay: 5, streakMaxDays: 10 },
  levels: [
    { level: 1, xp: 0, name: 'Brisa' },
    { level: 2, xp: 100, name: 'Garoa' },
    { level: 3, xp: 400, name: 'Sol' },
    { level: 4, xp: 900, name: 'Ventania' },
    { level: 5, xp: 1600, name: 'Aurora' },
    { level: 6, xp: 2500, name: 'Tempestade' },
    { level: 7, xp: 3600, name: 'Furacão' },
    { level: 8, xp: 4900, name: 'Clima Perfeito' },
  ],
};
```

- [ ] **Step 6: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- defaultEngineConfig && pnpm --filter mobile lint`
Expected: PASS, 14 testes.

```bash
git add apps/mobile/src/domain/activities apps/mobile/src/domain/config
git commit -m "feat(domain): perfis de atividade e config embutida do motor"
```

---

### Task 6: Curvas de conforto, vetos e score por hora

**Files:**
- Create: `apps/mobile/src/domain/recommendation/comfort.ts`, `comfort.test.ts`
- Create: `apps/mobile/src/domain/recommendation/vetoes.ts`, `vetoes.test.ts`
- Create: `apps/mobile/src/domain/recommendation/scoreHour.ts`, `scoreHour.test.ts`
- Create: `apps/mobile/src/domain/recommendation/testing/fixtures.ts` (fábrica de horas para testes)

**Interfaces:**
- Consumes: `HourlyConditions`, `ActivityProfile`, `EngineConfig`, `FactorId`.
- Produces:
  - `piecewise(points: readonly [number, number][], x: number): number`
  - `thermalComfort(apparent, range)`, `rainComfort(probability, mm)`, `windComfort(speed, gusts, limit)`, `uvComfort(uv, limit)`, `sunComfort(cloudPct)` → `number` em [0, 1]
  - `type VetoId = 'storm' | 'rain' | 'snow' | 'thermal'`
  - `applyVetoes(h, profile, base: number): { score: number; veto: VetoId | null }`
  - `type ScoreLabel = 'great' | 'good' | 'fair' | 'poor'`
  - `labelFor(score, cfg): ScoreLabel`
  - `type HourScore = { hour: HourlyConditions; score: number; comforts: Record<FactorId, number>; veto: VetoId | null; label: ScoreLabel }`
  - `scoreHour(h, profile, cfg): HourScore`
  - `makeHour(overrides?: Partial<HourlyConditions>): HourlyConditions` (fixture)

- [ ] **Step 1: Fixture de hora**

`apps/mobile/src/domain/recommendation/testing/fixtures.ts`:
```ts
import type { HourlyConditions } from '../../forecast/types';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Hora "perfeita" para caminhada: 22°, seco, vento leve, UV 3, céu aberto, dia. */
export function makeHour(overrides: Partial<HourlyConditions> = {}): HourlyConditions {
  const hour = overrides.hour ?? 10;
  const date = overrides.date ?? '2026-09-13';
  return {
    time: `${date}T${pad(hour)}:00`,
    date,
    hour,
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
    ...overrides,
  };
}

/** Gera as 24 horas de um dia a partir de um transformador por hora. */
export function makeDay(
  date: string,
  perHour: (hour: number) => Partial<HourlyConditions> = () => ({}),
): HourlyConditions[] {
  return Array.from({ length: 24 }, (_, hour) =>
    makeHour({ date, hour, isDay: hour >= 6 && hour < 18, ...perHour(hour) }),
  );
}
```

- [ ] **Step 2: Teste das curvas**

`apps/mobile/src/domain/recommendation/comfort.test.ts`:
```ts
import { piecewise, rainComfort, sunComfort, thermalComfort, uvComfort, windComfort } from './comfort';

describe('piecewise', () => {
  const pts: [number, number][] = [
    [0, 1],
    [10, 0],
  ];
  it('interpola linearmente e satura nas pontas', () => {
    expect(piecewise(pts, -5)).toBe(1);
    expect(piecewise(pts, 0)).toBe(1);
    expect(piecewise(pts, 5)).toBeCloseTo(0.5);
    expect(piecewise(pts, 10)).toBe(0);
    expect(piecewise(pts, 50)).toBe(0);
  });
});

describe('thermalComfort (caminhada: ideal 17–26, tolerância 8–33)', () => {
  const range = { idealMin: 17, idealMax: 26, tolMin: 8, tolMax: 33 };
  it.each([
    [20, 1],
    [17, 1],
    [26, 1],
    [12.5, 0.5],
    [29.5, 0.5],
    [8, 0],
    [33, 0],
    [-5, 0],
    [40, 0],
  ])('%i° → %f', (t, expected) => {
    expect(thermalComfort(t, range)).toBeCloseTo(expected);
  });
});

describe('rainComfort', () => {
  it.each([
    [0, 0, 1],
    [20, 0, 1],
    [35, 0, 0.75],
    [50, 0, 0.5],
    [65, 0, 0.3],
    [80, 0, 0],
    [95, 0, 0],
  ])('prob %i%% mm %f → %f', (p, mm, expected) => {
    expect(rainComfort(p, mm)).toBeCloseTo(expected);
  });
  it('volume entre 0,2 e 1 mm multiplica por 0,6', () => {
    expect(rainComfort(10, 0.5)).toBeCloseTo(0.6);
    expect(rainComfort(10, 0.1)).toBeCloseTo(1);
    expect(rainComfort(10, 1)).toBeCloseTo(0.6);
    expect(rainComfort(10, 1.5)).toBeCloseTo(0.6);
  });
});

describe('windComfort (ok 20, máx 45)', () => {
  const limit = { ok: 20, max: 45 };
  it.each([
    [0, 0, 1],
    [20, 25, 1],
    [32.5, 30, 0.5],
    [45, 40, 0],
    [60, 50, 0],
  ])('%f km/h → %f', (speed, gusts, expected) => {
    expect(windComfort(speed, gusts, limit)).toBeCloseTo(expected);
  });
  it('rajadas acima de 1,3 × máx multiplicam por 0,7', () => {
    expect(windComfort(10, 60, limit)).toBeCloseTo(0.7);
    expect(windComfort(10, 58.5, limit)).toBeCloseTo(1);
  });
});

describe('uvComfort (ok 5, máx 9)', () => {
  const limit = { ok: 5, max: 9 };
  it.each([
    [0, 1],
    [5, 1],
    [7, 0.65],
    [9, 0.3],
    [11, 0.2],
  ])('UV %i → %f', (uv, expected) => {
    expect(uvComfort(uv, limit)).toBeCloseTo(expected);
  });
});

describe('sunComfort', () => {
  it.each([
    [0, 1],
    [30, 1],
    [65, 0.65],
    [100, 0.3],
  ])('nuvens %i%% → %f', (cloud, expected) => {
    expect(sunComfort(cloud)).toBeCloseTo(expected);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- comfort`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `comfort.ts`**

```ts
import type { Limit, ThermalRange } from '../activities/types';

export type Point = readonly [number, number];

/** Interpolação linear por partes; satura fora do intervalo dos pontos. */
export function piecewise(points: readonly Point[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  const idx = points.findIndex((p) => p[0] >= x);
  const b = points[idx];
  const a = points[idx - 1];
  if (!a || !b) return last[1];
  const t = (x - a[0]) / (b[0] - a[0]);
  return a[1] + (b[1] - a[1]) * t;
}

export function thermalComfort(apparent: number, r: ThermalRange): number {
  return piecewise(
    [
      [r.tolMin, 0],
      [r.idealMin, 1],
      [r.idealMax, 1],
      [r.tolMax, 0],
    ],
    apparent,
  );
}

const RAIN_PROB_CURVE: readonly Point[] = [
  [20, 1],
  [50, 0.5],
  [80, 0.1],
];
const RAIN_PROB_ZERO = 80; // >= 80 % o conforto é 0 (e o veto limita o score a 20)
const LIGHT_RAIN_MIN_MM = 0.2;
const LIGHT_RAIN_PENALTY = 0.6;

export function rainComfort(probabilityPct: number, mm: number): number {
  if (probabilityPct >= RAIN_PROB_ZERO) return 0;
  const base = piecewise(RAIN_PROB_CURVE, probabilityPct);
  return mm >= LIGHT_RAIN_MIN_MM ? base * LIGHT_RAIN_PENALTY : base;
}

const GUST_RATIO = 1.3;
const GUST_PENALTY = 0.7;

export function windComfort(speedKmh: number, gustsKmh: number, limit: Limit): number {
  const base = piecewise(
    [
      [limit.ok, 1],
      [limit.max, 0],
    ],
    speedKmh,
  );
  return gustsKmh > limit.max * GUST_RATIO ? base * GUST_PENALTY : base;
}

const UV_FLOOR = 0.2;
const UV_AT_MAX = 0.3;

export function uvComfort(uv: number, limit: Limit): number {
  if (uv > limit.max) return UV_FLOOR;
  return piecewise(
    [
      [limit.ok, 1],
      [limit.max, UV_AT_MAX],
    ],
    uv,
  );
}

const SUN_CURVE: readonly Point[] = [
  [30, 1],
  [100, 0.3],
];

export function sunComfort(cloudCoverPct: number): number {
  return piecewise(SUN_CURVE, cloudCoverPct);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter mobile test -- comfort`
Expected: PASS.

- [ ] **Step 6: Teste dos vetos**

`apps/mobile/src/domain/recommendation/vetoes.test.ts`:
```ts
import { defaultEngineConfig } from '../config/defaultEngineConfig';

import { makeHour } from './testing/fixtures';
import { applyVetoes } from './vetoes';

const walk = defaultEngineConfig.activities.walk;
const cycle = defaultEngineConfig.activities.cycle;

describe('applyVetoes', () => {
  it('sem veto devolve o score base', () => {
    expect(applyVetoes(makeHour(), walk, 88)).toEqual({ score: 88, veto: null });
  });

  it.each([95, 96, 99])('trovoada (código %i) zera', (code) => {
    expect(applyVetoes(makeHour({ weatherCode: code }), walk, 88)).toEqual({ score: 0, veto: 'storm' });
  });

  it('chuva provável (>= 80%) limita a 20', () => {
    expect(applyVetoes(makeHour({ precipitationProbability: 80 }), walk, 88)).toEqual({
      score: 20,
      veto: 'rain',
    });
  });

  it('volume >= 1 mm limita a 20', () => {
    expect(applyVetoes(makeHour({ precipitationMm: 1 }), walk, 88)).toEqual({ score: 20, veto: 'rain' });
  });

  it.each([71, 75, 77, 85, 86])('neve (código %i) limita a 20', (code) => {
    expect(applyVetoes(makeHour({ weatherCode: code }), walk, 88)).toEqual({ score: 20, veto: 'snow' });
  });

  it('sensação fora da tolerância limita a 30', () => {
    expect(applyVetoes(makeHour({ apparentTemperature: 7 }), walk, 88)).toEqual({ score: 30, veto: 'thermal' });
    expect(applyVetoes(makeHour({ apparentTemperature: 34 }), walk, 88)).toEqual({ score: 30, veto: 'thermal' });
  });

  it('nevoeiro multiplica por 0,6 só para ciclismo, sem marcar veto', () => {
    expect(applyVetoes(makeHour({ weatherCode: 45 }), cycle, 80)).toEqual({ score: 48, veto: null });
    expect(applyVetoes(makeHour({ weatherCode: 48 }), walk, 80)).toEqual({ score: 80, veto: null });
  });

  it('o menor limite vence quando há mais de um veto', () => {
    const h = makeHour({ weatherCode: 71, apparentTemperature: 40 });
    expect(applyVetoes(h, walk, 88)).toEqual({ score: 20, veto: 'snow' });
  });

  it('score base já abaixo do limite não sobe', () => {
    expect(applyVetoes(makeHour({ precipitationMm: 2 }), walk, 10)).toEqual({ score: 10, veto: 'rain' });
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- vetoes`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 8: Implementar `vetoes.ts`**

```ts
import type { ActivityProfile } from '../activities/types';
import type { HourlyConditions } from '../forecast/types';

export type VetoId = 'storm' | 'rain' | 'snow' | 'thermal';

type Veto = { readonly id: VetoId; readonly cap: number };

const STORM_CODES = new Set([95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FOG_CODES = new Set([45, 48]);
const RAIN_PROB_VETO = 80;
const RAIN_MM_VETO = 1;
const FOG_CYCLING_FACTOR = 0.6;

const CAPS = { storm: 0, rain: 20, snow: 20, thermal: 30 } as const;

function collectVetoes(h: HourlyConditions, p: ActivityProfile): readonly Veto[] {
  const outOfTolerance =
    h.apparentTemperature < p.thermal.tolMin || h.apparentTemperature > p.thermal.tolMax;
  const candidates: readonly (Veto | null)[] = [
    STORM_CODES.has(h.weatherCode) ? { id: 'storm', cap: CAPS.storm } : null,
    h.precipitationProbability >= RAIN_PROB_VETO || h.precipitationMm >= RAIN_MM_VETO
      ? { id: 'rain', cap: CAPS.rain }
      : null,
    SNOW_CODES.has(h.weatherCode) ? { id: 'snow', cap: CAPS.snow } : null,
    outOfTolerance ? { id: 'thermal', cap: CAPS.thermal } : null,
  ];
  return candidates.filter((v): v is Veto => v !== null);
}

export function applyVetoes(
  h: HourlyConditions,
  profile: ActivityProfile,
  baseScore: number,
): { score: number; veto: VetoId | null } {
  const fogAdjusted =
    profile.id === 'cycle' && FOG_CODES.has(h.weatherCode)
      ? Math.round(baseScore * FOG_CYCLING_FACTOR)
      : baseScore;
  const vetoes = collectVetoes(h, profile);
  const strongest = vetoes.reduce<Veto | null>(
    (acc, v) => (acc === null || v.cap < acc.cap ? v : acc),
    null,
  );
  if (strongest === null) return { score: fogAdjusted, veto: null };
  return { score: Math.min(fogAdjusted, strongest.cap), veto: strongest.id };
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `pnpm --filter mobile test -- vetoes`
Expected: PASS.

- [ ] **Step 10: Teste de `scoreHour`**

`apps/mobile/src/domain/recommendation/scoreHour.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { labelFor, scoreHour } from './scoreHour';
import { makeHour } from './testing/fixtures';

const walk = cfg.activities.walk;
const beach = cfg.activities.beach;

describe('labelFor', () => {
  it.each([
    [100, 'great'],
    [80, 'great'],
    [79, 'good'],
    [65, 'good'],
    [64, 'fair'],
    [45, 'fair'],
    [44, 'poor'],
    [0, 'poor'],
  ])('%i → %s', (score, label) => {
    expect(labelFor(score, cfg)).toBe(label);
  });
});

describe('scoreHour', () => {
  it('hora perfeita para caminhada dá 100', () => {
    const r = scoreHour(makeHour(), walk, cfg);
    expect(r.score).toBe(100);
    expect(r.label).toBe('great');
    expect(r.veto).toBeNull();
    expect(r.comforts).toEqual({ thermal: 1, rain: 1, wind: 1, uv: 1, sun: 1 });
  });

  it('pondera pelos pesos da atividade', () => {
    // chuva 50% → conforto 0,5; peso chuva caminhada 0,30 → base 0,85
    const r = scoreHour(makeHour({ precipitationProbability: 50 }), walk, cfg);
    expect(r.score).toBe(85);
    expect(r.comforts.rain).toBeCloseTo(0.5);
  });

  it('à noite multiplica pelo fator noturno', () => {
    expect(scoreHour(makeHour({ isDay: false }), walk, cfg).score).toBe(70);
    expect(scoreHour(makeHour({ isDay: false, apparentTemperature: 28 }), beach, cfg).score).toBe(0);
  });

  it('aplica vetos depois da média', () => {
    const r = scoreHour(makeHour({ weatherCode: 95 }), walk, cfg);
    expect(r).toMatchObject({ score: 0, veto: 'storm', label: 'poor' });
  });

  it('praia valoriza sol: céu fechado derruba mais que na corrida', () => {
    const cloudy = makeHour({ cloudCoverPct: 100, apparentTemperature: 28 });
    const beachScore = scoreHour(cloudy, beach, cfg).score;
    const walkScore = scoreHour({ ...cloudy, apparentTemperature: 22 }, walk, cfg).score;
    expect(beachScore).toBe(86); // 1 - 0,2 × 0,7
    expect(walkScore).toBe(97); // 1 - 0,05 × 0,7 → 96,5 → 97
  });

  it('mantém referência à hora de entrada', () => {
    const h = makeHour({ hour: 17 });
    expect(scoreHour(h, walk, cfg).hour).toBe(h);
  });
});
```

- [ ] **Step 11: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- scoreHour`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 12: Implementar `scoreHour.ts`**

```ts
import { FACTOR_IDS, type ActivityProfile, type FactorId } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { HourlyConditions } from '../forecast/types';

import { rainComfort, sunComfort, thermalComfort, uvComfort, windComfort } from './comfort';
import { applyVetoes, type VetoId } from './vetoes';

export type ScoreLabel = 'great' | 'good' | 'fair' | 'poor';

export type HourScore = {
  readonly hour: HourlyConditions;
  readonly score: number;
  readonly comforts: Readonly<Record<FactorId, number>>;
  readonly veto: VetoId | null;
  readonly label: ScoreLabel;
};

export function labelFor(score: number, cfg: EngineConfig): ScoreLabel {
  if (score >= cfg.scores.great) return 'great';
  if (score >= cfg.scores.good) return 'good';
  if (score >= cfg.scores.fair) return 'fair';
  return 'poor';
}

export function comfortsFor(h: HourlyConditions, p: ActivityProfile): Record<FactorId, number> {
  return {
    thermal: thermalComfort(h.apparentTemperature, p.thermal),
    rain: rainComfort(h.precipitationProbability, h.precipitationMm),
    wind: windComfort(h.windSpeedKmh, h.windGustsKmh, p.wind),
    uv: uvComfort(h.uvIndex, p.uv),
    sun: sunComfort(h.cloudCoverPct),
  };
}

export function scoreHour(h: HourlyConditions, profile: ActivityProfile, cfg: EngineConfig): HourScore {
  const comforts = comfortsFor(h, profile);
  const weighted = FACTOR_IDS.reduce((acc, f) => acc + profile.weights[f] * comforts[f], 0);
  const light = h.isDay ? 1 : profile.nightFactor;
  const base = Math.round(100 * weighted * light);
  const { score, veto } = applyVetoes(h, profile, base);
  return { hour: h, score, comforts, veto, label: labelFor(score, cfg) };
}
```

- [ ] **Step 13: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- recommendation && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS em todos, cobertura de `domain` em 100 %.

```bash
git add apps/mobile/src/domain/recommendation
git commit -m "feat(domain): curvas de conforto, vetos e score por hora"
```

---

### Task 7: Escolha da janela

**Files:**
- Create: `apps/mobile/src/domain/recommendation/windows.ts`, `windows.test.ts`
- Modify: `apps/mobile/src/domain/recommendation/testing/fixtures.ts` (adicionar `makeHourScore`)

**Interfaces:**
- Consumes: `HourScore`, `EngineConfig`, `FactorId`, `VetoId`.
- Produces:
  - `type TimeWindow = { date: string; startHour: number; endHour: number }` (`endHour` exclusivo: 17–19h é `{ startHour: 17, endHour: 19 }`)
  - `type WindowResult = { kind: 'window'; window: TimeWindow; hours: readonly HourScore[]; score: number } | { kind: 'none'; best: HourScore | null; dominant: FactorId | VetoId | null }`
  - `candidateHours(dayHours, now: { hour; minute } | null, cfg): readonly HourScore[]`
  - `findBestWindow(candidates, cfg): WindowResult`
  - `dominantProblem(h: HourScore): FactorId | VetoId`
  - `isWithinWindow(window, now: { hour; minute }, graceHours): boolean`
  - fixture `makeHourScore(hour, score, overrides?)`

- [ ] **Step 1: Adicionar fixture `makeHourScore`** ao fim de `testing/fixtures.ts`

```ts
import type { FactorId } from '../../activities/types';
import type { HourScore, ScoreLabel } from '../scoreHour';
import type { VetoId } from '../vetoes';

const labelOf = (score: number): ScoreLabel =>
  score >= 80 ? 'great' : score >= 65 ? 'good' : score >= 45 ? 'fair' : 'poor';

export function makeHourScore(
  hour: number,
  score: number,
  overrides: { comforts?: Partial<Record<FactorId, number>>; veto?: VetoId | null } = {},
): HourScore {
  return {
    hour: makeHour({ hour }),
    score,
    comforts: { thermal: 1, rain: 1, wind: 1, uv: 1, sun: 1, ...overrides.comforts },
    veto: overrides.veto ?? null,
    label: labelOf(score),
  };
}
```

(Mova os `import` para o topo do arquivo, junto do import de `HourlyConditions`.)

- [ ] **Step 2: Teste de `windows`**

`apps/mobile/src/domain/recommendation/windows.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { makeHourScore } from './testing/fixtures';
import { candidateHours, dominantProblem, findBestWindow, isWithinWindow } from './windows';

const flat = (scores: readonly number[]) => scores.map((s, hour) => makeHourScore(hour, s));

describe('candidateHours', () => {
  const day = flat(Array.from({ length: 24 }, () => 70));

  it('sem "agora" devolve o dia inteiro', () => {
    expect(candidateHours(day, null, cfg)).toHaveLength(24);
  });

  it('inclui a hora atual se faltam pelo menos 30 min', () => {
    const c = candidateHours(day, { hour: 14, minute: 30 }, cfg);
    expect(c[0]?.hour.hour).toBe(14);
    expect(c).toHaveLength(10);
  });

  it('descarta a hora atual se faltam menos de 30 min', () => {
    const c = candidateHours(day, { hour: 14, minute: 31 }, cfg);
    expect(c[0]?.hour.hour).toBe(15);
  });
});

describe('findBestWindow', () => {
  it('escolhe a janela contígua de melhor ranking (média + 3 por hora extra)', () => {
    // 17,18,19 = 90,96,88 → média 91,3 + 6 = 97,3; 2h 17–18 = 93 + 3 = 96; 1h 18 = 96
    const scores = Array.from({ length: 24 }, (_, h) => (h === 17 ? 90 : h === 18 ? 96 : h === 19 ? 88 : 60));
    const r = findBestWindow(flat(scores), cfg);
    expect(r.kind).toBe('window');
    if (r.kind !== 'window') return;
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 17, endHour: 20 });
    expect(r.score).toBe(91);
  });

  it('prefere 1h de 96 a 2h de média 92 (96 > 92 + 3)', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 18 ? 96 : h === 19 ? 88 : 50));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 18, endHour: 19 });
  });

  it('com scores iguais, a janela mais longa vence pelo bônus', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 9 ? 80 : 40));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 7, endHour: 10 });
  });

  it('em empate de ranking e tamanho, prefere a mais cedo', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 7 || h === 17 ? 80 : 40));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window.startHour).toBe(7);
  });

  it('não atravessa horas não contíguas', () => {
    const hours = [makeHourScore(7, 80), makeHourScore(9, 80)];
    const r = findBestWindow(hours, cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 7, endHour: 8 });
  });

  it('descarta janelas com alguma hora abaixo de 45', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 17 ? 100 : h === 18 ? 44 : h === 19 ? 100 : 30));
    const r = findBestWindow(flat(scores), cfg);
    if (r.kind !== 'window') throw new Error('esperava janela');
    expect(r.window).toEqual({ date: '2026-09-13', startHour: 17, endHour: 18 });
  });

  it('sem hora >= 45 devolve none com a melhor hora e o problema dominante', () => {
    const hours = [
      makeHourScore(8, 20, { veto: 'rain' }),
      makeHourScore(9, 30, { comforts: { wind: 0.2 } }),
      makeHourScore(10, 30, { comforts: { thermal: 0.1 } }),
    ];
    const r = findBestWindow(hours, cfg);
    expect(r).toEqual({ kind: 'none', best: hours[1], dominant: 'wind' });
  });

  it('lista vazia devolve none sem melhor hora', () => {
    expect(findBestWindow([], cfg)).toEqual({ kind: 'none', best: null, dominant: null });
  });
});

describe('dominantProblem', () => {
  it('veto tem prioridade sobre conforto', () => {
    expect(dominantProblem(makeHourScore(8, 0, { veto: 'storm', comforts: { uv: 0 } }))).toBe('storm');
  });
  it('sem veto, é o fator de menor conforto', () => {
    expect(dominantProblem(makeHourScore(8, 50, { comforts: { rain: 0.4, uv: 0.3 } }))).toBe('uv');
  });
});

describe('isWithinWindow', () => {
  const w = { date: '2026-09-13', startHour: 17, endHour: 19 };
  it.each([
    [16, 59, false],
    [17, 0, true],
    [18, 59, true],
    [20, 59, true], // dentro das 2h de tolerância
    [21, 0, false],
  ])('%i:%i → %s', (hour, minute, expected) => {
    expect(isWithinWindow(w, { hour, minute }, 2)).toBe(expected);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- windows`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `windows.ts`**

```ts
import { FACTOR_IDS, type FactorId } from '../activities/types';
import type { EngineConfig } from '../config/types';

import type { HourScore } from './scoreHour';
import type { VetoId } from './vetoes';

export type TimeWindow = {
  readonly date: string;
  readonly startHour: number;
  readonly endHour: number; // exclusivo
};

export type WindowResult =
  | { readonly kind: 'window'; readonly window: TimeWindow; readonly hours: readonly HourScore[]; readonly score: number }
  | { readonly kind: 'none'; readonly best: HourScore | null; readonly dominant: FactorId | VetoId | null };

type Clock = { readonly hour: number; readonly minute: number };
type Candidate = { readonly hours: readonly HourScore[]; readonly mean: number; readonly rank: number };

const MINUTES_PER_HOUR = 60;

export function candidateHours(
  dayHours: readonly HourScore[],
  now: Clock | null,
  cfg: EngineConfig,
): readonly HourScore[] {
  if (now === null) return dayHours;
  const remaining = MINUTES_PER_HOUR - now.minute;
  const firstHour = remaining >= cfg.window.minRemainingMinutes ? now.hour : now.hour + 1;
  return dayHours.filter((h) => h.hour.hour >= firstHour);
}

const isContiguous = (hours: readonly HourScore[]): boolean =>
  hours.every((h, i) => i === 0 || h.hour.hour === (hours[i - 1]?.hour.hour ?? -99) + 1);

const mean = (hours: readonly HourScore[]): number =>
  hours.reduce((acc, h) => acc + h.score, 0) / hours.length;

function slidingCandidates(
  hours: readonly HourScore[],
  size: number,
  rules: { minHourScore: number; lengthBonus: number },
): Candidate[] {
  return hours
    .map((_, start) => hours.slice(start, start + size))
    .filter((slice) => slice.length === size && isContiguous(slice))
    .filter((slice) => slice.every((h) => h.score >= rules.minHourScore))
    .map((slice) => {
      const m = mean(slice);
      return { hours: slice, mean: m, rank: m + rules.lengthBonus * (size - 1) };
    });
}

const EPSILON = 1e-9;

/** Ranking maior vence; empate exato mantém o atual (que é mais curto ou mais cedo). */
function better(candidate: Candidate, current: Candidate | null): boolean {
  if (current === null) return true;
  return candidate.rank > current.rank + EPSILON;
}

export function dominantProblem(h: HourScore): FactorId | VetoId {
  if (h.veto !== null) return h.veto;
  return FACTOR_IDS.reduce((worst, f) => (h.comforts[f] < h.comforts[worst] ? f : worst), 'thermal');
}

function noWindow(candidates: readonly HourScore[]): WindowResult {
  const best = candidates.reduce<HourScore | null>(
    (acc, h) => (acc === null || h.score > acc.score ? h : acc),
    null,
  );
  return { kind: 'none', best, dominant: best === null ? null : dominantProblem(best) };
}

export function findBestWindow(candidates: readonly HourScore[], cfg: EngineConfig): WindowResult {
  const all = cfg.window.sizes.flatMap((size) => slidingCandidates(candidates, size, cfg.window));
  // sizes e starts crescentes: em empate exato de ranking fica a primeira encontrada (mais cedo)
  const winner = all.reduce<Candidate | null>((acc, c) => (better(c, acc) ? c : acc), null);
  if (winner === null) return noWindow(candidates);
  const first = winner.hours[0];
  const last = winner.hours[winner.hours.length - 1];
  if (!first || !last) return noWindow(candidates);
  return {
    kind: 'window',
    window: { date: first.hour.date, startHour: first.hour.hour, endHour: last.hour.hour + 1 },
    hours: winner.hours,
    score: Math.round(winner.mean),
  };
}

export function isWithinWindow(window: TimeWindow, now: Clock, graceHours: number): boolean {
  const minutes = now.hour * MINUTES_PER_HOUR + now.minute;
  const start = window.startHour * MINUTES_PER_HOUR;
  const end = (window.endHour + graceHours) * MINUTES_PER_HOUR;
  return minutes >= start && minutes < end;
}
```

- [ ] **Step 5: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- windows && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS. Se a cobertura acusar o ramo `if (!first || !last)` como não coberto, é aceitável adicionar `/* istanbul ignore next -- guarda de tipo, inalcançável */` acima dele: `winner.hours` nunca é vazio porque `slidingCandidates` exige `slice.length === size` e `sizes` não contém 0.

```bash
git add apps/mobile/src/domain/recommendation
git commit -m "feat(domain): escolha da melhor janela com desempate e caso sem janela"
```

---

### Task 8: Descritores, frase, ressalva e dicas de preparo

**Files:**
- Create: `apps/mobile/src/domain/recommendation/descriptors.ts`, `descriptors.test.ts`
- Create: `apps/mobile/src/domain/recommendation/sentence.ts`, `sentence.test.ts`
- Create: `apps/mobile/src/domain/recommendation/tips.ts`, `tips.test.ts`

**Interfaces:**
- Consumes: `HourScore`, `HourlyConditions`, `ActivityProfile`, `TimeWindow`, `EngineConfig`, `FactorId`.
- Produces:
  - `describeThermal(apparent)`, `describeRain(pct)`, `describeWind(kmh)`, `describeUv(uv)`, `describeSun(cloudPct)` → `string`
  - `factorValue(f: FactorId, h: HourlyConditions): number`
  - `averageFactor(f, hours: readonly HourlyConditions[]): number`
  - `buildSentence(windowHours: readonly HourScore[], profile): string`
  - `buildCaveat(dayHours: readonly HourScore[], window: TimeWindow, profile): string | null`
  - `type Tip = { id: 'sunscreen' | 'water' | 'cooling' | 'rain' | 'coat'; text: string }`
  - `preparationTips(dayHours: readonly HourlyConditions[], window: TimeWindow, cfg): readonly Tip[]`

- [ ] **Step 1: Teste dos descritores**

`apps/mobile/src/domain/recommendation/descriptors.test.ts`:
```ts
import {
  averageFactor,
  describeRain,
  describeSun,
  describeThermal,
  describeUv,
  describeWind,
  factorValue,
} from './descriptors';
import { makeHour } from './testing/fixtures';

describe('descritores PT-BR', () => {
  it.each([
    [5, 'gelado'],
    [7.9, 'gelado'],
    [8, 'frio'],
    [14, 'frio'],
    [15, 'fresco'],
    [18, 'fresco'],
    [19, 'agradável'],
    [26, 'agradável'],
    [27, 'quente'],
    [31, 'quente'],
    [32, 'muito quente'],
  ])('térmico %f → %s', (v, d) => expect(describeThermal(v)).toBe(d));

  it.each([
    [0, 'sem chuva'],
    [9, 'sem chuva'],
    [10, 'baixa chance de chuva'],
    [30, 'baixa chance de chuva'],
    [31, 'chance de chuva'],
    [60, 'chance de chuva'],
    [61, 'chuva provável'],
  ])('chuva %i → %s', (v, d) => expect(describeRain(v)).toBe(d));

  it.each([
    [0, 'calmo'],
    [7.9, 'calmo'],
    [8, 'leve'],
    [19, 'leve'],
    [20, 'moderado'],
    [34, 'moderado'],
    [35, 'forte'],
  ])('vento %f → %s', (v, d) => expect(describeWind(v)).toBe(d));

  it.each([
    [0, 'baixo'],
    [2, 'baixo'],
    [3, 'moderado'],
    [5, 'moderado'],
    [6, 'alto'],
    [7, 'alto'],
    [8, 'muito alto'],
  ])('UV %i → %s', (v, d) => expect(describeUv(v)).toBe(d));

  it.each([
    [0, 'céu aberto'],
    [29, 'céu aberto'],
    [30, 'parcialmente nublado'],
    [70, 'parcialmente nublado'],
    [71, 'nublado'],
  ])('nuvens %i → %s', (v, d) => expect(describeSun(v)).toBe(d));
});

describe('factorValue e averageFactor', () => {
  it('lê o campo certo de cada fator', () => {
    const h = makeHour({ apparentTemperature: 23, precipitationProbability: 5, windSpeedKmh: 9, uvIndex: 3, cloudCoverPct: 20 });
    expect(factorValue('thermal', h)).toBe(23);
    expect(factorValue('rain', h)).toBe(5);
    expect(factorValue('wind', h)).toBe(9);
    expect(factorValue('uv', h)).toBe(3);
    expect(factorValue('sun', h)).toBe(20);
  });
  it('faz média sobre as horas', () => {
    const hours = [makeHour({ apparentTemperature: 22 }), makeHour({ apparentTemperature: 24 })];
    expect(averageFactor('thermal', hours)).toBe(23);
    expect(averageFactor('thermal', [])).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- descriptors`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar `descriptors.ts`**

```ts
import type { FactorId } from '../activities/types';
import type { HourlyConditions } from '../forecast/types';

type Band = readonly [max: number, label: string];

const pick = (bands: readonly Band[], value: number, fallback: string): string =>
  bands.find(([max]) => value < max)?.[1] ?? fallback;

export const describeThermal = (apparent: number): string =>
  pick(
    [
      [8, 'gelado'],
      [15, 'frio'],
      [19, 'fresco'],
      [27, 'agradável'],
      [32, 'quente'],
    ],
    apparent,
    'muito quente',
  );

export const describeRain = (pct: number): string =>
  pick(
    [
      [10, 'sem chuva'],
      [31, 'baixa chance de chuva'],
      [61, 'chance de chuva'],
    ],
    pct,
    'chuva provável',
  );

export const describeWind = (kmh: number): string =>
  pick(
    [
      [8, 'calmo'],
      [20, 'leve'],
      [35, 'moderado'],
    ],
    kmh,
    'forte',
  );

export const describeUv = (uv: number): string =>
  pick(
    [
      [3, 'baixo'],
      [6, 'moderado'],
      [8, 'alto'],
    ],
    uv,
    'muito alto',
  );

export const describeSun = (cloudPct: number): string =>
  pick(
    [
      [30, 'céu aberto'],
      [71, 'parcialmente nublado'],
    ],
    cloudPct,
    'nublado',
  );

export function factorValue(f: FactorId, h: HourlyConditions): number {
  switch (f) {
    case 'thermal':
      return h.apparentTemperature;
    case 'rain':
      return h.precipitationProbability;
    case 'wind':
      return h.windSpeedKmh;
    case 'uv':
      return h.uvIndex;
    case 'sun':
      return h.cloudCoverPct;
  }
}

export function averageFactor(f: FactorId, hours: readonly HourlyConditions[]): number {
  if (hours.length === 0) return 0;
  return hours.reduce((acc, h) => acc + factorValue(f, h), 0) / hours.length;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter mobile test -- descriptors`
Expected: PASS.

- [ ] **Step 5: Teste da frase e da ressalva**

`apps/mobile/src/domain/recommendation/sentence.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { scoreHour } from './scoreHour';
import { buildCaveat, buildSentence } from './sentence';
import { makeHour } from './testing/fixtures';

const walk = cfg.activities.walk;
const run = cfg.activities.run;
const beach = cfg.activities.beach;

const scored = (hours: ReturnType<typeof makeHour>[], profile = walk) =>
  hours.map((h) => scoreHour(h, profile, cfg));

describe('buildSentence', () => {
  it('caminhada: sensação, chuva e vento (três maiores pesos)', () => {
    const hours = scored([
      makeHour({ hour: 17, apparentTemperature: 23, precipitationProbability: 5, windSpeedKmh: 9 }),
      makeHour({ hour: 18, apparentTemperature: 23, precipitationProbability: 5, windSpeedKmh: 9 }),
    ]);
    expect(buildSentence(hours, walk)).toBe('Sensação de 23°, sem chuva e vento leve.');
  });

  it('corrida: sensação, chuva e um dos fatores de 0,15 (vento vem antes de UV)', () => {
    const hours = scored([makeHour({ apparentTemperature: 18, precipitationProbability: 40, windSpeedKmh: 25 })], run);
    expect(buildSentence(hours, run)).toBe('Sensação de 18°, chance de chuva e vento moderado.');
  });

  it('praia: sensação, chuva e sol', () => {
    const hours = scored([makeHour({ apparentTemperature: 29, cloudCoverPct: 10 })], beach);
    expect(buildSentence(hours, beach)).toBe('Sensação de 29°, sem chuva e céu aberto.');
  });

  it('ignora o terceiro fator quando o peso é menor que 0,1', () => {
    // piquenique: thermal .35, rain .35, wind .15 → três fatores normalmente; força pesos custom
    const profile = { ...walk, weights: { thermal: 0.6, rain: 0.35, wind: 0.05, uv: 0, sun: 0 } };
    const hours = scored([makeHour({ apparentTemperature: 20 })], profile);
    expect(buildSentence(hours, profile)).toBe('Sensação de 20° e sem chuva.');
  });

  it('arredonda a sensação média', () => {
    const hours = scored([makeHour({ apparentTemperature: 22.4 }), makeHour({ apparentTemperature: 23.4 })]);
    expect(buildSentence(hours, walk)).toMatch(/^Sensação de 23°/);
  });
});

describe('buildCaveat', () => {
  const window = { date: '2026-09-13', startHour: 17, endHour: 19 };

  it('avisa sobre UV alto nas 3 horas antes da janela', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) => makeHour({ hour, uvIndex: hour >= 14 && hour < 17 ? 9 : 2 })),
    );
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h o UV está alto: melhor esperar.');
  });

  it('avisa sobre chuva antes da janela', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour, precipitationProbability: hour === 16 ? 70 : 0 })));
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h há chance de chuva.');
  });

  it('avisa sobre calor antes da janela', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour, apparentTemperature: hour === 15 ? 31 : 22 })));
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h a sensação térmica está quente.');
  });

  it('avisa sobre vento antes da janela', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour, windSpeedKmh: hour === 16 ? 40 : 5 })));
    expect(buildCaveat(day, window, walk)).toBe('Antes das 17h o vento está forte.');
  });

  it('sem problema antes da janela devolve null', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour })));
    expect(buildCaveat(day, window, walk)).toBeNull();
  });

  it('ignora fatores com peso zero e nuvens', () => {
    const day = scored(
      Array.from({ length: 24 }, (_, hour) => makeHour({ hour, cloudCoverPct: hour === 16 ? 100 : 0, uvIndex: hour === 16 ? 9 : 2 })),
      run,
    );
    // corrida: sun tem peso 0; UV tem peso e conforto < 0,5 → ressalva de UV
    expect(buildCaveat(day, window, run)).toBe('Antes das 17h o UV está alto: melhor esperar.');
  });

  it('janela às 0h não tem horas anteriores', () => {
    const day = scored(Array.from({ length: 24 }, (_, hour) => makeHour({ hour })));
    expect(buildCaveat(day, { date: '2026-09-13', startHour: 0, endHour: 1 }, walk)).toBeNull();
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- sentence`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar `sentence.ts`**

```ts
import { FACTOR_IDS, type ActivityProfile, type FactorId } from '../activities/types';

import { averageFactor, describeRain, describeSun, describeThermal, describeUv, describeWind } from './descriptors';
import type { HourScore } from './scoreHour';
import type { TimeWindow } from './windows';

const MAX_FACTORS = 3;
const MIN_THIRD_WEIGHT = 0.1;
const CAVEAT_LOOKBACK_HOURS = 3;
const CAVEAT_COMFORT = 0.5;

function rankedFactors(profile: ActivityProfile): readonly FactorId[] {
  const sorted = [...FACTOR_IDS]
    .filter((f) => profile.weights[f] > 0)
    .sort((a, b) => profile.weights[b] - profile.weights[a] || FACTOR_IDS.indexOf(a) - FACTOR_IDS.indexOf(b));
  const top = sorted.slice(0, MAX_FACTORS);
  const third = top[2];
  return third !== undefined && profile.weights[third] < MIN_THIRD_WEIGHT ? top.slice(0, 2) : top;
}

function phraseFor(f: FactorId, value: number): string {
  switch (f) {
    case 'thermal':
      return `sensação de ${Math.round(value)}°`;
    case 'rain':
      return describeRain(value);
    case 'wind':
      return `vento ${describeWind(value)}`;
    case 'uv':
      return `UV ${describeUv(value)}`;
    case 'sun':
      return describeSun(value);
  }
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function joinPtBr(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

export function buildSentence(windowHours: readonly HourScore[], profile: ActivityProfile): string {
  const raw = windowHours.map((h) => h.hour);
  const parts = rankedFactors(profile).map((f) => phraseFor(f, averageFactor(f, raw)));
  return `${capitalize(joinPtBr(parts))}.`;
}

function caveatFor(f: FactorId, startHour: number, value: number): string | null {
  switch (f) {
    case 'uv':
      return `Antes das ${startHour}h o UV está alto: melhor esperar.`;
    case 'rain':
      return `Antes das ${startHour}h há chance de chuva.`;
    case 'thermal':
      return `Antes das ${startHour}h a sensação térmica está ${describeThermal(value)}.`;
    case 'wind':
      return `Antes das ${startHour}h o vento está forte.`;
    case 'sun':
      return null;
  }
}

export function buildCaveat(
  dayHours: readonly HourScore[],
  window: TimeWindow,
  profile: ActivityProfile,
): string | null {
  const before = dayHours.filter(
    (h) => h.hour.hour < window.startHour && h.hour.hour >= window.startHour - CAVEAT_LOOKBACK_HOURS,
  );
  if (before.length === 0) return null;
  const problems = FACTOR_IDS.filter((f) => f !== 'sun' && profile.weights[f] > 0)
    .map((f) => ({ f, comfort: Math.min(...before.map((h) => h.comforts[f])) }))
    .filter(({ comfort }) => comfort < CAVEAT_COMFORT)
    .sort((a, b) => a.comfort - b.comfort);
  const worst = problems[0];
  if (!worst) return null;
  const worstHour = before.reduce((acc, h) => (h.comforts[worst.f] < acc.comforts[worst.f] ? h : acc));
  return caveatFor(worst.f, window.startHour, averageFactor(worst.f, [worstHour.hour]));
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter mobile test -- sentence`
Expected: PASS. Se o caso "corrida" falhar por ordem entre vento e UV (ambos 0,15), confirme que o desempate usa a ordem de `FACTOR_IDS` (vento antes de UV).

- [ ] **Step 9: Teste das dicas**

`apps/mobile/src/domain/recommendation/tips.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { makeDay } from './testing/fixtures';
import { preparationTips } from './tips';

const window = { date: '2026-09-13', startHour: 17, endHour: 19 };
const ids = (tips: readonly { id: string }[]) => tips.map((t) => t.id);

describe('preparationTips', () => {
  it('dia perfeito não gera dicas', () => {
    expect(preparationTips(makeDay('2026-09-13'), window, cfg)).toEqual([]);
  });

  it('protetor quando UV >= 6 na janela', () => {
    const day = makeDay('2026-09-13', (h) => ({ uvIndex: h === 18 ? 6 : 2 }));
    expect(preparationTips(day, window, cfg)).toEqual([{ id: 'sunscreen', text: 'Use protetor' }]);
  });

  it('água quando sensação >= 28 na janela', () => {
    const day = makeDay('2026-09-13', (h) => ({ apparentTemperature: h === 17 ? 28 : 22 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['water']);
  });

  it('esfria quando cai >= 4° até 2h após o fim', () => {
    const day = makeDay('2026-09-13', (h) => ({ apparentTemperature: h <= 18 ? 22 : h === 19 ? 20 : 17 }));
    expect(preparationTips(day, window, cfg)).toEqual([{ id: 'cooling', text: 'Esfria às 20h' }]);
  });

  it('capa quando a hora seguinte tem chuva > 40%', () => {
    const day = makeDay('2026-09-13', (h) => ({ precipitationProbability: h === 19 ? 41 : 0 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['rain']);
  });

  it('casaco quando sensação < 14 na janela', () => {
    const day = makeDay('2026-09-13', () => ({ apparentTemperature: 13 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['coat']);
  });

  it('ordem fixa e sem duplicatas', () => {
    const day = makeDay('2026-09-13', (h) => ({
      uvIndex: 7,
      apparentTemperature: h <= 18 ? 29 : 20,
      precipitationProbability: h === 19 ? 50 : 0,
    }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['sunscreen', 'water', 'cooling', 'rain']);
  });

  it('janela no fim do dia não quebra sem horas seguintes', () => {
    const day = makeDay('2026-09-13');
    expect(preparationTips(day, { date: '2026-09-13', startHour: 23, endHour: 24 }, cfg)).toEqual([]);
  });
});
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- tips`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 11: Implementar `tips.ts`**

```ts
import type { EngineConfig } from '../config/types';
import type { HourlyConditions } from '../forecast/types';

import type { TimeWindow } from './windows';

export type TipId = 'sunscreen' | 'water' | 'cooling' | 'rain' | 'coat';
export type Tip = { readonly id: TipId; readonly text: string };

const AFTER_WINDOW_HOURS = 2;

const inWindow = (hours: readonly HourlyConditions[], w: TimeWindow) =>
  hours.filter((h) => h.hour >= w.startHour && h.hour < w.endHour);

const after = (hours: readonly HourlyConditions[], w: TimeWindow, count: number) =>
  hours.filter((h) => h.hour >= w.endHour && h.hour < w.endHour + count);

function coolingTip(
  inside: readonly HourlyConditions[],
  following: readonly HourlyConditions[],
  dropDeg: number,
): Tip | null {
  const start = inside[0];
  if (!start) return null;
  const cold = following.find((h) => start.apparentTemperature - h.apparentTemperature >= dropDeg);
  return cold ? { id: 'cooling', text: `Esfria às ${cold.hour}h` } : null;
}

export function preparationTips(
  dayHours: readonly HourlyConditions[],
  window: TimeWindow,
  cfg: EngineConfig,
): readonly Tip[] {
  const inside = inWindow(dayHours, window);
  const following = after(dayHours, window, AFTER_WINDOW_HOURS);
  const next = following[0];
  const t = cfg.tips;
  const candidates: readonly (Tip | null)[] = [
    inside.some((h) => h.uvIndex >= t.uvProtect) ? { id: 'sunscreen', text: 'Use protetor' } : null,
    inside.some((h) => h.apparentTemperature >= t.waterApparent) ? { id: 'water', text: 'Leve água' } : null,
    coolingTip(inside, following, t.coolDropDeg),
    next && next.precipitationProbability > t.rainNextPct ? { id: 'rain', text: 'Leve capa' } : null,
    inside.some((h) => h.apparentTemperature < t.coatApparent) ? { id: 'coat', text: 'Leve casaco' } : null,
  ];
  return candidates.filter((c): c is Tip => c !== null);
}
```

- [ ] **Step 12: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- recommendation && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS, cobertura de `domain` 100 %.

```bash
git add apps/mobile/src/domain/recommendation
git commit -m "feat(domain): descritores PT-BR, frase de explicação, ressalva e dicas de preparo"
```

---

### Task 9: Recomendação do dia e visão geral (hoje, agora, próximos dias, comparativo)

**Files:**
- Create: `apps/mobile/src/domain/recommendation/recommendDay.ts`, `recommendDay.test.ts`
- Create: `apps/mobile/src/domain/recommendation/overview.ts`, `overview.test.ts`
- Modify: `apps/mobile/src/domain/recommendation/testing/fixtures.ts` (adicionar `makeForecast`)

**Interfaces:**
- Consumes: tudo de Tasks 4–8, `LocalDateTime`.
- Produces:
  - `type DayRecommendation = { date; activityId; hours: readonly HourScore[]; result: WindowResult; score: number | null; label: ScoreLabel | null; sentence: string | null; caveat: string | null; tips: readonly Tip[]; daily: DailySummary | null }`
  - `recommendDay(forecast, profile, cfg, opts: { date: string; now?: { hour; minute } | null }): DayRecommendation`
  - `type Comparison = 'tomorrowBetter' | 'todayBestOfWeek' | null`
  - `type Overview = { today: DayRecommendation; nextDays: readonly DayRecommendation[]; now: HourScore | null; nowInWindow: boolean; bestDate: string | null; comparison: Comparison }`
  - `recommendOverview(forecast, profile, cfg, now: LocalDateTime): Overview`
  - fixture `makeForecast(dates: readonly string[], perHour?: (date, hour) => Partial<HourlyConditions>): Forecast`

- [ ] **Step 1: Adicionar `makeForecast` ao fim de `testing/fixtures.ts`**

```ts
import type { Forecast } from '../../forecast/types';

export function makeForecast(
  dates: readonly string[],
  perHour: (date: string, hour: number) => Partial<HourlyConditions> = () => ({}),
): Forecast {
  return {
    timezone: 'America/Sao_Paulo',
    utcOffsetSeconds: -10800,
    hourly: dates.flatMap((date) => makeDay(date, (hour) => perHour(date, hour))),
    daily: dates.map((date) => ({
      date,
      sunrise: `${date}T06:12`,
      sunset: `${date}T18:04`,
      weatherCode: 1,
      tempMax: 26,
      tempMin: 16,
    })),
  };
}
```

(Junte o import de `Forecast` ao import já existente de `HourlyConditions`.)

- [ ] **Step 2: Teste de `recommendDay`**

`apps/mobile/src/domain/recommendation/recommendDay.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { recommendDay } from './recommendDay';
import { makeForecast } from './testing/fixtures';

const walk = cfg.activities.walk;
const DATES = ['2026-09-13', '2026-09-14'];

describe('recommendDay', () => {
  it('dia bom: janela, frase, sem ressalva, sem dicas, com resumo diário', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, { date: '2026-09-13' });
    expect(r.hours).toHaveLength(24);
    expect(r.result.kind).toBe('window');
    expect(r.result.kind === 'window' && r.result.window).toEqual({ date: '2026-09-13', startHour: 6, endHour: 9 });
    expect(r.score).toBe(100);
    expect(r.label).toBe('great');
    expect(r.sentence).toBe('Sensação de 22°, sem chuva e vento leve.');
    expect(r.caveat).toBeNull();
    expect(r.tips).toEqual([]);
    expect(r.daily?.sunrise).toBe('2026-09-13T06:12');
    expect(r.activityId).toBe('walk');
  });

  it('só considera as horas da data pedida', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-13' ? { precipitationProbability: 90 } : {}));
    const r = recommendDay(f, walk, cfg, { date: '2026-09-14' });
    expect(r.hours.every((h) => h.hour.date === '2026-09-14')).toBe(true);
    expect(r.result.kind).toBe('window');
  });

  it('respeita o "agora" ao escolher candidatas', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, { date: '2026-09-13', now: { hour: 14, minute: 0 } });
    expect(r.result.kind === 'window' && r.result.window).toEqual({ date: '2026-09-13', startHour: 14, endHour: 17 });
  });

  it('dia de chuva: sem janela, melhor score isolado e sem frase', () => {
    const f = makeForecast(DATES, () => ({ precipitationProbability: 90, precipitationMm: 2 }));
    const r = recommendDay(f, walk, cfg, { date: '2026-09-13' });
    expect(r.result).toMatchObject({ kind: 'none', dominant: 'rain' });
    expect(r.score).toBe(20);
    expect(r.label).toBe('poor');
    expect(r.sentence).toBeNull();
    expect(r.tips).toEqual([]);
  });

  it('data sem previsão devolve vazio sem quebrar', () => {
    const r = recommendDay(makeForecast(DATES), walk, cfg, { date: '2030-01-01' });
    expect(r.hours).toEqual([]);
    expect(r.result).toEqual({ kind: 'none', best: null, dominant: null });
    expect(r.score).toBeNull();
    expect(r.label).toBeNull();
    expect(r.daily).toBeNull();
  });

  it('gera ressalva e dicas quando cabem', () => {
    const f = makeForecast(DATES, (_, hour) => ({
      uvIndex: hour >= 11 && hour < 14 ? 9 : hour >= 14 ? 6 : 1,
      apparentTemperature: hour < 14 ? 34 : 22,
    }));
    const r = recommendDay(f, walk, cfg, { date: '2026-09-13' });
    expect(r.result.kind === 'window' && r.result.window.startHour).toBe(14);
    expect(r.caveat).toBe('Antes das 14h a sensação térmica está muito quente.');
    expect(r.tips.map((t) => t.id)).toEqual(['sunscreen']);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- recommendDay`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `recommendDay.ts`**

```ts
import type { ActivityId, ActivityProfile } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { DailySummary, Forecast } from '../forecast/types';

import { labelFor, scoreHour, type HourScore, type ScoreLabel } from './scoreHour';
import { buildCaveat, buildSentence } from './sentence';
import { preparationTips, type Tip } from './tips';
import { candidateHours, findBestWindow, type WindowResult } from './windows';

export type DayRecommendation = {
  readonly date: string;
  readonly activityId: ActivityId;
  readonly hours: readonly HourScore[];
  readonly result: WindowResult;
  readonly score: number | null;
  readonly label: ScoreLabel | null;
  readonly sentence: string | null;
  readonly caveat: string | null;
  readonly tips: readonly Tip[];
  readonly daily: DailySummary | null;
};

type Options = { readonly date: string; readonly now?: { hour: number; minute: number } | null };

export function recommendDay(
  forecast: Forecast,
  profile: ActivityProfile,
  cfg: EngineConfig,
  opts: Options,
): DayRecommendation {
  const raw = forecast.hourly.filter((h) => h.date === opts.date);
  const hours = raw.map((h) => scoreHour(h, profile, cfg));
  const result = findBestWindow(candidateHours(hours, opts.now ?? null, cfg), cfg);
  const daily = forecast.daily.find((d) => d.date === opts.date) ?? null;
  const base = { date: opts.date, activityId: profile.id, hours, result, daily };

  if (result.kind === 'window') {
    return {
      ...base,
      score: result.score,
      label: labelFor(result.score, cfg),
      sentence: buildSentence(result.hours, profile),
      caveat: buildCaveat(hours, result.window, profile),
      tips: preparationTips(raw, result.window, cfg),
    };
  }
  const score = result.best?.score ?? null;
  return {
    ...base,
    score,
    label: score === null ? null : labelFor(score, cfg),
    sentence: null,
    caveat: null,
    tips: [],
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter mobile test -- recommendDay`
Expected: PASS.

- [ ] **Step 6: Teste de `overview`**

`apps/mobile/src/domain/recommendation/overview.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';
import type { LocalDateTime } from '../time/localDateTime';

import { recommendOverview } from './overview';
import { makeForecast } from './testing/fixtures';

const walk = cfg.activities.walk;
const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const rainy = { precipitationProbability: 50 }; // caminhada → 85 de dia

describe('recommendOverview', () => {
  it('hoje usa o "agora"; próximos dias são os 4 seguintes inteiros', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(14));
    expect(o.today.result.kind === 'window' && o.today.result.window.startHour).toBe(14);
    expect(o.nextDays.map((d) => d.date)).toEqual(DATES.slice(1));
    expect(o.nextDays[0]?.result.kind === 'window' && o.nextDays[0].result.window.startHour).toBe(6);
  });

  it('score de agora é o da hora atual', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(20, 15));
    expect(o.now?.hour.hour).toBe(20);
    expect(o.now?.score).toBe(70);
  });

  it('nowInWindow reflete a janela de hoje', () => {
    const f = makeForecast(DATES, (_, hour) => (hour < 17 || hour > 18 ? rainy : {}));
    expect(recommendOverview(f, walk, cfg, at(17, 30)).nowInWindow).toBe(true);
    expect(recommendOverview(f, walk, cfg, at(9)).nowInWindow).toBe(false);
  });

  it('comparativo: amanhã melhor que hoje por 10+ pontos', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-13' ? rainy : {}));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.comparison).toBe('tomorrowBetter');
    expect(o.bestDate).toBe('2026-09-14');
  });

  it('comparativo: hoje é o melhor da semana (empate resolve para o mais cedo)', () => {
    const o = recommendOverview(makeForecast(DATES), walk, cfg, at(8));
    expect(o.comparison).toBe('todayBestOfWeek');
    expect(o.bestDate).toBe('2026-09-13');
  });

  it('comparativo nulo quando nem hoje é o melhor nem amanhã é bem melhor', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-15' ? {} : rainy));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.comparison).toBeNull();
    expect(o.bestDate).toBe('2026-09-15');
  });

  it('hoje sem janela e amanhã com janela → amanhã melhor', () => {
    const f = makeForecast(DATES, (date) => (date === '2026-09-13' ? { precipitationProbability: 95 } : {}));
    expect(recommendOverview(f, walk, cfg, at(8)).comparison).toBe('tomorrowBetter');
  });

  it('nenhum dia com janela → sem melhor data', () => {
    const f = makeForecast(DATES, () => ({ precipitationProbability: 95 }));
    const o = recommendOverview(f, walk, cfg, at(8));
    expect(o.bestDate).toBeNull();
    expect(o.comparison).toBeNull();
    expect(o.nowInWindow).toBe(false);
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- overview`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 8: Implementar `overview.ts`**

```ts
import type { ActivityProfile } from '../activities/types';
import type { EngineConfig } from '../config/types';
import type { Forecast } from '../forecast/types';
import type { LocalDateTime } from '../time/localDateTime';

import { recommendDay, type DayRecommendation } from './recommendDay';
import type { HourScore } from './scoreHour';
import { isWithinWindow } from './windows';

export type Comparison = 'tomorrowBetter' | 'todayBestOfWeek' | null;

export type Overview = {
  readonly today: DayRecommendation;
  readonly nextDays: readonly DayRecommendation[];
  readonly now: HourScore | null;
  readonly nowInWindow: boolean;
  readonly bestDate: string | null;
  readonly comparison: Comparison;
};

const NEXT_DAYS = 4;
const TOMORROW_BETTER_BY = 10;

const windowScore = (d: DayRecommendation): number | null =>
  d.result.kind === 'window' ? d.result.score : null;

function pickBestDate(days: readonly DayRecommendation[]): string | null {
  return days.reduce<{ date: string; score: number } | null>((acc, d) => {
    const s = windowScore(d);
    if (s === null) return acc;
    return acc === null || s > acc.score ? { date: d.date, score: s } : acc;
  }, null)?.date ?? null;
}

function compare(today: DayRecommendation, tomorrow: DayRecommendation | undefined, bestDate: string | null): Comparison {
  const todayScore = windowScore(today);
  const tomorrowScore = tomorrow ? windowScore(tomorrow) : null;
  if (tomorrowScore !== null && (todayScore === null || tomorrowScore - todayScore >= TOMORROW_BETTER_BY)) {
    return 'tomorrowBetter';
  }
  if (todayScore !== null && bestDate === today.date) return 'todayBestOfWeek';
  return null;
}

export function recommendOverview(
  forecast: Forecast,
  profile: ActivityProfile,
  cfg: EngineConfig,
  now: LocalDateTime,
): Overview {
  const today = recommendDay(forecast, profile, cfg, { date: now.date, now });
  const futureDates = forecast.daily.map((d) => d.date).filter((d) => d > now.date).slice(0, NEXT_DAYS);
  const nextDays = futureDates.map((date) => recommendDay(forecast, profile, cfg, { date }));
  const nowScore = today.hours.find((h) => h.hour.hour === now.hour) ?? null;
  const nowInWindow =
    today.result.kind === 'window' && isWithinWindow(today.result.window, now, cfg.window.graceHoursAfterEnd);
  const bestDate = pickBestDate([today, ...nextDays]);
  return { today, nextDays, now: nowScore, nowInWindow, bestDate, comparison: compare(today, nextDays[0], bestDate) };
}
```

- [ ] **Step 9: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- recommendation && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS, cobertura de `domain` 100 %.

```bash
git add apps/mobile/src/domain/recommendation
git commit -m "feat(domain): recomendação do dia e visão geral com agora, próximos dias e comparativo"
```

---

### Task 10: Gamificação: eventos, XP e níveis

**Files:**
- Create: `apps/mobile/src/domain/gamification/events.ts`
- Create: `apps/mobile/src/domain/gamification/xp.ts`, `xp.test.ts`
- Create: `apps/mobile/src/domain/gamification/levels.ts`, `levels.test.ts`

**Interfaces:**
- Consumes: `ActivityId`, `TimeWindow`, `XpRules`, `LevelDef`.
- Produces:
  - Tipos de evento (abaixo) e `GamificationEvent`
  - `type XpBreakdown = { base; hourBonus; planBonus; streakBonus; total }`
  - `computeXp(input: { hourScore: number; planFulfilled: boolean; streakDays: number }, rules: XpRules): XpBreakdown`
  - `type LevelProgress = { level; name; totalXp; levelStartXp; nextLevelXp: number | null; xpToNext: number | null; progress: number }`
  - `levelFor(totalXp: number, levels: readonly LevelDef[]): LevelProgress`

- [ ] **Step 1: `events.ts`** (só tipos)

```ts
import type { ActivityId } from '../activities/types';
import type { TimeWindow } from '../recommendation/windows';

type Base = { readonly id: string; readonly createdAt: number }; // epoch ms

export type PlannedEvent = Base & {
  readonly type: 'planned';
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly window: TimeWindow;
  readonly windowScore: number;
};

export type ConfirmedEvent = Base & {
  readonly type: 'confirmed';
  readonly planId: string;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};

export type LoggedEvent = Base & {
  readonly type: 'logged';
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly hourLeft: number;
  readonly hourScore: number;
};

export type PlanCancelledEvent = Base & { readonly type: 'planCancelled'; readonly planId: string };

export type BadWeatherDayEvent = Base & {
  readonly type: 'badWeatherDay';
  readonly cityId: string;
  readonly date: string;
  readonly bestScore: number;
};

export type GamificationEvent =
  | PlannedEvent
  | ConfirmedEvent
  | LoggedEvent
  | PlanCancelledEvent
  | BadWeatherDayEvent;
```

- [ ] **Step 2: Teste de `xp`**

`apps/mobile/src/domain/gamification/xp.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { computeXp } from './xp';

describe('computeXp', () => {
  it('exemplo do spec: score 86, plano cumprido, 7 dias → 153', () => {
    expect(computeXp({ hourScore: 86, planFulfilled: true, streakDays: 7 }, cfg.xp)).toEqual({
      base: 50,
      hourBonus: 43,
      planBonus: 25,
      streakBonus: 35,
      total: 153,
    });
  });

  it('sem plano e primeiro dia', () => {
    expect(computeXp({ hourScore: 30, planFulfilled: false, streakDays: 1 }, cfg.xp)).toEqual({
      base: 50,
      hourBonus: 15,
      planBonus: 0,
      streakBonus: 5,
      total: 70,
    });
  });

  it('bônus de sequência tem teto em 10 dias', () => {
    expect(computeXp({ hourScore: 0, planFulfilled: false, streakDays: 25 }, cfg.xp).streakBonus).toBe(50);
  });

  it('arredonda o bônus de horário', () => {
    expect(computeXp({ hourScore: 85, planFulfilled: false, streakDays: 1 }, cfg.xp).hourBonus).toBe(43);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- gamification/xp`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 4: Implementar `xp.ts`**

```ts
import type { XpRules } from '../config/types';

export type XpBreakdown = {
  readonly base: number;
  readonly hourBonus: number;
  readonly planBonus: number;
  readonly streakBonus: number;
  readonly total: number;
};

export type XpInput = {
  readonly hourScore: number;
  readonly planFulfilled: boolean;
  readonly streakDays: number;
};

export function computeXp(input: XpInput, rules: XpRules): XpBreakdown {
  const base = rules.base;
  const hourBonus = Math.round(input.hourScore / 2);
  const planBonus = input.planFulfilled ? rules.planBonus : 0;
  const streakBonus = rules.streakPerDay * Math.min(input.streakDays, rules.streakMaxDays);
  return { base, hourBonus, planBonus, streakBonus, total: base + hourBonus + planBonus + streakBonus };
}
```

- [ ] **Step 5: Teste de `levels`**

`apps/mobile/src/domain/gamification/levels.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { levelFor } from './levels';

describe('levelFor', () => {
  it('0 XP é nível 1 Brisa, faltam 100 para o 2', () => {
    expect(levelFor(0, cfg.levels)).toEqual({
      level: 1,
      name: 'Brisa',
      totalXp: 0,
      levelStartXp: 0,
      nextLevelXp: 100,
      xpToNext: 100,
      progress: 0,
    });
  });

  it('1358 XP é nível 4 Ventania com 242 para Aurora', () => {
    const l = levelFor(1358, cfg.levels);
    expect(l).toMatchObject({ level: 4, name: 'Ventania', levelStartXp: 900, nextLevelXp: 1600, xpToNext: 242 });
    expect(l.progress).toBeCloseTo((1358 - 900) / 700);
  });

  it('exatamente no limiar sobe de nível', () => {
    expect(levelFor(900, cfg.levels).level).toBe(4);
    expect(levelFor(899, cfg.levels).level).toBe(3);
  });

  it('último nível não tem próximo', () => {
    expect(levelFor(10000, cfg.levels)).toMatchObject({ level: 8, name: 'Clima Perfeito', nextLevelXp: null, xpToNext: null, progress: 1 });
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- gamification/levels`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar `levels.ts`**

```ts
import type { LevelDef } from '../config/types';

export type LevelProgress = {
  readonly level: number;
  readonly name: string;
  readonly totalXp: number;
  readonly levelStartXp: number;
  readonly nextLevelXp: number | null;
  readonly xpToNext: number | null;
  readonly progress: number; // 0–1
};

export function levelFor(totalXp: number, levels: readonly LevelDef[]): LevelProgress {
  const sorted = [...levels].sort((a, b) => a.xp - b.xp);
  const idx = sorted.reduce((acc, l, i) => (totalXp >= l.xp ? i : acc), 0);
  const current = sorted[idx] ?? { level: 1, xp: 0, name: '' };
  const next = sorted[idx + 1] ?? null;
  const span = next === null ? 0 : next.xp - current.xp;
  return {
    level: current.level,
    name: current.name,
    totalXp,
    levelStartXp: current.xp,
    nextLevelXp: next === null ? null : next.xp,
    xpToNext: next === null ? null : next.xp - totalXp,
    progress: next === null ? 1 : (totalXp - current.xp) / span,
  };
}
```

- [ ] **Step 8: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- gamification && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS. Se a cobertura acusar o fallback `?? { level: 1, xp: 0, name: '' }`, adicione um teste com `levelFor(50, [])` esperando `{ level: 1, name: '', progress: 1, nextLevelXp: null }`.

```bash
git add apps/mobile/src/domain/gamification
git commit -m "feat(domain): eventos de gamificação, cálculo de XP e níveis"
```

---

### Task 11: Gamificação: streak, badges e derivação do progresso

**Files:**
- Create: `apps/mobile/src/domain/gamification/streak.ts`, `streak.test.ts`
- Create: `apps/mobile/src/domain/gamification/records.ts`
- Create: `apps/mobile/src/domain/gamification/badges.ts`, `badges.test.ts`
- Create: `apps/mobile/src/domain/gamification/deriveProgress.ts`, `deriveProgress.test.ts`
- Create: `apps/mobile/src/domain/gamification/testing/fixtures.ts`

**Interfaces:**
- Consumes: Tasks 4, 5, 7, 10.
- Produces:
  - `computeStreak(activeDates: ReadonlySet<string>, restDates: ReadonlySet<string>, today: string): number`
  - `type ActivityRecord = { id; date; cityId; activity; hourLeft; hourScore; planFulfilled; streakDays; xp: XpBreakdown; createdAt }`
  - `type BadgeId = 'first' | 'early' | 'owl' | 'explorer' | 'planner' | 'week' | 'multi' | 'perfect'`; `BADGE_IDS`
  - `type BadgeState = { id: BadgeId; unlocked: boolean; unlockedOn: string | null; progress: { current: number; target: number } | null }`
  - `evaluateBadges(records: readonly ActivityRecord[], restDates: ReadonlySet<string>): readonly BadgeState[]`
  - `newlyUnlocked(before: readonly BadgeState[], after: readonly BadgeState[]): readonly BadgeId[]`
  - `type ActivePlan = { planId; cityId; activity; date; window; windowScore }`
  - `type Progress = { totalXp; level: LevelProgress; streak; records; badges; activeDates; restDates; citiesCount; activePlan: ActivePlan | null; todayRecord: ActivityRecord | null }`
  - `deriveProgress(events: readonly GamificationEvent[], cfg: EngineConfig, today: string): Progress`
  - fixtures `planned(...)`, `confirmed(...)`, `logged(...)`, `badDay(...)`, `cancelled(...)`

- [ ] **Step 1: Teste de `streak`**

`apps/mobile/src/domain/gamification/streak.test.ts`:
```ts
import { computeStreak } from './streak';

const set = (...d: string[]) => new Set(d);
const none = new Set<string>();

describe('computeStreak', () => {
  it('sem atividades é 0', () => {
    expect(computeStreak(none, none, '2026-09-13')).toBe(0);
  });

  it('conta dias consecutivos terminando hoje', () => {
    expect(computeStreak(set('2026-09-11', '2026-09-12', '2026-09-13'), none, '2026-09-13')).toBe(3);
  });

  it('hoje sem atividade ainda não quebra: conta a partir de ontem', () => {
    expect(computeStreak(set('2026-09-11', '2026-09-12'), none, '2026-09-13')).toBe(2);
  });

  it('um dia perdido zera o que veio antes', () => {
    expect(computeStreak(set('2026-09-10', '2026-09-12', '2026-09-13'), none, '2026-09-13')).toBe(2);
  });

  it('dia de folga por mau tempo não quebra nem conta', () => {
    expect(computeStreak(set('2026-09-10', '2026-09-11', '2026-09-13'), set('2026-09-12'), '2026-09-13')).toBe(3);
  });

  it('folga hoje e ontem sem atividade: streak preservado', () => {
    expect(computeStreak(set('2026-09-11'), set('2026-09-12', '2026-09-13'), '2026-09-13')).toBe(1);
  });

  it('atividade em dia marcado como folga conta normalmente', () => {
    expect(computeStreak(set('2026-09-12', '2026-09-13'), set('2026-09-13'), '2026-09-13')).toBe(2);
  });

  it('dois dias perdidos seguidos zeram', () => {
    expect(computeStreak(set('2026-09-09', '2026-09-10'), none, '2026-09-13')).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- streak`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar `streak.ts`**

```ts
import { addDays } from '../time/localDateTime';

const MAX_LOOKBACK_DAYS = 400;

/**
 * Dias consecutivos com atividade, olhando de hoje para trás.
 * Hoje sem atividade não quebra (o dia ainda não acabou).
 * Dias em restDates (folga por mau tempo) são pulados sem contar nem quebrar.
 */
export function computeStreak(
  activeDates: ReadonlySet<string>,
  restDates: ReadonlySet<string>,
  today: string,
): number {
  const start = activeDates.has(today) ? today : addDays(today, -1);
  const dates = Array.from({ length: MAX_LOOKBACK_DAYS }, (_, i) => addDays(start, -i));
  const firstMiss = dates.findIndex((d) => !activeDates.has(d) && !restDates.has(d));
  const run = firstMiss === -1 ? dates : dates.slice(0, firstMiss);
  return run.filter((d) => activeDates.has(d)).length;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter mobile test -- streak`
Expected: PASS, 8 testes.

- [ ] **Step 5: `records.ts`** (tipo compartilhado por badges e deriveProgress)

```ts
import type { ActivityId } from '../activities/types';

import type { XpBreakdown } from './xp';

export type ActivityRecord = {
  readonly id: string;
  readonly date: string;
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly hourLeft: number;
  readonly hourScore: number;
  readonly planFulfilled: boolean;
  readonly streakDays: number; // streak no momento do registro, incluindo o dia
  readonly xp: XpBreakdown;
  readonly createdAt: number;
};
```

- [ ] **Step 6: Fixtures de eventos**

`apps/mobile/src/domain/gamification/testing/fixtures.ts`:
```ts
import type { ActivityId } from '../../activities/types';
import type {
  BadWeatherDayEvent,
  ConfirmedEvent,
  LoggedEvent,
  PlanCancelledEvent,
  PlannedEvent,
} from '../events';

let seq = 0;
const nextId = (): string => `evt-${++seq}`;
const at = (date: string, hour: number): number => Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);

export function planned(
  date: string,
  opts: { activity?: ActivityId; cityId?: string; startHour?: number; endHour?: number; windowScore?: number; id?: string } = {},
): PlannedEvent {
  const startHour = opts.startHour ?? 17;
  return {
    type: 'planned',
    id: opts.id ?? nextId(),
    cityId: opts.cityId ?? 'sp',
    activity: opts.activity ?? 'run',
    date,
    window: { date, startHour, endHour: opts.endHour ?? startHour + 2 },
    windowScore: opts.windowScore ?? 84,
    createdAt: at(date, 8),
  };
}

export function confirmed(
  plan: PlannedEvent,
  opts: { hourLeft?: number; hourScore?: number } = {},
): ConfirmedEvent {
  const hourLeft = opts.hourLeft ?? plan.window.startHour;
  return {
    type: 'confirmed',
    id: nextId(),
    planId: plan.id,
    date: plan.date,
    hourLeft,
    hourScore: opts.hourScore ?? 86,
    createdAt: at(plan.date, hourLeft) + 1,
  };
}

export function logged(
  date: string,
  opts: { activity?: ActivityId; cityId?: string; hourLeft?: number; hourScore?: number } = {},
): LoggedEvent {
  const hourLeft = opts.hourLeft ?? 18;
  return {
    type: 'logged',
    id: nextId(),
    cityId: opts.cityId ?? 'sp',
    activity: opts.activity ?? 'walk',
    date,
    hourLeft,
    hourScore: opts.hourScore ?? 70,
    createdAt: at(date, hourLeft) + 1,
  };
}

export function cancelled(plan: PlannedEvent): PlanCancelledEvent {
  return { type: 'planCancelled', id: nextId(), planId: plan.id, createdAt: plan.createdAt + 1 };
}

export function badDay(date: string, cityId = 'sp'): BadWeatherDayEvent {
  return { type: 'badWeatherDay', id: nextId(), cityId, date, bestScore: 22, createdAt: at(date, 7) };
}

/** Sequência de dias consecutivos com registro espontâneo, terminando em `lastDate`. */
export function loggedRun(lastDate: string, days: number, opts: Parameters<typeof logged>[1] = {}): LoggedEvent[] {
  const [y = 0, m = 1, d = 1] = lastDate.split('-').map(Number);
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - (days - 1 - i)));
    const date = dt.toISOString().slice(0, 10);
    return logged(date, opts);
  });
}
```

- [ ] **Step 7: Teste de `badges`**

`apps/mobile/src/domain/gamification/badges.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { evaluateBadges, newlyUnlocked, type BadgeState } from './badges';
import { deriveProgress } from './deriveProgress';
import { badDay, logged, loggedRun } from './testing/fixtures';

const badge = (states: readonly BadgeState[], id: string) => states.find((b) => b.id === id);
const recordsOf = (events: Parameters<typeof deriveProgress>[0], today: string) =>
  deriveProgress(events, cfg, today).records;

describe('evaluateBadges', () => {
  it('sem registros: tudo bloqueado, progresso zerado onde contável', () => {
    const b = evaluateBadges([], new Set());
    expect(b).toHaveLength(8);
    expect(b.every((x) => !x.unlocked)).toBe(true);
    expect(badge(b, 'explorer')?.progress).toEqual({ current: 0, target: 5 });
    expect(badge(b, 'planner')?.progress).toEqual({ current: 0, target: 10 });
    expect(badge(b, 'multi')?.progress).toEqual({ current: 0, target: 5 });
    expect(badge(b, 'week')?.progress).toEqual({ current: 0, target: 7 });
    expect(badge(b, 'first')?.progress).toBeNull();
  });

  it('primeira saída desbloqueia na data do primeiro registro', () => {
    const r = recordsOf([logged('2026-09-10'), logged('2026-09-12')], '2026-09-13');
    expect(badge(evaluateBadges(r, new Set()), 'first')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-10' });
  });

  it('madrugador (< 7h) e coruja (>= 20h)', () => {
    const r = recordsOf([logged('2026-09-10', { hourLeft: 6 }), logged('2026-09-11', { hourLeft: 20 })], '2026-09-13');
    const b = evaluateBadges(r, new Set());
    expect(badge(b, 'early')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-10' });
    expect(badge(b, 'owl')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-11' });
  });

  it('explorador conta cidades distintas', () => {
    const cities = ['a', 'b', 'c', 'd', 'e'];
    const r = recordsOf(cities.map((cityId, i) => logged(`2026-09-0${i + 1}`, { cityId })), '2026-09-13');
    const b = evaluateBadges(r, new Set());
    expect(badge(b, 'explorer')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-05', progress: { current: 5, target: 5 } });
    expect(badge(evaluateBadges(r.slice(0, 3), new Set()), 'explorer')).toMatchObject({ unlocked: false, progress: { current: 3, target: 5 } });
  });

  it('multiatleta exige as cinco atividades', () => {
    const acts = ['walk', 'run', 'cycle', 'beach', 'picnic'] as const;
    const r = recordsOf(acts.map((activity, i) => logged(`2026-09-0${i + 1}`, { activity })), '2026-09-13');
    expect(badge(evaluateBadges(r, new Set()), 'multi')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-05' });
  });

  it('clima perfeito com score >= 95', () => {
    const r = recordsOf([logged('2026-09-10', { hourScore: 94 }), logged('2026-09-11', { hourScore: 95 })], '2026-09-13');
    expect(badge(evaluateBadges(r, new Set()), 'perfect')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-11' });
  });

  it('semana cheia com streak 7, respeitando folgas', () => {
    const events = [...loggedRun('2026-09-09', 4), badDay('2026-09-10'), ...loggedRun('2026-09-13', 3)];
    const r = recordsOf(events, '2026-09-13');
    const b = evaluateBadges(r, new Set(['2026-09-10']));
    expect(badge(b, 'week')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-13', progress: { current: 7, target: 7 } });
  });
});

describe('newlyUnlocked', () => {
  it('lista o que passou de bloqueado para desbloqueado', () => {
    const before = evaluateBadges([], new Set());
    const after = evaluateBadges(recordsOf([logged('2026-09-13', { hourLeft: 6 })], '2026-09-13'), new Set());
    expect(newlyUnlocked(before, after)).toEqual(['first', 'early']);
    expect(newlyUnlocked(after, after)).toEqual([]);
  });
});
```

- [ ] **Step 8: Teste de `deriveProgress`**

`apps/mobile/src/domain/gamification/deriveProgress.test.ts`:
```ts
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { deriveProgress } from './deriveProgress';
import { badDay, cancelled, confirmed, logged, loggedRun, planned } from './testing/fixtures';

const TODAY = '2026-09-13';

describe('deriveProgress', () => {
  it('vazio', () => {
    const p = deriveProgress([], cfg, TODAY);
    expect(p).toMatchObject({ totalXp: 0, streak: 0, records: [], citiesCount: 0, activePlan: null, todayRecord: null });
    expect(p.level.level).toBe(1);
    expect(p.badges).toHaveLength(8);
  });

  it('plano confirmado dentro da janela: plano cumprido, XP do exemplo do spec', () => {
    const plan = planned(TODAY, { startHour: 17 });
    const events = [...loggedRun('2026-09-12', 6), plan, confirmed(plan, { hourLeft: 17, hourScore: 86 })];
    const p = deriveProgress(events, cfg, TODAY);
    expect(p.streak).toBe(7);
    expect(p.todayRecord).toMatchObject({ planFulfilled: true, streakDays: 7, activity: 'run', cityId: 'sp' });
    expect(p.todayRecord?.xp).toEqual({ base: 50, hourBonus: 43, planBonus: 25, streakBonus: 35, total: 153 });
    expect(p.activePlan).toBeNull();
  });

  it('confirmação até 2h após o fim ainda cumpre o plano; depois disso não', () => {
    const p1 = planned(TODAY, { startHour: 17, endHour: 19 });
    const p2 = planned('2026-09-12', { startHour: 17, endHour: 19 });
    const p = deriveProgress([p1, confirmed(p1, { hourLeft: 20 }), p2, confirmed(p2, { hourLeft: 21 })], cfg, TODAY);
    expect(p.records.find((r) => r.date === TODAY)?.planFulfilled).toBe(true);
    expect(p.records.find((r) => r.date === '2026-09-12')?.planFulfilled).toBe(false);
  });

  it('só o primeiro registro do dia conta', () => {
    const p = deriveProgress([logged(TODAY, { hourLeft: 8, hourScore: 60 }), logged(TODAY, { hourLeft: 18, hourScore: 100 })], cfg, TODAY);
    expect(p.records).toHaveLength(1);
    expect(p.records[0]?.hourScore).toBe(60);
    expect(p.totalXp).toBe(50 + 30 + 5);
  });

  it('plano ativo é o plano de hoje não cancelado e não confirmado', () => {
    const plan = planned(TODAY);
    expect(deriveProgress([plan], cfg, TODAY).activePlan).toMatchObject({ planId: plan.id, date: TODAY, window: plan.window });
    expect(deriveProgress([plan, cancelled(plan)], cfg, TODAY).activePlan).toBeNull();
    expect(deriveProgress([planned('2026-09-12')], cfg, TODAY).activePlan).toBeNull();
  });

  it('confirmação de plano inexistente ou cancelado é ignorada', () => {
    const plan = planned(TODAY);
    const orphan = { ...confirmed(plan), planId: 'nao-existe' };
    expect(deriveProgress([orphan], cfg, TODAY).records).toEqual([]);
    expect(deriveProgress([plan, cancelled(plan), confirmed(plan)], cfg, TODAY).records).toEqual([]);
  });

  it('folga por mau tempo entra em restDates e preserva o streak', () => {
    const p = deriveProgress([...loggedRun('2026-09-11', 2), badDay('2026-09-12')], cfg, TODAY);
    expect(p.restDates.has('2026-09-12')).toBe(true);
    expect(p.streak).toBe(2);
  });

  it('XP acumula, nível deriva do total e cidades são contadas', () => {
    const events = [logged('2026-09-10', { cityId: 'a', hourScore: 100 }), logged('2026-09-11', { cityId: 'b', hourScore: 100 })];
    const p = deriveProgress(events, cfg, TODAY);
    // dia 1: 50 + 50 + 5 = 105; dia 2: 50 + 50 + 10 = 110
    expect(p.totalXp).toBe(215);
    expect(p.level).toMatchObject({ level: 2, name: 'Garoa' });
    expect(p.citiesCount).toBe(2);
    expect([...p.activeDates].sort()).toEqual(['2026-09-10', '2026-09-11']);
  });

  it('ordena por createdAt mesmo se os eventos vierem fora de ordem', () => {
    const a = logged('2026-09-10');
    const b = logged('2026-09-11');
    expect(deriveProgress([b, a], cfg, TODAY).records.map((r) => r.date)).toEqual(['2026-09-10', '2026-09-11']);
  });
});
```

- [ ] **Step 9: Rodar e ver falhar**

Run: `pnpm --filter mobile test -- gamification`
Expected: FAIL em `badges` e `deriveProgress` (módulos não encontrados).

- [ ] **Step 10: Implementar `badges.ts`**

```ts
import { ACTIVITY_IDS } from '../activities/types';

import type { ActivityRecord } from './records';
import { computeStreak } from './streak';

export const BADGE_IDS = ['first', 'early', 'owl', 'explorer', 'planner', 'week', 'multi', 'perfect'] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export type BadgeState = {
  readonly id: BadgeId;
  readonly unlocked: boolean;
  readonly unlockedOn: string | null;
  readonly progress: { readonly current: number; readonly target: number } | null;
};

const TARGETS = { explorer: 5, planner: 10, week: 7, multi: ACTIVITY_IDS.length } as const;
const EARLY_BEFORE_HOUR = 7;
const OWL_FROM_HOUR = 20;
const PERFECT_SCORE = 95;

type Rule = {
  readonly id: BadgeId;
  readonly target: number | null;
  /** valor acumulado até o prefixo de registros (inclusive) */
  readonly measure: (prefix: readonly ActivityRecord[], restDates: ReadonlySet<string>) => number;
};

const distinct = <T>(xs: readonly T[]): number => new Set(xs).size;
const streakAt = (prefix: readonly ActivityRecord[], rest: ReadonlySet<string>): number => {
  const last = prefix[prefix.length - 1];
  return last ? computeStreak(new Set(prefix.map((r) => r.date)), rest, last.date) : 0;
};

const RULES: readonly Rule[] = [
  { id: 'first', target: null, measure: (p) => (p.length > 0 ? 1 : 0) },
  { id: 'early', target: null, measure: (p) => (p.some((r) => r.hourLeft < EARLY_BEFORE_HOUR) ? 1 : 0) },
  { id: 'owl', target: null, measure: (p) => (p.some((r) => r.hourLeft >= OWL_FROM_HOUR) ? 1 : 0) },
  { id: 'explorer', target: TARGETS.explorer, measure: (p) => distinct(p.map((r) => r.cityId)) },
  { id: 'planner', target: TARGETS.planner, measure: (p) => p.filter((r) => r.planFulfilled).length },
  { id: 'week', target: TARGETS.week, measure: (p, rest) => streakAt(p, rest) },
  { id: 'multi', target: TARGETS.multi, measure: (p) => distinct(p.map((r) => r.activity)) },
  { id: 'perfect', target: null, measure: (p) => (p.some((r) => r.hourScore >= PERFECT_SCORE) ? 1 : 0) },
];

/** Avalia a medida em cada prefixo (uma vez por prefixo): desbloqueio = primeiro prefixo que atinge o alvo. */
function evaluate(rule: Rule, records: readonly ActivityRecord[], rest: ReadonlySet<string>): BadgeState {
  const target = rule.target ?? 1;
  const values = records.map((_, i) => rule.measure(records.slice(0, i + 1), rest));
  const unlockIndex = values.findIndex((v) => v >= target);
  const peak = Math.min(Math.max(0, ...values), target);
  return {
    id: rule.id,
    unlocked: unlockIndex !== -1,
    unlockedOn: records[unlockIndex]?.date ?? null,
    progress: rule.target === null ? null : { current: peak, target },
  };
}

export function evaluateBadges(
  records: readonly ActivityRecord[],
  restDates: ReadonlySet<string>,
): readonly BadgeState[] {
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);
  return RULES.map((rule) => evaluate(rule, sorted, restDates));
}

export function newlyUnlocked(before: readonly BadgeState[], after: readonly BadgeState[]): readonly BadgeId[] {
  const wasUnlocked = new Set(before.filter((b) => b.unlocked).map((b) => b.id));
  return after.filter((b) => b.unlocked && !wasUnlocked.has(b.id)).map((b) => b.id);
}
```

- [ ] **Step 11: Implementar `deriveProgress.ts`**

```ts
import type { ActivityId } from '../activities/types';
import type { EngineConfig } from '../config/types';
import { isWithinWindow, type TimeWindow } from '../recommendation/windows';

import { evaluateBadges, type BadgeState } from './badges';
import type { ConfirmedEvent, GamificationEvent, LoggedEvent, PlannedEvent } from './events';
import { levelFor, type LevelProgress } from './levels';
import type { ActivityRecord } from './records';
import { computeStreak } from './streak';
import { computeXp } from './xp';

export type ActivePlan = {
  readonly planId: string;
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly window: TimeWindow;
  readonly windowScore: number;
};

export type Progress = {
  readonly totalXp: number;
  readonly level: LevelProgress;
  readonly streak: number;
  readonly records: readonly ActivityRecord[];
  readonly badges: readonly BadgeState[];
  readonly activeDates: ReadonlySet<string>;
  readonly restDates: ReadonlySet<string>;
  readonly citiesCount: number;
  readonly activePlan: ActivePlan | null;
  readonly todayRecord: ActivityRecord | null;
};

type Draft = Omit<ActivityRecord, 'streakDays' | 'xp'>;

function draftFromConfirmed(
  e: ConfirmedEvent,
  plans: ReadonlyMap<string, PlannedEvent>,
  cancelled: ReadonlySet<string>,
  graceHours: number,
): Draft | null {
  const plan = plans.get(e.planId);
  if (!plan || cancelled.has(plan.id)) return null;
  const planFulfilled =
    e.date === plan.date && isWithinWindow(plan.window, { hour: e.hourLeft, minute: 0 }, graceHours);
  return {
    id: e.id,
    date: e.date,
    cityId: plan.cityId,
    activity: plan.activity,
    hourLeft: e.hourLeft,
    hourScore: e.hourScore,
    planFulfilled,
    createdAt: e.createdAt,
  };
}

const draftFromLogged = (e: LoggedEvent): Draft => ({
  id: e.id,
  date: e.date,
  cityId: e.cityId,
  activity: e.activity,
  hourLeft: e.hourLeft,
  hourScore: e.hourScore,
  planFulfilled: false,
  createdAt: e.createdAt,
});

function buildRecords(
  sorted: readonly GamificationEvent[],
  cfg: EngineConfig,
  restDates: ReadonlySet<string>,
): readonly ActivityRecord[] {
  const plans = new Map(sorted.filter((e): e is PlannedEvent => e.type === 'planned').map((p) => [p.id, p]));
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const drafts = sorted.flatMap((e): Draft[] => {
    if (e.type === 'confirmed') {
      const d = draftFromConfirmed(e, plans, cancelled, cfg.window.graceHoursAfterEnd);
      return d ? [d] : [];
    }
    return e.type === 'logged' ? [draftFromLogged(e)] : [];
  });
  return drafts.reduce<readonly ActivityRecord[]>((acc, d) => {
    if (acc.some((r) => r.date === d.date)) return acc; // só o primeiro do dia conta
    const active = new Set([...acc.map((r) => r.date), d.date]);
    const streakDays = computeStreak(active, restDates, d.date);
    const xp = computeXp({ hourScore: d.hourScore, planFulfilled: d.planFulfilled, streakDays }, cfg.xp);
    return [...acc, { ...d, streakDays, xp }];
  }, []);
}

function findActivePlan(sorted: readonly GamificationEvent[], today: string): ActivePlan | null {
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const confirmedIds = new Set(sorted.flatMap((e) => (e.type === 'confirmed' ? [e.planId] : [])));
  const plan = [...sorted]
    .reverse()
    .find(
      (e): e is PlannedEvent =>
        e.type === 'planned' && e.date === today && !cancelled.has(e.id) && !confirmedIds.has(e.id),
    );
  return plan
    ? { planId: plan.id, cityId: plan.cityId, activity: plan.activity, date: plan.date, window: plan.window, windowScore: plan.windowScore }
    : null;
}

export function deriveProgress(
  events: readonly GamificationEvent[],
  cfg: EngineConfig,
  today: string,
): Progress {
  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const restDates = new Set(sorted.flatMap((e) => (e.type === 'badWeatherDay' ? [e.date] : [])));
  const records = buildRecords(sorted, cfg, restDates);
  const activeDates = new Set(records.map((r) => r.date));
  const totalXp = records.reduce((acc, r) => acc + r.xp.total, 0);
  return {
    totalXp,
    level: levelFor(totalXp, cfg.levels),
    streak: computeStreak(activeDates, restDates, today),
    records,
    badges: evaluateBadges(records, restDates),
    activeDates,
    restDates,
    citiesCount: new Set(records.map((r) => r.cityId)).size,
    activePlan: findActivePlan(sorted, today),
    todayRecord: records.find((r) => r.date === today) ?? null,
  };
}
```

- [ ] **Step 12: Rodar, lint, commit**

Run: `pnpm --filter mobile test -- gamification && pnpm --filter mobile lint && pnpm --filter mobile typecheck`
Expected: PASS em `streak`, `badges`, `deriveProgress`; cobertura de `domain` 100 %. Se `deriveProgress.ts` passar de 300 linhas, extraia `findActivePlan` para `activePlan.ts` mantendo a assinatura.

```bash
git add apps/mobile/src/domain/gamification
git commit -m "feat(domain): streak com folga por mau tempo, badges e derivação do progresso"
```

---

### Task 12: Fechamento: índice público do domínio, cobertura e README inicial

**Files:**
- Create: `apps/mobile/src/domain/index.ts`
- Create: `README.md`
- Modify: `.gitignore` (adicionar `coverage/`, `.expo/`)

**Interfaces:**
- Produces: `@/domain` como único ponto de importação público do domínio para as camadas de cima (Plano 2).

- [ ] **Step 1: Criar `apps/mobile/src/domain/index.ts`**

```ts
export * from './shared/result';
export * from './forecast/types';
export * from './time/localDateTime';
export * from './time/dayPhase';
export * from './activities/types';
export * from './config/types';
export { defaultEngineConfig } from './config/defaultEngineConfig';
export * from './recommendation/scoreHour';
export * from './recommendation/windows';
export * from './recommendation/tips';
export * from './recommendation/recommendDay';
export * from './recommendation/overview';
export * from './gamification/events';
export * from './gamification/xp';
export * from './gamification/levels';
export * from './gamification/records';
export * from './gamification/badges';
export * from './gamification/streak';
export * from './gamification/deriveProgress';
```

- [ ] **Step 2: Atualizar `.gitignore`** (raiz), acrescentando:

```
coverage/
.expo/
*.orig.*
web-build/
```

- [ ] **Step 3: Rodar a suíte completa com cobertura**

Run: `pnpm --filter mobile test`
Expected: todos os testes passam; a tabela de cobertura mostra `src/domain` em 100 % nas quatro colunas e nenhum aviso de threshold. Se algum arquivo do domínio ficar abaixo de 100 %, adicione o teste que cobre a linha apontada (não use `istanbul ignore` fora dos casos já autorizados nas tarefas 7 e 10).

Run: `pnpm lint && pnpm typecheck`
Expected: sem erros.

- [ ] **Step 4: Smoke do app no Expo Go**

Run: `pnpm --filter mobile start`
Expected: QR code no terminal; ao abrir no Expo Go, a tela mostra "Melhor Hora" e "Domínio em construção". Encerre com Ctrl+C.

- [ ] **Step 5: `README.md` inicial**

```markdown
# Melhor Hora

App React Native (Expo) que transforma a previsão da Open-Meteo em uma recomendação simples:
o melhor horário do dia para uma atividade ao ar livre, com gamificação para criar o hábito.

## Estado

Plano 1 concluído: monorepo, tooling e domínio (motor de recomendação e gamificação) com
100 % de cobertura. As telas, a integração com a API e o BFF vêm nos próximos planos.

## Rodar

```bash
pnpm install
pnpm --filter mobile start   # QR code para o Expo Go
pnpm test                    # testes com cobertura
pnpm lint && pnpm typecheck
```

## Estrutura

- `apps/mobile/src/domain` — regras puras, sem React: `recommendation/` (score por hora,
  janela, frase, dicas) e `gamification/` (eventos, XP, níveis, streak, badges).
- Documentação de design: `docs/superpowers/specs/2026-09-13-melhor-hora-design.md`.
```

- [ ] **Step 6: Commit final do plano**

```bash
git add -A
git commit -m "chore: índice público do domínio, cobertura 100% e README inicial"
```

---

## Self-review (feito ao escrever o plano)

**Cobertura do spec (seções atribuídas a este plano):**
- 3.1 perfis → Task 5. 4.1 entrada e fuso → Tasks 4 e 9. 4.2 score e vetos → Task 6.
  4.3 janela, "é agora", candidatas com 30 min → Task 7 (+ regra do bônus por duração corrigida no spec).
  4.4 descritores, frase, ressalva, dicas → Task 8. 4.5 agora, próximos dias, comparativo, melhor da semana → Task 9.
  4.6 config como parâmetro com cópia embutida → Task 5 (o download remoto é do Plano 3).
  5.1 eventos → Task 10. 5.2 XP → Task 10. 5.3 níveis → Task 10. 5.4 streak → Task 11. 5.5 badges → Task 11.
  5.6 notificação → Plano 2 (infra). 6.1/6.2 camadas, boundaries, Result, imutabilidade → Tasks 2, 3.
  8.1 tooling → Tasks 1–3. 8.2 cobertura domain 100 % → Tasks 2 e 12.
- Fora deste plano, de propósito: application, infrastructure, presentation, BFF, CI (Planos 2 e 3).

**Consistência de nomes entre tarefas:** `HourScore`, `ScoreLabel`, `labelFor`, `scoreHour` (T6) usados em T7–T9;
`TimeWindow`, `WindowResult`, `isWithinWindow`, `candidateHours`, `findBestWindow` (T7) usados em T8–T11;
`Tip` (T8) em T9; `XpBreakdown`, `computeXp` (T10) em T11; `LevelProgress`, `levelFor` (T10) em T11;
`ActivityRecord` (T11 `records.ts`) em `badges.ts` e `deriveProgress.ts`; `EngineConfig.window.lengthBonus` (T5) em T7.
