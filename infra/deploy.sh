#!/usr/bin/env bash
# Uso: deploy.sh <tag da imagem>   — troca só a tag de BFF_IMAGE no .env, puxa, sobe e confere /health
# (status ok e version igual à tag). O repositório da imagem vem do BFF_IMAGE atual do .env.
set -euo pipefail
cd "$(dirname "$0")"
TAG="${1:?informe a tag da imagem (SHA)}"
[[ "$TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { echo "tag inválida: ${TAG}" >&2; exit 1; }

CURRENT="$(sed -n 's/^BFF_IMAGE=//p' .env | tail -n 1)"
[[ -n "$CURRENT" ]] || { echo "BFF_IMAGE ausente no .env" >&2; exit 1; }
REPOSITORY="${CURRENT%@*}"                      # descarta @sha256:... se houver
if [[ "${REPOSITORY##*/}" == *:* ]]; then        # a tag só pode estar no último segmento (host:porta fica)
  REPOSITORY="${REPOSITORY%:*}"
fi
IMAGE="${REPOSITORY}:${TAG}"

sed -i.bak "s#^BFF_IMAGE=.*#BFF_IMAGE=${IMAGE}#; s#^APP_VERSION=.*#APP_VERSION=${TAG}#" .env && rm -f .env.bak
docker compose --env-file .env pull bff
docker compose --env-file .env up -d --wait
for _ in $(seq 1 10); do
  if HEALTH="$(curl -fsS http://127.0.0.1:8180/health)" &&
    grep -q '"status":"ok"' <<<"$HEALTH" && grep -q "\"version\":\"${TAG}\"" <<<"$HEALTH"; then
    echo "bff ok (${IMAGE})"
    exit 0
  fi
  sleep 3
done
echo "bff não respondeu em /health com version=${TAG}" >&2
docker compose --env-file .env logs --tail=50 bff >&2
exit 1
