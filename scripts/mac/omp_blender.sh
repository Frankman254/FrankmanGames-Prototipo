#!/bin/sh
# OMP en modo Blender: perfil «blender» (~/.omp/profiles/blender/agent) con el
# catálogo completo de Blender MCP (~240 herramientas, esculpido incluido).
# Modelo: skynet-qwen por Tailscale, 180K de contexto. Nunca el modelo local.
# Uso: scripts/mac/omp_blender.sh [@referencia.png] ["encargo"]
set -eu
M=skynet-qwen/Qwen3.8-Flash-Next
exec omp --profile blender \
  --model "$M" --plan "$M" --slow "$M" --smol "$M" \
  --thinking medium \
  --no-lsp \
  --append-system-prompt 'Modo Blender. Lee AGENTS.md y docs/GUIA_BLENDER_MCP.md antes de modelar. Usa las herramientas MCP de Blender (esculpido, multires, remesh, retopología, bake, PBR) en vez de escribir todo en Python. Trabaja por hitos: referencia, silueta, forma, escultura, detalle, PBR, render comparativo contra la referencia, corrección y validación. Guarda cada hito antes de seguir. Pruebas y renders en work/omp-<tarea>/. No declares calidad sin mirar los renders.' \
  "$@"
