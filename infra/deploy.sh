#!/usr/bin/env bash
# Uso: deploy.sh <tag da imagem>   — troca a tag, puxa, sobe e confere /health.
set -euo pipefail
cd "$(dirname "$0")"
TAG="${1:?informe a tag da imagem (SHA)}"
IMAGE="ghcr.io/techmardine/melhor-hora-bff:${TAG}"
sed -i "s#^BFF_IMAGE=.*#BFF_IMAGE=${IMAGE}#" .env
sed -i "s#^APP_VERSION=.*#APP_VERSION=${TAG}#" .env
docker compose --env-file .env pull bff
docker compose --env-file .env up -d --wait
for i in $(seq 1 10); do
  if curl -fsS http://127.0.0.1:8180/health | grep -q '"status":"ok"'; then echo "bff ok (${TAG})"; exit 0; fi
  sleep 3
done
echo "bff não respondeu em /health" >&2; docker compose --env-file .env logs --tail=50 bff >&2; exit 1
