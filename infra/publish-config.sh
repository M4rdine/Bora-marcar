#!/usr/bin/env bash
# Publica infra/assets/config/v1/engine.json no bucket `assets` com os metadados de cache.
set -euo pipefail
cd "$(dirname "$0")"
set -a
# shellcheck source=/dev/null
source ./.env
set +a
# --entrypoint sh: a imagem do mc tem ENTRYPOINT ["mc"], então sem isso o `sh -c` vira subcomando.
docker run --rm --network bora-marcar_default -v "$PWD/assets:/assets:ro" \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD --entrypoint sh quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z -c '
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null &&
    mc cp --attr "Content-Type=application/json;Cache-Control=public, max-age=300, stale-while-revalidate=86400" \
      /assets/config/v1/engine.json local/assets/config/v1/engine.json'
echo "publicado: /config/v1/engine.json"
