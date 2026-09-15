#!/usr/bin/env bash
# Uso: infra/setup-vps.sh root@76.13.230.205   — exige infra/.env preenchido (API_DOMAIN, ASSETS_DOMAIN, MINIO_*).
set -euo pipefail
HOST="${1:?informe usuario@host}"
HERE="$(cd "$(dirname "$0")" && pwd)"
set -a; source "$HERE/.env"; set +a
ssh "$HOST" 'mkdir -p /opt/melhor-hora/assets /var/cache/nginx/melhor-hora'
scp "$HERE/docker-compose.yml" "$HERE/.env" "$HERE/deploy.sh" "$HERE/publish-config.sh" "$HOST:/opt/melhor-hora/"
scp -r "$HERE/assets/." "$HOST:/opt/melhor-hora/assets/"
scp "$HERE/nginx/melhor-hora-cache.conf" "$HOST:/etc/nginx/conf.d/melhor-hora-cache.conf"
envsubst '${API_DOMAIN} ${ASSETS_DOMAIN}' < "$HERE/nginx/melhor-hora.conf.template" | ssh "$HOST" 'cat > /etc/nginx/sites-available/melhor-hora'
ssh "$HOST" bash -s <<EOSSH
set -euo pipefail
chmod +x /opt/melhor-hora/*.sh
ln -sf /etc/nginx/sites-available/melhor-hora /etc/nginx/sites-enabled/melhor-hora
nginx -t && systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --redirect -m "${CERTBOT_EMAIL:?defina CERTBOT_EMAIL no infra/.env}" \
  -d "${API_DOMAIN}" -d "${ASSETS_DOMAIN}" || echo "certbot falhou: confira se os domínios já apontam para esta VPS"
cd /opt/melhor-hora && docker compose --env-file .env up -d --wait && ./publish-config.sh
EOSSH
echo "API:    https://${API_DOMAIN}/health"
echo "Assets: https://${ASSETS_DOMAIN}/config/v1/engine.json"
