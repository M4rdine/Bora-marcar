# Infra — Melhor Hora na VPS

## Topologia

```
Internet ──443/80──> nginx (do sistema, já serve outros sites)
                        ├─ ${API_DOMAIN}      → 127.0.0.1:8180  (bff)
                        └─ ${ASSETS_DOMAIN}
                             ├─ /config/*      → 127.0.0.1:9000/assets/config/*  (engine.json, com proxy_cache)
                             └─ /assets/*      → 127.0.0.1:9000/assets/assets/*  (reservado a imagens futuras)

docker compose (rede interna "melhor-hora_default")
  bff   ──> redis   (só na rede interna, sem porta publicada)
  bff   ──> Open-Meteo (upstream externo)
  minio (bucket "assets", leitura anônima) — publicado em 127.0.0.1:9000/9001
```

Todo serviço do Compose fica em `127.0.0.1`; quem expõe ao mundo é o nginx do sistema operacional,
que já ocupa as portas 80/443 com outros sites da VPS (por isso não há Caddy aqui — ver ADR 0008
em `docs/adr/0008-nginx-existente-em-vez-de-caddy.md`, escrita na Task 14). O Redis nunca sai da
rede interna do Compose.

## Pré-requisitos

- Dois subdomínios DuckDNS apontando para `76.13.230.205` — por padrão `melhor-hora.duckdns.org`
  (API) e `melhor-hora-assets.duckdns.org` (assets); podem ser outros, desde que resolvam para a
  VPS antes de rodar `setup-vps.sh` (o certbot valida por HTTP-01).
- `infra/.env` preenchido a partir de `infra/.env.example`, com `MINIO_ROOT_PASSWORD` trocado (ex.:
  `openssl rand -base64 32`) e `CERTBOT_EMAIL` definido. **Esse arquivo nunca é commitado** (está no
  `.gitignore`) — só existe localmente e na VPS. `deploy.sh`, `publish-config.sh` e `setup-vps.sh`
  carregam o `.env` com `source` (sem aspas), então `MINIO_ROOT_PASSWORD` precisa ser um token só,
  sem espaços, `$`, crases ou `#` — o alfabeto do `openssl rand -base64 32` já é seguro para isso.
- `ssh`, `scp` e `envsubst` disponíveis na máquina local; Docker Compose e nginx+certbot já
  instalados na VPS.

## Os três scripts

- **`setup-vps.sh <usuario@host>`** — roda na máquina local, é idempotente. Cria
  `/opt/melhor-hora`, copia `docker-compose.yml`, `.env`, os outros dois scripts e `assets/`,
  instala `melhor-hora-cache.conf` em `/etc/nginx/conf.d/`, gera o site em
  `/etc/nginx/sites-available/melhor-hora` via `envsubst`, habilita, testa e recarrega o nginx,
  emite certificado com `certbot --nginx` para os dois domínios, sobe o Compose e chama
  `publish-config.sh`. Pode ser executado de novo com segurança (sobrescreve os mesmos arquivos).
- **`deploy.sh <tag>`** — roda na VPS (`/opt/melhor-hora/deploy.sh <tag>`). Troca `BFF_IMAGE` e
  `APP_VERSION` no `.env` para a tag informada (o SHA da imagem publicada pelo CI), faz
  `docker compose pull bff && up -d --wait` e confere `/health` até 10 tentativas antes de falhar.
- **`publish-config.sh`** — roda na VPS. Copia `assets/config/v1/engine.json` para o bucket
  `assets` do MinIO com `Content-Type: application/json` e o mesmo `Cache-Control` servido pelo
  nginx (`public, max-age=300, stale-while-revalidate=86400`).

## Rotacionar a senha do MinIO

1. Gerar uma senha nova: `openssl rand -base64 32`.
2. Editar `MINIO_ROOT_PASSWORD` em `infra/.env` (local) — e no `.env` da VPS, em
   `/opt/melhor-hora/.env` (ou copiar o novo `.env` local via `scp`).
3. Recriar os containers para aplicar a env nova: `docker compose --env-file .env up -d --wait`
   (na VPS, dentro de `/opt/melhor-hora`).
4. `mc alias` usado por `publish-config.sh` é recriado a cada execução com as credenciais do
   `.env`, então não precisa de nenhum passo extra além disso.

## Logs

```bash
# na VPS, dentro de /opt/melhor-hora
docker compose logs -f bff      # logs do BFF (pino)
docker compose logs -f minio    # logs do MinIO
docker compose logs -f redis    # logs do Redis
```

Logs de acesso/erro do nginx ficam em `/var/log/nginx/` (`access.log` / `error.log`), como para
qualquer outro site do sistema.

## Por que não há Caddy

A VPS já roda nginx + certbot para outros sites nas portas 80/443; instalar Caddy ao lado exigiria
disputar ou revezar essas portas. Em vez disso, o Compose só publica em `127.0.0.1` e o nginx
existente faz de borda: TLS, roteamento por `server_name` e `proxy_cache` para os assets. Ver ADR
0008 (`docs/adr/0008-nginx-existente-em-vez-de-caddy.md`, Task 14) para a decisão completa.

## O que a Cloudflare acrescentaria

Hoje o `proxy_cache` do nginx já é a borda de cache. Com um domínio próprio na Cloudflare (Task 16,
condicional), dá para colocar `api.<dominio>` e `assets.<dominio>` atrás dela em modo proxiado
(nuvem laranja) com SSL/TLS "Full (strict)": Cache Rules dedicadas para `/config/*` (Edge TTL 5 min,
respeitando `stale-while-revalidate`) e `/assets/*` (Edge TTL 1 dia), bypass para a API, e proteção
extra (WAF, DDoS) na frente do nginx da VPS. Sem domínio próprio, isso fica como item de "o que
faria com mais tempo".
