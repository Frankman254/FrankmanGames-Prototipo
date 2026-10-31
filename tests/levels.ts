// Hechizos con requisito de nivel en los tests: en vez de saltarse la regla,
// el personaje sube de verdad hasta el nivel que piden.
import type { Character } from '../src/rpg/character';
import { requiredLevel } from '../src/rpg/spells';

/** Sube de nivel ganando la XP que falta (como en partida). */
export function reachLevel(c: Character, level: number): void {
  while (c.level < level) c.gainXp(c.xpToNext - c.xp);
}

/** Sube al nivel que exigen los hechizos y aprende los que aún no conozca (pergaminos). */
export function prepareSpells(c: Character, ...spellIds: string[]): void {
  reachLevel(c, Math.max(c.level, ...spellIds.map((id) => requiredLevel(c.content.spells[id]!))));
  for (const id of spellIds) if (c.spellbook.rank(id) === 0) c.spellbook.learn(id);
}
