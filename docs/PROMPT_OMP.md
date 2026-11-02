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
