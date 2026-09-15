#!/usr/bin/env bash
# Forced command da chave de deploy do CI (authorized_keys: command="/opt/bora-marcar/ci-entry.sh",...).
# O sshd põe o comando pedido pelo cliente em SSH_ORIGINAL_COMMAND; só três formas são aceitas:
#   deploy sha-<7 hex>   → deploy.sh sha-<7 hex>
#   publish-config       → publish-config.sh
#   receive-assets       → lê um tar.gz do stdin com raiz assets/ (só config/ e assets/) e troca o diretório
# BORA_MARCAR_DIR existe só para testar localmente; o sshd não repassa essa variável ao cliente.
set -euo pipefail

readonly BASE_DIR="${BORA_MARCAR_DIR:-/opt/bora-marcar}"
readonly MAX_UPLOAD_BYTES=$((10 * 1024 * 1024))
readonly REQUEST="${SSH_ORIGINAL_COMMAND:-}"

deny() {
  echo "ci-entry: $1" >&2
  exit 1
}

# Nomes permitidos no arquivo: assets/, assets/config[/...], assets/assets[/...]; nada de `..`.
valid_entry() {
  local name="$1"
  [[ "$name" =~ ^assets/?$ || "$name" =~ ^assets/(config|assets)(/.*)?$ ]] || return 1
  [[ "/$name/" != *"/../"* && "/$name/" != *"/./"* ]]
}

receive_assets() {
  local archive staged previous name kind line
  # Global de propósito: o trap de EXIT roda depois que a função retornou.
  work="$(mktemp -d "${BASE_DIR}/.assets-upload.XXXXXX")"
  trap 'rm -rf "$work"' EXIT
  archive="$work/upload.tar.gz"
  staged="$work/extract"
  mkdir "$staged"

  head -c "$((MAX_UPLOAD_BYTES + 1))" >"$archive"
  [[ "$(wc -c <"$archive")" -le "$MAX_UPLOAD_BYTES" ]] || deny "arquivo de assets maior que ${MAX_UPLOAD_BYTES} bytes"

  tar -tzf "$archive" >"$work/names" 2>/dev/null || deny "stdin não é um tar.gz válido"
  tar -tvzf "$archive" >"$work/verbose" 2>/dev/null || deny "stdin não é um tar.gz válido"
  [[ -s "$work/names" ]] || deny "tar vazio"

  # Só arquivos regulares e diretórios (nada de links, devices ou fifos).
  while IFS= read -r line; do
    kind="${line:0:1}"
    [[ "$kind" == "-" || "$kind" == "d" ]] || deny "tipo de entrada não permitido no tar: ${line}"
  done <"$work/verbose"
  while IFS= read -r name; do
    valid_entry "$name" || deny "caminho fora de assets/config ou assets/assets: ${name}"
  done <"$work/names"

  tar -xzf "$archive" -C "$staged" --no-same-owner --no-same-permissions
  [[ -f "$staged/assets/config/v1/engine.json" ]] || deny "assets/config/v1/engine.json ausente no tar"
  chmod -R u=rwX,go=rX "$staged/assets"

  # Troca por rename no mesmo sistema de arquivos: a janela sem diretório é de um rename.
  previous="$work/previous"
  if [[ -e "$BASE_DIR/assets" ]]; then mv "$BASE_DIR/assets" "$previous"; fi
  mv "$staged/assets" "$BASE_DIR/assets"
  echo "assets recebidos em ${BASE_DIR}/assets"
}

if [[ "$REQUEST" =~ ^deploy\ (sha-[0-9a-f]{7})$ ]]; then
  exec "$BASE_DIR/deploy.sh" "${BASH_REMATCH[1]}"
elif [[ "$REQUEST" == "publish-config" ]]; then
  exec "$BASE_DIR/publish-config.sh"
elif [[ "$REQUEST" == "receive-assets" ]]; then
  receive_assets
else
  deny "comando não permitido: '${REQUEST}'"
fi
