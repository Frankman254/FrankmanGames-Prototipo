# Ronda 004 — muerte espectral activa

2026-11-02, master. Petición del creador: activar muerte espectral y reducir
un poco la regeneración de Pulso.

## Comportamiento incorporado

Cada caída procesada por la sesión activa la forma espectral y descuenta
Pulso una sola vez. El botón de muerte continúa junto a la Piedra Pintada
como espectro; restaurar vida interna o reconstruir el mundo no quita el estado.
Esc no descarta la pantalla de muerte y no deja al personaje sin continuación.

El espectro puede moverse, con el multiplicador de velocidad de death.json.
No combate, recoge botín, pesca, comercia ni usa consumibles; las mascotas
quedan suspendidas y los enemigos lo ignoran. Se excluye de placaje y separación.
La tubería de daño/estados bloquea acciones hostiles desde/hacia el espectro.

Llegar al radio de un Alzador en el exterior recupera la forma viva y las
reservas de vida/recurso. El agotamiento de Pulso permanece si corresponde.
La muerte y carga espectral desde una mazmorra continúan en el exterior.
Se conserva el estado en la sesión, guardado y carga sin cambiar versión.

HUD y guía muestran estado y Alzador cercano; hay botón de navegación,
tinte azul del personaje y marcadores procedurales. El botín queda congelado
en espectro, se reabre al resucitar si fue ocultado, y se guarda/carga sin
volver a conceder la XP ya ganada.

## Ajuste de Pulso

Se eligió una reducción moderada del 20 %, ajustable en data/rpg/energy.json:

| Recuperación | Antes | Ahora |
|---|---:|---:|
| Pasiva por minuto | 3 | 2,4 |
| Descanso por segundo | 2 | 1,6 |

No regenera mientras el personaje es espectral. Coste de muerte, consumibles,
tope y penalización actual weakened sin cambios.

## Evidencia y límites

Dos revisiones de un subagente integrado detectaron entradas de combate,
riesgo de pérdida de botín y Escape sin continuación; se corrigieron.
No se confundió ese subagente con el proceso OMP externo.

tests/rpg/spectralIntegration.test.ts: nueve casos, incluido mapa real,
camino a los tres Alzadores y llegada dentro del radio; muerte idempotente,
movimiento, IA, daño, estados, mascotas, botín, pesca, recuperación,
guardado antiguo, guardado espectral y recompensa pendiente sin duplicación.

Validación final: npm test 76 archivos, 729/729; typecheck y build correctos.
Persiste aviso de tamaño del chunk principal. git diff --check correcto.
Electron arrancó con perfil separado; no se completó manualmente muerte ->
Alzador por errores de control/foco/tamaño de ventana. No se certifica esa
revisión visual como realizada; queda en la lista humana.

Las skills añadidas en .agents/ y el diagnóstico de organización del creador
se conservan fuera del commit de esta tarea. Se aplicó domain-modeling para
crear GLOSSARY.md, sin editar los archivos de la skill.
