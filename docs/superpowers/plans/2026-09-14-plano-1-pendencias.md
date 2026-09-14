# Plano 1 — pendências e decisões herdadas para os Planos 2 e 3

Origem: revisão final de branch do Plano 1 (2026-09-14). Itens já corrigidos não constam.

## Obrigatórios no Plano 2 (app)

- Memoizar `deriveProgress` (selector/`useMemo` por tamanho do log + último `createdAt`): O(n²) com `week` O(400·n); não rodar por render.
- `logActivity` deve devolver erro tipado (`alreadyLoggedToday`) ou aceitar o segundo registro do dia sem XP (domínio já mantém o registro com XP zero) — decidir ao construir "Registrar sem plano".
- `activePlanFor(date)` / `plansByDate` no domínio para o fluxo "Planejar amanhã" (`/day/[date]`).
- Mapa PT-BR de motivos para `FactorId | VetoId` (estado "Sem janela boa"); avaliar `'fog'` como `VetoId` (hoje nevoeiro só multiplica o score do ciclismo e não aparece como motivo).
- Progresso da badge "Semana cheia" é a melhor sequência já atingida (peak): rotular como "melhor sequência" no Perfil.
- Mapeamentos `weatherCode → glifo` e `weatherCode → resumo curto` são da apresentação (`presentation/i18n`).
- Provar `boundaries/dependencies` entre camadas com o primeiro import cruzado real (probes só validaram domain→externo).
- `tsconfig`: trocar `ignoreDeprecations: "6.0"` por remoção de `baseUrl` (manter `paths`) e revalidar o alias `@/` no Metro.
- `apps/mobile/index.ts` vs `main: expo/AppEntry.js`: Expo Router troca o `main`; remover o que sobrar.

## Obrigatórios no Plano 3 (BFF/contracts)

- Schema Zod do `engine.json` deve impor: `tolMin < idealMin <= idealMax < tolMax`, `levels` não vazio e crescente, `window.sizes` todos ≥ 1 (precondições do `piecewise`/`levelFor`/`findBestWindow`, ver comentário em `comfort.ts`).
- Teste "config malformada" contra `thermalComfort` quando o schema existir.

## Minors diferidos (fazer se sobrar tempo)

- `RAIN_PROB_ZERO` (comfort.ts) e `RAIN_PROB_VETO` (vetoes.ts) duplicam o 80 sem referência cruzada.
- Fixture `makeHourScore` reimplementa `labelFor` (80/65/45) em vez de chamá-lo.
- Teste de empate de conforto em `dominantProblem`.
- `levelFor` com lista vazia devolve nível sem nome; `confirmed` órfão é descartado em silêncio — degradação invisível com storage corrompido.
- `MAX_LOOKBACK_DAYS = 400` acoplado à poda de 365 dias do spec 6.3 (comentar).
- Spec 4.2: "acima de 1 mm" → "a partir de 1 mm" (o veto usa `>=`).
- Verificação manual pendente: abrir o app no Expo Go (`pnpm --filter mobile start`) e ver a tela placeholder.
