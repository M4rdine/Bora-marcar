#!/usr/bin/env bash
# Uso: infra/setup-vps.sh root@76.13.230.205   — exige infra/.env preenchido (DOMAIN, MINIO_*).
# CERTBOT_EMAIL é opcional: a VPS já tem conta ACME registrada, então o certbot reaproveita; se
# ficar vazio, o certbot roda sem `-m` (--register-unsafely-without-email). Idempotente: não
# sobrescreve o .env da VPS (o deploy grava a tag nele), só instala o site do nginx antes de
# existir certificado e só chama o certbot sem certificado.
# Na primeira execução sobe só redis/minio/minio-init; o bff sobe quando a imagem existir no GHCR.
# Os valores locais (já validados abaixo) são expandidos de propósito no cliente antes do ssh.
# shellcheck disable=SC2029,SC2087
set -euo pipefail
HOST="${1:?informe usuario@host}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REMOTE_DIR=/opt/bora-marcar
PLACEHOLDER_PASSWORD=troque-esta-senha-longa

fail() {
  echo "setup-vps: $*" >&2
  exit 1
}

[[ -f "$HERE/.env" ]] || fail "infra/.env não existe — copie infra/.env.example e preencha"
set -a
# shellcheck source=/dev/null
source "$HERE/.env"
set +a

for var in DOMAIN MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  [[ -n "${!var:-}" ]] || fail "defina ${var} no infra/.env"
done
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || fail "DOMAIN não parece um nome de host: ${DOMAIN}"
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  [[ "$CERTBOT_EMAIL" =~ ^[^[:space:]\"\'\$\`]+@[^[:space:]\"\'\$\`]+$ ]] || fail "CERTBOT_EMAIL inválido: ${CERTBOT_EMAIL}"
fi
[[ "$MINIO_ROOT_PASSWORD" != "$PLACEHOLDER_PASSWORD" ]] ||
  fail "troque MINIO_ROOT_PASSWORD no infra/.env (ex.: openssl rand -base64 32)"

# Responde yes/no sem confundir "não existe" com falha de conexão (ssh sai 255 e o set -e aborta).
remote_exists() {
  ssh "$HOST" "if [ -e '$1' ]; then echo yes; else echo no; fi"
}

ssh "$HOST" "mkdir -p ${REMOTE_DIR}/assets /var/cache/nginx/bora-marcar"

if [[ "$(remote_exists "${REMOTE_DIR}/.env")" == no ]]; then
  scp "$HERE/.env" "$HOST:${REMOTE_DIR}/.env"
else
  echo "mantido: ${REMOTE_DIR}/.env já existe na VPS (edite lá ou apague para recopiar)"
fi
scp "$HERE/docker-compose.yml" "$HERE/deploy.sh" "$HERE/publish-config.sh" "$HERE/ci-entry.sh" \
  "$HOST:${REMOTE_DIR}/"
scp -r "$HERE/assets/." "$HOST:${REMOTE_DIR}/assets/"
scp "$HERE/nginx/bora-marcar-cache.conf" "$HOST:/etc/nginx/conf.d/bora-marcar-cache.conf"

# Depois do certbot o site ganha o bloco 443; reescrever o template apagaria esse bloco.
if [[ "$(remote_exists "/etc/letsencrypt/live/${DOMAIN}")" == no ]]; then
  # shellcheck disable=SC2016 # a lista de variáveis do envsubst é literal
  envsubst '${DOMAIN}' <"$HERE/nginx/bora-marcar.conf.template" |
    ssh "$HOST" 'cat > /etc/nginx/sites-available/bora-marcar'
else
  echo "mantido: site do nginx já tem certificado (/etc/letsencrypt/live/${DOMAIN})"
fi

ssh "$HOST" bash -s <<EOSSH
set -euo pipefail
chmod 600 ${REMOTE_DIR}/.env
chmod +x ${REMOTE_DIR}/*.sh
ln -sf /etc/nginx/sites-available/bora-marcar /etc/nginx/sites-enabled/bora-marcar
nginx -t
systemctl reload nginx
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  CERTBOT_OK=0
  if [ -n "${CERTBOT_EMAIL:-}" ]; then
    certbot --nginx --non-interactive --agree-tos --redirect -m "${CERTBOT_EMAIL}" -d "${DOMAIN}" || CERTBOT_OK=1
  else
    certbot --nginx --non-interactive --agree-tos --redirect --register-unsafely-without-email -d "${DOMAIN}" || CERTBOT_OK=1
  fi
  if [ "\$CERTBOT_OK" -ne 0 ]; then
    echo "certbot falhou: confira no DuckDNS se ${DOMAIN} já resolve para esta VPS e se a porta 80 responde" >&2
    exit 1
  fi
fi
cd ${REMOTE_DIR}
docker compose --env-file .env up -d --wait redis minio minio-init
./publish-config.sh
if docker compose --env-file .env pull bff; then
  docker compose --env-file .env up -d --wait bff
else
  echo "bff sobe no primeiro deploy do CI"
fi
EOSSH
echo "API e assets: https://${DOMAIN}/health"
