#!/usr/bin/env bash
# Sobe o app numa janela do tamanho de um telefone, sem barra de navegador, para
# compartilhar a tela durante a apresentação.
#
# Existe porque esta máquina tem só as Command Line Tools, não o Xcode completo: não há
# simulador iOS nem emulador Android disponível. A alternativa de instalar Xcode são ~10 GB.
#
# Para mostrar o app NATIVO de verdade, espelhe o aparelho (veja o README desta pasta).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$RAIZ/apps/mobile/dist"
PORTA="${PORTA:-8099}"
LARGURA=${LARGURA:-402}
ALTURA=${ALTURA:-880}

if [ "${PULAR_BUILD:-}" != "1" ]; then
  echo "→ Gerando o pacote web (use PULAR_BUILD=1 para reaproveitar o anterior)…"
  rm -rf "$DIST"
  (cd "$RAIZ/apps/mobile" && npx expo export --platform web >/dev/null)
fi

[ -f "$DIST/index.html" ] || { echo "✗ Build não encontrado em $DIST"; exit 1; }

lsof -ti:"$PORTA" | xargs kill -9 2>/dev/null || true

echo "→ Servindo em http://localhost:$PORTA"
node "$RAIZ/scripts/servir-dist.mjs" "$DIST" "$PORTA" &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null || true' EXIT

until curl -sf -o /dev/null "http://localhost:$PORTA/"; do sleep 0.3; done

CHROME="/Applications/Google Chrome.app"
if [ -d "$CHROME" ]; then
  echo "→ Abrindo janela de ${LARGURA}x${ALTURA}"
  open -na "$CHROME" --args \
    --app="http://localhost:$PORTA/" \
    --window-size="$LARGURA,$ALTURA" \
    --window-position=80,60 \
    --user-data-dir="/tmp/bora-marcar-apresentacao"
else
  echo "→ Chrome não encontrado; abra http://localhost:$PORTA/ no navegador"
  open "http://localhost:$PORTA/"
fi

echo
echo "Pronto. Ctrl+C aqui encerra o servidor."
wait $SERVIDOR
