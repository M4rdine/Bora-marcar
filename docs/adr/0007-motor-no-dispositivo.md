# 0007 — Motor de recomendação no dispositivo, não no servidor

## Status

Aceito

## Contexto

O teste técnico pede explicitamente para explicar a lógica de recomendação — ela precisa
estar legível no repositório do candidato, não escondida atrás de uma API privada que o
avaliador não pode ler. O app também deveria continuar útil (mostrar a última recomendação)
quando o BFF ou a rede não estão disponíveis.

## Decisão

Todo o motor de recomendação (`scoreHour`, `applyVetoes`, `findBestWindow`, descritores e
frases) roda no dispositivo, em TypeScript puro dentro de
`apps/mobile/src/domain/recommendation`, com 100 % de cobertura. O BFF (ADR 0004) só faz
proxy e cache dos dados brutos da Open-Meteo — nunca calcula score nem decide janela; os
DTOs que ele devolve (`ForecastDTO` em `packages/contracts`) são os mesmos dados crus que o
adapter direto também mapeia. O "agora" usado pelo motor é sempre o fuso da cidade
consultada (`utc_offset_seconds` da resposta, lido com getters UTC em `LocalDateTime`),
nunca o fuso do aparelho — buscar Lisboa de São Paulo mostra o "agora" de Lisboa.

## Consequências

Qualquer avaliador lê `src/domain/recommendation` e entende a pontuação sem acesso a
nenhum servidor — é a resposta pronta para "breve descrição da lógica de recomendação"
pedida pelo teste. O app funciona offline com a última previsão que o TanStack Query
mantém em cache (`staleTime`/`gcTime` de `useForecast`). Custo: o BFF não pode aplicar
regras específicas por cliente (por exemplo, pontuação diferente por versão do app) sem
publicar uma config nova (ADR 0005) ou uma versão nova do app — trade-off aceito porque o
motor legível pesa mais que essa flexibilidade neste projeto.
