# 0008 — nginx existente em vez de Caddy como borda da VPS

## Status

Aceito

## Contexto

O spec original (seção 7.4) previa Caddy como borda com TLS automático para o Compose. Na
VPS de destino (`76.13.230.205`), porém, já roda nginx + certbot nas portas 80/443 servindo
outros sites — instalar Caddy ao lado disputaria ou exigiria revezar essas mesmas portas
com um serviço que já está em produção para outra coisa.

## Decisão

O `docker-compose.yml` publica todo serviço só em `127.0.0.1` (`bff` em `127.0.0.1:8180`,
`minio` em `127.0.0.1:9000`/`9001`); nenhum container expõe porta ao mundo. O nginx do
sistema operacional continua sendo a única borda: termina TLS (certificados emitidos por
`certbot --nginx` em `setup-vps.sh`), roteia por `server_name`
(`melhor-hora.duckdns.org` → BFF, `melhor-hora-assets.duckdns.org` → MinIO) e faz o cache de
borda com `proxy_cache` (`infra/nginx/melhor-hora-cache.conf` define a zona,
`melhor-hora.conf.template` aplica `proxy_cache_valid 5m` em `/config/*` e `1d` em
`/assets/*`, no lugar do que seria o cache do Caddy). O Redis nunca sai da rede interna do
Compose — só o BFF fala com ele. O nginx grava `X-Real-IP` no proxy; o BFF confia nesse
header, não em `X-Forwarded-For` (que o cliente pode forjar), para o rate limit por IP
(`TRUST_PROXY=true`, `src/http/clientIp.ts`).

## Consequências

Custo: um passo a mais de instalação por site (`setup-vps.sh` escreve o site em
`/etc/nginx/sites-available/` e roda `certbot --nginx`) em vez de um único processo Caddy
autocontido. Benefício: zero conflito com os outros sites da VPS, e a infra deste projeto
não briga por porta com nada que já estava rodando. A Cloudflare como CDN fica condicional
a um domínio próprio registrado nela (spec, seção 11, item 2); sem ele, o `proxy_cache` do
nginx já cumpre o papel de cache de borda — ver `infra/README.md` ("O que a Cloudflare
acrescentaria").
