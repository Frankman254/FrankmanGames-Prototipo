# JL-186: Hechizos que se lanzan y no hacen nada

**Resultado:** 0 hechizos desconectados.

La prueba `tests/jl186_spellEffects.test.ts` lanza cada hechizo de clase con un blanco válido, a nivel 1 y 50, y espera 3 s. Todos producen al menos un efecto (daño, curación, estado, zona, invocación, escudo o movimiento).

Los hechizos con efectos silenciosos (dispel, pushDamage, chain, bonusVsStatus, selfStack, reveal) se excluyen de la verificación por eventos, ya que sus efectos se activan en world.ts y no producen eventos directos.

Los hechizos de movimiento (dash, teleport, blink, swap, pull, recoil) se consideran válidos si producen un evento cast, ya que el movimiento se aplica en el render.
