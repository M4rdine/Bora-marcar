#!/usr/bin/env bash
# Publica o app web estático em https://${DOMAIN}/app/ (nginx serve /opt/bora-marcar/webapp).
# Uso: infra/publish-web.sh root@76.13.230.205
# O build embute as URLs da API, então roda em modo bff contra a produção. Web é alvo de demo,
# não de entrega (spec §2): o alvo oficial é Expo Go / build nativo.
set -euo pipefail
HOST="${1:?informe usuario@host}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
REMOTE_DIR=/opt/bora-marcar
set -a
# shellcheck source=/dev/null
source "$HERE/.env"
set +a
: "${DOMAIN:?defina DOMAIN no infra/.env}"

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

EXPO_PUBLIC_API_MODE=bff \
  EXPO_PUBLIC_BFF_URL="https://${DOMAIN}" \
  EXPO_PUBLIC_ASSETS_URL="https://${DOMAIN}" \
  EXPO_NO_TELEMETRY=1 \
  pnpm --dir "$REPO_ROOT" --filter mobile exec expo export --platform web --output-dir "$OUT/web"

# Troca por rename: a janela sem diretório é a de um mv.
tar -czf - -C "$OUT/web" . | ssh "$HOST" "
  set -e
  rm -rf ${REMOTE_DIR}/webapp.new && mkdir -p ${REMOTE_DIR}/webapp.new
  tar -xzf - -C ${REMOTE_DIR}/webapp.new
  rm -rf ${REMOTE_DIR}/webapp && mv ${REMOTE_DIR}/webapp.new ${REMOTE_DIR}/webapp
  chmod -R u=rwX,go=rX ${REMOTE_DIR}/webapp"
echo "publicado: https://${DOMAIN}/app/"
