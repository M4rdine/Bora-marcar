# Infra — Bora marcar na VPS

## Topologia

```
Internet ──443/80──> nginx (do sistema, já serve outros sites)
                        └─ ${DOMAIN}
                             ├─ /config/*      → 127.0.0.1:9000/assets/config/*  (engine.json, com proxy_cache)
                             ├─ /assets/*      → 127.0.0.1:9000/assets/assets/*  (reservado a imagens futuras)
                             └─ /  (resto)     → 127.0.0.1:8180  (bff — /v1/*, /health)

docker compose (rede interna "bora-marcar_default")
  bff   ──> redis   (só na rede interna, sem porta publicada)
  bff   ──> Open-Meteo (upstream externo)
  minio (bucket "assets", leitura anônima) — publicado em 127.0.0.1:9000/9001
```

Um único domínio serve API e assets: `/config/` e `/assets/` vão para o MinIO com cache de borda
(`proxy_cache`); todo o resto vai para o BFF. Todo serviço do Compose fica em `127.0.0.1`; quem
expõe ao mundo é o nginx do sistema operacional, que já ocupa as portas 80/443 com outros sites da
VPS (por isso não há Caddy aqui — ver ADR 0008 em `docs/adr/0008-nginx-existente-em-vez-de-caddy.md`,
escrita na Task 14). O Redis nunca sai da rede interna do Compose.

## Pré-requisitos

- Um subdomínio DuckDNS apontando para `76.13.230.205` — por padrão `bora-marcar.duckdns.org`; pode
  ser outro, desde que resolva para a VPS antes de rodar `setup-vps.sh` (o certbot valida por
  HTTP-01).
- `infra/.env` preenchido a partir de `infra/.env.example`, com `MINIO_ROOT_PASSWORD` trocado (ex.:
  `openssl rand -base64 32`). `CERTBOT_EMAIL` é **opcional** — a VPS já tem conta ACME registrada,
  então o certbot reaproveita; deixe vazio para pular o `-m` (o certbot roda com
  `--register-unsafely-without-email`). **Esse arquivo nunca é commitado** (está no `.gitignore`) —
  só existe localmente e na VPS. `deploy.sh`, `publish-config.sh` e `setup-vps.sh` carregam o `.env`
  com `source` (sem aspas), então `MINIO_ROOT_PASSWORD` precisa ser um token só, sem espaços, `$`,
  crases ou `#` — o alfabeto do `openssl rand -base64 32` já é seguro para isso.
- `ssh`, `scp` e `envsubst` disponíveis na máquina local; Docker Compose e nginx+certbot já
  instalados na VPS.

## Os scripts

- **`setup-vps.sh <usuario@host>`** — roda na máquina local. Valida o `infra/.env` antes de qualquer
  `ssh` (`DOMAIN` e `MINIO_ROOT_PASSWORD` preenchidos, senha diferente do placeholder
  `troque-esta-senha-longa`; `CERTBOT_EMAIL`, se preenchido, precisa parecer um e-mail). Cria
  `/opt/bora-marcar`; copia o `.env` **só se ainda não existir na VPS** (o deploy grava
  `BFF_IMAGE`/`APP_VERSION` nele) e aplica `chmod 600`; sempre copia `docker-compose.yml`,
  `deploy.sh`, `publish-config.sh`, `ci-entry.sh` e `assets/`; sempre instala
  `bora-marcar-cache.conf` em `/etc/nginx/conf.d/`; gera o site
  `/etc/nginx/sites-available/bora-marcar` via `envsubst` **só enquanto não existe
  `/etc/letsencrypt/live/${DOMAIN}`** (depois disso o certbot já acrescentou o bloco 443, que o
  template apagaria); `nginx -t` e reload; roda `certbot --nginx` para o domínio só sem certificado
  — com `-m "${CERTBOT_EMAIL}"` se a variável estiver definida, senão
  `--register-unsafely-without-email` — se o certbot falhar o script sai com erro apontando para o
  DNS. Por fim sobe só `redis minio minio-init` com `--wait`, chama `publish-config.sh` e tenta
  `docker compose pull bff`: se a imagem existir e estiver acessível, sobe o `bff`; senão avisa que
  o `bff` sobe no primeiro deploy do CI.
- **Idempotência:** rodar de novo não desfaz o deploy (o `.env` da VPS é preservado), não apaga o
  bloco TLS do nginx e não pede certificado novo. Para mudar algo no `.env` da VPS, edite
  `/opt/bora-marcar/.env` lá (ou apague-o e rode o setup de novo). **Rode `setup-vps.sh` de novo
  sempre que mudar `docker-compose.yml` ou algum script** — o CI não copia esses arquivos.
- **`deploy.sh <tag>`** — roda na VPS (chamado pelo CI via `ci-entry.sh`). Lê o repositório da
  imagem do `BFF_IMAGE` atual do `.env` e troca só a tag (e `APP_VERSION`) pela informada; faz
  `docker compose pull bff && up -d --wait` e confere `/health` até 10 tentativas, exigindo
  `"status":"ok"` **e** `"version":"<tag>"`.
- **`publish-config.sh`** — roda na VPS. Copia `assets/config/v1/engine.json` para o bucket
  `assets` do MinIO com `Content-Type: application/json` e o mesmo `Cache-Control` servido pelo
  nginx (`public, max-age=300, stale-while-revalidate=86400`).
- **`ci-entry.sh`** — forced command da chave de deploy do CI (abaixo). Lê `$SSH_ORIGINAL_COMMAND` e
  aceita só `deploy sha-<7 hex>` (→ `deploy.sh`), `publish-config` (→ `publish-config.sh`) e
  `receive-assets` (lê do stdin um `tar.gz` com raiz `assets/`, aceita só `assets/config/…` e
  `assets/assets/…`, apenas arquivos e diretórios, exige `assets/config/v1/engine.json` e troca
  `/opt/bora-marcar/assets` por rename); qualquer outra coisa sai com código 1 e mensagem no stderr.
  `BORA_MARCAR_DIR` só serve para testar localmente com uma raiz falsa.

## Chave de deploy restrita

O CI entra na VPS com uma chave dedicada que só executa `ci-entry.sh`. Em `/root/.ssh/authorized_keys`:

```
command="/opt/bora-marcar/ci-entry.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... bora-marcar-ci
```

Secrets do repositório: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (a chave privada dedicada) e
`VPS_KNOWN_HOSTS` (saída de `ssh-keyscan -t ed25519 76.13.230.205`, conferida contra a host key da
VPS — os workflows não usam `StrictHostKeyChecking=no`). Variables: `API_URL` e `ASSETS_URL`.

## Ordem das etapas externas

1. **DuckDNS:** o subdomínio único resolvendo para `76.13.230.205`.
2. **`infra/setup-vps.sh root@76.13.230.205`:** nginx, certificado, `redis`/`minio`/`minio-init` e o
   `engine.json` publicado. O `bff` ainda não sobe (a imagem não existe no GHCR).
3. **Secrets/vars:** gerar a chave dedicada, instalar a linha `command=...` acima no
   `authorized_keys`, gravar `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `API_URL` e
   `ASSETS_URL` no repositório `M4rdine/Bora-marcar-` (privado; já existe, não recriar).
4. **Push em `main`:** o CI roda e dispara o "Deploy BFF", que publica a imagem no GHCR.
5. **O primeiro deploy falha no `pull`:** o pacote do GHCR nasce privado. Torne-o público pela
   interface web (Package settings → Change visibility → Public; não há endpoint de API para isso).
   O repositório em si continua privado — só a imagem precisa ser pública, para a VPS puxar sem
   login.
6. **`gh run rerun <id>`** do "Deploy BFF": agora o `pull` funciona e o smoke confere a versão.

## Rotacionar a senha do MinIO

1. Gerar uma senha nova: `openssl rand -base64 32`.
2. Editar `MINIO_ROOT_PASSWORD` em `infra/.env` (local) e no `.env` da VPS, em
   `/opt/bora-marcar/.env` — editar lá, não copiar o local por cima: o da VPS guarda a tag do
   último deploy (`BFF_IMAGE`/`APP_VERSION`).
3. Recriar os containers para aplicar a env nova: `docker compose --env-file .env up -d --wait`
   (na VPS, dentro de `/opt/bora-marcar`).
4. `mc alias` usado por `publish-config.sh` é recriado a cada execução com as credenciais do
   `.env`, então não precisa de nenhum passo extra além disso.

## Logs

```bash
# na VPS, dentro de /opt/bora-marcar
docker compose logs -f bff      # logs do BFF (pino)
docker compose logs -f minio    # logs do MinIO
docker compose logs -f redis    # logs do Redis
```

Logs de acesso/erro do nginx ficam em `/var/log/nginx/` (`access.log` / `error.log`), como para
qualquer outro site do sistema.

## Por que não há Caddy

A VPS já roda nginx + certbot para outros sites nas portas 80/443; instalar Caddy ao lado exigiria
disputar ou revezar essas portas. Em vez disso, o Compose só publica em `127.0.0.1` e o nginx
existente faz de borda: TLS, roteamento por `location` (domínio único) e `proxy_cache` para os
assets. Ver ADR 0008 (`docs/adr/0008-nginx-existente-em-vez-de-caddy.md`, Task 14) para a decisão
completa.

## O que a Cloudflare acrescentaria

Hoje o `proxy_cache` do nginx já é a borda de cache. Com um domínio próprio na Cloudflare (Task 16,
condicional), dá para colocar `<dominio>` atrás dela em modo proxiado (nuvem laranja) com SSL/TLS
"Full (strict)": Cache Rules dedicadas para `/config/*` (Edge TTL 5 min, respeitando
`stale-while-revalidate`) e `/assets/*` (Edge TTL 1 dia), bypass para o resto (API), e proteção
extra (WAF, DDoS) na frente do nginx da VPS. Sem domínio próprio, isso fica como item de "o que
faria com mais tempo".

## App web de demonstração (`/app/`)

`infra/publish-web.sh root@76.13.230.205` gera o export web do Expo já apontando para a API de
produção (modo `bff`) e o envia para `/opt/bora-marcar/webapp`, servido pelo nginx em
`https://${DOMAIN}/app/`. Os arquivos com hash no nome ganham cache de um ano; o `index.html`
vai com `no-cache` para um deploy novo aparecer na hora. Qualquer rota do cliente cai no
`index.html` (`try_files`), então `/app/day/2026-09-16` funciona.

Web aqui é demonstração, não a entrega: o alvo oficial é Expo Go ou build nativo (spec §2), e
as notificações locais não existem no navegador.
