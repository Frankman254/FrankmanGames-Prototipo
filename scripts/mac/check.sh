#!/bin/sh
# Diagnóstico de lectura; ejecutar desde cualquier carpeta con sh scripts/mac/check.sh.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
if [ "$(uname -s)" != Darwin ]; then
  echo 'Este diagnóstico debe ejecutarse en macOS.' >&2
  exit 1
fi
echo "Repositorio: $ROOT"
echo "Arquitectura del equipo: $(uname -m)"
if command -v node >/dev/null 2>&1; then
  node -p '"Node " + process.version + " / " + process.platform + " / " + process.arch'
else
  echo 'Pendiente: instalar Node.'
fi
if command -v uvx >/dev/null 2>&1; then
  command -v uvx
else
  echo 'Pendiente: instalar uv y localizar uvx.'
fi
BLENDER=${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}
if [ -x "$BLENDER" ]; then
  echo "Ejecutable Blender encontrado: $BLENDER (no iniciado)"
else
  echo 'Pendiente: instalar Blender o indicar BLENDER_BIN con su ruta absoluta.'
fi
if command -v lsof >/dev/null 2>&1; then
  lsof -nP -iTCP:9876 -sTCP:LISTEN || echo 'No se detectó listener accesible en 9876.'
fi
echo 'Este diagnóstico no acredita conexión MCP ni funcionamiento del juego.'
