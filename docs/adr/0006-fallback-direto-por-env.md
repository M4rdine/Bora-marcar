# 0006 — Fallback direto por variável de ambiente

## Status

Aceito

## Contexto

Quem avalia o teste técnico precisa rodar o app sem configurar nenhuma infraestrutura. Ao
mesmo tempo, o app precisa conseguir falar com o BFF (ADR 0004) em produção, e uma
configuração de `bff` quebrada (URL ausente ou inválida) não pode cair em silêncio para
`direct` — isso esconderia um erro de deploy atrás de um app que parece funcionar.

## Decisão

`EXPO_PUBLIC_API_MODE=direct|bff` seleciona os adapters em `selectAdapters`
(`infrastructure/adapters.ts`). O padrão é `direct`: fala direto com a Open-Meteo
(`OpenMeteoForecastProvider`/`OpenMeteoGeocodingProvider`) e usa a config embutida —
nenhuma variável extra é obrigatória, e é o modo em que o avaliador roda sem configurar
nada. Em `bff`, `EXPO_PUBLIC_BFF_URL` e `EXPO_PUBLIC_ASSETS_URL` passam a ser obrigatórias e
validadas como URL (`z.url()`, `env.ts`); se estiverem ausentes ou inválidas, `parseEnv`
lança `EnvError` — falha alta e visível, não um `direct` silencioso. A tela raiz
(`app/_layout.tsx`) captura esse erro e mostra uma tela de erro com "tentar de novo" em vez
de apontar para uma URL vazia.

## Consequências

O mesmo port (`ForecastProvider`, `GeocodingProvider`, `EngineConfigProvider`) com dois
adapters concretos é a demonstração de ports and adapters com um caso real, não teórico
(spec 10). Custo: dois caminhos de código para testar em `infrastructure` — mitigado porque
os dois usam os mesmos contratos de `packages/contracts`. Falhar alto em vez de degradar
para `direct` é intencional: evita que um build de produção suba apontando para
`localhost` ou uma URL vazia por engano.
