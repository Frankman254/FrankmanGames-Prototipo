# Auditoría de estabilización P0

**Rama:** `fix/p0-estabilizacion`  
**Commit inicial:** `2c3387ce6d25fcce46689e3020af42c5620b4122`  
**Commit final:** pendiente al terminar la operación

## Línea base

- `npm test`: 654/654 pruebas en verde al ejecutarse con acceso a loopback.
  Dentro del sandbox, la única prueba fallida fue la conexión WebSocket local
  (`EACCES 127.0.0.1`); la repetición fuera del aislamiento pasó.
- `npm run typecheck`: verde.
- `npm run build`: verde, con la advertencia preexistente de Vite por el tamaño
  del chunk principal.

## Estado de los errores

| Error | Reproducido | Corregido | Estado |
|---|---:|---:|---|
| P0-01 — desasignación accidental de hechizos | Sí | Sí | Pruebas automáticas en verde; revisión manual Electron pendiente |
| P0-02 — pausa global y menú ESC | Pendiente | No | No iniciado |
| P0-03 — pasos y eventos audiovisuales | Pendiente | No | No iniciado |
| P0-04 — curación innecesaria de mascota | Pendiente | No | No iniciado |
| P0-05 — jerarquía de ventanas y HUD | Pendiente | No | No iniciado |
| P0-06 — clic en la posición actual | Pendiente | No | No iniciado |
| Vegetación en mazmorra | Pendiente | No | Diagnóstico no iniciado |
| Balance y progresión | Pendiente | No aplica | Auditoría no iniciada; no se cambiarán valores |

## P0-01 — desasignación accidental de hechizos

### Comportamiento anterior y causa raíz

`src/ui/menus/dragModel.ts` trataba los destinos `trash` (exterior o terreno) y
`none` (panel no compatible) como una orden
`assignHotbar(index, null)`. El controlador DOM sólo clasificaba el destino; la
mutación accidental se originaba en esa regla pura.

### Cambio y justificación

Un arrastre con origen `hotbar` sólo produce una orden cuando el destino es
otro hueco válido de la barra. Cualquier otro destino devuelve `none`. No se
eliminó ni alteró `assignHotbar(null)`, porque sigue siendo una operación válida
de la sesión para acciones explícitas.

### Archivos modificados

- `src/ui/menus/dragModel.ts`
- `tests/ui/dragModel.test.ts`
- `docs/BITACORA.md`
- `docs/AUDITORIA_ESTABILIZACION_P0.md`

### Pruebas reales

- Focalizadas: 27/27 en
  `tests/ui/dragModel.test.ts`, `tests/rpg/session.test.ts` y
  `tests/ui/saveStore.test.ts`.
- Regresión completa tras el cambio: `npm test` 658/658,
  `npm run typecheck` verde y `npm run build` verde.
- Casos: fuera de la barra, terreno, panel incompatible, mismo hueco, hueco
  ocupado, hueco vacío, cancelación y persistencia tras reorganizar.

### Riesgos y arquitectura futura

El cambio queda en el modelo puro de presentación y no modifica simulación,
identificadores, guardados ni contratos públicos. Para una arquitectura MMORPG,
la UI continúa emitiendo una intención explícita y la sesión conserva la
autoridad para validar cualquier asignación. Riesgo residual: el gesto completo
con puntero no se revisó todavía en Electron.

## Hallazgos de balance

Pendientes. Esta intervención no cambiará fórmulas ni datos de balance.

## Elementos que requieren aprobación del creador

Ninguno derivado de P0-01. Una acción futura para quitar voluntariamente un
hechizo de la barra requeriría un diseño explícito y no forma parte de esta
corrección.
