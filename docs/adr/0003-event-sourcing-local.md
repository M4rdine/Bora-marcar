# 0003 — Event sourcing local para a gamificação

## Status

Aceito

## Contexto

XP, nível, streak e badges precisam ser auditáveis, recalculáveis se as regras de XP ou os
limiares mudarem (config remota, ver ADR 0005), e o streak tem uma regra fina — um dia ruim
(`badWeatherDay`) não quebra nem incrementa a sequência (spec 5.4). Guardar só um contador de
XP e um contador de streak torna essa regra e a auditoria difíceis de acertar e de testar.

## Decisão

O progresso é um log imutável de eventos (`planned`, `confirmed`, `logged`,
`planCancelled`, `badWeatherDay`, tipo `GamificationEvent`) persistido em `progress:v1`
(`AsyncStorage`, `ProgressRepository`). Nenhum estado derivado (XP total, nível, streak,
histórico, badges) é armazenado diretamente: tudo vem de `deriveProgress(events, config,
today)`, uma função pura em `apps/mobile/src/domain/gamification/deriveProgress.ts`,
chamada pelos casos de uso (`planActivity`, `confirmActivity`, `logActivity`,
`getProgress`).

## Consequências

Auditoria e depuração ficam triviais (o log é a fonte de verdade, dá para reconstruir o
histórico passo a passo); mudar as regras de XP na config remota recalcula o progresso
inteiro sem migração de dados. Custo: a derivação é O(n) no número de eventos a cada
chamada — mitigado porque só roda nos casos de uso que escrevem ou leem progresso, e o
resultado fica cacheado pelo TanStack Query (`useProgress`), invalidado apenas depois de um
evento novo ser gravado (spec 6.2); o `ProgressRepository` também poda eventos com mais de
365 dias na escrita, para o log não crescer sem limite.
