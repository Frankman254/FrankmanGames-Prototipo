# Auditoría y tareas faltantes — 2026-11-01

## Continuación: ronda de verificación 001

Resultados actuales en agents/COORDINADOR_001.md. Informe OMP revisado:
integración espectral ausente confirmada; corrección pequeña de coordenadas
no finitas probada (689/689 regresión). Prueba real inicial en Electron realizada,
sin certificar aún combate, muerte ni guardado/carga completos.
Encargo OMP 002 en agents/OMP_002_GUARDADO; estado inicial PENDIENTE.
Decisiones y lista de pruebas humanas en docs/ACCIONES_CREADOR.md.
Las verificaciones históricas inferiores se conservan como antecedentes.

## Base y límites

Checkout auditado: master f6c43e5, inicialmente limpio, remoto
Frankman254/FrankmanGames-Prototipo. Trabajo aislado en
audit/2026-11-01-pulido. GitHub compare confirmó que master contiene
fix/p0-estabilizacion d7d3d7c: un commit de merge por delante, cero archivos
diferentes. No se necesita volver a fusionar esa rama.

Se leyó la conversación 6ae811f5-8844-83e8-8f00-be4c2addb0aa y su adjunto
Texto pegado(10).txt. El texto mezcla ideas del usuario con recomendaciones de
ChatGPT: ninguna cifra, narrativa ni mecánica detallada queda ratificada aquí.
La imagen adjunta no se usó como evidencia de comportamiento.
Las referencias hermanas de AGENTS.md no están en este checkout; se consultaron
ALCANCE_SLICE_01.md y la visión v0.4 como contexto, sin inventar decisiones DEC.

## Contraste con evidencia

«Cumplido» significa alcance técnico indicado, no aprobación artística ni QA visual.

| Requisito | Estado | Evidencia / límite |
|---|---|---|
| Estabilización P0 | Cumplido en código e informe previo | f6c43e5 integra d7d3d7c; dragModel, modalPolicy, playerAvatar, pets, windows, world y vegetationView; informe AUDITORIA_ESTABILIZACION_P0.md |
| Movimiento, combate y separación del render | Cumplido como prototipo | src/sim, src/rpg; tests/world.test.ts, tests/combat.test.ts; no certifica MMO |
| Online/cooperativo | Parcial | server/pocServer.ts, transport.ts, tests/server/poc.test.ts; dos bots y snapshots locales, sin mundo RPG multijugador persistente |
| Mapa/coordenadas | Parcial | data/cartography.json ya usa 32 m; src/world/cartography.ts y tests/travelDeath.test.ts; hoja de ruta aún decía 16 m |
| Streaming | Parcial | src/world/streaming.ts calcula conjuntos/deltas; no se encontró integración SectorStream en main/session/world; no equivale a carga real de regiones |
| Cámara | Parcial | src/camera/damping.ts, framing.ts, modes.ts, collision.ts y tests/camera/cameraLogic.test.ts; commit 1738c7b; hoja de ruta decía solo giro/zoom |
| Muerte espectral | Parcial | src/rpg/spectral.ts y tests/travelDeath.test.ts, 1738c7b; no se encontró referencia spectral en main/session/world: falta acreditar integración completa |
| Misiones | Parcial | data/rpg/quests.json y src/rpg/quests.ts; tests/rpg/questChain.test.ts; cadena técnica de prueba, sin aventura Diablicos |
| Arcos | Parcial | darien_bow, cane_crossbow, lookout_crossbow en data/rpg/items.json; bow/crossbow en src/world/look.ts; tests/arrows.test.ts no certifica disponibilidad y sensación del básico con cada arma |
| Mascotas | Parcial | src/rpg/pets.ts: fighter/collector/guardian; PetDef.attack no declara efectos al impacto; curación redundante corregida en 164a3a0 |
| Música | Parcial | src/audio/score.ts, director.ts, localMusic.ts y WAV originales; falta validar selección por región, transiciones y procedencia de cada nueva pieza |
| Balance/progresión | Pendiente de decisión y validación | maxLevel=20 en progression.json frente a zonas hasta 100; auditP0.ts mide escalados; no modificar cifras sin escenario comparable |
| Equipo | Parcial, informe antiguo incorrecto | items.json contiene objetos hasta nivel 99, integrado por 87d49f6; no afirmar que todo el equipo termina en nivel 4. Existencia no prueba acceso por tienda/drop ni equipabilidad con máximo 20 |
| Diablicos, máscara, Panamá Viejo, harpía | Pendiente | no hay evidencia acreditada de contenido jugable; registrar intención, diseñar un vertical pequeño |
| Cinemáticas, temporadas y exclusivos | Pendiente de especificación | cámara/audio reutilizables no constituyen secuenciador; PoC local no constituye calendario de servidor ni economía persistente |

Matiz de contenido: data/rpg/enemies.json ya contiene «Diablico Sucio»
(minion) y «Águila Harpía Real» (darien_harpy, nivel 58). Estos nombres no
acreditan Diablicos Espejos, disfraz ni transporte desbloqueado por misiones.

## Ideas recibidas: intención y decisiones abiertas

EXPRESADO en el adjunto: Diablicos Espejos, Panamá Viejo, máscara que permite
pasar desapercibido, transporte en águila harpía desbloqueado por misiones,
música original, cinemáticas, secretos, casas/interiores/castillos, temporadas,
objetos exclusivos, arcos y mascotas con efectos (oso ralentizador).

PROPUESTA del asistente, POR_VALIDAR: reflejos hostiles frente a guardianes,
nombre y trama de una aventura, detección por proximidad, ruptura por ataque,
vuelo por rutas fijas, recuerdos para repetir cinemáticas, exclusivos cosméticos
y efectos genéricos de mascotas. No son respuestas nuevas a «> R:».

## Trabajo priorizado y aceptación

Orden propuesto para esta ronda, no sustitución de la prioridad histórica del §17.

| ID | Prioridad | Trabajo y criterio verificable |
|---|---|---|
| T01 | P0 | Balance: registrar escenarios nivel igual y +10/+20 con equipo realmente obtenible; separar vida, resistencia y penalización. Comparar TTK, supervivencia y gasto por clase antes de proponer cifras |
| T02 | P0 | Integración: rastrear cámara, cartografía, viaje y spectral desde entrada hasta guardado/render; prueba de sesión y revisión Electron por flujo, sin sobrescribir la ranura del creador |
| T03 | P0 | Documentación: conservar respuestas, corregir fotografías obsoletas y enlazar informe; resolver fuentes hermanas ausentes sin fabricar aprobaciones |
| T04 | P1 | Vertical Panamá Viejo/Diablicos: una zona pequeña, NPC, objetivo y máscara; definir facciones, detección, ruptura, expiración, carga y muerte; pruebas de percepción sin DOM |
| T05 | P1 | Arcos: auditar requisitos, tienda/drop, alcance, básico, proyectil y animación; probar equipar/guardar/cargar; proponer arco temprano sin duplicar tipos existentes |
| T06 | P2 | Mascotas: efectos al impacto configurables y validados, sin if por nombre de oso; probar objetivo, cadencia, inmunidad, expiración y ausencia de duplicación; conservar datos vigentes |
| T07 | P2 | Harpía: desbloqueo idempotente por cadena de misiones, rutas descubiertas y destino válido; probar carga/guardado y repetición de recompensa |
| T08 | P2 | Música/cinemáticas: selección por zona con transiciones, secuencia omisible y accesible; omitir no debe duplicar ni perder recompensas; registrar procedencia |
| T09 | P3 | Geografía/interiores/secretos: plan modular y presupuesto de carga antes de ciudad extensa; demostrar entrada/salida y liberación de recursos |
| T10 | P3 | Temporadas/exclusivos: definir reloj autoritativo, versionado e idempotencia; no introducir poder obligatorio ni economía persistente a partir de la PoC |
| T11 | P2 | Streaming: integrar carga real y presupuesto de sectores por actualización; probar tamaños extremos, fronteras, ida/vuelta y recursos liberados |

## Mejoras realizadas en esta ronda

- Validación de tamaño de sector finito positivo, radio finito no negativo y
  coordenadas finitas antes de recorrer sectores; agrupación vacía también valida.
- Constructor rechaza configuración inválida; update fallido conserva conjunto activo.
- Pruebas de regresión de entradas inválidas y estado conservado.
- Notas conservadoras en cuestionario, README, hoja de ruta y AGENTS.

No cambian datos, fórmulas, guardados ni contratos de combate. Esta validación
no limita aún radios finitos enormes; T11 debe definir un presupuesto operativo.
No se ejecutó QA visual Electron en esta ronda ni se certifican FPS.

## Verificación ejecutada

- Focalizadas: 16/16 (streamingValidation y travelDeath).
- Regresión: 72 archivos, 684/684 pruebas. Primer intento: 683 pasan y
  WebSocket falla con EACCES de loopback; repetición con permiso: todas pasan.
- npm run typecheck: correcto (renderer, Electron y servidor).
- npm run build: correcto; aviso de Vite por chunk principal grande
  (aprox. 6,77 MB minificado), no resuelto en esta ronda.
- npm run balance:audit-p0: correcto, diez casos; conserva máximo 20 y
  multiplicador mínimo de 0,60. Diagnóstico, no validación de diversión.
- git diff --check: correcto. No se modificó data/.

## Encargo acotado para OMP local

Lee AGENTS.md y este informe. En una rama nueva, audita únicamente la integración
del estado espectral: src/rpg/spectral.ts, src/rpg/session.ts, src/sim/world.ts,
src/main.ts y sus pruebas. No implementes todavía una mecánica nueva.
Entrega docs/AUDITORIA_SPECTRAL_OMP.md con una tabla: muerte -> activación ->
restricciones de combate/botín -> Alzador -> guardado/carga -> render.
Para cada paso indica archivo y función reales, o AUSENTE si no existe.
Comprueba con búsquedas los importadores y consumidores; no concluyas integración
solo porque hay una clase o un test unitario. Ejecuta tests/travelDeath.test.ts
y tests/rpg/session.test.ts, reporta comandos, resultados y límites.
No modifiques data, balance, guardados ni código productivo; no hagas push,
merge, reset ni borres trabajo. Criterios: todas las flechas tienen evidencia
reproducible, ausencias explícitas, resultados reales y diff solo del informe.

## Entrega al checkout de escritorio

Los cambios se incorporaron también a este checkout, cuya base es
fix/p0-estabilizacion d7d3d7c (el mismo árbol auditado antes del merge).
Pruebas focalizadas aquí: 16/16. El prompt está en docs/PROMPT_OMP.md.
La creación de rama fue bloqueada por permisos de escritura en .git;
los archivos quedan guardados como cambios locales en la rama existente.
No se creó commit ni se hizo push desde este checkout.
