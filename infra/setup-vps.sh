#!/usr/bin/env bash
# Uso: infra/setup-vps.sh root@76.13.230.205   — exige infra/.env preenchido (API_DOMAIN, ASSETS_DOMAIN,
# CERTBOT_EMAIL, MINIO_*). Idempotente: não sobrescreve o .env da VPS (o deploy grava a tag nele), só
# instala o site do nginx antes de existir certificado e só chama o certbot sem certificado.
# Na primeira execução sobe só redis/minio/minio-init; o bff sobe quando a imagem existir no GHCR.
# Os valores locais (já validados abaixo) são expandidos de propósito no cliente antes do ssh.
# shellcheck disable=SC2029,SC2087
set -euo pipefail
HOST="${1:?informe usuario@host}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REMOTE_DIR=/opt/melhor-hora
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

for var in API_DOMAIN ASSETS_DOMAIN CERTBOT_EMAIL MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  [[ -n "${!var:-}" ]] || fail "defina ${var} no infra/.env"
done
for var in API_DOMAIN ASSETS_DOMAIN; do
  [[ "${!var}" =~ ^[A-Za-z0-9.-]+$ ]] || fail "${var} não parece um nome de host: ${!var}"
done
[[ "$CERTBOT_EMAIL" =~ ^[^[:space:]\"\'\$\`]+@[^[:space:]\"\'\$\`]+$ ]] || fail "CERTBOT_EMAIL inválido: ${CERTBOT_EMAIL}"
[[ "$MINIO_ROOT_PASSWORD" != "$PLACEHOLDER_PASSWORD" ]] ||
  fail "troque MINIO_ROOT_PASSWORD no infra/.env (ex.: openssl rand -base64 32)"

# Responde yes/no sem confundir "não existe" com falha de conexão (ssh sai 255 e o set -e aborta).
remote_exists() {
  ssh "$HOST" "if [ -e '$1' ]; then echo yes; else echo no; fi"
}

ssh "$HOST" "mkdir -p ${REMOTE_DIR}/assets /var/cache/nginx/melhor-hora"

if [[ "$(remote_exists "${REMOTE_DIR}/.env")" == no ]]; then
  scp "$HERE/.env" "$HOST:${REMOTE_DIR}/.env"
else
  echo "mantido: ${REMOTE_DIR}/.env já existe na VPS (edite lá ou apague para recopiar)"
fi
scp "$HERE/docker-compose.yml" "$HERE/deploy.sh" "$HERE/publish-config.sh" "$HERE/ci-entry.sh" \
  "$HOST:${REMOTE_DIR}/"
scp -r "$HERE/assets/." "$HOST:${REMOTE_DIR}/assets/"
scp "$HERE/nginx/melhor-hora-cache.conf" "$HOST:/etc/nginx/conf.d/melhor-hora-cache.conf"

# Depois do certbot o site ganha os blocos 443; reescrever o template apagaria esses blocos.
if [[ "$(remote_exists "/etc/letsencrypt/live/${API_DOMAIN}")" == no ]]; then
  # shellcheck disable=SC2016 # a lista de variáveis do envsubst é literal
  envsubst '${API_DOMAIN} ${ASSETS_DOMAIN}' <"$HERE/nginx/melhor-hora.conf.template" |
    ssh "$HOST" 'cat > /etc/nginx/sites-available/melhor-hora'
else
  echo "mantido: site do nginx já tem certificado (/etc/letsencrypt/live/${API_DOMAIN})"
fi

ssh "$HOST" bash -s <<EOSSH
set -euo pipefail
chmod 600 ${REMOTE_DIR}/.env
chmod +x ${REMOTE_DIR}/*.sh
ln -sf /etc/nginx/sites-available/melhor-hora /etc/nginx/sites-enabled/melhor-hora
nginx -t
systemctl reload nginx
if [ ! -d "/etc/letsencrypt/live/${API_DOMAIN}" ]; then
  if ! certbot --nginx --non-interactive --agree-tos --redirect -m "${CERTBOT_EMAIL}" \
    -d "${API_DOMAIN}" -d "${ASSETS_DOMAIN}"; then
    echo "certbot falhou: confira no DuckDNS se ${API_DOMAIN} e ${ASSETS_DOMAIN} já resolvem para esta VPS e se a porta 80 responde" >&2
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
echo "API:    https://${API_DOMAIN}/health"
echo "Assets: https://${ASSETS_DOMAIN}/config/v1/engine.json"
