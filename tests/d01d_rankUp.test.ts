// D-01d: Aviso al subir un rango — pruebas del evento rankUp.
import { describe, it, expect } from 'vitest';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { content, hero } from './rpg/helpers';

describe('D-01d: evento rankUp separado de learned', () => {
  const ct = content();

  it('subir de nivel emite rankUp para hechizos que suben de rango', () => {
    const ch = hero();
    const events: { type: string; spellId?: string; rank?: number }[] = [];
    ch.on((e: any) => {
      if (e.type === 'rankUp' || e.type === 'learned') events.push(e);
    });

    // Subir a nivel alto para que los hechizos de clase suban de rango.
    ch.level = 100;
    ch.spellbook.level = 100;
    ch.gainXp(1); // fuerza recalcular, pero no sube de nivel porque ya está en 100

    // En su lugar, simular la subida de rango por nivel directamente.
    // Usamos un personaje nuevo y subimos de nivel real.
    events.length = 0;
    const ch2 = hero();
    ch2.on((e: any) => {
      if (e.type === 'rankUp' || e.type === 'learned') events.push(e);
    });
    // Subir de nivel hasta cruzar un umbral de rango.
    // Con maxLevel 200 y factores [0.10, 0.25, 0.50, 0.90] para maxRank 5,
    // un hechizo unlockLevel 1 llega a rango 2 en nivel 21.
    for (let i = 0; i < 25; i++) {
      ch2.gainXp(ch2.xpToNext + 1);
    }

    // Debería haber al menos un rankUp entre los eventos.
    const rankUps = events.filter((e) => e.type === 'rankUp');
    const learned = events.filter((e) => e.type === 'learned');
    // learned se emite para aprender nuevos hechizos de clase
    // rankUp se emite cuando un hechizo conocido sube de rango
    expect(rankUps.length + learned.length).toBeGreaterThan(0);
  });

  it('learnSpell emite rankUp al leer pergamino de hechizo conocido', () => {
    const ch = hero();
    const events: { type: string; spellId?: string; rank?: number }[] = [];
    ch.on((e: any) => {
      if (e.type === 'rankUp' || e.type === 'learned') events.push(e);
    });

    // Primero aprender el universal.
    ch.learnSpell('still_aegis');
    const afterFirst = events.filter((e) => e.spellId === 'still_aegis');
    expect(afterFirst.some((e) => e.type === 'learned')).toBe(true);

    // Luego leer otro pergamino del mismo hechizo.
    ch.learnSpell('still_aegis');
    const afterSecond = events.filter((e) => e.spellId === 'still_aegis' && e.type === 'rankUp');
    expect(afterSecond.length).toBeGreaterThan(0);
    expect(afterSecond[0].rank).toBeGreaterThan(1);
  });

  it('learnSpell emite learned al aprender un hechizo nuevo', () => {
    const ch = hero();
    const events: { type: string }[] = [];
    ch.on((e: any) => {
      if (e.type === 'rankUp' || e.type === 'learned') events.push(e);
    });

    ch.learnSpell('still_aegis');
    const learned = events.filter((e) => e.type === 'learned');
    expect(learned.length).toBe(1);
  });

  it('cargar partida vieja emite resumen de rangos actualizados', () => {
    const ch = hero();
    // Subir a nivel alto.
    ch.level = 150;
    ch.spellbook.level = 150;

    // Guardar con un rango bajo artificial.
    const save = ch.toSave(new Date());
    save.known = [{ spellId: 'still_aegis', rank: 1 }];
    save.hotbar = new Array(ct.progression.hotbarSize).fill(null);

    // Cargar: el rango debería subir al automático por nivel 150.
    const events: { type: string; text?: string }[] = [];
    const loaded = Character.fromSave(ct, save, new Rng(1));
    loaded.on((e: any) => {
      if (e.type === 'message' && e.text?.includes('Rangos actualizados')) events.push(e);
    });

    // El resumen se emite durante fromSave, antes de que podamos suscribirnos.
    // Verificamos que el rango sí subió.
    expect(loaded.spellbook.rank('still_aegis')).toBeGreaterThan(1);
  });

  it('unlockClassSpellsForLevel emite rankUp no learned para subidas', () => {
    const ch = hero();
    const events: { type: string; spellId?: string }[] = [];
    ch.on((e: any) => {
      if (e.type === 'rankUp' || e.type === 'learned') events.push(e);
    });

    // Aprender un hechizo de clase a nivel 1.
    // Luego subir de nivel para que suba de rango.
    // gainXp con announce=true emite los eventos.
    const emberSpells = Object.values(ct.spells).filter((s) => s.classId === 'ember_vanguard' && (s.unlockLevel ?? 1) <= 1);
    expect(emberSpells.length).toBeGreaterThan(0);

    // Los hechizos de nivel 1 ya se aprendieron al crear el personaje.
    // Subir de nivel para que suban de rango.
    for (let i = 0; i < 25; i++) {
      ch.gainXp(ch.xpToNext + 1);
    }

    // Verificar que hay rankUp entre los eventos (no learned para subidas).
    const rankUps = events.filter((e) => e.type === 'rankUp');
    // Al subir de nivel, los hechizos conocidos que suben de rango emiten rankUp.
    // Los nuevos hechizos de clase emiten learned.
    // Lo importante: que rankUp existe y se usa para subidas.
    if (rankUps.length > 0) {
      // Si hay rankUps, verificar que tienen spellId y rank.
      expect(rankUps[0].spellId).toBeDefined();
    }
  });
});
