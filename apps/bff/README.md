# BFF — Melhor Hora

Proxy fino (Hono) na frente da Open-Meteo: normaliza a resposta no contrato de
`@melhor-hora/contracts`, cacheia no Redis (cache-aside) e aplica rate limit por IP — para que mil
usuários na mesma cidade gerem **uma** chamada à Open-Meteo, não mil.

## Endpoints

| Endpoint                        | Função                                               | Cache Redis                                    |
| ------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `GET /v1/cities?q=&lang=pt\|en` | Proxy do geocoding, resposta normalizada `CityDTO[]` | `geo:v1:{lang}:{q normalizado}` TTL 24 h       |
| `GET /v1/forecast?lat=&lon=`    | Proxy do forecast, resposta `ForecastDTO`            | `fc:v1:{lat 2 casas}:{lon 2 casas}` TTL 15 min |
| `GET /health`                   | Estado do processo e do Redis                        | —                                              |

Exemplos:

```bash
curl 'http://localhost:8180/v1/cities?q=lisboa&lang=pt'
curl 'http://localhost:8180/v1/forecast?lat=-23.55&lon=-46.63'
curl 'http://localhost:8180/health'
```

Toda resposta de `/v1/cities` e `/v1/forecast` traz `X-Cache: HIT|MISS` e `Cache-Control`; o corpo
é o DTO puro (sem envelope).

## Variáveis de ambiente

Ver `.env.example`. Todas validadas com Zod na inicialização (`src/config/env.ts`); uma inválida
derruba o processo com a lista de campos.

| Variável              | Padrão                                 | Observação                                                      |
| --------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `PORT`                | `8080`                                 |                                                                 |
| `REDIS_URL`           | ausente                                | sem Redis, o BFF segue sem cache (cache em memória do processo) |
| `ALLOWED_ORIGINS`     | vazio                                  | lista separada por vírgula; usada no CORS                       |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com`           |                                                                 |
| `GEOCODING_BASE_URL`  | `https://geocoding-api.open-meteo.com` |                                                                 |
| `RATE_LIMIT_PER_MIN`  | `60`                                   | por IP, janela deslizante de 60 s                               |
| `UPSTREAM_TIMEOUT_MS` | `5000`                                 | timeout da chamada à Open-Meteo                                 |
| `LOG_LEVEL`           | `info`                                 | pino                                                            |
| `TRUST_PROXY`         | `true`                                 | `true` atrás do nginx, que grava `X-Real-IP`                    |
| `APP_VERSION`         | `dev`                                  | exposta em `/health`                                            |

## Como rodar

```bash
pnpm --filter bff dev                                  # sem REDIS_URL: cache em memória, sem persistência
REDIS_URL=redis://127.0.0.1:6379 pnpm --filter bff dev  # com Redis local
```

Ou via Compose (constrói a imagem local em vez de puxar do GHCR):

```bash
cp ../../infra/.env.example ../../infra/.env
docker compose --env-file ../../infra/.env -f ../../infra/docker-compose.yml -f ../../infra/docker-compose.local.yml up -d --build --wait
```

## Como testar

```bash
REDIS_URL=redis://127.0.0.1:6379 pnpm --filter bff test   # Vitest + Redis real (cache hit/miss, TTLs, rate limit)
pnpm --filter bff lint
pnpm --filter bff typecheck
```

Sem `REDIS_URL`, os testes que dependem do Redis real são pulados; a suíte cobre o fallback em
memória separadamente.

## Formato de erro

Toda resposta de erro segue `{ error: { code, message } }`:

```json
{ "error": { "code": "bad_request", "message": "Parâmetros inválidos — lat: Invalid input" } }
```

Códigos: `bad_request` (400, query inválida), `not_found` (404, rota inexistente),
`rate_limited` (429, com header `Retry-After`), `upstream_unavailable` (502, erro ou timeout da
Open-Meteo — mensagem fixa `Open-Meteo indisponível (<código>)`; o detalhe do upstream vai só para
o log), `internal` (500, erro inesperado).

## Política de cache

- Cache-aside: hit devolve o corpo salvo; miss busca na Open-Meteo, valida com Zod e só então
  grava — **nunca cacheia lixo** (resposta que não bate com o schema não é gravada nem devolvida).
- Se o Redis cair (ou não estiver configurado), o BFF segue respondendo sem cache, cai para uma
  cache em memória do processo local e registra o motivo no log; nenhuma rota quebra por isso.
- Contadores de acerto (`hits`, `misses`, `hitRate`) ficam expostos em `/health`.

## Rate limit

60 req/min por IP (configurável em `RATE_LIMIT_PER_MIN`), janela deslizante contada no Redis.
Acima do limite: `429` com `Retry-After: 60`. O IP do cliente vem de `X-Real-IP` quando
`TRUST_PROXY=true` (nginx da Task 12); nunca de `X-Forwarded-For`, que o cliente pode forjar.

## `/health`

```json
{
  "status": "ok",
  "version": "local",
  "uptimeSeconds": 42,
  "redis": "ok",
  "cache": { "hits": 3, "misses": 2, "hitRate": 0.6 }
}
```

`redis` é `"ok"`, `"down"` (configurado mas sem responder ao ping) ou `"disabled"` (sem
`REDIS_URL`).
