# Arquitectura actual

Mapa de implementación inspeccionado2026-11-02, no propuesta de refactor.

| Lugar | Responsabilidad | Relación verificable |
|---|---|---|
| `electron/` | Ventana de escritorio y proceso principal | Destino Windows; juego en renderer, sin cargar URLs remotas en producción |
| `src/main.ts` | Composición de sesión, mundo, entrada, vistas e interiores | Coordina CryptScene/BankScene y enlaza sesión al mundo; no constituye servidor |
| `src/data/index.ts`, `src/rpg/content.ts` | Carga y validación de datos | JSON→RpgContent; campos no parseados como configInicial no llegan al juego |
| `src/rpg/contracts.ts` | Definiciones de contenido, vistas, comandos y guardado | Contrato usado por lógica y menús |
| `src/rpg/character.ts` | Personaje, stats, equipo, inventario, banco y reconstrucción de guardado | Comparte el mismo personaje con GameSession y World; no son dos estados independientes |
| `src/rpg/items.ts`, `bank.ts` | Creación de copias, mochila por peso, equipo/sets y almacén personal | Identidad por UID; las reglas de fusión/restauración requieren C01/C02 |
| `src/rpg/session.ts` | Comandos de interfaz, misiones, comercio, Pulso y botín pendiente | Delega movimiento/efectos al mundo enlazado y expone vistas para menús |
| `src/sim/` | Paso fijo, navegación, encuentros, combate y entidades | Lógica independiente del DOM/Babylon; World usa Character compartido |
| `src/scenes/` | Transiciones de cripta y banco | Construyen mundos de interior conservando personaje; main coordina vistas/guardado |
| `src/render/`, `src/camera/` | Babylon, representación e interacción de cámara | Consumen simulación; no confundir presencia visual con reglas RPG |
| `src/ui/menus/`, `src/ui/map/` | DOM/CSS, mochila/comercio/banco, mapa y minimapa | Mapas con canvas HTML real; no se migraron a mallas Babylon |
| `src/world/` | Terreno, zonas, cartografía, viaje y sectores | Streaming es selección de sectores; carga regional real pendiente |
| `src/audio/` | Música y efectos | Assets y límites de distribución en PROCEDENCIA.md |
| `server/` | PoC autoritativa separada en loopback | No integra todavía economía/mundo persistente del RPG |
| `tests/`, `scripts/balance/` | Regresión y mediciones | Vitest no sustituye typecheck, build ni prueba visual |

Datos vigentes: `data/`. Borradores de diseño: [propuestas](propuestas/README.md), sin carga automática. Assets: [procedencia](../PROCEDENCIA.md). Reglas de juego y clean-room: [AGENTS](../AGENTS.md).

No se ha decidido extraer equipment/roll: el intento previo fue incompatible. Antes de una extracción futura debe demostrarse conservación de comportamiento a través de los contratos existentes; no es una tarea de esta limpieza.
