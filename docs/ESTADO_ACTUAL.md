# Estado actual y contraste con el código

Revisión: 2026-11-02. Base auditada `ac150a2`, después de las entregas `4488d2c` y `26d9d92`. Este documento sustituye fotografías antiguas como referencia de estado. Los siguientes pendientes viven solo en [TAREAS](TAREAS.md).

## Comportamiento acreditado y límites

| Sistema | Estado técnico | Evidencia principal | Límite real |
|---|---|---|---|
| Escritorio 3D | Implementado como prototipo | `electron/`, `src/main.ts`, `src/render/arenaView.ts`, `package.json` | Revisión visual de esta ronda no ejecutada; no certifica FPS ni diversión |
| Simulación y combate | Implementados y probados | `src/sim/world.ts`, `src/rpg/character.ts`, `tests/combatV2.test.ts`, `tests/combateTactico.test.ts` | Balance entre zonas y nivel máximo sin cerrar |
| Progresión | XP, niveles, puntos y desbloqueos integrados | `src/rpg/progression.ts`, `Character.gainXp/refreshLevel`, `tests/rpg/progression.test.ts` | Máximo 20 y 3 puntos libres por nivel; crecimiento depende de cada clase |
| Configuración inicial nueva | Parcial: valores almacenados no equivalen a mecánica | `data/rpg/progression.json`, `parseRpgContent` en `src/rpg/content.ts` | `configInicial` no se parsea ni aplica: +5 característica/+20 vida/+30 capacidad no están implementados |
| Peso de mochila | Implementado | `Inventory` en `src/rpg/items.ts`, `tests/rpg/inventoryWeight.test.ts`, `tests/rpg/inventoryIntegration.test.ts` | Solo mochila; capacidad actual 1500, peso de cada uno de los 123 objetos explícito. `defaultItemWeight=1000` no reescala esos objetos; el parser usa1 si falta weight |
| Banco y comercio | Implementados con límites | `src/rpg/bank.ts`, `src/scenes/bankScene.ts`, `tests/rpg/bankIntegration.test.ts`, `tests/bankScene.test.ts` | Banco por personaje; cargar desde dentro reaparece fuera. Falta asegurar UID compartidos entre banco/mochila/equipo y QA de interfaz |
| Interfaz de mochila | Rejilla fluida y comercio sin equipo | `src/ui/menus/inventory.ts`, `bankPanel.ts`, `itemContextMenu.ts` | La cantidad de celdas sigue partiendo de `inv.slots`; no acredita relleno calculado por alto/ancho. Recetas solo informa ausencia |
| Muerte espectral | Integrada con persistencia y Alzadores | `src/rpg/session.ts`, `src/sim/world.ts`, `src/render/resurrectorView.ts`, `tests/rpg/spectralIntegration.test.ts` | QA completo muerte→Alzador en Electron pendiente; Pulso mantiene weakened al agotarse |
| Pulso | Regeneración moderada | `data/rpg/energy.json`, `src/rpg/energy.ts` | 2.4 por minuto y 1.6/s de descanso; balance propuesto |
| Mapa/cámara/zonas | Implementados parcialmente frente al producto final | `src/ui/map/`, `src/camera/`, `src/world/`, `tests/camera/`, `tests/mapLogic.test.ts` | Minimapa y mapa grande son canvas HTML dentro de DOM; no son planos Babylon. Streaming calcula sectores, no acredita carga/liberación de regiones |
| Distancia | Ballesta y destino de proyectil probados | `tests/rangedPresentation.test.ts`, `tests/arrows.test.ts`, `data/rpg/items.json` | Acceso temprano a arco y armas sobre nivel20 pendientes de balance/obtención |
| Mascotas/misiones/audio | Sistemas básicos implementados | `src/rpg/pets.ts`, `quests.ts`, `src/audio/`, `tests/rpg/questChain.test.ts` | Efectos de mascotas, harpía por misiones, cinemáticas y contenido narrativo no acreditados |
| Online | Prueba local separada | `server/`, `tests/server/poc.test.ts` | No hay MMO, economía persistente ni intercambio entre jugadores en el RPG |

## Qué dejó OMP y qué se corrigió en esta revisión

- `f1a2e60` incorporó skills y configuración de datos; no se deshacen esas aportaciones ni se cambia balance aquí.
- `96435ab` añadió seis pruebas de banco. Sus casos llamados «UID repetidos» no construían realmente ese escenario; duplicaban pruebas existentes y fallaban comprobación de tipos. Se retira ese archivo redundante; continúan las pruebas de banco e integración útiles.
- `ac150a2` sustituyó las nueve pruebas existentes de progresión y botín por quince comprobaciones débiles, incluida una rama de `configInicial` que el parser no entrega. Se recupera la cobertura de comportamiento de `4488d2c` (XP real, subir varios niveles, límite, asignar/reiniciar puntos, desbloqueos y botín).
- Los marcados «TAREA COMPLETA» de `f51189d` no prueban integridad de UID ni crecimiento de carga por nivel. Ambos vuelven a pendientes explícitos.
- Se retiran del árbol los prompts vencidos y la propuesta fallida equipment/roll. Las entregas aceptadas y handoffs útiles se conservan en histórico; el material retirado sigue en Git hasta `ac150a2`.
- Tres borradores no seguidos (`changelog.md`, `BUG_CANVAS_2D.md`, `DEC_CANVAS_2D_EXCEPCION.md`) afirmaban aprobación inexistente y render 3D no implementado. Se respaldan fuera del checkout antes de retirarlos. DEC-2026-004 trata recurso+enfriamiento, no prohibición de Canvas 2D; no se crea DEC-2026-006.

## Verificación de esta revisión

Entrada: `npm test`766/766,83 archivos; `npm run typecheck` falló por los tests nuevos de OMP. Esto demuestra que Vitest en verde no acredita compilación.

Salida: `npm test`754/754, 82 archivos; `npm run build` correcto, incluyendo typecheck de juego/Electron/servidor. Aviso existente de Vite por bundle grande. La reducción del número de tests corresponde a recuperar 9 pruebas reales y retirar 21 comprobaciones débiles/redundantes; no se desactivan casos para ocultar fallos.

`npm run docs:check`: 20 Markdown mantenidos con enlaces locales correctos; también se comprobó que rechaza un enlace roto temporal. `npm run balance -- --zones --zone-seeds 1`: correcto; genera `work/balance/EQUILIBRIO_ZONAS.md`, no sobrescribe histórico ni llena docs. Esto comprueba la herramienta, no certifica balance.

Orden: 51 Markdown en la raíz de docs → 11; 49 documentos reubicados; 24 residuos documentales versionados y un generador temporal retirados. agents pasa de 27 archivos a un README de protocolo. Skills, respuestas originales, procedencia y cifras de progression.json intactas. Solo se actualizan referencias de documentación en comentarios/metadatos.

Respaldo de los tres borradores no seguidos: `C:/Users/frank/Documents/Codex/work/frankman-doc-cleanup-2026-11-02/borradores-no-seguidos.zip`, comprobado byte por byte antes de retirarlos. No se ejecutó QA visual Electron en esta ronda.
