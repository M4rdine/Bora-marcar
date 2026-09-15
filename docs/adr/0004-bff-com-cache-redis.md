# 0004 — BFF com cache Redis na frente da Open-Meteo

## Status

Aceito

## Contexto

A Open-Meteo é uma API pública, sem chave, com uso justo esperado — o app não deve fazer
uma chamada por usuário toda vez que alguém abre a mesma cidade. O spec também pede
desacoplar o app do provedor de clima (spec 10).

## Decisão

Um BFF em Hono (Node 22, `apps/bff`) fica na frente da Open-Meteo com cache-aside no Redis:
`GET /v1/cities` cacheia em `geo:v1:{lang}:{q normalizado}` por 24 h; `GET /v1/forecast`
cacheia em `fc:v1:{lat 2 casas}:{lon 2 casas}` por 15 min. Assim, mil usuários pedindo a
previsão da mesma cidade dentro da janela do cache geram **uma** chamada à Open-Meteo, não
mil. A resposta upstream é validada com Zod antes de gravar no cache — nunca cacheia lixo
(`apps/bff/src/routes/forecast.ts`, `cities.ts`). Rate limit de 60 req/min por IP, janela
deslizante contada no Redis, `429` com `Retry-After` (`RATE_LIMIT_PER_MIN`,
`src/http/rateLimit.ts`). Se o Redis cair ou não estiver configurado
(`resilientCache.ts`), o BFF cai para cache em memória do processo e segue respondendo —
nenhuma rota quebra por causa do Redis.

## Consequências

Custo: mais um serviço para rodar, versionar imagem (GHCR) e monitorar (`/health` expõe
`hits`/`misses`/`hitRate` e o estado do Redis). Benefício: cache hit responde em
milissegundos, a Open-Meteo é protegida de tráfego repetido, e a degradação sem Redis é
testada explicitamente (`apps/bff/src/cache/resilientCache.test.ts`) em vez de assumida.
