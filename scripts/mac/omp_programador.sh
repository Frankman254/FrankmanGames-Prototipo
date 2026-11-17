#!/bin/sh
# OMP en modo programador: perfil por defecto, sin Blender MCP, con LSP.
# Modelo: skynet-qwen por Tailscale, 180K de contexto. Nunca el modelo local.
# Uso: scripts/mac/omp_programador.sh ["encargo"]
set -eu
M=skynet-qwen/Qwen3.8-Flash-Next
exec omp \
  --model "$M" --plan "$M" --slow "$M" --smol "$M" \
  --thinking low \
  "$@"
