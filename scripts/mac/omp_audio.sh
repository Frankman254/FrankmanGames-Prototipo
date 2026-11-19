#!/bin/sh
# OMP en modo Audio: perfil «audio» (~/.omp/profiles/audio/agent) con un solo
# MCP, el de ACE-Step Studio, que corre en el PC con Windows (RTX 3080) y solo
# escucha en su 127.0.0.1:8792. Este lanzador lo trae al Mac por un túnel SSH
# sobre Tailscale: nada queda expuesto a la red ni a Internet.
# Modelo: skynet-qwen por Tailscale, 180K de contexto. Nunca el modelo local.
# Uso: scripts/mac/omp_audio.sh ["encargo"]
#   FMG_AUDIO_HOST   alias SSH del PC con Windows (por defecto: pc-audio)
#   FMG_AUDIO_SIN_ESTUDIO=1  arrancar aunque el estudio no responda (solo posproceso)
# Guía: docs/GUIA_AUDIO_MCP.md
set -eu
M=skynet-qwen/Qwen3.8-Flash-Next
HOST=${FMG_AUDIO_HOST:-pc-audio}
URL=http://127.0.0.1:8792/mcp

up() { curl -s -o /dev/null -m 3 -w '%{http_code}' "$URL" | grep -qv '^000$'; }

if ! up; then
  if lsof -nP -iTCP:8792 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "omp_audio: algo ya ocupa el 8792 del Mac y no responde como el estudio" >&2
  else
    echo "omp_audio: abriendo túnel 127.0.0.1:8792 → $HOST:127.0.0.1:8792" >&2
    ssh -f -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
      -L 127.0.0.1:8792:127.0.0.1:8792 "$HOST" || true
    sleep 1
  fi
fi
if ! up; then
  echo "omp_audio: ACE-Step Studio no responde en $URL." >&2
  echo "  En Windows: abre el estudio (el MCP solo vive con la ventana abierta)." >&2
  echo "  Comprueba: ssh $HOST y scripts/windows/check_audio_ia.ps1" >&2
  [ "${FMG_AUDIO_SIN_ESTUDIO:-0}" = 1 ] || exit 1
fi

exec omp --profile audio \
  --model "$M" --plan "$M" --slow "$M" --smol "$M" \
  --thinking medium \
  --no-lsp \
  --append-system-prompt 'Modo Audio. Lee AGENTS.md y docs/GUIA_AUDIO_MCP.md antes de generar. Usa las herramientas MCP de ACE-Step Studio (xd://mcp__acestep_*): writing_guide antes de escribir el caption, song_create con [Instrumental], studio_wait para esperar, library_song_get para guardar ajustes y semilla. Nunca nombres artistas, juegos ni obras en un caption, ni uses audio de otro juego como referencia. Trae cada pieza al Mac con scp a work/omp-audio-<tarea>/, pásale scripts/audio/validar_audio_generado.py y escribe su ficha (prompt, semilla, ajustes, modelo, tiempo). Una pieza rechazada por el validador no se entrega. No toques assets/, data/, src/ ni Git: el coordinador integra.' \
  "$@"
