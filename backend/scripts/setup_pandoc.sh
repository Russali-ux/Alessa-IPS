#!/bin/bash
# Descarga el binario estático oficial de Pandoc (linux-amd64) y lo coloca
# en backend/bin/pandoc para que quede incluido en el bundle de la función
# de Vercel. No se versiona en git por su tamaño (~160MB descomprimido);
# se descarga en cada build.
#
# Uso local: normalmente NO necesitas correr esto -- en tu máquina usas el
# Pandoc que ya tienes instalado en el sistema (el código hace fallback
# automático al comando 'pandoc' del PATH si no encuentra el binario
# empaquetado en backend/bin/).

set -e

PANDOC_VERSION="3.10.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$BACKEND_DIR/bin"

mkdir -p "$BIN_DIR"

echo "Descargando Pandoc $PANDOC_VERSION (linux-amd64)..."
curl -sL -o /tmp/pandoc.tar.gz \
  "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz"

echo "Extrayendo..."
mkdir -p /tmp/pandoc_extract
tar xzf /tmp/pandoc.tar.gz -C /tmp/pandoc_extract --strip-components=1

cp /tmp/pandoc_extract/bin/pandoc "$BIN_DIR/pandoc"
chmod +x "$BIN_DIR/pandoc"

echo "Pandoc listo en $BIN_DIR/pandoc"
"$BIN_DIR/pandoc" --version | head -1