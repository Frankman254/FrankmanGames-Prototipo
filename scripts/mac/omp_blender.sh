#!/bin/sh
# Perfil Blender remoto: evita modelos locales y reduce el prompt base de OMP.
set -eu

exec omp \
  --model skynet-qwen/Qwen3.8-Flash-Next \
  --plan skynet-qwen/Qwen3.8-Flash-Next \
  --slow skynet-qwen/Qwen3.8-Flash-Next \
  --smol skynet-qwen/Qwen3.8-Flash-Next \
  --thinking low \
  --no-lsp \
  --tools=read,bash,edit,write \
  --system-prompt 'Opera Blender mediante MCP. Lee AGENTS.md y, para modelado, docs/GUIA_BLENDER_MCP.md. Trabaja por hitos cortos: referencia, silueta, forma, detalle, PBR, render comparativo, corrección y validación. Persiste cada hito antes de continuar. No declares calidad sin revisar renders.' \
  "$@"
