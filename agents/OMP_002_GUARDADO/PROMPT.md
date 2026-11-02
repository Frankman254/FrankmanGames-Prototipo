# OMP 002 — campo opcional espectral en almacenamiento

Trabaja en FrankmanGames-Prototipo. Lee AGENTS.md, src/rpg/spectral.ts,
src/rpg/contracts.ts, src/ui/menus/saveStore.ts y sus tests.
Revisa git status; usa copia/worktree aislado a partir del commit entregado por
el coordinador. No cambies de rama en un checkout compartido ni incluyas trabajo ajeno.

Objetivo único: preparar el almacenamiento de un futuro campo opcional
spectral en SaveData. Todavía NO activar muerte espectral ni integrarla en sesión.

Archivos productivos permitidos: src/rpg/contracts.ts y
src/ui/menus/saveStore.ts. Puedes añadir un test específico en tests/ui/.
No modifiques spectral.ts, sesión, mundo, render, data ni balance.

Implementa:
1. spectral?: SpectralSaveData en SaveData, usando import type.
2. migrateSave conserva una copia independiente de un spectral válido.
   Válido: objeto no array, active boolean, deaths entero seguro no negativo.
   Copia solo active y deaths. Un spectral ausente sigue ausente.
3. Un spectral inválido se descarta sin perder el resto del guardado.
   La normalización debe correr incluso si place ya era válido.
4. Pruebas reales con un SaveData válido: antiguo sin campo, estado activo e
   inactivo, ida/vuelta JSON a través de SaveStore, copia sin alias, deaths
   negativo/fraccionario/no seguro, active de tipo incorrecto, null y array.

Criterios: version continúa en 1; no perder inventario, equipo, energy ni place;
no activar ninguna regla; no afirmar persistencia de GameSession, aún pendiente.
Ejecuta npm test -- tests/ui/saveStore.test.ts tests/guardadoPresets.test.ts
y el test nuevo, además de npm run typecheck. Reporta el resultado real.

En agents/OMP_002_GUARDADO/ escribe STATUS.md como EN_CURSO al empezar.
Al terminar deja RESULTADO.md (base SHA, rama, archivos/funciones, comandos,
conteos, límites) y cambios.patch con todo tu diff, incluidos tests nuevos.
Si falla una prueba, marca FALLIDO; si falta una dependencia imprescindible,
BLOQUEADO. Solo marca COMPLETADO cuando pasen todos los criterios.
Corrige en tu informe el dato anterior: death.json tiene Alzadores en
(136,120), (180,60), (174,174), con radio 3; travelDeath tiene dos pruebas
espectrales de seis totales. No son seis pruebas espectrales.
No hagas push, merge, reset, borrados ni commits de archivos ajenos.
