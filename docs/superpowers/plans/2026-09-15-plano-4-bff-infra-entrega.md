# Plano 4 — BFF, infra, config remota, CI/CD e entrega

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a entrega do teste técnico: BFF com cache Redis, bucket MinIO com config remota do motor, app com modo `bff` e fallback `direct`, infra real na VPS atrás do nginx existente, CI/CD no GitHub Actions, documentação (README, ADRs, apresentação) e repositório público.

**Architecture:** Um pacote `packages/contracts` concentra os schemas Zod compartilhados (DTOs do BFF, schemas brutos da Open-Meteo, `engine.json`). O BFF (`apps/bff`, Hono em Node 22) é um proxy fino com cache Redis por chave normalizada, rate limit por IP e validação em ambas as pontas; se o Redis cair, segue sem cache. O app ganha adapters `bff` para os mesmos ports (`ForecastProvider`, `GeocodingProvider`, `EngineConfigProvider`) e o container escolhe por `EXPO_PUBLIC_API_MODE`. Na VPS, Docker Compose sobe `bff`, `redis` e `minio` em portas locais; o **nginx já existente** (que detém 80/443 com certbot) faz TLS, cabeçalhos de cache e cache de borda — o Caddy do spec cai (ADR 0008). Cloudflare fica condicional a um domínio registrado.

**Tech Stack:** pnpm workspaces (hoisted), TypeScript 6 strict, Zod 4, Hono 4 + `@hono/node-server`, ioredis 5, pino 9, Vitest 3, esbuild, Docker Compose v5, nginx + certbot (já na VPS), MinIO + `mc`, GitHub Actions, GHCR, Expo SDK 57 (app).

**Spec:** `docs/superpowers/specs/2026-09-13-melhor-hora-design.md` (seções 2, 4.6, 6.4, 7, 8, 9, 10, 11, 12). Pendências herdadas: `docs/superpowers/plans/2026-09-14-plano-{1,2,3}-pendencias.md` e `docs/superpowers/qa/2026-09-15-qa-visual-web.md` (seção "Residuais").

## Global Constraints

- Monorepo pnpm `10.4.0`, Node `>=22`, `nodeLinker: hoisted` (`.npmrc`); novos pacotes entram em `pnpm-workspace.yaml` (`apps/*`, `packages/*` já listados).
- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` em todos os pacotes novos (copiar as opções de `apps/mobile/tsconfig.json`).
- Zod na mesma major do app (`^4.6.5`) em `contracts` e `bff`; API do Zod 4 (`z.url()`, `z.enum([...])`, `.refine(fn, { message })`).
- Camadas do app: `domain` só importa `domain`; `application` só `domain`/`application`; `@melhor-hora/contracts` é import **externo** permitido em `infrastructure` (e `application`/`presentation` se preciso), **nunca em `domain`**. O domínio recebe a config como parâmetro; nunca lê rede nem storage (spec 4.6).
- Cobertura: domain 100 %, global ≥ 80 % (app); bff ≥ 85 %; contracts ≥ 90 %. Sem `istanbul ignore`/`v8 ignore`.
- `no-console` em todo código de produção (BFF loga com pino; app com `consoleLogger`).
- Copy do app em PT-BR e só em `src/presentation/i18n/pt-BR.ts`.
- Commits convencionais (`feat|fix|refactor|docs|test|chore|perf|ci: ...`), sem trailers de atribuição (o hook `commit-msg` rejeita).
- Endpoints, chaves e TTLs do BFF exatamente como o spec 7.2: `GET /v1/cities?q=&lang=pt` → `geo:v1:{lang}:{q normalizado}` TTL 24 h; `GET /v1/forecast?lat=&lon=` → `fc:v1:{lat 2 casas}:{lon 2 casas}` TTL 15 min; `GET /health`; rate limit 60 req/min por IP (janela deslizante) com `429` + `Retry-After`; timeout upstream 5 s → `502` com `{ error: { code, message } }`; sem cachear resposta inválida; sem Redis segue sem cache e loga.
- Variáveis (spec 7.5): mobile `EXPO_PUBLIC_API_MODE`, `EXPO_PUBLIC_BFF_URL`, `EXPO_PUBLIC_ASSETS_URL`; BFF `PORT`, `REDIS_URL`, `ALLOWED_ORIGINS`, `OPEN_METEO_BASE_URL`, `GEOCODING_BASE_URL`, `RATE_LIMIT_PER_MIN`, `UPSTREAM_TIMEOUT_MS`, `LOG_LEVEL`; todas validadas com Zod na inicialização; `.env.example` versionado.
- Decisões deste plano (registrar em ADR): **nginx existente como borda, sem Caddy** (ADR 0008); **bucket só com `config/v1/engine.json`** — o app usa emoji, não imagens (spec 7.3 "o bucket é otimização"); **imagem do BFF pública no GHCR** (VPS não precisa de login); **Cloudflare condicional** a domínio registrado (spec 11.2).
- Domínios padrão (DuckDNS, conta do usuário): API `melhor-hora.duckdns.org`, assets `melhor-hora-assets.duckdns.org`. Se o usuário informar outros, trocar só em `infra/.env` (variáveis `API_DOMAIN`, `ASSETS_DOMAIN`).
- Ações com efeito externo exigem confirmação explícita do usuário antes de executar: criar/pushar repositório, gravar secrets, mexer na VPS (`ssh root@76.13.230.205`), rodar certbot. Tudo o mais roda sem perguntar.
- VPS (verificado em 2026-09-15): Ubuntu 24.04, Docker 29 + Compose v5, 2 vCPU, 7,9 GB RAM, nginx do sistema em 80/443 com certbot 2.9, portas locais livres para 8180 (bff), 9000/9001 (minio); `ufw` inativo — **todos os serviços novos escutam só em `127.0.0.1`**.

---

## Estrutura de arquivos (novos e alterados)

```
packages/contracts/
  package.json  tsconfig.json  vitest.config.ts  eslint.config.js
  src/index.ts
  src/engineConfig.ts (+ .test.ts)          # schema do engine.json com invariantes
  src/dto.ts (+ .test.ts)                   # CityDto, ForecastDto (contrato BFF ↔ app)
  src/openMeteo/{forecastSchema,geocodingSchema,mapForecast,mapCity,query}.ts (+ tests)
  src/testing/index.ts  src/testing/fixtures/{forecast,geocoding}-sao-paulo.json
apps/bff/
  package.json  tsconfig.json  vitest.config.ts  eslint.config.js  Dockerfile  README.md  .env.example
  src/server.ts  src/app.ts  src/logger.ts
  src/config/env.ts (+ .test.ts)
  src/cache/{cache,memoryCache,redisCache,resilientCache,keys,meter}.ts (+ tests)
  src/upstream/openMeteo.ts (+ .test.ts)
  src/http/{errors,rateLimit,requestLog}.ts (+ tests)
  src/routes/{health,cities,forecast}.ts (+ tests em app.test.ts)
apps/mobile/src/infrastructure/
  env.ts (falha alto em bff)  adapters.ts (+ .test.ts)  container.ts
  bff/{bffGeocodingClient,bffForecastClient}.ts (+ tests)
  config/remoteEngineConfigProvider.ts (+ .test.ts)
  openMeteo/* (passam a importar schemas/mappers do contracts)
apps/mobile/src/application/useCases/{planActivity,confirmActivity,logActivity,getProgress}.ts (config injetada)
infra/
  docker-compose.yml  docker-compose.local.yml  .env.example  README.md
  nginx/melhor-hora.conf.template  setup-vps.sh  deploy.sh  publish-config.sh
  assets/config/v1/engine.json
.github/workflows/{ci,deploy-bff,publish-assets}.yml
docs/adr/0001..0008-*.md  docs/apresentacao.md  README.md
```

---

### Task 1: Pacote `@melhor-hora/contracts` com o schema do `engine.json`

**Files:**

- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/vitest.config.ts`, `packages/contracts/eslint.config.js`
- Create: `packages/contracts/src/index.ts`, `packages/contracts/src/engineConfig.ts`, `packages/contracts/src/testing/index.ts`, `packages/contracts/src/testing/validEngineConfig.ts`
- Test: `packages/contracts/src/engineConfig.test.ts`, `apps/mobile/src/infrastructure/config/engineConfigSchema.test.ts`
- Modify: `apps/mobile/package.json` (dependência `"@melhor-hora/contracts": "workspace:*"`), `apps/mobile/eslint.config.js` (comentário: contracts é origem externa; nenhuma regra nova)

**Interfaces:**

- Produces: `engineConfigSchema: z.ZodType<EngineConfigDto>` e `type EngineConfigDto = z.infer<typeof engineConfigSchema>`; `ACTIVITY_IDS`, `FACTOR_IDS` (mesmas listas do domínio); `validEngineConfig: EngineConfigDto` em `@melhor-hora/contracts/testing` (cópia literal de `defaultEngineConfig`).
- Invariantes impostas (pendência Plano 1): `tolMin < idealMin <= idealMax < tolMax`; `ok < max` em vento/UV; pesos somam 1 (±1e-6); `scores.great > good > fair`; `window.sizes` inteiros ≥ 1, não vazio; `quietHoursEnd` inteiro 0–23; `levels` não vazio, `level` 1..n consecutivos, `xp` começa em 0 e é estritamente crescente; `schemaVersion === 1`.

- [ ] **Step 1: Criar o pacote**

`packages/contracts/package.json`:

```json
{
  "name": "@melhor-hora/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./testing": "./src/testing/index.ts"
  },
  "scripts": {
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage"
  },
  "dependencies": { "zod": "^4.6.5" },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "@vitest/coverage-v8": "^3.2.4",
    "eslint": "^9.39.5",
    "eslint-config-prettier": "^10.1.8",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.46.0",
    "vitest": "^3.2.4"
  }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": []
  },
  "include": ["src/**/*.ts", "src/**/*.json", "vitest.config.ts"]
}
```

`packages/contracts/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/index.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
```

`packages/contracts/eslint.config.js` (mesma base para o BFF na Task 3):

```js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage/**', 'dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { rules: { 'no-console': 'error', '@typescript-eslint/consistent-type-imports': 'error' } },
);
```

- [ ] **Step 2: Escrever o teste do schema (falhando)**

`packages/contracts/src/engineConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { engineConfigSchema } from './engineConfig';
import { validEngineConfig } from './testing/validEngineConfig';

const withWalk = (patch: Partial<(typeof validEngineConfig)['activities']['walk']>) => ({
  ...validEngineConfig,
  activities: {
    ...validEngineConfig.activities,
    walk: { ...validEngineConfig.activities.walk, ...patch },
  },
});

describe('engineConfigSchema', () => {
  it('aceita a config embutida sem alterar nada', () => {
    const parsed = engineConfigSchema.parse(validEngineConfig);
    expect(parsed).toEqual(validEngineConfig);
  });

  it('rejeita schemaVersion diferente de 1', () => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, schemaVersion: 2 }).success).toBe(
      false,
    );
  });

  it.each([
    ['tolMin >= idealMin', { idealMin: 17, idealMax: 26, tolMin: 17, tolMax: 33 }],
    ['idealMin > idealMax', { idealMin: 27, idealMax: 26, tolMin: 8, tolMax: 33 }],
    ['idealMax >= tolMax', { idealMin: 17, idealMax: 33, tolMin: 8, tolMax: 33 }],
  ])('rejeita faixa térmica incoerente (%s)', (_, thermal) => {
    expect(engineConfigSchema.safeParse(withWalk({ thermal })).success).toBe(false);
  });

  it('rejeita pesos que não somam 1', () => {
    const weights = { thermal: 0.5, rain: 0.3, wind: 0.15, uv: 0.1, sun: 0.05 };
    expect(engineConfigSchema.safeParse(withWalk({ weights })).success).toBe(false);
  });

  it('rejeita limite com ok >= max', () => {
    expect(engineConfigSchema.safeParse(withWalk({ wind: { ok: 45, max: 45 } })).success).toBe(
      false,
    );
  });

  it('rejeita id da atividade diferente da chave', () => {
    expect(engineConfigSchema.safeParse(withWalk({ id: 'run' })).success).toBe(false);
  });

  it('rejeita limiares de score fora de ordem', () => {
    const scores = { great: 60, good: 65, fair: 45 };
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, scores }).success).toBe(false);
  });

  it.each([
    ['sizes vazio', { sizes: [] }],
    ['size zero', { sizes: [0, 1] }],
    ['size fracionário', { sizes: [1.5] }],
    ['quietHoursEnd 24', { quietHoursEnd: 24 }],
  ])('rejeita regra de janela inválida (%s)', (_, patch) => {
    const window = { ...validEngineConfig.window, ...patch };
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, window }).success).toBe(false);
  });

  it.each([
    ['vazio', []],
    ['não começa em 0', [{ level: 1, xp: 10, name: 'A' }]],
    [
      'xp não cresce',
      [
        { level: 1, xp: 0, name: 'A' },
        { level: 2, xp: 0, name: 'B' },
      ],
    ],
    [
      'níveis não consecutivos',
      [
        { level: 1, xp: 0, name: 'A' },
        { level: 3, xp: 100, name: 'C' },
      ],
    ],
  ])('rejeita níveis inválidos (%s)', (_, levels) => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, levels }).success).toBe(false);
  });

  it('rejeita campos desconhecidos no topo (config de outra versão)', () => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, extra: 1 }).success).toBe(false);
  });
});
```

`packages/contracts/src/testing/validEngineConfig.ts` é a cópia literal de `apps/mobile/src/domain/config/defaultEngineConfig.ts` (mesmos números; ver aquele arquivo — cinco atividades, `scores { great: 80, good: 65, fair: 45 }`, `window { sizes: [1, 2, 3], minHourScore: 45, lengthBonus: 3, minRemainingMinutes: 30, graceHoursAfterEnd: 2, quietHoursEnd: 5 }`, `tips { uvProtect: 6, waterApparent: 28, coolDropDeg: 4, rainNextPct: 40, coatApparent: 14 }`, `xp { base: 50, planBonus: 25, streakPerDay: 5, streakMaxDays: 10 }`, oito níveis de Brisa (0) a Clima Perfeito (4900)) exportada como `export const validEngineConfig = { ... } as const satisfies EngineConfigDto` — **sem** importar o domínio do app. `packages/contracts/src/testing/index.ts` reexporta `validEngineConfig`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm install && pnpm --filter @melhor-hora/contracts test`
Expected: FAIL — `Cannot find module './engineConfig'`.

- [ ] **Step 4: Implementar o schema**

`packages/contracts/src/engineConfig.ts`:

```ts
import { z } from 'zod';

export const ACTIVITY_IDS = ['walk', 'run', 'cycle', 'beach', 'picnic'] as const;
export const FACTOR_IDS = ['thermal', 'rain', 'wind', 'uv', 'sun'] as const;

const WEIGHT_SUM_TOLERANCE = 1e-6;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;

const score = z.number().min(0).max(100);
const nonNegative = z.number().min(0);
const unit = z.number().min(0).max(1);

const limitSchema = z
  .object({ ok: nonNegative, max: nonNegative })
  .strict()
  .refine((l) => l.ok < l.max, { message: 'ok deve ser menor que max' });

const thermalSchema = z
  .object({ idealMin: z.number(), idealMax: z.number(), tolMin: z.number(), tolMax: z.number() })
  .strict()
  .refine((t) => t.tolMin < t.idealMin && t.idealMin <= t.idealMax && t.idealMax < t.tolMax, {
    message: 'esperado tolMin < idealMin <= idealMax < tolMax',
  });

const weightsSchema = z
  .object({ thermal: unit, rain: unit, wind: unit, uv: unit, sun: unit })
  .strict()
  .refine((w) => Math.abs(w.thermal + w.rain + w.wind + w.uv + w.sun - 1) < WEIGHT_SUM_TOLERANCE, {
    message: 'pesos devem somar 1',
  });

const activitySchema = z
  .object({
    id: z.enum(ACTIVITY_IDS),
    name: z.string().min(1),
    emoji: z.string().min(1),
    thermal: thermalSchema,
    wind: limitSchema,
    uv: limitSchema,
    nightFactor: unit,
    weights: weightsSchema,
  })
  .strict();

const activitiesSchema = z
  .object({
    walk: activitySchema,
    run: activitySchema,
    cycle: activitySchema,
    beach: activitySchema,
    picnic: activitySchema,
  })
  .strict()
  .refine((a) => ACTIVITY_IDS.every((id) => a[id].id === id), {
    message: 'o campo id de cada atividade deve repetir a chave',
  });

const scoresSchema = z
  .object({ great: score, good: score, fair: score })
  .strict()
  .refine((s) => s.great > s.good && s.good > s.fair, { message: 'great > good > fair' });

const windowSchema = z
  .object({
    sizes: z.array(z.number().int().min(1)).min(1),
    minHourScore: score,
    lengthBonus: nonNegative,
    minRemainingMinutes: z.number().int().min(0).max(MINUTES_IN_HOUR),
    graceHoursAfterEnd: nonNegative,
    quietHoursEnd: z
      .number()
      .int()
      .min(0)
      .max(HOURS_IN_DAY - 1),
  })
  .strict();

const tipsSchema = z
  .object({
    uvProtect: nonNegative,
    waterApparent: z.number(),
    coolDropDeg: nonNegative,
    rainNextPct: score,
    coatApparent: z.number(),
  })
  .strict();

const xpSchema = z
  .object({
    base: nonNegative,
    planBonus: nonNegative,
    streakPerDay: nonNegative,
    streakMaxDays: z.number().int().min(0),
  })
  .strict();

const levelSchema = z
  .object({ level: z.number().int().min(1), xp: nonNegative, name: z.string().min(1) })
  .strict();

const levelsSchema = z
  .array(levelSchema)
  .min(1)
  .refine((levels) => levels[0]?.xp === 0, { message: 'o primeiro nível começa em 0 XP' })
  .refine((levels) => levels.every((l, i) => l.level === i + 1), {
    message: 'níveis devem ser 1..n consecutivos',
  })
  .refine((levels) => levels.every((l, i) => i === 0 || l.xp > (levels[i - 1]?.xp ?? 0)), {
    message: 'xp deve crescer estritamente',
  });

export const engineConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    activities: activitiesSchema,
    scores: scoresSchema,
    window: windowSchema,
    tips: tipsSchema,
    xp: xpSchema,
    levels: levelsSchema,
  })
  .strict();

export type EngineConfigDto = z.infer<typeof engineConfigSchema>;
```

`packages/contracts/src/index.ts`:

```ts
export { ACTIVITY_IDS, FACTOR_IDS, engineConfigSchema, type EngineConfigDto } from './engineConfig';
```

- [ ] **Step 5: Rodar até passar**

Run: `pnpm --filter @melhor-hora/contracts test && pnpm --filter @melhor-hora/contracts typecheck && pnpm --filter @melhor-hora/contracts lint`
Expected: PASS, cobertura ≥ 90 %.

- [ ] **Step 6: Ligar o app ao pacote e provar a compatibilidade de tipos**

Em `apps/mobile/package.json` adicionar em `dependencies`: `"@melhor-hora/contracts": "workspace:*"` e rodar `pnpm install`.

`apps/mobile/src/infrastructure/config/engineConfigSchema.test.ts`:

```ts
import { engineConfigSchema, type EngineConfigDto } from '@melhor-hora/contracts';

import { defaultEngineConfig, type EngineConfig } from '@/domain';

// Os dois tipos são estruturalmente iguais: o DTO do contrato é atribuível ao tipo do domínio e
// vice-versa. Se um dos lados ganhar um campo, este arquivo para de compilar.
const dtoToDomain: EngineConfig = {} as EngineConfigDto;
const domainToDto: EngineConfigDto = {} as EngineConfig;
void dtoToDomain;
void domainToDto;

describe('engine.json (contracts) × defaultEngineConfig (domínio)', () => {
  it('a config embutida é válida e sai idêntica do schema', () => {
    expect(engineConfigSchema.parse(defaultEngineConfig)).toEqual(defaultEngineConfig);
  });

  it('config malformada nunca chega ao motor: faixa térmica invertida é rejeitada', () => {
    const broken = {
      ...defaultEngineConfig,
      activities: {
        ...defaultEngineConfig.activities,
        walk: {
          ...defaultEngineConfig.activities.walk,
          thermal: { idealMin: 26, idealMax: 17, tolMin: 8, tolMax: 33 },
        },
      },
    };
    expect(engineConfigSchema.safeParse(broken).success).toBe(false);
  });
});
```

Run: `pnpm --filter mobile exec jest src/infrastructure/config --coverage=false && pnpm --filter mobile typecheck && pnpm --filter mobile lint`
Expected: PASS. Se o ESLint acusar `boundaries/dependencies` para `@melhor-hora/contracts`, o import está na camada errada (deve ser `infrastructure`); nenhuma política nova é necessária porque pacotes npm/workspace são origem `external`.

- [ ] **Step 7: Verificar o Metro com o pacote de workspace**

Run: `pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export && rm -rf /tmp/mh-export`
Expected: bundle gerado sem erro de resolução de `@melhor-hora/contracts` (o `expo/metro-config` detecta o monorepo e observa a raiz). Se falhar com "Unable to resolve", criar `apps/mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
module.exports = config;
```

- [ ] **Step 8: Commit**

```bash
git add packages/contracts apps/mobile/package.json apps/mobile/src/infrastructure/config/engineConfigSchema.test.ts pnpm-lock.yaml
git commit -m "feat(contracts): pacote compartilhado com schema validado do engine.json"
```

---

### Task 2: DTOs do BFF e schemas brutos da Open-Meteo no pacote; app passa a usá-los

**Files:**

- Create: `packages/contracts/src/dto.ts` (+ `dto.test.ts`), `packages/contracts/src/openMeteo/forecastSchema.ts`, `geocodingSchema.ts`, `mapForecast.ts`, `mapCity.ts`, `query.ts` (+ `openMeteo.test.ts`), `packages/contracts/src/testing/fixtures/forecast-sao-paulo.json`, `geocoding-sao-paulo.json` (movidos de `apps/mobile/src/infrastructure/openMeteo/testing/fixtures/`)
- Modify: `packages/contracts/src/index.ts`, `packages/contracts/src/testing/index.ts`
- Modify: `apps/mobile/src/infrastructure/openMeteo/forecastClient.ts`, `geocodingClient.ts` (importam do contracts; `HOURLY_VARS`/`DAILY_VARS`/`buildForecastUrl` saem daqui), `realFixtures.test.ts`, `mapForecast.test.ts` (move para o contracts como Vitest), `testing/forecastDto.ts`, `apps/mobile/src/presentation/testing/msw/handlers.ts` (fixtures do contracts)
- Delete: `apps/mobile/src/infrastructure/openMeteo/{forecastSchema,geocodingSchema,mapForecast,mapCity}.ts` e as fixtures antigas

**Interfaces:**

- Consumes: `engineConfigSchema` (Task 1).
- Produces: `cityDtoSchema`/`CityDto` (= `City` do app: `id, name, admin1 | null, country, countryCode, latitude, longitude, timezone`), `forecastDtoSchema`/`ForecastDto` (= `Forecast` do domínio: `timezone, utcOffsetSeconds, hourly: HourlyDto[], daily: DailyDto[]`), `openMeteoForecastSchema`, `openMeteoGeocodingSchema`, `mapForecast(raw): ForecastDto`, `mapCity(raw): CityDto`, `buildForecastUrl(baseUrl, lat, lon)`, `buildGeocodingUrl(baseUrl, query, lang, count)`, `HOURLY_VARS`, `DAILY_VARS`, `FORECAST_DAYS = 5`, `GEOCODING_COUNT = 8`; fixtures `forecastSaoPaulo`, `geocodingSaoPaulo` em `@melhor-hora/contracts/testing`.

- [ ] **Step 1: Teste do DTO e do mapper (falhando)**

`packages/contracts/src/dto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { cityDtoSchema, forecastDtoSchema } from './dto';
import { mapCity } from './openMeteo/mapCity';
import { mapForecast } from './openMeteo/mapForecast';
import { forecastSaoPaulo, geocodingSaoPaulo } from './testing';

describe('DTOs do BFF', () => {
  it('a previsão mapeada da fixture real passa no forecastDtoSchema', () => {
    const dto = mapForecast(forecastSaoPaulo);
    expect(forecastDtoSchema.parse(dto)).toEqual(dto);
    expect(dto.hourly).toHaveLength(120);
    expect(dto.hourly[0]).toMatchObject({ date: '2026-09-14', hour: 0 });
  });

  it('cada cidade mapeada da fixture real passa no cityDtoSchema', () => {
    for (const raw of geocodingSaoPaulo.results ?? []) {
      const dto = mapCity(raw);
      expect(cityDtoSchema.parse(dto)).toEqual(dto);
    }
  });

  it('rejeita previsão com hora fora de 0–23', () => {
    const dto = mapForecast(forecastSaoPaulo);
    const first = dto.hourly[0];
    if (!first) throw new Error('fixture vazia');
    const broken = { ...dto, hourly: [{ ...first, hour: 24 }, ...dto.hourly.slice(1)] };
    expect(forecastDtoSchema.safeParse(broken).success).toBe(false);
  });
});
```

`packages/contracts/src/openMeteo/openMeteo.test.ts` (traz os casos de `apps/mobile/src/infrastructure/openMeteo/mapForecast.test.ts` e `realFixtures.test.ts`, adaptados a Vitest):

```ts
import { describe, expect, it } from 'vitest';

import { forecastSaoPaulo, geocodingSaoPaulo } from '../testing';

import { openMeteoForecastSchema } from './forecastSchema';
import { openMeteoGeocodingSchema } from './geocodingSchema';
import { mapForecast } from './mapForecast';
import { buildForecastUrl, buildGeocodingUrl, DAILY_VARS, HOURLY_VARS } from './query';

describe('schemas brutos da Open-Meteo', () => {
  it('geocoding real passa e traz São Paulo', () => {
    const parsed = openMeteoGeocodingSchema.safeParse(geocodingSaoPaulo);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.results?.some((r) => r.name === 'São Paulo')).toBe(true);
  });

  it('forecast real passa e mapeia 5 dias × 24 horas com fuso e offset', () => {
    const parsed = openMeteoForecastSchema.safeParse(forecastSaoPaulo);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const f = mapForecast(parsed.data);
    expect(f.hourly).toHaveLength(120);
    expect(f.daily).toHaveLength(5);
    expect(f.timezone).toBe('America/Sao_Paulo');
    expect(f.utcOffsetSeconds).toBe(-10800);
  });

  it('arrays horários de tamanhos diferentes são rejeitados', () => {
    const broken = {
      ...forecastSaoPaulo,
      hourly: { ...forecastSaoPaulo.hourly, uv_index: forecastSaoPaulo.hourly.uv_index.slice(1) },
    };
    expect(openMeteoForecastSchema.safeParse(broken).success).toBe(false);
  });

  it('valores nulos viram 0 e is_day vira boolean', () => {
    const raw = openMeteoForecastSchema.parse(forecastSaoPaulo);
    const patched = {
      ...raw,
      hourly: {
        ...raw.hourly,
        precipitation_probability: raw.hourly.precipitation_probability.map(() => null),
        is_day: raw.hourly.is_day.map((_, i) => (i % 2 === 0 ? 1 : 0)),
      },
    };
    const f = mapForecast(patched);
    expect(f.hourly[0]?.precipitationProbability).toBe(0);
    expect(f.hourly[0]?.isDay).toBe(true);
    expect(f.hourly[1]?.isDay).toBe(false);
  });

  it('monta as URLs com os parâmetros fixos do spec 4.1', () => {
    const url = new URL(buildForecastUrl('https://api.open-meteo.com', -23.5475, -46.63611));
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('hourly')).toBe(HOURLY_VARS.join(','));
    expect(url.searchParams.get('daily')).toBe(DAILY_VARS.join(','));
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    const geo = new URL(
      buildGeocodingUrl('https://geocoding-api.open-meteo.com', 'São Paulo', 'pt', 8),
    );
    expect(geo.pathname).toBe('/v1/search');
    expect(geo.searchParams.get('name')).toBe('São Paulo');
    expect(geo.searchParams.get('count')).toBe('8');
    expect(geo.searchParams.get('language')).toBe('pt');
    expect(geo.searchParams.get('format')).toBe('json');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @melhor-hora/contracts test`
Expected: FAIL por módulos ausentes.

- [ ] **Step 3: Mover schemas e mappers para o pacote**

`git mv apps/mobile/src/infrastructure/openMeteo/testing/fixtures/*.json packages/contracts/src/testing/fixtures/`.

`packages/contracts/src/testing/index.ts`:

```ts
import forecastSaoPaulo from './fixtures/forecast-sao-paulo.json';
import geocodingSaoPaulo from './fixtures/geocoding-sao-paulo.json';

export { validEngineConfig } from './validEngineConfig';
export { forecastSaoPaulo, geocodingSaoPaulo };
```

`packages/contracts/src/openMeteo/forecastSchema.ts` e `geocodingSchema.ts`: o conteúdo atual de `apps/mobile/src/infrastructure/openMeteo/{forecastSchema,geocodingSchema}.ts`, renomeando as exportações para `openMeteoForecastSchema` / `OpenMeteoForecast` e `openMeteoGeocodingSchema` / `OpenMeteoGeocodingResult` / `OpenMeteoGeocodingResponse`.

`packages/contracts/src/openMeteo/query.ts`:

```ts
export const FORECAST_DAYS = 5;
export const GEOCODING_COUNT = 8;
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

export function buildForecastUrl(baseUrl: string, latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `${baseUrl}/v1/forecast?${params.toString()}`;
}

export function buildGeocodingUrl(
  baseUrl: string,
  query: string,
  lang: string,
  count: number,
): string {
  const params = new URLSearchParams({
    name: query,
    count: String(count),
    language: lang,
    format: 'json',
  });
  return `${baseUrl}/v1/search?${params.toString()}`;
}
```

`packages/contracts/src/dto.ts`:

```ts
import { z } from 'zod';

const HOURS = 23;

export const cityDtoSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    admin1: z.string().nullable(),
    country: z.string(),
    countryCode: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(1),
  })
  .strict();

export const hourlyDtoSchema = z
  .object({
    time: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hour: z.number().int().min(0).max(HOURS),
    temperature: z.number(),
    apparentTemperature: z.number(),
    precipitationProbability: z.number(),
    precipitationMm: z.number(),
    windSpeedKmh: z.number(),
    windGustsKmh: z.number(),
    uvIndex: z.number(),
    cloudCoverPct: z.number(),
    weatherCode: z.number(),
    isDay: z.boolean(),
    humidityPct: z.number(),
  })
  .strict();

export const dailyDtoSchema = z
  .object({
    date: z.string(),
    sunrise: z.string(),
    sunset: z.string(),
    weatherCode: z.number(),
    tempMax: z.number(),
    tempMin: z.number(),
  })
  .strict();

export const forecastDtoSchema = z
  .object({
    timezone: z.string().min(1),
    utcOffsetSeconds: z.number(),
    hourly: z.array(hourlyDtoSchema),
    daily: z.array(dailyDtoSchema),
  })
  .strict();

export type CityDto = z.infer<typeof cityDtoSchema>;
export type HourlyDto = z.infer<typeof hourlyDtoSchema>;
export type DailyDto = z.infer<typeof dailyDtoSchema>;
export type ForecastDto = z.infer<typeof forecastDtoSchema>;
```

`packages/contracts/src/openMeteo/mapForecast.ts`: o conteúdo atual do app, tipado com `ForecastDto`/`HourlyDto`/`DailyDto` e com um `parseLocalIso` local (o pacote não importa o domínio do app):

```ts
const parseLocalIso = (iso: string): { date: string; hour: number } => {
  const t = iso.indexOf('T');
  const date = t === -1 ? iso : iso.slice(0, t);
  const hour = t === -1 ? 0 : Number(iso.slice(t + 1, t + 3));
  return { date, hour };
};
```

`packages/contracts/src/openMeteo/mapCity.ts`: idem ao app, devolvendo `CityDto`.

`packages/contracts/src/index.ts` passa a exportar também: `cityDtoSchema, forecastDtoSchema, hourlyDtoSchema, dailyDtoSchema, type CityDto, type ForecastDto, type HourlyDto, type DailyDto` e, de `./openMeteo/*`: `openMeteoForecastSchema, openMeteoGeocodingSchema, type OpenMeteoForecast, type OpenMeteoGeocodingResult, mapForecast, mapCity, buildForecastUrl, buildGeocodingUrl, HOURLY_VARS, DAILY_VARS, FORECAST_DAYS, GEOCODING_COUNT`.

- [ ] **Step 4: Rodar o pacote até passar**

Run: `pnpm --filter @melhor-hora/contracts test && pnpm --filter @melhor-hora/contracts typecheck && pnpm --filter @melhor-hora/contracts lint`
Expected: PASS.

- [ ] **Step 5: Rewire do app**

`apps/mobile/src/infrastructure/openMeteo/forecastClient.ts`:

```ts
import { buildForecastUrl, mapForecast, openMeteoForecastSchema } from '@melhor-hora/contracts';

import type { Coordinates, ForecastProvider, ProviderError } from '@/application/ports';
import { err, ok, type Forecast, type Result } from '@/domain';

import { fetchJson, type FetchLike } from './http';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com';

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl?: string };

export function createOpenMeteoForecast({
  fetchFn,
  baseUrl = FORECAST_BASE_URL,
}: Deps): ForecastProvider {
  return {
    async fetch(coords: Coordinates, signal): Promise<Result<Forecast, ProviderError>> {
      const url = buildForecastUrl(baseUrl, coords.latitude, coords.longitude);
      const raw = await fetchJson(fetchFn, url, signal ? { signal } : {});
      if (!raw.ok) return raw;
      const parsed = openMeteoForecastSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(mapForecast(parsed.data));
    },
  };
}
```

`geocodingClient.ts` idem com `buildGeocodingUrl(baseUrl, query, 'pt', GEOCODING_COUNT)`, `openMeteoGeocodingSchema`, `mapCity`. Apagar os quatro arquivos movidos e a pasta de fixtures antiga; `testing/forecastDto.ts` importa `type OpenMeteoForecast` do contracts; `realFixtures.test.ts` e `presentation/testing/msw/handlers.ts` importam `forecastSaoPaulo`/`geocodingSaoPaulo` de `@melhor-hora/contracts/testing`; `mapForecast.test.ts` do app é removido (casos migrados no Step 1). Ajustar `collectCoverageFrom` só se algum arquivo listado deixou de existir.

- [ ] **Step 6: Suíte do app verde**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck && pnpm --filter mobile lint && pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export && rm -rf /tmp/mh-export`
Expected: PASS (76+ suítes), cobertura global ≥ 80 %, export sem erro.

- [ ] **Step 7: Commit**

```bash
git add -A packages/contracts apps/mobile
git commit -m "refactor(contracts): DTOs do BFF e schemas da Open-Meteo compartilhados entre app e servidor"
```

---

### Task 3: BFF — esqueleto (env, app Hono, health, segurança, erros, logs)

**Files:**

- Create: `apps/bff/package.json`, `apps/bff/tsconfig.json`, `apps/bff/vitest.config.ts`, `apps/bff/eslint.config.js`, `apps/bff/.env.example`
- Create: `apps/bff/src/config/env.ts` (+ `env.test.ts`), `apps/bff/src/logger.ts`, `apps/bff/src/http/errors.ts`, `apps/bff/src/http/requestLog.ts`, `apps/bff/src/cache/cache.ts`, `apps/bff/src/cache/memoryCache.ts` (+ `memoryCache.test.ts`), `apps/bff/src/cache/meter.ts`, `apps/bff/src/upstream/types.ts`, `apps/bff/src/routes/health.ts`, `apps/bff/src/app.ts` (+ `app.test.ts`), `apps/bff/src/server.ts`, `apps/bff/src/testing/deps.ts`

**Interfaces:**

- Produces: `loadEnv(source: NodeJS.ProcessEnv): Env`; `createLogger(level): pino.Logger`; `AppError(status, code, message)`; `Cache` (`get`, `set(key, value, ttlSeconds)`, `slidingCount(key, nowMs, windowMs)`, `ping`); `memoryCache(now)`; `createMeter()` → `{ hit(), miss(), snapshot(): { hits, misses, hitRate } }`; `Upstream` (assinaturas em `upstream/types.ts`, implementado na Task 5); `AppDeps = { env, logger, cache, upstream, meter, now, startedAt }`; `createApp(deps): Hono`; `testDeps(overrides)` para os testes.
- Formato de erro: `{ error: { code: string, message: string } }`; 404 → `not_found`; 400 → `bad_request`; 502 → `upstream_unavailable`; 429 → `rate_limited`; 500 → `internal`.

- [ ] **Step 1: Criar o pacote**

`apps/bff/package.json`:

```json
{
  "name": "bff",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "esbuild src/server.ts --bundle --platform=node --target=node22 --format=esm --outfile=dist/server.mjs --external:hono --external:@hono/node-server --external:ioredis --external:pino --external:zod",
    "start": "node dist/server.mjs",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.0",
    "@melhor-hora/contracts": "workspace:*",
    "hono": "^4.7.0",
    "ioredis": "^5.6.0",
    "pino": "^9.7.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "@types/node": "^22.15.0",
    "@vitest/coverage-v8": "^3.2.4",
    "esbuild": "^0.25.0",
    "eslint": "^9.39.5",
    "eslint-config-prettier": "^10.1.8",
    "tsx": "^4.20.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.46.0",
    "vitest": "^3.2.4"
  }
}
```

`apps/bff/tsconfig.json`: igual ao de `packages/contracts` mas com `"types": ["node"]` e `"include": ["src/**/*.ts", "vitest.config.ts"]`. `apps/bff/eslint.config.js`: cópia do de `packages/contracts`. `apps/bff/vitest.config.ts`: igual ao do contracts com `thresholds` 85 e `exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/server.ts']`.

`apps/bff/.env.example`:

```
PORT=8080
REDIS_URL=redis://redis:6379
ALLOWED_ORIGINS=
OPEN_METEO_BASE_URL=https://api.open-meteo.com
GEOCODING_BASE_URL=https://geocoding-api.open-meteo.com
RATE_LIMIT_PER_MIN=60
UPSTREAM_TIMEOUT_MS=5000
LOG_LEVEL=info
TRUST_PROXY=true
APP_VERSION=dev
```

- [ ] **Step 2: Testes (falhando)**

`apps/bff/src/config/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

describe('loadEnv', () => {
  it('aplica os padrões do spec 7.5', () => {
    const env = loadEnv({});
    expect(env).toMatchObject({
      PORT: 8080,
      REDIS_URL: undefined,
      ALLOWED_ORIGINS: [],
      OPEN_METEO_BASE_URL: 'https://api.open-meteo.com',
      GEOCODING_BASE_URL: 'https://geocoding-api.open-meteo.com',
      RATE_LIMIT_PER_MIN: 60,
      UPSTREAM_TIMEOUT_MS: 5000,
      LOG_LEVEL: 'info',
      TRUST_PROXY: true,
    });
  });

  it('separa ALLOWED_ORIGINS por vírgula e ignora vazios', () => {
    expect(loadEnv({ ALLOWED_ORIGINS: 'https://a.com, https://b.com,,' }).ALLOWED_ORIGINS).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('falha alto com valor inválido', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadEnv({ REDIS_URL: 'not-a-url' })).toThrow(/REDIS_URL/);
    expect(() => loadEnv({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});
```

`apps/bff/src/cache/memoryCache.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { memoryCache } from './memoryCache';

describe('memoryCache', () => {
  it('guarda e expira pelo TTL usando o relógio injetado', async () => {
    const clock = { now: 1_000_000 };
    const cache = memoryCache(() => clock.now);
    await cache.set('k', 'v', 10);
    expect(await cache.get('k')).toBe('v');
    clock.now += 10_000;
    expect(await cache.get('k')).toBeNull();
  });

  it('conta hits numa janela deslizante', async () => {
    const clock = { now: 0 };
    const cache = memoryCache(() => clock.now);
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(1);
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(2);
    clock.now = 61_000;
    expect(await cache.slidingCount('ip', clock.now, 60_000)).toBe(1);
  });

  it('ping responde true', async () => {
    expect(await memoryCache(() => 0).ping()).toBe(true);
  });
});
```

`apps/bff/src/app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import { testDeps } from './testing/deps';

describe('createApp', () => {
  it('GET /health responde estado, versão, cache e redis', async () => {
    const app = createApp(testDeps({ env: { APP_VERSION: 'abc123' } }));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      version: 'abc123',
      uptimeSeconds: expect.any(Number),
      redis: 'disabled',
      cache: { hits: 0, misses: 0, hitRate: 0 },
    });
  });

  it('rota desconhecida devolve 404 no formato padrão', async () => {
    const res = await createApp(testDeps()).request('/nada');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'Rota não encontrada' },
    });
  });

  it('cabeçalhos de segurança presentes', async () => {
    const res = await createApp(testDeps()).request('/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('CORS só para origens configuradas', async () => {
    const app = createApp(testDeps({ env: { ALLOWED_ORIGINS: ['https://ok.example'] } }));
    const allowed = await app.request('/health', { headers: { origin: 'https://ok.example' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://ok.example');
    const denied = await app.request('/health', { headers: { origin: 'https://evil.example' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('erro inesperado vira 500 padronizado sem vazar detalhes', async () => {
    const app = createApp(testDeps());
    app.get('/boom', () => {
      throw new Error('segredo');
    });
    const res = await app.request('/boom');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'internal', message: 'Erro interno' } });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm install && pnpm --filter bff test`
Expected: FAIL por módulos ausentes.

- [ ] **Step 4: Implementar**

`apps/bff/src/config/env.ts`:

```ts
import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  REDIS_URL: z.url().optional(),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    ),
  OPEN_METEO_BASE_URL: z.url().default('https://api.open-meteo.com'),
  GEOCODING_BASE_URL: z.url().default('https://geocoding-api.open-meteo.com'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(60),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  APP_VERSION: z.string().default('dev'),
});

export type Env = z.infer<typeof schema>;

/** Valida as variáveis na inicialização; uma inválida derruba o processo com a lista de campos. */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = schema.safeParse(source);
  if (parsed.success) return parsed.data;
  const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Variáveis de ambiente inválidas — ${fields}`);
}
```

`apps/bff/src/logger.ts`:

```ts
import pino from 'pino';

import type { Env } from './config/env';

export type Logger = pino.Logger;

export const createLogger = (level: Env['LOG_LEVEL']): Logger => pino({ level });
export const silentLogger = (): Logger => pino({ enabled: false });
```

`apps/bff/src/http/errors.ts`:

```ts
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  'bad_request' | 'not_found' | 'rate_limited' | 'upstream_unavailable' | 'internal';

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly headers: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

export const errorBody = (code: ErrorCode, message: string) => ({ error: { code, message } });

export function errorResponse(c: Context, e: AppError): Response {
  return c.json(errorBody(e.code, e.message), e.status, e.headers);
}
```

`apps/bff/src/cache/cache.ts`:

```ts
export type Cache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Registra um evento na janela deslizante da chave e devolve quantos há nos últimos `windowMs`. */
  slidingCount(key: string, nowMs: number, windowMs: number): Promise<number>;
  ping(): Promise<boolean>;
  close?(): Promise<void>;
};
```

`apps/bff/src/cache/memoryCache.ts`:

```ts
import type { Cache } from './cache';

type Entry = { readonly value: string; readonly expiresAt: number };

/** Cache do processo: usado nos testes e como fallback quando REDIS_URL está ausente. */
export function memoryCache(now: () => number): Cache {
  const entries = new Map<string, Entry>();
  const windows = new Map<string, readonly number[]>();
  return {
    async get(key) {
      const e = entries.get(key);
      if (!e) return null;
      if (e.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return e.value;
    },
    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },
    async slidingCount(key, nowMs, windowMs) {
      const kept = (windows.get(key) ?? []).filter((t) => t > nowMs - windowMs);
      const next = [...kept, nowMs];
      windows.set(key, next);
      return next.length;
    },
    async ping() {
      return true;
    },
  };
}
```

`apps/bff/src/cache/meter.ts`:

```ts
export type CacheSnapshot = {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
};
export type Meter = { hit(): void; miss(): void; snapshot(): CacheSnapshot };

/** Contador de acerto de cache exposto em /health (spec 7.2). */
export function createMeter(): Meter {
  let hits = 0;
  let misses = 0;
  return {
    hit: () => {
      hits += 1;
    },
    miss: () => {
      misses += 1;
    },
    snapshot: () => {
      const total = hits + misses;
      return { hits, misses, hitRate: total === 0 ? 0 : Number((hits / total).toFixed(3)) };
    },
  };
}
```

`apps/bff/src/upstream/types.ts`:

```ts
import type { CityDto, ForecastDto } from '@melhor-hora/contracts';

export type UpstreamErrorCode =
  'upstream_timeout' | 'upstream_http' | 'upstream_schema' | 'upstream_network';
export type UpstreamError = { readonly code: UpstreamErrorCode; readonly message: string };
export type UpstreamResult<T> = { ok: true; value: T } | { ok: false; error: UpstreamError };

export type Upstream = {
  searchCities(query: string, lang: string): Promise<UpstreamResult<readonly CityDto[]>>;
  fetchForecast(latitude: number, longitude: number): Promise<UpstreamResult<ForecastDto>>;
};
```

`apps/bff/src/http/requestLog.ts`:

```ts
import type { MiddlewareHandler } from 'hono';

import type { Logger } from '../logger';

export type AppVariables = { cacheHit: boolean | null };
export type AppEnv = { Variables: AppVariables };

/** Uma linha por requisição: rota, status, latência e se veio do cache (spec 7.2). */
export const requestLog =
  (logger: Logger): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const start = performance.now();
    c.set('cacheHit', null);
    await next();
    logger.info(
      {
        method: c.req.method,
        route: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - start),
        cacheHit: c.get('cacheHit'),
      },
      'request',
    );
  };
```

`apps/bff/src/routes/health.ts`:

```ts
import { Hono } from 'hono';

import type { AppDeps } from '../app';
import type { AppEnv } from '../http/requestLog';

export function healthRoute(deps: AppDeps) {
  const route = new Hono<AppEnv>();
  route.get('/', async (c) => {
    const redis =
      deps.env.REDIS_URL === undefined ? 'disabled' : (await deps.cache.ping()) ? 'ok' : 'down';
    return c.json({
      status: 'ok',
      version: deps.env.APP_VERSION,
      uptimeSeconds: Math.round((deps.now() - deps.startedAt) / 1000),
      redis,
      cache: deps.meter.snapshot(),
    });
  });
  return route;
}
```

`apps/bff/src/app.ts`:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import type { Cache } from './cache/cache';
import type { Meter } from './cache/meter';
import type { Env } from './config/env';
import { AppError, errorBody, errorResponse } from './http/errors';
import { requestLog, type AppEnv } from './http/requestLog';
import type { Logger } from './logger';
import { healthRoute } from './routes/health';
import type { Upstream } from './upstream/types';

export type AppDeps = {
  readonly env: Env;
  readonly logger: Logger;
  readonly cache: Cache;
  readonly upstream: Upstream;
  readonly meter: Meter;
  readonly now: () => number;
  readonly startedAt: number;
};

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  const allowed = new Set(deps.env.ALLOWED_ORIGINS);

  app.use('*', requestLog(deps.logger));
  app.use('*', secureHeaders({ xFrameOptions: 'DENY' }));
  app.use('*', cors({ origin: (origin) => (allowed.has(origin) ? origin : null) }));

  app.route('/health', healthRoute(deps));

  app.notFound((c) => c.json(errorBody('not_found', 'Rota não encontrada'), 404));
  app.onError((e, c) => {
    if (e instanceof AppError) return errorResponse(c, e);
    deps.logger.error({ err: e, route: c.req.path }, 'erro inesperado');
    return c.json(errorBody('internal', 'Erro interno'), 500);
  });
  return app;
}
```

`apps/bff/src/testing/deps.ts`:

```ts
import { memoryCache } from '../cache/memoryCache';
import { createMeter } from '../cache/meter';
import { loadEnv, type Env } from '../config/env';
import { silentLogger } from '../logger';
import type { Upstream } from '../upstream/types';
import type { AppDeps } from '../app';

export const unusedUpstream: Upstream = {
  searchCities: async () => ({
    ok: false,
    error: { code: 'upstream_network', message: 'não usado' },
  }),
  fetchForecast: async () => ({
    ok: false,
    error: { code: 'upstream_network', message: 'não usado' },
  }),
};

export function testDeps(
  overrides: { env?: Partial<Env> } & Partial<Omit<AppDeps, 'env'>> = {},
): AppDeps {
  const clock = { now: 1_700_000_000_000 };
  return {
    env: { ...loadEnv({}), ...overrides.env },
    logger: silentLogger(),
    cache: memoryCache(() => clock.now),
    upstream: unusedUpstream,
    meter: createMeter(),
    now: () => clock.now,
    startedAt: clock.now,
    ...overrides,
  };
}
```

`apps/bff/src/server.ts`:

```ts
import { serve } from '@hono/node-server';

import { createApp } from './app';
import { memoryCache } from './cache/memoryCache';
import { createMeter } from './cache/meter';
import { loadEnv } from './config/env';
import { createLogger } from './logger';
import { unusedUpstream } from './testing/deps';

const env = loadEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const cache = memoryCache(() => Date.now()); // Task 4 troca por Redis resiliente quando REDIS_URL existir
const app = createApp({
  env,
  logger,
  cache,
  upstream: unusedUpstream, // Task 5 troca pelo cliente da Open-Meteo
  meter: createMeter(),
  now: () => Date.now(),
  startedAt: Date.now(),
});

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) =>
  logger.info({ port: info.port, version: env.APP_VERSION }, 'bff no ar'),
);

const shutdown = () => {
  logger.info('encerrando');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 5: Rodar até passar**

Run: `pnpm --filter bff test && pnpm --filter bff typecheck && pnpm --filter bff lint && pnpm --filter bff build && (PORT=8181 node apps/bff/dist/server.mjs & sleep 1; curl -s localhost:8181/health; kill %1)`
Expected: testes verdes; `/health` devolve `{"status":"ok",...,"redis":"disabled"}`.

- [ ] **Step 6: Commit**

```bash
git add apps/bff pnpm-lock.yaml
git commit -m "feat(bff): esqueleto Hono com env validado, /health, CORS restrito, cabeçalhos e erros padronizados"
```

---

### Task 4: BFF — cache Redis resiliente, chaves e TTLs

**Files:**

- Create: `apps/bff/src/cache/keys.ts` (+ `keys.test.ts`), `apps/bff/src/cache/redisCache.ts` (+ `redisCache.test.ts`, integração), `apps/bff/src/cache/resilientCache.ts` (+ `resilientCache.test.ts`), `apps/bff/src/cache/createCache.ts`
- Modify: `apps/bff/src/server.ts` (usa `createCache`)

**Interfaces:**

- Produces: `geoKey(lang, query)`, `forecastKey(lat, lon)`, `rateKey(ip)`, `GEO_TTL_S = 86_400`, `FORECAST_TTL_S = 900`, `RATE_WINDOW_MS = 60_000`; `createRedisCache(url, onError)`: `Cache & { close }`; `resilientCache(primary, logger)`: `Cache` que nunca lança; `createCache(env, logger)`.

- [ ] **Step 1: Testes (falhando)**

`apps/bff/src/cache/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { forecastKey, geoKey, rateKey } from './keys';

describe('chaves de cache (spec 7.2)', () => {
  it('geo normaliza espaços, caixa e acentos compostos', () => {
    expect(geoKey('pt', '  São   Paulo ')).toBe('geo:v1:pt:são paulo');
    expect(geoKey('pt', 'São Paulo')).toBe('geo:v1:pt:são paulo');
  });
  it('forecast arredonda para 2 casas', () => {
    expect(forecastKey(-23.5475, -46.63611)).toBe('fc:v1:-23.55:-46.64');
    expect(forecastKey(0, 0)).toBe('fc:v1:0.00:0.00');
  });
  it('rate limit por ip', () => {
    expect(rateKey('10.0.0.1')).toBe('rl:v1:10.0.0.1');
  });
});
```

`apps/bff/src/cache/resilientCache.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { Cache } from './cache';
import { silentLogger } from '../logger';
import { resilientCache } from './resilientCache';

const broken: Cache = {
  get: async () => {
    throw new Error('ECONNREFUSED');
  },
  set: async () => {
    throw new Error('ECONNREFUSED');
  },
  slidingCount: async () => {
    throw new Error('ECONNREFUSED');
  },
  ping: async () => {
    throw new Error('ECONNREFUSED');
  },
};

describe('resilientCache', () => {
  it('sem Redis: get é miss, set é no-op, contagem é 0, ping false — nunca lança', async () => {
    const cache = resilientCache(broken, silentLogger());
    await expect(cache.get('k')).resolves.toBeNull();
    await expect(cache.set('k', 'v', 10)).resolves.toBeUndefined();
    await expect(cache.slidingCount('k', 0, 1000)).resolves.toBe(0);
    await expect(cache.ping()).resolves.toBe(false);
  });
});
```

`apps/bff/src/cache/redisCache.test.ts` (roda só com `REDIS_URL`; em CI o serviço Redis existe):

```ts
import { afterAll, describe, expect, it } from 'vitest';

import { createRedisCache } from './redisCache';

const url = process.env.REDIS_URL;

describe.skipIf(!url)('redisCache (integração)', () => {
  const cache = createRedisCache(url ?? '', () => undefined);
  const prefix = `test:${Date.now()}:`;
  afterAll(() => cache.close());

  it('set/get com TTL', async () => {
    await cache.set(`${prefix}a`, '1', 60);
    expect(await cache.get(`${prefix}a`)).toBe('1');
    expect(await cache.get(`${prefix}nada`)).toBeNull();
  });

  it('janela deslizante conta e esquece', async () => {
    const key = `${prefix}rl`;
    const now = Date.now();
    expect(await cache.slidingCount(key, now, 1000)).toBe(1);
    expect(await cache.slidingCount(key, now + 10, 1000)).toBe(2);
    expect(await cache.slidingCount(key, now + 2000, 1000)).toBe(1);
  });

  it('ping', async () => {
    expect(await cache.ping()).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter bff test`
Expected: FAIL (módulos ausentes); o teste de integração aparece como skipped sem `REDIS_URL`.

- [ ] **Step 3: Implementar**

`apps/bff/src/cache/keys.ts`:

```ts
export const GEO_TTL_S = 86_400;
export const FORECAST_TTL_S = 900;
export const RATE_WINDOW_MS = 60_000;
const COORD_DECIMALS = 2;

const normalizeQuery = (q: string): string =>
  q.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

export const geoKey = (lang: string, query: string): string =>
  `geo:v1:${lang}:${normalizeQuery(query)}`;
export const forecastKey = (lat: number, lon: number): string =>
  `fc:v1:${lat.toFixed(COORD_DECIMALS)}:${lon.toFixed(COORD_DECIMALS)}`;
export const rateKey = (ip: string): string => `rl:v1:${ip}`;
```

`apps/bff/src/cache/redisCache.ts`:

```ts
import { Redis } from 'ioredis';

import type { Cache } from './cache';

const CONNECT_TIMEOUT_MS = 2000;

/** Adapter ioredis. Não trata falhas: isso é papel do `resilientCache`, que o envolve. */
export function createRedisCache(
  url: string,
  onError: (e: Error) => void,
): Cache & { close(): Promise<void> } {
  const redis = new Redis(url, {
    connectTimeout: CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // comando com Redis fora falha na hora em vez de enfileirar
  });
  redis.on('error', onError);
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    },
    async slidingCount(key, nowMs, windowMs) {
      const member = `${nowMs}-${Math.random().toString(36).slice(2)}`;
      const results = await redis
        .multi()
        .zremrangebyscore(key, 0, nowMs - windowMs)
        .zadd(key, nowMs, member)
        .zcard(key)
        .pexpire(key, windowMs)
        .exec();
      const card = results?.[2]?.[1];
      return typeof card === 'number' ? card : 0;
    },
    ping: async () => (await redis.ping()) === 'PONG',
    close: async () => {
      await redis.quit();
    },
  };
}
```

`apps/bff/src/cache/resilientCache.ts`:

```ts
import type { Logger } from '../logger';

import type { Cache } from './cache';

const LOG_EVERY_MS = 60_000;

/** Se o Redis cair, o BFF segue sem cache e loga (spec 7.2): toda falha vira miss/no-op. */
export function resilientCache(
  primary: Cache,
  logger: Logger,
  now: () => number = Date.now,
): Cache {
  let lastLoggedAt = -Infinity;
  const note = (op: string, e: unknown) => {
    if (now() - lastLoggedAt < LOG_EVERY_MS) return;
    lastLoggedAt = now();
    logger.warn(
      { op, err: e instanceof Error ? e.message : String(e) },
      'cache indisponível; seguindo sem cache',
    );
  };
  const guard = async <T>(op: string, fallback: T, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (e) {
      note(op, e);
      return fallback;
    }
  };
  return {
    get: (key) => guard('get', null, () => primary.get(key)),
    set: (key, value, ttl) => guard('set', undefined, () => primary.set(key, value, ttl)),
    slidingCount: (key, nowMs, windowMs) =>
      guard('slidingCount', 0, () => primary.slidingCount(key, nowMs, windowMs)),
    ping: () => guard('ping', false, () => primary.ping()),
    ...(primary.close ? { close: () => primary.close?.() ?? Promise.resolve() } : {}),
  };
}
```

`apps/bff/src/cache/createCache.ts`:

```ts
import type { Env } from '../config/env';
import type { Logger } from '../logger';

import type { Cache } from './cache';
import { memoryCache } from './memoryCache';
import { createRedisCache } from './redisCache';
import { resilientCache } from './resilientCache';

export function createCache(env: Env, logger: Logger): Cache {
  if (env.REDIS_URL === undefined) {
    logger.warn(
      'REDIS_URL ausente: cache em memória do processo (sem compartilhamento entre réplicas)',
    );
    return memoryCache(() => Date.now());
  }
  const redis = createRedisCache(env.REDIS_URL, (e) => logger.warn({ err: e.message }, 'redis'));
  return resilientCache(redis, logger);
}
```

Em `server.ts`, trocar a linha do cache por `const cache = createCache(env, logger);` e, no `shutdown`, `void cache.close?.()`.

- [ ] **Step 4: Rodar até passar (com Redis local para a integração)**

Run: `docker run -d --rm --name mh-redis -p 6379:6379 redis:7-alpine && REDIS_URL=redis://127.0.0.1:6379 pnpm --filter bff test; docker stop mh-redis`
Expected: PASS incluindo a integração; cobertura ≥ 85 %.

- [ ] **Step 5: Commit**

```bash
git add apps/bff
git commit -m "feat(bff): cache Redis com fallback resiliente, chaves normalizadas e TTLs do spec"
```

---

### Task 5: BFF — upstream Open-Meteo e rotas `/v1/cities` e `/v1/forecast`

**Files:**

- Create: `apps/bff/src/upstream/openMeteo.ts` (+ `openMeteo.test.ts`), `apps/bff/src/routes/cities.ts`, `apps/bff/src/routes/forecast.ts`, `apps/bff/src/routes/routes.test.ts`, `apps/bff/src/testing/fakeFetch.ts`
- Modify: `apps/bff/src/app.ts` (monta as rotas), `apps/bff/src/server.ts` (upstream real com `globalThis.fetch`)

**Interfaces:**

- Consumes: `Cache`, `Meter`, `AppDeps`, `AppError`, `geoKey/forecastKey/GEO_TTL_S/FORECAST_TTL_S`, schemas/mappers/`buildForecastUrl`/`buildGeocodingUrl` do contracts.
- Produces: `createOpenMeteoUpstream({ fetchFn, forecastBaseUrl, geocodingBaseUrl, timeoutMs }): Upstream`; rotas `GET /v1/cities?q=&lang=` (200 `CityDto[]`, cabeçalhos `X-Cache: HIT|MISS`, `Cache-Control: public, max-age=300`) e `GET /v1/forecast?lat=&lon=` (200 `ForecastDto`, `Cache-Control: public, max-age=60`); 400 `bad_request` para query inválida; 502 `upstream_unavailable` para qualquer falha upstream (mensagem inclui o código: timeout/http/schema/network).

- [ ] **Step 1: Testes (falhando)**

`apps/bff/src/testing/fakeFetch.ts`:

```ts
import type { FetchLike } from '../upstream/openMeteo';

type Reply = { status?: number; body?: unknown; delayMs?: number; throws?: Error };

/** fetch falso: devolve a resposta programada e grava as URLs chamadas. */
export function fakeFetch(reply: Reply | ((url: string) => Reply)) {
  const calls: string[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push(url);
    const r = typeof reply === 'function' ? reply(url) : reply;
    if (r.throws) throw r.throws;
    if (r.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, r.delayMs);
        init.signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => r.body };
  };
  return { fetchFn, calls };
}
```

`apps/bff/src/upstream/openMeteo.test.ts`:

```ts
import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { fakeFetch } from '../testing/fakeFetch';

import { createOpenMeteoUpstream } from './openMeteo';

const make = (fetchFn: ReturnType<typeof fakeFetch>['fetchFn'], timeoutMs = 5000) =>
  createOpenMeteoUpstream({
    fetchFn,
    forecastBaseUrl: 'https://fc.test',
    geocodingBaseUrl: 'https://geo.test',
    timeoutMs,
  });

describe('createOpenMeteoUpstream', () => {
  it('busca cidades e devolve CityDto[] validados', async () => {
    const { fetchFn, calls } = fakeFetch({ body: geocodingSaoPaulo });
    const r = await make(fetchFn).searchCities('São Paulo', 'pt');
    expect(r.ok && r.value[0]?.name).toBe('São Paulo');
    expect(calls[0]).toContain(
      'https://geo.test/v1/search?name=S%C3%A3o+Paulo&count=8&language=pt',
    );
  });

  it('previsão passa pelo schema bruto e vira ForecastDto', async () => {
    const { fetchFn, calls } = fakeFetch({ body: forecastSaoPaulo });
    const r = await make(fetchFn).fetchForecast(-23.5475, -46.63611);
    expect(r.ok && r.value.hourly).toHaveLength(120);
    expect(calls[0]).toContain('forecast_days=5');
  });

  it.each([
    ['http', { status: 503 }, 'upstream_http'],
    ['schema', { body: { nope: true } }, 'upstream_schema'],
    ['network', { throws: new Error('ECONNRESET') }, 'upstream_network'],
    ['timeout', { delayMs: 50, body: forecastSaoPaulo }, 'upstream_timeout'],
  ])('falha %s vira erro tipado', async (_, reply, code) => {
    const { fetchFn } = fakeFetch(reply);
    const r = await make(fetchFn, 10).fetchForecast(0, 0);
    expect(!r.ok && r.error.code).toBe(code);
  });
});
```

`apps/bff/src/routes/routes.test.ts`:

```ts
import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';
import { FORECAST_TTL_S, GEO_TTL_S } from '../cache/keys';
import { testDeps } from '../testing/deps';
import { fakeFetch } from '../testing/fakeFetch';
import { createOpenMeteoUpstream } from '../upstream/openMeteo';

const appWith = (reply: Parameters<typeof fakeFetch>[0]) => {
  const { fetchFn, calls } = fakeFetch(reply);
  const deps = testDeps({
    upstream: createOpenMeteoUpstream({
      fetchFn,
      forecastBaseUrl: 'https://fc.test',
      geocodingBaseUrl: 'https://geo.test',
      timeoutMs: 1000,
    }),
  });
  return { app: createApp(deps), deps, calls };
};

describe('GET /v1/cities', () => {
  it('miss consulta a Open-Meteo, cacheia por 24 h e o segundo pedido é hit sem chamar upstream', async () => {
    const { app, deps, calls } = appWith({ body: geocodingSaoPaulo });
    const first = await app.request('/v1/cities?q=S%C3%A3o%20Paulo');
    expect(first.status).toBe(200);
    expect(first.headers.get('x-cache')).toBe('MISS');
    expect(first.headers.get('cache-control')).toBe('public, max-age=300');
    const cached = await deps.cache.get('geo:v1:pt:são paulo');
    expect(cached).not.toBeNull();
    const second = await app.request('/v1/cities?q=%20s%C3%A3o%20%20paulo%20');
    expect(second.headers.get('x-cache')).toBe('HIT');
    expect(await second.json()).toEqual(await first.json());
    expect(calls).toHaveLength(1);
    expect(deps.meter.snapshot()).toEqual({ hits: 1, misses: 1, hitRate: 0.5 });
  });

  it('valida a query: q curta ou lang desconhecida → 400', async () => {
    const { app } = appWith({ body: geocodingSaoPaulo });
    expect((await app.request('/v1/cities?q=a')).status).toBe(400);
    const res = await app.request('/v1/cities?q=rio&lang=xx');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('bad_request');
  });

  it('upstream fora → 502 e nada entra no cache', async () => {
    const { app, deps } = appWith({ status: 500 });
    const res = await app.request('/v1/cities?q=rio');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: { code: 'upstream_unavailable', message: expect.stringContaining('upstream_http') },
    });
    expect(await deps.cache.get('geo:v1:pt:rio')).toBeNull();
  });

  it('resposta upstream fora do schema nunca é cacheada', async () => {
    const { app, deps } = appWith({ body: { results: [{ id: 'x' }] } });
    expect((await app.request('/v1/cities?q=rio')).status).toBe(502);
    expect(await deps.cache.get('geo:v1:pt:rio')).toBeNull();
  });
});

describe('GET /v1/forecast', () => {
  it('miss → hit com chave de 2 casas e TTL de 15 min', async () => {
    const { app, deps, calls } = appWith({ body: forecastSaoPaulo });
    const first = await app.request('/v1/forecast?lat=-23.5475&lon=-46.63611');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('public, max-age=60');
    expect(await deps.cache.get('fc:v1:-23.55:-46.64')).not.toBeNull();
    const second = await app.request('/v1/forecast?lat=-23.549&lon=-46.641');
    expect(second.headers.get('x-cache')).toBe('HIT');
    expect(calls).toHaveLength(1);
  });

  it('lat/lon fora da faixa → 400', async () => {
    const { app } = appWith({ body: forecastSaoPaulo });
    expect((await app.request('/v1/forecast?lat=91&lon=0')).status).toBe(400);
    expect((await app.request('/v1/forecast?lat=0')).status).toBe(400);
  });
});

it('TTLs do spec', () => {
  expect(GEO_TTL_S).toBe(24 * 60 * 60);
  expect(FORECAST_TTL_S).toBe(15 * 60);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter bff test`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`apps/bff/src/upstream/openMeteo.ts`:

```ts
import {
  buildForecastUrl,
  buildGeocodingUrl,
  GEOCODING_COUNT,
  mapCity,
  mapForecast,
  openMeteoForecastSchema,
  openMeteoGeocodingSchema,
} from '@melhor-hora/contracts';
import type { z } from 'zod';

import type { Upstream, UpstreamError, UpstreamResult } from './types';

export type FetchLike = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Deps = {
  readonly fetchFn: FetchLike;
  readonly forecastBaseUrl: string;
  readonly geocodingBaseUrl: string;
  readonly timeoutMs: number;
};

const fail = <T>(code: UpstreamError['code'], message: string): UpstreamResult<T> => ({
  ok: false,
  error: { code, message },
});
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function fetchValidated<S extends z.ZodType>(
  deps: Deps,
  url: string,
  schema: S,
): Promise<UpstreamResult<z.infer<S>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  try {
    const response = await deps.fetchFn(url, { signal: controller.signal });
    if (!response.ok) return fail('upstream_http', `Open-Meteo respondeu HTTP ${response.status}`);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) return fail('upstream_schema', 'Resposta da Open-Meteo fora do schema');
    return { ok: true, value: parsed.data };
  } catch (e) {
    return controller.signal.aborted
      ? fail('upstream_timeout', `Open-Meteo não respondeu em ${deps.timeoutMs} ms`)
      : fail('upstream_network', messageOf(e));
  } finally {
    clearTimeout(timer);
  }
}

export function createOpenMeteoUpstream(deps: Deps): Upstream {
  return {
    async searchCities(query, lang) {
      const url = buildGeocodingUrl(deps.geocodingBaseUrl, query, lang, GEOCODING_COUNT);
      const r = await fetchValidated(deps, url, openMeteoGeocodingSchema);
      return r.ok ? { ok: true, value: (r.value.results ?? []).map(mapCity) } : r;
    },
    async fetchForecast(latitude, longitude) {
      const url = buildForecastUrl(deps.forecastBaseUrl, latitude, longitude);
      const r = await fetchValidated(deps, url, openMeteoForecastSchema);
      return r.ok ? { ok: true, value: mapForecast(r.value) } : r;
    },
  };
}
```

`apps/bff/src/routes/cities.ts`:

```ts
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDeps } from '../app';
import { GEO_TTL_S, geoKey } from '../cache/keys';
import { AppError } from '../http/errors';
import type { AppEnv } from '../http/requestLog';

import { cachedJson, parseQuery } from './shared';

const querySchema = z.object({
  q: z.string().trim().min(2).max(64),
  lang: z.enum(['pt', 'en']).default('pt'),
});

export function citiesRoute(deps: AppDeps) {
  const route = new Hono<AppEnv>();
  route.get('/', async (c) => {
    const { q, lang } = parseQuery(querySchema, c.req.query());
    return cachedJson(c, deps, {
      key: geoKey(lang, q),
      ttlSeconds: GEO_TTL_S,
      cacheControl: 'public, max-age=300',
      load: async () => {
        const r = await deps.upstream.searchCities(q, lang);
        if (!r.ok)
          throw new AppError(502, 'upstream_unavailable', `${r.error.code}: ${r.error.message}`);
        return r.value;
      },
    });
  });
  return route;
}
```

`apps/bff/src/routes/forecast.ts` (mesma forma): `querySchema = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) })`, chave `forecastKey(lat, lon)`, `FORECAST_TTL_S`, `cacheControl: 'public, max-age=60'`, `deps.upstream.fetchForecast(lat, lon)`.

`apps/bff/src/routes/shared.ts`:

```ts
import type { Context } from 'hono';
import type { z } from 'zod';

import type { AppDeps } from '../app';
import { AppError } from '../http/errors';
import type { AppEnv } from '../http/requestLog';

export function parseQuery<S extends z.ZodType>(
  schema: S,
  query: Record<string, string>,
): z.infer<S> {
  const parsed = schema.safeParse(query);
  if (parsed.success) return parsed.data;
  const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new AppError(400, 'bad_request', `Parâmetros inválidos — ${detail}`);
}

type Options<T> = {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly cacheControl: string;
  readonly load: () => Promise<T>;
};

const JSON_TYPE = 'application/json; charset=utf-8';

/** Cache-aside: hit devolve o corpo serializado guardado; miss carrega, valida (no `load`) e só então grava. */
export async function cachedJson<T>(
  c: Context<AppEnv>,
  deps: AppDeps,
  opts: Options<T>,
): Promise<Response> {
  const hit = await deps.cache.get(opts.key);
  if (hit !== null) {
    deps.meter.hit();
    c.set('cacheHit', true);
    return c.body(hit, 200, {
      'Content-Type': JSON_TYPE,
      'X-Cache': 'HIT',
      'Cache-Control': opts.cacheControl,
    });
  }
  const value = await opts.load();
  const body = JSON.stringify(value);
  await deps.cache.set(opts.key, body, opts.ttlSeconds);
  deps.meter.miss();
  c.set('cacheHit', false);
  return c.body(body, 200, {
    'Content-Type': JSON_TYPE,
    'X-Cache': 'MISS',
    'Cache-Control': opts.cacheControl,
  });
}
```

Em `app.ts`, após o health: `app.route('/v1/cities', citiesRoute(deps)); app.route('/v1/forecast', forecastRoute(deps));`. Em `server.ts`: `upstream: createOpenMeteoUpstream({ fetchFn: (url, init) => fetch(url, init), forecastBaseUrl: env.OPEN_METEO_BASE_URL, geocodingBaseUrl: env.GEOCODING_BASE_URL, timeoutMs: env.UPSTREAM_TIMEOUT_MS })` e remover o `unusedUpstream` do servidor.

- [ ] **Step 4: Rodar até passar e provar contra a API real**

Run: `pnpm --filter bff test && pnpm --filter bff build && (PORT=8181 node apps/bff/dist/server.mjs & sleep 1; curl -si 'localhost:8181/v1/cities?q=Campinas' | head -12; curl -si 'localhost:8181/v1/forecast?lat=-23.55&lon=-46.63' | grep -i x-cache; curl -si 'localhost:8181/v1/forecast?lat=-23.55&lon=-46.63' | grep -i x-cache; kill %1)`
Expected: testes verdes; primeira previsão `X-Cache: MISS`, segunda `HIT`.

- [ ] **Step 5: Commit**

```bash
git add apps/bff
git commit -m "feat(bff): rotas /v1/cities e /v1/forecast com cache-aside, validação em ambas as pontas e 502 padronizado"
```

---

### Task 6: BFF — rate limit por IP e métricas em `/health`

**Files:**

- Create: `apps/bff/src/http/rateLimit.ts` (+ `rateLimit.test.ts`), `apps/bff/src/http/clientIp.ts` (+ `clientIp.test.ts`)
- Modify: `apps/bff/src/app.ts` (`app.use('/v1/*', rateLimit(deps))`), `apps/bff/src/app.test.ts` (health após hit/miss)

**Interfaces:**

- Consumes: `Cache.slidingCount`, `rateKey`, `RATE_WINDOW_MS`, `env.RATE_LIMIT_PER_MIN`, `env.TRUST_PROXY`.
- Produces: `clientIp(c, trustProxy): string` (primeiro IP de `X-Forwarded-For` quando `trustProxy`; senão o endereço da conexão via `getConnInfo`; `'unknown'` sem ambos); `rateLimit(deps): MiddlewareHandler` — a (limite+1)-ésima requisição na janela de 60 s devolve `429` com `Retry-After: 60` e `{ error: { code: 'rate_limited', message } }`; cabeçalhos `X-RateLimit-Limit` e `X-RateLimit-Remaining` em toda resposta de `/v1/*`.

- [ ] **Step 1: Testes (falhando)**

`apps/bff/src/http/rateLimit.test.ts`:

```ts
import { forecastSaoPaulo } from '@melhor-hora/contracts/testing';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app';
import { testDeps } from '../testing/deps';
import { fakeFetch } from '../testing/fakeFetch';
import { createOpenMeteoUpstream } from '../upstream/openMeteo';

const appWithLimit = (limit: number) => {
  const { fetchFn } = fakeFetch({ body: forecastSaoPaulo });
  return createApp(
    testDeps({
      env: { RATE_LIMIT_PER_MIN: limit },
      upstream: createOpenMeteoUpstream({
        fetchFn,
        forecastBaseUrl: 'https://fc.test',
        geocodingBaseUrl: 'https://geo.test',
        timeoutMs: 1000,
      }),
    }),
  );
};
const get = (app: ReturnType<typeof createApp>, ip: string) =>
  app.request('/v1/forecast?lat=0&lon=0', { headers: { 'x-forwarded-for': `${ip}, 10.0.0.9` } });

describe('rateLimit', () => {
  it('bloqueia a requisição seguinte ao limite com 429 e Retry-After', async () => {
    const app = appWithLimit(3);
    for (let i = 0; i < 3; i += 1) expect((await get(app, '1.1.1.1')).status).toBe(200);
    const blocked = await get(app, '1.1.1.1');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect((await blocked.json()).error.code).toBe('rate_limited');
  });

  it('isola por IP e expõe os cabeçalhos de limite', async () => {
    const app = appWithLimit(1);
    const a = await get(app, '1.1.1.1');
    expect(a.headers.get('x-ratelimit-limit')).toBe('1');
    expect(a.headers.get('x-ratelimit-remaining')).toBe('0');
    expect((await get(app, '2.2.2.2')).status).toBe(200);
    expect((await get(app, '1.1.1.1')).status).toBe(429);
  });

  it('/health não é limitado', async () => {
    const app = appWithLimit(1);
    await get(app, '1.1.1.1');
    expect(
      (await app.request('/health', { headers: { 'x-forwarded-for': '1.1.1.1' } })).status,
    ).toBe(200);
  });
});
```

`apps/bff/src/http/clientIp.test.ts`:

```ts
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { clientIp } from './clientIp';

const probe = (trustProxy: boolean, headers: Record<string, string> = {}) => {
  const app = new Hono();
  app.get('/', (c) => c.text(clientIp(c, trustProxy)));
  return app.request('/', { headers }).then((r) => r.text());
};

describe('clientIp', () => {
  it('confia no primeiro X-Forwarded-For atrás do nginx', async () => {
    expect(await probe(true, { 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' })).toBe('203.0.113.7');
  });
  it('ignora o cabeçalho quando não confia no proxy', async () => {
    expect(await probe(false, { 'x-forwarded-for': '203.0.113.7' })).toBe('unknown');
  });
  it('sem cabeçalho e sem conexão real devolve unknown', async () => {
    expect(await probe(true)).toBe('unknown');
  });
});
```

Em `app.test.ts`, acrescentar ao teste de `/health`: depois de um miss e um hit em `/v1/forecast` (com upstream falso), `cache` é `{ hits: 1, misses: 1, hitRate: 0.5 }`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter bff test`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`apps/bff/src/http/clientIp.ts`:

```ts
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

const UNKNOWN = 'unknown';

/** IP do cliente: atrás do nginx (`TRUST_PROXY=true`) é o primeiro X-Forwarded-For; senão, a conexão. */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    if (first) return first;
  }
  try {
    return getConnInfo(c).remote.address ?? UNKNOWN;
  } catch {
    return UNKNOWN; // `app.request()` nos testes não tem socket
  }
}
```

`apps/bff/src/http/rateLimit.ts`:

```ts
import type { MiddlewareHandler } from 'hono';

import type { AppDeps } from '../app';
import { RATE_WINDOW_MS, rateKey } from '../cache/keys';

import { clientIp } from './clientIp';
import { AppError } from './errors';
import type { AppEnv } from './requestLog';

const RETRY_AFTER_S = String(RATE_WINDOW_MS / 1000);

/** Janela deslizante de 60 s por IP (spec 7.2). Com o Redis fora, `slidingCount` devolve 0 e não bloqueia. */
export const rateLimit =
  (deps: AppDeps): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const limit = deps.env.RATE_LIMIT_PER_MIN;
    const ip = clientIp(c, deps.env.TRUST_PROXY);
    const count = await deps.cache.slidingCount(rateKey(ip), deps.now(), RATE_WINDOW_MS);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    if (count > limit) {
      throw new AppError(429, 'rate_limited', 'Muitas requisições; tente de novo em um minuto', {
        'Retry-After': RETRY_AFTER_S,
      });
    }
    await next();
  };
```

Em `app.ts`: `app.use('/v1/*', rateLimit(deps));` antes de montar as rotas `/v1`.

- [ ] **Step 4: Rodar até passar**

Run: `pnpm --filter bff test && pnpm --filter bff lint && pnpm --filter bff typecheck`
Expected: PASS, cobertura ≥ 85 %.

- [ ] **Step 5: Commit**

```bash
git add apps/bff
git commit -m "feat(bff): rate limit por IP em janela deslizante e métricas de cache em /health"
```

---

### Task 7: BFF — Dockerfile, Compose (bff + redis + minio) e README

**Files:**

- Create: `apps/bff/Dockerfile`, `apps/bff/.dockerignore`, `infra/docker-compose.yml`, `infra/docker-compose.local.yml`, `infra/.env.example`, `apps/bff/README.md`
- Modify: `.gitignore` (já ignora `.env`; conferir `infra/.env`)

**Interfaces:**

- Produces: imagem `ghcr.io/techmardine/melhor-hora-bff:<sha>|latest` (porta 8080, usuário `node`, healthcheck em `/health`); Compose com projeto `melhor-hora`, serviços `bff` (`127.0.0.1:8180:8080`), `redis` (AOF, volume `redis-data`, só rede interna), `minio` (`127.0.0.1:9000:9000`, console `127.0.0.1:9001:9001`, volume `minio-data`), `minio-init` (cria bucket `assets` com leitura anônima); rede padrão `melhor-hora_default`.

- [ ] **Step 1: Dockerfile e ignore**

`apps/bff/.dockerignore`: `node_modules`, `dist`, `coverage`, `.env`.

`apps/bff/Dockerfile` (contexto de build = raiz do monorepo):

```Dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.4.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/bff/package.json apps/bff/
# --ignore-scripts: sem husky/prepare dentro do container
RUN pnpm install --frozen-lockfile --ignore-scripts --filter bff...
COPY packages/contracts packages/contracts
COPY apps/bff apps/bff
RUN pnpm --filter bff build && pnpm --filter bff deploy --legacy --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/bff/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
CMD ["node", "dist/server.mjs"]
```

- [ ] **Step 2: Compose**

`infra/.env.example`:

```
# Domínios servidos pelo nginx da VPS (Task 12)
API_DOMAIN=melhor-hora.duckdns.org
ASSETS_DOMAIN=melhor-hora-assets.duckdns.org
# Imagem do BFF (o deploy troca a tag pelo SHA)
BFF_IMAGE=ghcr.io/techmardine/melhor-hora-bff:latest
APP_VERSION=local
ALLOWED_ORIGINS=
RATE_LIMIT_PER_MIN=60
UPSTREAM_TIMEOUT_MS=5000
LOG_LEVEL=info
# MinIO (só no .env da VPS; nunca no repositório)
MINIO_ROOT_USER=melhorhora
MINIO_ROOT_PASSWORD=troque-esta-senha-longa
```

`infra/docker-compose.yml`:

```yaml
name: melhor-hora

services:
  bff:
    image: ${BFF_IMAGE:-ghcr.io/techmardine/melhor-hora-bff:latest}
    restart: unless-stopped
    environment:
      PORT: '8080'
      REDIS_URL: redis://redis:6379
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-}
      RATE_LIMIT_PER_MIN: ${RATE_LIMIT_PER_MIN:-60}
      UPSTREAM_TIMEOUT_MS: ${UPSTREAM_TIMEOUT_MS:-5000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      TRUST_PROXY: 'true'
      APP_VERSION: ${APP_VERSION:-unknown}
    ports:
      - '127.0.0.1:8180:8080'
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    command:
      [
        'redis-server',
        '--appendonly',
        'yes',
        '--maxmemory',
        '256mb',
        '--maxmemory-policy',
        'allkeys-lru',
      ]
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: ['server', '/data', '--console-address', ':9001']
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - '127.0.0.1:9000:9000'
      - '127.0.0.1:9001:9001'
    volumes:
      - minio-data:/data
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    entrypoint: ['/bin/sh', '-c']
    command:
      - |
        mc alias set local http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD" &&
        mc mb --ignore-existing local/assets &&
        mc anonymous set download local/assets
    restart: 'no'

volumes:
  redis-data:
  minio-data:
```

`infra/docker-compose.local.yml` (só para desenvolver: constrói a imagem em vez de puxar):

```yaml
services:
  bff:
    build:
      context: ..
      dockerfile: apps/bff/Dockerfile
    image: melhor-hora-bff:local
```

- [ ] **Step 3: Verificar localmente**

Run:

```bash
cp infra/.env.example infra/.env
docker compose --env-file infra/.env -f infra/docker-compose.yml -f infra/docker-compose.local.yml up -d --build --wait
curl -s localhost:8180/health
curl -si 'localhost:8180/v1/forecast?lat=-23.55&lon=-46.63' | grep -i x-cache
curl -si 'localhost:8180/v1/forecast?lat=-23.55&lon=-46.63' | grep -i x-cache
curl -s localhost:9000/assets/ | head -c 200
docker compose --env-file infra/.env -f infra/docker-compose.yml -f infra/docker-compose.local.yml down -v
```

Expected: health com `"redis":"ok"`; `MISS` depois `HIT`; o bucket responde XML de listagem (leitura anônima).

- [ ] **Step 4: README do BFF**

`apps/bff/README.md` com: o que é (proxy fino + cache), endpoints (tabela do spec 7.2 com exemplos `curl`), variáveis (`.env.example`), como rodar (`pnpm --filter bff dev` com `REDIS_URL` opcional; Compose local), como testar (`REDIS_URL=redis://127.0.0.1:6379 pnpm --filter bff test`), formato de erro, política de cache (nunca cacheia lixo; sem Redis segue sem cache), rate limit e o que aparece em `/health`.

- [ ] **Step 5: Commit**

```bash
git add apps/bff infra .gitignore
git commit -m "chore(bff): Dockerfile multi-stage e Compose com redis e minio"
```

---

### Task 8: App — modo `bff`, config remota do motor e config injetada na gamificação

**Files:**

- Modify: `apps/mobile/src/infrastructure/env.ts` (+ `env.test.ts`): modo `bff` sem URLs válidas falha alto
- Create: `apps/mobile/src/infrastructure/bff/bffGeocodingClient.ts`, `bffForecastClient.ts` (+ `bffClients.test.ts`)
- Create: `apps/mobile/src/infrastructure/config/remoteEngineConfigProvider.ts` (+ `.test.ts`)
- Create: `apps/mobile/src/infrastructure/adapters.ts` (+ `adapters.test.ts`) — seleção pura por `env.apiMode`
- Modify: `apps/mobile/src/infrastructure/container.ts` (usa `selectAdapters`), `apps/mobile/src/app/_layout.tsx` (erro de env vira `ErrorScreen`), `apps/mobile/src/presentation/i18n/pt-BR.ts` (`errors.env`)
- Modify: `apps/mobile/src/application/useCases/{planActivity,confirmActivity,logActivity,getProgress}.ts` (+ testes): recebem `config: EngineConfigProvider`
- Modify: `apps/mobile/package.json` (`collectCoverageFrom` cobre `infrastructure/bff/**` e `adapters.ts`)

**Interfaces:**

- Consumes: `cityDtoSchema`, `forecastDtoSchema`, `engineConfigSchema` (contracts); `fetchJson`/`FetchLike` (`infrastructure/openMeteo/http.ts`); `KeyValueStorage`, `Clock`, `Logger`, `EngineConfigProvider` (ports).
- Produces: `createBffGeocoding({ fetchFn, baseUrl }): GeocodingProvider` (GET `${baseUrl}/v1/cities?q=&lang=pt`); `createBffForecast({ fetchFn, baseUrl }): ForecastProvider` (GET `${baseUrl}/v1/forecast?lat=&lon=`); `createRemoteEngineConfigProvider({ fetchFn, assetsUrl, storage, clock, logger, embedded })` com chave `engineConfig:v1` = `{ fetchedAt: number, config: EngineConfig }`, cache 24 h, revalida quando vencido, usa a última cópia válida em falha e a embutida sem cópia; `selectAdapters(env, deps): { geocoding, forecast, config }`; `parseEnv` lança `EnvError` em `bff` sem `bffUrl`/`assetsUrl`.

- [ ] **Step 1: Testes (falhando)**

`apps/mobile/src/infrastructure/env.test.ts` — substituir o terceiro caso e acrescentar:

```ts
it('modo desconhecido cai em direct', () => {
  expect(parseEnv({ apiMode: 'weird' })).toEqual({
    apiMode: 'direct',
    bffUrl: null,
    assetsUrl: null,
  });
});

it('modo bff sem URLs válidas falha alto, em vez de degradar em silêncio', () => {
  expect(() => parseEnv({ apiMode: 'bff' })).toThrow(EnvError);
  expect(() =>
    parseEnv({ apiMode: 'bff', bffUrl: 'not a url', assetsUrl: 'https://a.test' }),
  ).toThrow(/EXPO_PUBLIC_BFF_URL/);
  expect(() => parseEnv({ apiMode: 'bff', bffUrl: 'https://a.test' })).toThrow(
    /EXPO_PUBLIC_ASSETS_URL/,
  );
});
```

`apps/mobile/src/infrastructure/bff/bffClients.test.ts`:

```ts
import { forecastSaoPaulo, geocodingSaoPaulo } from '@melhor-hora/contracts/testing';
import { mapCity, mapForecast } from '@melhor-hora/contracts';

import type { FetchLike } from '../openMeteo/http';

import { createBffForecast } from './bffForecastClient';
import { createBffGeocoding } from './bffGeocodingClient';

const replying = (status: number, body: unknown) => {
  const calls: string[] = [];
  const fetchFn: FetchLike = async (url) => {
    calls.push(url);
    return { ok: status < 400, status, json: async () => body };
  };
  return { fetchFn, calls };
};

describe('clients do BFF', () => {
  it('cidades: chama /v1/cities com q e lang e devolve City[]', async () => {
    const cities = (geocodingSaoPaulo.results ?? []).map(mapCity);
    const { fetchFn, calls } = replying(200, cities);
    const r = await createBffGeocoding({ fetchFn, baseUrl: 'https://bff.test' }).search(
      'São Paulo',
    );
    expect(r.ok && r.value[0]?.name).toBe('São Paulo');
    expect(calls[0]).toBe('https://bff.test/v1/cities?q=S%C3%A3o+Paulo&lang=pt');
  });

  it('previsão: chama /v1/forecast e devolve Forecast', async () => {
    const { fetchFn, calls } = replying(200, mapForecast(forecastSaoPaulo));
    const r = await createBffForecast({ fetchFn, baseUrl: 'https://bff.test' }).fetch({
      latitude: -23.5475,
      longitude: -46.63611,
    });
    expect(r.ok && r.value.hourly).toHaveLength(120);
    expect(calls[0]).toBe('https://bff.test/v1/forecast?lat=-23.5475&lon=-46.63611');
  });

  it('corpo fora do contrato vira erro schema; HTTP 502 vira erro http com status', async () => {
    const bad = await createBffForecast({
      ...replying(200, { nope: 1 }),
      baseUrl: 'https://bff.test',
    }).fetch({
      latitude: 0,
      longitude: 0,
    });
    expect(!bad.ok && bad.error.code).toBe('schema');
    const down = await createBffGeocoding({
      ...replying(502, {}),
      baseUrl: 'https://bff.test',
    }).search('rio');
    expect(!down.ok && down.error).toMatchObject({ code: 'http', status: 502 });
  });
});
```

`apps/mobile/src/infrastructure/config/remoteEngineConfigProvider.test.ts`:

```ts
import { fixedClock, silentLogger } from '@/application/testing/fakes';
import { defaultEngineConfig } from '@/domain';

import type { FetchLike } from '../openMeteo/http';
import { memoryKeyValue } from '../storage/memoryKeyValue';

import {
  createRemoteEngineConfigProvider,
  ENGINE_CONFIG_KEY,
  ENGINE_CONFIG_TTL_MS,
} from './remoteEngineConfigProvider';

const remote = { ...defaultEngineConfig, xp: { ...defaultEngineConfig.xp, base: 60 } };
const T0 = Date.UTC(2026, 8, 15, 12, 0, 0);

const fetching = (status: number, body: unknown) => {
  let calls = 0;
  const fetchFn: FetchLike = async () => {
    calls += 1;
    return { ok: status < 400, status, json: async () => body };
  };
  return { fetchFn, calls: () => calls };
};

const make = (fetchFn: FetchLike, storage = memoryKeyValue(), nowMs = T0) =>
  createRemoteEngineConfigProvider({
    fetchFn,
    assetsUrl: 'https://assets.test',
    storage,
    clock: fixedClock(nowMs),
    logger: silentLogger(),
    embedded: defaultEngineConfig,
  });

describe('remoteEngineConfigProvider', () => {
  it('sem cópia local baixa, valida, guarda e devolve a config remota', async () => {
    const storage = memoryKeyValue();
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(JSON.parse((await storage.getItem(ENGINE_CONFIG_KEY)) ?? '{}')).toEqual({
      fetchedAt: T0,
      config: remote,
    });
  });

  it('cópia fresca (< 24 h) não vai à rede', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(
      ENGINE_CONFIG_KEY,
      JSON.stringify({ fetchedAt: T0 - 1000, config: remote }),
    );
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(f.calls()).toBe(0);
  });

  it('cópia vencida revalida; se a rede falhar, mantém a última cópia válida', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(
      ENGINE_CONFIG_KEY,
      JSON.stringify({ fetchedAt: T0 - ENGINE_CONFIG_TTL_MS - 1, config: remote }),
    );
    const f = fetching(503, {});
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
    expect(f.calls()).toBe(1);
  });

  it('schema inválido nunca entra: usa a embutida e não grava', async () => {
    const storage = memoryKeyValue();
    const f = fetching(200, { ...remote, schemaVersion: 2 });
    expect(await make(f.fetchFn, storage).get()).toEqual(defaultEngineConfig);
    expect(await storage.getItem(ENGINE_CONFIG_KEY)).toBeNull();
  });

  it('cópia local corrompida é ignorada e substituída', async () => {
    const storage = memoryKeyValue();
    await storage.setItem(ENGINE_CONFIG_KEY, '{not json');
    const f = fetching(200, remote);
    expect(await make(f.fetchFn, storage).get()).toEqual(remote);
  });
});
```

`apps/mobile/src/infrastructure/adapters.test.ts`:

```ts
import { parseEnv } from './env';
import { selectAdapters } from './adapters';
import { memoryKeyValue } from './storage/memoryKeyValue';
import { fixedClock, silentLogger } from '@/application/testing/fakes';

const deps = {
  fetchFn: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  storage: memoryKeyValue(),
  clock: fixedClock(0),
  logger: silentLogger(),
};

describe('selectAdapters', () => {
  it('direct: Open-Meteo direto e config embutida', () => {
    const a = selectAdapters(parseEnv({}), deps);
    expect(a.kind).toEqual({ geocoding: 'open-meteo', forecast: 'open-meteo', config: 'embedded' });
  });
  it('bff: clients do BFF e config remota', () => {
    const env = parseEnv({
      apiMode: 'bff',
      bffUrl: 'https://bff.test',
      assetsUrl: 'https://assets.test',
    });
    const a = selectAdapters(env, deps);
    expect(a.kind).toEqual({ geocoding: 'bff', forecast: 'bff', config: 'remote' });
  });
});
```

Casos de uso — em `planActivity.test.ts`, `confirmActivity.test.ts`, `logActivity.test.ts`, `getProgress.test.ts` acrescentar um caso cada, com `fixedConfig({ ...defaultEngineConfig, xp: { ...defaultEngineConfig.xp, base: 60 } })` (o fake já existe em `application/testing/fakes.ts`): registrar/confirmar com essa config produz `xp.base === 60` no `todayRecord` de `getProgress` (que também deve usar a config injetada), provando que o `defaultEngineConfig` estático sumiu do caminho.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter mobile exec jest src/infrastructure src/application --coverage=false`
Expected: FAIL nos arquivos novos e nos casos de uso (deps sem `config`).

- [ ] **Step 3: Implementar**

`env.ts`:

```ts
import { z } from 'zod';

export type RawEnv = {
  readonly apiMode?: string | undefined;
  readonly bffUrl?: string | undefined;
  readonly assetsUrl?: string | undefined;
};
export type AppEnv =
  | { readonly apiMode: 'direct'; readonly bffUrl: null; readonly assetsUrl: null }
  | { readonly apiMode: 'bff'; readonly bffUrl: string; readonly assetsUrl: string };

export class EnvError extends Error {}

const mode = z.enum(['direct', 'bff']).catch('direct');
const url = z.url();

/** `bff` exige as duas URLs válidas: configuração quebrada deve aparecer, não virar `direct` em silêncio. */
export function parseEnv(raw: RawEnv): AppEnv {
  if (mode.parse(raw.apiMode) === 'direct')
    return { apiMode: 'direct', bffUrl: null, assetsUrl: null };
  const bff = url.safeParse(raw.bffUrl);
  if (!bff.success) throw new EnvError('EXPO_PUBLIC_API_MODE=bff exige EXPO_PUBLIC_BFF_URL válida');
  const assets = url.safeParse(raw.assetsUrl);
  if (!assets.success)
    throw new EnvError('EXPO_PUBLIC_API_MODE=bff exige EXPO_PUBLIC_ASSETS_URL válida');
  return { apiMode: 'bff', bffUrl: bff.data, assetsUrl: assets.data };
}

export const readEnv = (): AppEnv =>
  parseEnv({
    apiMode: process.env.EXPO_PUBLIC_API_MODE,
    bffUrl: process.env.EXPO_PUBLIC_BFF_URL,
    assetsUrl: process.env.EXPO_PUBLIC_ASSETS_URL,
  });
```

`bff/bffGeocodingClient.ts`:

```ts
import { cityDtoSchema } from '@melhor-hora/contracts';
import { z } from 'zod';

import type { City, GeocodingProvider, ProviderError } from '@/application/ports';
import { err, ok, type Result } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

const LANGUAGE = 'pt';
const citiesSchema = z.array(cityDtoSchema);

type Deps = { readonly fetchFn: FetchLike; readonly baseUrl: string };

export function createBffGeocoding({ fetchFn, baseUrl }: Deps): GeocodingProvider {
  return {
    async search(query, signal): Promise<Result<readonly City[], ProviderError>> {
      const params = new URLSearchParams({ q: query, lang: LANGUAGE });
      const raw = await fetchJson(
        fetchFn,
        `${baseUrl}/v1/cities?${params.toString()}`,
        signal ? { signal } : {},
      );
      if (!raw.ok) return raw;
      const parsed = citiesSchema.safeParse(raw.value);
      if (!parsed.success) return err({ code: 'schema', message: parsed.error.message });
      return ok(parsed.data);
    },
  };
}
```

`bff/bffForecastClient.ts`: mesma forma com `forecastDtoSchema` e `new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude) })` em `/v1/forecast`.

`config/remoteEngineConfigProvider.ts`:

```ts
import { engineConfigSchema } from '@melhor-hora/contracts';
import { z } from 'zod';

import type { Clock, EngineConfigProvider, KeyValueStorage, Logger } from '@/application/ports';
import type { EngineConfig } from '@/domain';

import { fetchJson, type FetchLike } from '../openMeteo/http';

export const ENGINE_CONFIG_KEY = 'engineConfig:v1';
export const ENGINE_CONFIG_TTL_MS = 24 * 60 * 60_000;
export const ENGINE_CONFIG_PATH = '/config/v1/engine.json';

const storedSchema = z.object({ fetchedAt: z.number(), config: engineConfigSchema });
type Stored = z.infer<typeof storedSchema>;

type Deps = {
  readonly fetchFn: FetchLike;
  readonly assetsUrl: string;
  readonly storage: KeyValueStorage;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly embedded: EngineConfig;
};

async function readStored(storage: KeyValueStorage): Promise<Stored | null> {
  try {
    const raw = await storage.getItem(ENGINE_CONFIG_KEY);
    if (raw === null) return null;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Spec 4.6: baixa `engine.json` com cache de 24 h, valida, guarda a última cópia válida; sem rede
 * ou schema inválido usa a cópia guardada e, sem cópia, a embutida. O domínio só vê o resultado. */
export function createRemoteEngineConfigProvider(deps: Deps): EngineConfigProvider {
  const fetchRemote = async (): Promise<EngineConfig | null> => {
    const raw = await fetchJson(deps.fetchFn, `${deps.assetsUrl}${ENGINE_CONFIG_PATH}`);
    if (!raw.ok) {
      deps.logger.warn('Config remota indisponível', { code: raw.error.code });
      return null;
    }
    const parsed = engineConfigSchema.safeParse(raw.value);
    if (!parsed.success) {
      deps.logger.warn('Config remota fora do schema; ignorada', {
        issues: parsed.error.issues.length,
      });
      return null;
    }
    return parsed.data;
  };
  return {
    async get() {
      const now = deps.clock.now();
      const stored = await readStored(deps.storage);
      if (stored !== null && now - stored.fetchedAt < ENGINE_CONFIG_TTL_MS) return stored.config;
      const fresh = await fetchRemote();
      if (fresh === null) return stored?.config ?? deps.embedded;
      try {
        await deps.storage.setItem(
          ENGINE_CONFIG_KEY,
          JSON.stringify({ fetchedAt: now, config: fresh }),
        );
      } catch (e) {
        deps.logger.warn('Falha ao guardar a config remota', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return fresh;
    },
  };
}
```

`adapters.ts`:

```ts
import type {
  Clock,
  EngineConfigProvider,
  ForecastProvider,
  GeocodingProvider,
  KeyValueStorage,
  Logger,
} from '@/application/ports';
import { defaultEngineConfig } from '@/domain';

import { createBffForecast } from './bff/bffForecastClient';
import { createBffGeocoding } from './bff/bffGeocodingClient';
import { embeddedEngineConfigProvider } from './config/embeddedEngineConfigProvider';
import { createRemoteEngineConfigProvider } from './config/remoteEngineConfigProvider';
import type { AppEnv } from './env';
import { createOpenMeteoForecast } from './openMeteo/forecastClient';
import { createOpenMeteoGeocoding } from './openMeteo/geocodingClient';
import type { FetchLike } from './openMeteo/http';

type Deps = {
  readonly fetchFn: FetchLike;
  readonly storage: KeyValueStorage;
  readonly clock: Clock;
  readonly logger: Logger;
};
export type SelectedAdapters = {
  readonly geocoding: GeocodingProvider;
  readonly forecast: ForecastProvider;
  readonly config: EngineConfigProvider;
  readonly kind: {
    readonly geocoding: 'open-meteo' | 'bff';
    readonly forecast: 'open-meteo' | 'bff';
    readonly config: 'embedded' | 'remote';
  };
};

/** Spec 6.4: o mesmo port com dois adapters; o avaliador roda em `direct` sem configurar nada. */
export function selectAdapters(env: AppEnv, deps: Deps): SelectedAdapters {
  if (env.apiMode === 'direct') {
    return {
      geocoding: createOpenMeteoGeocoding({ fetchFn: deps.fetchFn }),
      forecast: createOpenMeteoForecast({ fetchFn: deps.fetchFn }),
      config: embeddedEngineConfigProvider(),
      kind: { geocoding: 'open-meteo', forecast: 'open-meteo', config: 'embedded' },
    };
  }
  return {
    geocoding: createBffGeocoding({ fetchFn: deps.fetchFn, baseUrl: env.bffUrl }),
    forecast: createBffForecast({ fetchFn: deps.fetchFn, baseUrl: env.bffUrl }),
    config: createRemoteEngineConfigProvider({
      ...deps,
      assetsUrl: env.assetsUrl,
      embedded: defaultEngineConfig,
    }),
    kind: { geocoding: 'bff', forecast: 'bff', config: 'remote' },
  };
}
```

`container.ts`: remove o `warn` de "bff ainda não disponível"; `const storage = asyncStorageKeyValue(); const adapters = selectAdapters(env, { fetchFn: globalFetch, storage, clock, logger }); logger.info('Adapters', adapters.kind);` e passa `geocoding: adapters.geocoding, forecast: adapters.forecast, config: adapters.config`.

`_layout.tsx`: `readEnv()` pode lançar `EnvError`; envolver em `try/catch` dentro do `useState(() => ...)` e, em erro, renderizar `<ErrorScreen message={t.errors.env} onRetry={...} />` (se `ErrorScreen` não aceitar `message`, acrescentar a prop opcional). `t.errors.env = 'Configuração do app inválida: modo bff sem as URLs do servidor.'`.

Casos de uso: acrescentar `readonly config: EngineConfigProvider` em `Deps` de `planActivity`, `confirmActivity`, `logActivity`, `getProgress`; trocar `deriveProgress(events, defaultEngineConfig, date)` por `deriveProgress(events, await config.get(), date)`; remover os imports/comentários de `defaultEngineConfig`. `createAppServices(ports)` já repassa `ports` inteiro, então nada muda em `services.ts`.

`package.json` (jest): remover nada; garantir que `src/infrastructure/bff/**`, `adapters.ts` e `remoteEngineConfigProvider.ts` entram na cobertura (não estão nas exclusões).

- [ ] **Step 4: Rodar tudo até passar**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck && pnpm --filter mobile lint`
Expected: PASS; cobertura global ≥ 80 %; `grep -rn defaultEngineConfig apps/mobile/src/application` devolve só `testing/fakes.ts`.

- [ ] **Step 5: Prova manual do modo bff contra o BFF local**

Run (com o Compose da Task 7 no ar):

```bash
cd apps/mobile && EXPO_PUBLIC_API_MODE=bff EXPO_PUBLIC_BFF_URL=http://localhost:8180 EXPO_PUBLIC_ASSETS_URL=http://localhost:9000/assets \
  EXPO_NO_TELEMETRY=1 pnpm exec expo start --web --port 8090 &
sleep 20 && node ../../tools/qa-web/cdp.js ../../tools/qa-web/scenarios/home-states.js; kill %1
docker compose --env-file ../../infra/.env -f ../../infra/docker-compose.yml logs bff | grep -c '"route":"/v1/forecast"'
```

Expected: capturas iguais às do modo `direct`; o log do BFF mostra as chamadas de `/v1/cities` e `/v1/forecast` (a segunda previsão com `cacheHit: true`). Sem `engine.json` no bucket ainda, o provider remoto cai na embutida com um `warn` no console do app — esperado até a Task 12.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(app): modo bff com adapters do BFF, config remota do motor com cache de 24 h e config injetada na gamificação"
```

---

### Task 9: Cidades — retry e skeleton na busca

**Files:**

- Modify: `apps/mobile/src/presentation/queries/useCitySearch.ts` (expõe `refetch`), `apps/mobile/src/presentation/features/cities/components/CitiesHeader.tsx` (`onRetry`), `CitiesScreen.tsx`, `apps/mobile/src/presentation/i18n/pt-BR.ts` (`cities.retry: 'Tentar de novo'`)
- Create: `apps/mobile/src/presentation/features/cities/components/CitySkeleton.tsx`
- Test: `apps/mobile/src/presentation/features/cities/CitiesScreen.test.tsx`

**Interfaces:**

- Consumes: `useCitySearch` (TanStack `refetch`), `Surface`, `tokens`.
- Produces: `CitySkeleton({ rows = 3 })` — três `Surface` com a altura da linha de cidade (`tokens.size.cityRow` se existir; senão 64) e `accessibilityLabel={t.cities.searching}`; `CitiesHeader` mostra o botão `t.cities.retry` (kind `quiet`) ao lado da mensagem de erro; `useCitySearch` devolve também `retry: () => void`.

- [ ] **Step 1: Teste (falhando)** — em `CitiesScreen.test.tsx`:

```ts
  it('erro na busca mostra "Tentar de novo" e refaz a consulta', async () => {
    const geocoding = fakeGeocoding(err({ code: 'network' as const, message: 'offline' }));
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding }) });
    fireEvent.changeText(screen.getByPlaceholderText('Digite o nome da cidade'), 'São Paulo');
    await screen.findByText('Tentar de novo', {}, { timeout: 2000 });
    fireEvent.press(screen.getByText('Tentar de novo'));
    await waitFor(() => expect(geocoding.calls.length).toBe(2));
  });

  it('enquanto busca mostra o skeleton', async () => {
    const slow = { search: () => new Promise<never>(() => undefined), calls: [] as string[] };
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding: slow }) });
    fireEvent.changeText(screen.getByPlaceholderText('Digite o nome da cidade'), 'São Paulo');
    expect((await screen.findAllByLabelText('Buscando…', {}, { timeout: 2000 })).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter mobile exec jest src/presentation/features/cities --coverage=false`.

- [ ] **Step 3: Implementar** — `useCitySearch` devolve `{ ..., retry: () => void q.refetch() }`; `CitiesHeader` recebe `onRetry` e, quando `message?.danger`, renderiza `<Button kind="quiet" label={t.cities.retry} onPress={onRetry} />` dentro da mesma `Surface`; `CitiesScreen` passa `onRetry={search.retry}` e renderiza `<CitySkeleton />` no lugar de `CityResults` quando `search.isSearching`. `CitySkeleton` com três `Surface strength="soft" radius="card"` de altura fixa e `opacity: 0.6`, sem animação (movimento reduzido já é o padrão).

- [ ] **Step 4: Rodar até passar** — `pnpm --filter mobile exec jest src/presentation/features/cities && pnpm --filter mobile lint`.

- [ ] **Step 5: Commit** — `git commit -am "feat(cities): tentar de novo e skeleton na busca de cidades"` (após `git add` dos arquivos novos).

---

### Task 10: Perfil e abas — progresso na grade de conquistas, aba ativa distinguível, a11y do recibo

**Files:**

- Modify: `apps/mobile/src/presentation/features/profile/components/BadgeGrid.tsx` (+ `BadgeGrid.test.tsx` novo), `apps/mobile/src/app/(tabs)/_layout.tsx`, `apps/mobile/src/presentation/features/home/components/XpReceipt.tsx`, `apps/mobile/src/presentation/i18n/pt-BR.ts`

**Interfaces:**

- `BadgeGrid`: célula bloqueada com `progress` mostra `AppText variant="micro" tone="muted"` com `${current}/${target}`; `accessibilityLabel` passa a `"${nome}: bloqueada, 2 de 5"` (`t.profile.badgeProgress(current, target)` → `` `${current} de ${target}` ``); segundo toque na mesma badge fecha o detalhe (já existe; ganha teste).
- Abas: `tabBarIcon: ({ focused }) => ...` com `opacity: focused ? 1 : 0.55` e `transform: [{ scale: focused ? 1 : 0.92 }]` (emoji ignora `color`).
- `XpReceipt`: emoji em `<Emoji symbol label="" />`? Não — `Emoji` exige `label`; usar `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"` num `View` em volta do emoji e a linha inteira com `accessible accessibilityLabel={`${row.label}: ${row.value}`}`.

- [ ] **Step 1: Testes (falhando)** — `BadgeGrid.test.tsx`: renderiza uma badge bloqueada com `progress { current: 2, target: 5 }` → texto `2/5` e rótulo `"Explorador: bloqueada, 2 de 5"`; badge desbloqueada não mostra fração; tocar duas vezes na mesma badge abre e fecha o `BadgeDetail` (descrição some). Em `HomeScreen.test.tsx` (caso "planejar e confirmar"): `getByLabelText('Cumpriu o plano: +25')`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** conforme as interfaces acima.
- [ ] **Step 4: Rodar até passar** — `pnpm --filter mobile test`.
- [ ] **Step 5: Commit** — `git commit -m "feat(profile): progresso das conquistas na grade, aba ativa visível e recibo acessível"`.

---

### Task 11: Higiene de testes e cobertura por diretório

**Files:**

- Modify: `apps/mobile/package.json` (threshold `./src/presentation/features/`: lines/statements/functions 85, branches 80; script `lint` inclui os arquivos de config), `apps/mobile/src/presentation/testing/msw/handlers.ts` e `HomeScreen.msw.test.tsx` (asserções saem do handler), `apps/mobile/src/presentation/features/home/useBadWeatherRecorder.ts` (guarda por data), testes listados abaixo

**Steps:**

- [ ] **Step 1:** `handlers.ts` sem `expect`; em `HomeScreen.msw.test.tsx`, capturar a URL com `server.events.on('request:start', ({ request }) => urls.push(request.url))` e afirmar `timezone=auto` e `forecast_days=5` no corpo do teste.
- [ ] **Step 2:** `useBadWeatherRecorder`: `const recorded = useRef<string | null>(null)`; só chama `recordBadWeatherDay` quando `recorded.current !== date`; teste em `HomeScreen.test.tsx` (caso "dia sem janela"): forçar um re-render (mudar atividade) e afirmar que o fake `progress.events()` continua com **um** `badWeatherDay` e que `recordBadWeatherDay` foi chamado uma vez (contar via `memoryProgressRepository().appendCalls` se existir; senão via spy no serviço).
- [ ] **Step 3:** Testes de ramo pendentes: `MonthCalendar` com um dia `rest`; `BadgeDetail` com badge `unlocked`; `CityResults` com `favorites`/`recents` não vazios (`CitySection` renderizada); `Welcome` passos 2 e 3 (`getByLabelText('Passo 2')`, `'Passo 3'`); `ConfirmBody` fatores da janela (`22°` dentro do herói no estado confirm).
- [ ] **Step 4:** `package.json` → `"lint": "expo lint && eslint eslint.config.js jest.setup.js"`; `coverageThreshold["./src/presentation/features/"] = { branches: 80, functions: 85, lines: 85, statements: 85 }`.
- [ ] **Step 5:** `pnpm --filter mobile test && pnpm --filter mobile lint` verdes; commit `test(app): asserções fora do handler MSW, guarda do dia de folga e cobertura por diretório`.

---

### Task 12: Infra na VPS — nginx como borda, scripts e `engine.json` publicado (provisionamento com confirmação)

**Files:**

- Create: `infra/nginx/melhor-hora.conf.template`, `infra/nginx/melhor-hora-cache.conf`, `infra/setup-vps.sh`, `infra/deploy.sh`, `infra/publish-config.sh`, `infra/assets/config/v1/engine.json`, `infra/README.md`
- Test: `apps/mobile/src/infrastructure/config/publishedEngineConfig.test.ts` (o JSON publicado é igual à config embutida e passa no schema)

**Interfaces:**

- API em `https://${API_DOMAIN}` → `127.0.0.1:8180` (BFF); assets em `https://${ASSETS_DOMAIN}/config/v1/engine.json` → `127.0.0.1:9000/assets/config/v1/engine.json` com `Cache-Control: public, max-age=300, stale-while-revalidate=86400` e cache de borda do nginx (`proxy_cache`); `/assets/*` (reservado a imagens) com `max-age=86400`.
- `deploy.sh <tag>`: atualiza `BFF_IMAGE` no `.env`, `docker compose pull bff && up -d --wait`, verifica `/health`. `publish-config.sh`: copia `engine.json` para o bucket com os metadados de cache. `setup-vps.sh` (roda da máquina local): cria `/opt/melhor-hora`, envia `docker-compose.yml`, `.env`, scripts e `assets/`, instala o site do nginx via `envsubst`, roda `certbot --nginx` para os dois domínios, sobe o Compose e publica o config.

- [ ] **Step 1: `engine.json` publicado = config embutida (teste primeiro)**

`apps/mobile/src/infrastructure/config/publishedEngineConfig.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { engineConfigSchema } from '@melhor-hora/contracts';

import { defaultEngineConfig } from '@/domain';

const PUBLISHED = join(__dirname, '../../../../../infra/assets/config/v1/engine.json');

describe('infra/assets/config/v1/engine.json', () => {
  it('é a config embutida, válida no schema (a remota começa igual à local)', () => {
    const published: unknown = JSON.parse(readFileSync(PUBLISHED, 'utf8'));
    expect(engineConfigSchema.parse(published)).toEqual(defaultEngineConfig);
  });
});
```

Gerar o arquivo a partir do domínio, uma vez, sem console no código de produção:

```bash
cd apps/mobile && node -e "
require('@babel/register')({ extensions: ['.ts'], presets: ['babel-preset-expo'] });
const { defaultEngineConfig } = require('./src/domain/config/defaultEngineConfig.ts');
require('fs').mkdirSync('../../infra/assets/config/v1', { recursive: true });
require('fs').writeFileSync('../../infra/assets/config/v1/engine.json', JSON.stringify(defaultEngineConfig, null, 2) + '\n');
"
```

Se `@babel/register` não estiver disponível, copiar os valores à mão de `defaultEngineConfig.ts`; o teste acima garante a igualdade.

Run: `pnpm --filter mobile exec jest src/infrastructure/config --coverage=false` → PASS.

- [ ] **Step 2: nginx**

`infra/nginx/melhor-hora-cache.conf` (vai para `/etc/nginx/conf.d/`, contexto `http`):

```nginx
proxy_cache_path /var/cache/nginx/melhor-hora levels=1:2 keys_zone=melhor_hora_assets:10m max_size=200m inactive=7d use_temp_path=off;
```

`infra/nginx/melhor-hora.conf.template` (vai para `/etc/nginx/sites-available/melhor-hora` após `envsubst '${API_DOMAIN} ${ASSETS_DOMAIN}'`; o certbot acrescenta os blocos 443):

```nginx
server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:8180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 15s;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    }
}

server {
    listen 80;
    server_name ${ASSETS_DOMAIN};

    location /config/ {
        proxy_pass http://127.0.0.1:9000/assets/config/;
        proxy_set_header Host 127.0.0.1:9000;
        proxy_hide_header Cache-Control;
        proxy_cache melhor_hora_assets;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        add_header Cache-Control "public, max-age=300, stale-while-revalidate=86400" always;
        add_header X-Cache-Status $upstream_cache_status always;
        add_header X-Content-Type-Options nosniff always;
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:9000/assets/assets/;
        proxy_set_header Host 127.0.0.1:9000;
        proxy_hide_header Cache-Control;
        proxy_cache melhor_hora_assets;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400" always;
        add_header X-Cache-Status $upstream_cache_status always;
    }

    location / { return 404; }
}
```

- [ ] **Step 3: Scripts**

`infra/deploy.sh` (fica em `/opt/melhor-hora/deploy.sh` na VPS):

```bash
#!/usr/bin/env bash
# Uso: deploy.sh <tag da imagem>   — troca a tag, puxa, sobe e confere /health.
set -euo pipefail
cd "$(dirname "$0")"
TAG="${1:?informe a tag da imagem (SHA)}"
IMAGE="ghcr.io/techmardine/melhor-hora-bff:${TAG}"
sed -i "s#^BFF_IMAGE=.*#BFF_IMAGE=${IMAGE}#" .env
sed -i "s#^APP_VERSION=.*#APP_VERSION=${TAG}#" .env
docker compose --env-file .env pull bff
docker compose --env-file .env up -d --wait
for i in $(seq 1 10); do
  if curl -fsS http://127.0.0.1:8180/health | grep -q '"status":"ok"'; then echo "bff ok (${TAG})"; exit 0; fi
  sleep 3
done
echo "bff não respondeu em /health" >&2; docker compose --env-file .env logs --tail=50 bff >&2; exit 1
```

`infra/publish-config.sh` (na VPS):

```bash
#!/usr/bin/env bash
# Publica infra/assets/config/v1/engine.json no bucket `assets` com os metadados de cache.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ./.env; set +a
docker run --rm --network melhor-hora_default -v "$PWD/assets:/assets:ro" \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD minio/mc:latest sh -c '
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
    mc cp --attr "Content-Type=application/json;Cache-Control=public, max-age=300, stale-while-revalidate=86400" \
      /assets/config/v1/engine.json local/assets/config/v1/engine.json'
echo "publicado: /config/v1/engine.json"
```

`infra/setup-vps.sh` (roda **na máquina local**, idempotente):

```bash
#!/usr/bin/env bash
# Uso: infra/setup-vps.sh root@76.13.230.205   — exige infra/.env preenchido (API_DOMAIN, ASSETS_DOMAIN, MINIO_*).
set -euo pipefail
HOST="${1:?informe usuario@host}"
HERE="$(cd "$(dirname "$0")" && pwd)"
set -a; source "$HERE/.env"; set +a
ssh "$HOST" 'mkdir -p /opt/melhor-hora/assets /var/cache/nginx/melhor-hora'
scp "$HERE/docker-compose.yml" "$HERE/.env" "$HERE/deploy.sh" "$HERE/publish-config.sh" "$HOST:/opt/melhor-hora/"
scp -r "$HERE/assets/." "$HOST:/opt/melhor-hora/assets/"
scp "$HERE/nginx/melhor-hora-cache.conf" "$HOST:/etc/nginx/conf.d/melhor-hora-cache.conf"
envsubst '${API_DOMAIN} ${ASSETS_DOMAIN}' < "$HERE/nginx/melhor-hora.conf.template" | ssh "$HOST" 'cat > /etc/nginx/sites-available/melhor-hora'
ssh "$HOST" bash -s <<EOSSH
set -euo pipefail
chmod +x /opt/melhor-hora/*.sh
ln -sf /etc/nginx/sites-available/melhor-hora /etc/nginx/sites-enabled/melhor-hora
nginx -t && systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --redirect -m "${CERTBOT_EMAIL:?defina CERTBOT_EMAIL no infra/.env}" \
  -d "${API_DOMAIN}" -d "${ASSETS_DOMAIN}" || echo "certbot falhou: confira se os domínios já apontam para esta VPS"
cd /opt/melhor-hora && docker compose --env-file .env up -d --wait && ./publish-config.sh
EOSSH
echo "API:    https://${API_DOMAIN}/health"
echo "Assets: https://${ASSETS_DOMAIN}/config/v1/engine.json"
```

Acrescentar `CERTBOT_EMAIL=` ao `infra/.env.example`.

- [ ] **Step 4: Validar sem tocar na VPS**

Run: `bash -n infra/*.sh && docker run --rm -v "$PWD/infra/nginx:/etc/nginx/mh:ro" nginx:alpine sh -c 'cp /etc/nginx/mh/melhor-hora-cache.conf /etc/nginx/conf.d/ && export API_DOMAIN=a.test ASSETS_DOMAIN=b.test && envsubst "\${API_DOMAIN} \${ASSETS_DOMAIN}" < /etc/nginx/mh/melhor-hora.conf.template > /etc/nginx/conf.d/mh.conf && mkdir -p /var/cache/nginx/melhor-hora && nginx -t'`
Expected: `syntax is ok` / `test is successful`.

- [ ] **Step 5: `infra/README.md`** — topologia (nginx do sistema → 127.0.0.1:8180 BFF / 127.0.0.1:9000 MinIO; Redis só interno), pré-requisitos (dois subdomínios DuckDNS apontando para `76.13.230.205`, `infra/.env` preenchido), passo a passo (`setup-vps.sh`, `deploy.sh`, `publish-config.sh`), como rotacionar a senha do MinIO, como ver logs (`docker compose logs -f bff`), por que não há Caddy (ADR 0008), o que a Cloudflare acrescentaria (Task 16).

- [ ] **Step 6: Commit (antes de provisionar)**

```bash
git add infra apps/mobile/src/infrastructure/config/publishedEngineConfig.test.ts
git commit -m "chore(infra): nginx como borda, compose na VPS, scripts de setup/deploy e engine.json publicado"
```

- [ ] **Step 7: Provisionar — PARE e confirme com o usuário**

Perguntar ao usuário, de uma vez: (a) confirmar os domínios `melhor-hora.duckdns.org` e `melhor-hora-assets.duckdns.org` (ou outros) e que já apontam para `76.13.230.205`; (b) e-mail para o certbot; (c) autorização para rodar `infra/setup-vps.sh root@76.13.230.205` (instala site no nginx, emite certificados, sobe containers). Só depois do sim: preencher `infra/.env` (senha do MinIO gerada com `openssl rand -base64 32`, **não** commitada), rodar o script, e verificar:

```bash
curl -s https://melhor-hora.duckdns.org/health
curl -sI https://melhor-hora-assets.duckdns.org/config/v1/engine.json | grep -iE 'cache-control|x-cache-status|content-type'
curl -sI https://melhor-hora-assets.duckdns.org/config/v1/engine.json | grep -i x-cache-status   # segunda vez: HIT
```

Expected: `"redis":"ok"`; `Cache-Control: public, max-age=300, stale-while-revalidate=86400`; `X-Cache-Status: MISS` depois `HIT`. Antes do primeiro deploy do CI a imagem `latest` não existe no GHCR: subir só `redis`/`minio`/`minio-init` (`docker compose up -d redis minio minio-init`) e deixar o `bff` para a Task 15, ou fazer um `docker build` + `docker save | ssh docker load` temporário com tag `local`.

---

### Task 13: CI/CD no GitHub Actions

**Files:**

- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy-bff.yml`, `.github/workflows/publish-assets.yml`
- Modify: `package.json` raiz (scripts `lint`, `typecheck`, `test` já percorrem os pacotes; acrescentar `"format:check"` ao CI), `apps/mobile/package.json` (`lint` já cobre os arquivos de config — Task 11)

**Interfaces:**

- `ci.yml` (push e PR): jobs paralelos `contracts`, `bff` (com `services: redis` e `REDIS_URL=redis://localhost:6379`), `mobile` (lint, typecheck, `jest --coverage` com upload de `coverage/lcov.info`), `format` (`prettier --check .`).
- `deploy-bff.yml` (`workflow_run` de "CI" concluído com sucesso em `master`): build da imagem com `docker/build-push-action` (contexto raiz, `apps/bff/Dockerfile`, tags `sha-<sha7>` e `latest`, cache GHA), push no GHCR com `GITHUB_TOKEN` (`packages: write`), SSH na VPS (`appleboy/ssh-action`) executando `/opt/melhor-hora/deploy.sh sha-<sha7>`, e `curl https://${API_URL}/health` final.
- `publish-assets.yml` (`workflow_dispatch`): `scp` de `infra/assets` para `/opt/melhor-hora/assets` e `publish-config.sh` via SSH.
- Secrets/vars do repositório: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (secrets); `API_URL` (variable, ex.: `https://melhor-hora.duckdns.org`).

- [ ] **Step 1: `ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @melhor-hora/contracts lint
      - run: pnpm --filter @melhor-hora/contracts typecheck
      - run: pnpm --filter @melhor-hora/contracts test
  bff:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter bff lint
      - run: pnpm --filter bff typecheck
      - run: pnpm --filter bff test
      - run: pnpm --filter bff build
  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter mobile lint
      - run: pnpm --filter mobile typecheck
      - run: pnpm --filter mobile test
      - uses: actions/upload-artifact@v4
        with: { name: mobile-coverage, path: apps/mobile/coverage/lcov.info, retention-days: 14 }
```

- [ ] **Step 2: `deploy-bff.yml`**

```yaml
name: Deploy BFF
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [master]
permissions:
  contents: read
  packages: write
jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.workflow_run.head_sha }} }
      - id: meta
        run: echo "tag=sha-$(git rev-parse --short=7 HEAD)" >> "$GITHUB_OUTPUT"
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/bff/Dockerfile
          push: true
          tags: |
            ghcr.io/techmardine/melhor-hora-bff:${{ steps.meta.outputs.tag }}
            ghcr.io/techmardine/melhor-hora-bff:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: /opt/melhor-hora/deploy.sh ${{ steps.meta.outputs.tag }}
      - name: Smoke
        run: |
          curl -fsS "${{ vars.API_URL }}/health" | tee health.json
          grep -q '"status":"ok"' health.json
```

- [ ] **Step 3: `publish-assets.yml`**

```yaml
name: Publish assets
on: { workflow_dispatch: {} }
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: infra/assets
          target: /opt/melhor-hora/
          strip_components: 1
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: /opt/melhor-hora/publish-config.sh
      - run: curl -fsS "${{ vars.ASSETS_URL }}/config/v1/engine.json" | head -c 200
```

Acrescentar a variável `ASSETS_URL` à lista de vars do repositório.

- [ ] **Step 4: Validar localmente o que dá**

Run: `npx --yes @action-validator/cli .github/workflows/*.yml 2>/dev/null || npx --yes yaml-lint .github/workflows/*.yml; pnpm format:check; pnpm lint; pnpm typecheck; pnpm test`
Expected: YAML válido e os quatro comandos raiz verdes (é exatamente o que o CI roda).

- [ ] **Step 5: Commit**

```bash
git add .github package.json
git commit -m "ci: workflows de CI (contracts, bff com redis, mobile), deploy do BFF via GHCR e publicação de assets"
```

---

### Task 14: Documentação de entrega — ADRs, README, apresentação

**Files:**

- Create: `docs/adr/0001-expo-managed.md`, `0002-hexagonal-leve.md`, `0003-event-sourcing-local.md`, `0004-bff-com-cache-redis.md`, `0005-config-remota-do-motor.md`, `0006-fallback-direto-por-env.md`, `0007-motor-no-dispositivo.md`, `0008-nginx-existente-em-vez-de-caddy.md`, `docs/adr/README.md`
- Create: `docs/apresentacao.md`
- Modify: `README.md` (reescrita completa)
- Test: `apps/mobile/src/domain/recommendation/readmeExample.test.ts` (fixa os números do exemplo do README)

**Interfaces:** cada ADR com `Status`, `Contexto`, `Decisão`, `Consequências` (5–15 linhas cada); README com as seções do spec 9.

- [ ] **Step 1: Exemplo numérico verificável**

`readmeExample.test.ts`: uma hora com `apparentTemperature: 24, precipitationProbability: 10, precipitationMm: 0, windSpeedKmh: 12, uvIndex: 6, cloudCoverPct: 30, isDay: true` para `walk` → `scoreHour(...)`; o teste afirma `score`, `label` e cada `comforts[f]` com os valores que a primeira execução mostrar (rodar, ler o "Received", fixar). Esses números vão literalmente para o README (seção "Como o motor decide"), junto com a tabela de pesos da caminhada (0,4/0,3/0,15/0,1/0,05) e a frase que o app gera para esse dia.

- [ ] **Step 2: ADRs** — conteúdo mínimo por arquivo:
  - 0001: Expo managed + Expo Go como alvo do avaliador; custo: sem módulos nativos custom; benefício: QR e zero setup.
  - 0002: quatro camadas com `eslint-plugin-boundaries`; ports em `application`; composição em `app/_layout` + `infrastructure/container`.
  - 0003: progresso como log de eventos (`progress:v1`) derivado por `deriveProgress`; permite recalcular XP com outra config e auditar; custo: derivação O(n) memoizada.
  - 0004: BFF Hono + Redis (chaves/TTLs), "mil usuários, uma chamada", rate limit, sem cachear lixo, degradação sem Redis.
  - 0005: `engine.json` no bucket com schema Zod compartilhado e invariantes; cache 24 h; última cópia válida; o que é config e o que é código (curvas, descritores, badges).
  - 0006: `EXPO_PUBLIC_API_MODE` seleciona adapters; `bff` sem URLs falha alto; avaliador roda em `direct`.
  - 0007: motor no dispositivo (offline com última previsão, legibilidade no repositório, fuso da cidade); o BFF não pontua.
  - 0008: nginx + certbot já detêm 80/443 na VPS com outros sites; Compose só em `127.0.0.1`; `proxy_cache` faz o cache de borda; Cloudflare condicional a domínio próprio.
- [ ] **Step 3: README** — seções: o que é (uma frase + 3 capturas de `docs/superpowers/qa/2026-09-15-web-depois/`), rodar em 3 comandos, modos `direct`/`bff` (URLs públicas da Task 12), diagrama Mermaid (app → BFF → Open-Meteo; app → assets; Redis; nginx), como o motor decide (exemplo numérico do Step 1 + vetos + janela + madrugada), gamificação (ciclo, XP, streak protegido), arquitetura (camadas + link para ADRs), qualidade (números de testes/cobertura, CI), infra (link `infra/README.md`), decisões e trade-offs, o que faria com mais tempo (opcionais do spec 2), QA visual (link do relatório e do harness).
- [ ] **Step 4: `docs/apresentacao.md`** — os dez pontos do spec 10 como roteiro de fala, cada um com "o que mostrar" (comando `curl` com `X-Cache`, tela do app, trecho de código) e a nota do usuário: _"o cache no servidor: mil usuários na mesma cidade geram apenas uma chamada, não mil"_; acrescentar "madrugada fora das candidatas" e "QA visual com CDP" como pontos extras.
- [ ] **Step 5:** `pnpm format:check && pnpm --filter mobile test` verdes; commit `docs: ADRs, README de entrega e roteiro da apresentação`.

---

### Task 15: Repositório remoto, secrets, primeiro deploy e verificação ponta a ponta (com confirmação)

**Files:** nenhum novo; atualiza `README.md` com URLs finais se mudarem.

- [ ] **Step 1: PARE e confirme com o usuário** — nome/visibilidade do repositório (proposta: `TechMardine/melhor-hora`, público, conta já autenticada no `gh`), e autorização para: criar o repositório e fazer push de `master`; gravar os secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (chave dedicada gerada agora, só leitura de deploy) e as vars `API_URL`/`ASSETS_URL`; instalar a chave pública em `/root/.ssh/authorized_keys` da VPS.
- [ ] **Step 2: Chave de deploy** — `ssh-keygen -t ed25519 -N '' -f ~/.ssh/melhor-hora-deploy -C melhor-hora-ci`; `ssh-copy-id -i ~/.ssh/melhor-hora-deploy.pub root@76.13.230.205`.
- [ ] **Step 3: Repositório e secrets**

```bash
gh repo create TechMardine/melhor-hora --public --source . --remote origin --push
gh secret set VPS_HOST --body 76.13.230.205
gh secret set VPS_USER --body root
gh secret set VPS_SSH_KEY < ~/.ssh/melhor-hora-deploy
gh variable set API_URL --body https://melhor-hora.duckdns.org
gh variable set ASSETS_URL --body https://melhor-hora-assets.duckdns.org
gh api -X PUT /user/packages/container/melhor-hora-bff/visibility -f visibility=public   # após a 1ª imagem existir
```

- [ ] **Step 4: Acompanhar** — `gh run watch` do CI e do "Deploy BFF"; se o pacote GHCR nascer privado, tornar público (comando acima) e reexecutar o deploy (`gh run rerun <id>`). Verificar `curl https://melhor-hora.duckdns.org/health` (`version` = `sha-…`), duas chamadas de previsão (`X-Cache: MISS` → `HIT`), `publish-assets` manual (`gh workflow run "Publish assets"`) e o `engine.json` público.
- [ ] **Step 5: App em modo bff contra a produção** — `EXPO_PUBLIC_API_MODE=bff EXPO_PUBLIC_BFF_URL=https://melhor-hora.duckdns.org EXPO_PUBLIC_ASSETS_URL=https://melhor-hora-assets.duckdns.org` com o harness web (`tools/qa-web`) e, se o usuário puder, no Expo Go (`.env` em `apps/mobile`); conferir no log do BFF `cacheHit: true` na segunda abertura e no `/health` o `hitRate` subindo.
- [ ] **Step 6:** Atualizar README (URLs, badge do CI) e memória do projeto; commit `docs: URLs públicas e badge de CI`; push.

---

### Task 16 (condicional): CDN Cloudflare

Só se o usuário tiver um domínio registrado na Cloudflare (spec 11.2). Sem ele, o `proxy_cache` do nginx da Task 12 é a borda e este item vai para "o que faria com mais tempo".

- [ ] **Step 1:** Criar registros `A` proxiados (nuvem laranja) `api.<dominio>` e `assets.<dominio>` → `76.13.230.205`; SSL/TLS "Full (strict)"; certbot já emite para os novos nomes (`certbot --nginx -d api.<dominio> -d assets.<dominio>` e `server_name` adicional no template).
- [ ] **Step 2:** Cache Rules: `assets.<dominio>/config/*` → Eligible for cache, Edge TTL 5 min, respeitar `stale-while-revalidate`; `assets.<dominio>/assets/*` → Edge TTL 1 dia; `api.<dominio>/*` → Bypass.
- [ ] **Step 3:** Verificar `cf-cache-status: HIT` na segunda requisição do `engine.json`; atualizar `EXPO_PUBLIC_ASSETS_URL`, `ALLOWED_ORIGINS` (se houver web) e o README; ADR 0008 ganha a nota "Cloudflare em frente ao nginx desde <data>".

---

## Auto-revisão do plano

**Cobertura do spec:** 4.6 (config remota) → Tasks 1, 8, 12; 6.4 (modos) → Task 8; 7.1 (monorepo) → Tasks 1–3; 7.2 (BFF) → Tasks 3–6; 7.3 (bucket/CDN) → Tasks 7, 12, 16; 7.4 (Compose) → Task 7 + ADR 0008 (Caddy substituído); 7.5 (env) → Tasks 3, 8; 8.2 (bff ≥ 85 %, infra "seleção de adapter por env") → Tasks 3–6, 8; 8.3 (CI/CD) → Task 13; 9 (documentação) → Task 14; 10 (apresentação) → Task 14; 11 (questões) → domínio e Cloudflare tratados como condicionais; pendências dos Planos 1–3 → Tasks 1 (schema com invariantes), 8 (env falha alto, config injetada), 9–11 (Cidades, badges, abas, cobertura, MSW, guarda), 13 (lint de config). Fora do plano, por decisão: imagens no bucket (app usa emoji), E2E Maestro e EAS (opcionais do spec 2).

**Placeholders:** nenhum "TBD"; onde o código é repetição de um arquivo vizinho (rota `forecast.ts`, `bffForecastClient.ts`) o plano nomeia as diferenças exatas.

**Consistência de nomes:** `Cache`/`memoryCache`/`createRedisCache`/`resilientCache`/`createCache`; `createMeter`/`Meter`; `AppDeps` (`env, logger, cache, upstream, meter, now, startedAt`); `Upstream`/`UpstreamResult`; `AppError(status, code, message, headers)`; `AppEnv`/`requestLog`; `geoKey`/`forecastKey`/`rateKey`; `cityDtoSchema`/`forecastDtoSchema`/`engineConfigSchema`; `mapCity`/`mapForecast`/`buildForecastUrl`/`buildGeocodingUrl`; `selectAdapters`/`SelectedAdapters`; `createRemoteEngineConfigProvider`/`ENGINE_CONFIG_KEY`/`ENGINE_CONFIG_TTL_MS`; `EnvError`/`parseEnv`/`readEnv` — usados com a mesma grafia em todas as tarefas.
