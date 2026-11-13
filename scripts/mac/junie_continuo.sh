#!/usr/bin/env bash
# Ejecuta Junie en bucle, en modo no interactivo, con una tarea de la cola por vuelta.
# En modo interactivo Junie cierra el turno al acabar algo y espera respuesta;
# este bucle la relanza hasta vaciar la cola, agotar el tiempo o el número de vueltas.
#
# Uso (desde la raíz del repo):
#   scripts/mac/junie_continuo.sh [cola] [reglas]
# Variables opcionales:
#   HORAS=10       tiempo máximo total
#   VUELTAS=30     máximo de ejecuciones de Junie
#   PASOS=400      --max-steps por ejecución
#   MODELO=...     --model (vacío = el configurado en Junie)
#   ESFUERZO=high  --effort (low|medium|high)
set -u
cd "$(dirname "$0")/../.."

COLA="${1:-work/prompts-noche/COLA_JUNIE.md}"
REGLAS="${2:-work/prompts-noche/JUNIE.md}"
HORAS="${HORAS:-10}"
VUELTAS="${VUELTAS:-30}"
PASOS="${PASOS:-400}"
ESFUERZO="${ESFUERZO:-high}"
LOGS="work/prompts-noche/logs"
mkdir -p "$LOGS"

[ -f "$COLA" ] || { echo "No existe la cola: $COLA"; exit 1; }
[ -f "$REGLAS" ] || { echo "No existen las reglas: $REGLAS"; exit 1; }

fin=$(( $(date +%s) + HORAS * 3600 ))
abiertas() { grep -c '^- \[ \]' "$COLA" || true; }
primera() { grep -m1 '^- \[ \]' "$COLA" | cut -c7- | cut -c1-80; }

extra=()
[ -n "${MODELO:-}" ] && extra+=(--model="$MODELO")
[ -n "$ESFUERZO" ] && extra+=(--effort="$ESFUERZO")

vuelta=0
intentos=0
anterior=""
while [ "$(abiertas)" -gt 0 ] && [ "$vuelta" -lt "$VUELTAS" ] && [ "$(date +%s)" -lt "$fin" ]; do
  vuelta=$((vuelta + 1))
  tarea="$(primera)"
  if [ "$tarea" = "$anterior" ]; then intentos=$((intentos + 1)); else intentos=1; anterior="$tarea"; fi
  if [ "$intentos" -gt 2 ]; then
    # Dos vueltas sin cerrar la misma tarea: se marca bloqueada y se sigue.
    linea=$(grep -n -m1 '^- \[ \]' "$COLA" | cut -d: -f1)
    sed -i '' "${linea}s/^- \[ \]/- [!]/; ${linea}s/\$/ — BLOQUEADA: dos ejecuciones sin cerrarla (ver logs)/" "$COLA"
    echo "[$(date +%H:%M)] Bloqueada tras 2 intentos: $tarea"
    continue
  fi
  log="$LOGS/$(date +%Y%m%d-%H%M%S)-v${vuelta}.log"
  echo "[$(date +%H:%M)] Vuelta $vuelta (intento $intentos): $tarea  → $log"
  junie --skip-update-check --act-as-interactive --max-steps="$PASOS" ${extra[@]+"${extra[@]}"} \
    --task="Trabajas sin supervisión: nadie responde preguntas. Lee y cumple $REGLAS (reglas del proyecto y del turno). Después abre $COLA y haz SOLO la primera tarea marcada '- [ ]', hasta terminarla y verificarla (pruebas y, si se ve, captura de Electron en work/). Haz commit solo de tus rutas y git push origin master. Al final cambia esa casilla a '- [x] … — <commit> — <evidencia>' o a '- [!] … — BLOQUEADA: <motivo>' y guarda $COLA. No toques las demás casillas ni empieces otra tarea." \
    >"$log" 2>&1
  echo "[$(date +%H:%M)] Fin vuelta $vuelta (salida $?). Abiertas: $(abiertas)"
done

echo "Terminado: $(abiertas) tareas abiertas, $vuelta vueltas. Cola: $COLA"
