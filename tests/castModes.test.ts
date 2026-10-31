import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { CastInput } from '../src/sim/castModes';
import { Rng } from '../src/sim/rng';
import { needsAim, World } from '../src/sim/world';
import { DEFAULT_OPTIONS, normalizeOptions } from '../src/ui/menus/saveStore';
import { prepareSpells } from './levels';

describe('modos de lanzamiento (lógica pura)', () => {
  it('por defecto es «con indicador»: pulsar apunta, soltar lanza', () => {
    const c = new CastInput();
    expect(c.mode).toBe('indicator');
    expect(c.press(2, true)).toEqual({ kind: 'aim', slot: 2 });
    expect(c.aiming).toBe(2);
    expect(c.release(5)).toEqual({ kind: 'none' }); // otra tecla
    expect(c.release(2)).toEqual({ kind: 'cast', slot: 2 });
    expect(c.aiming).toBeNull();
    expect(c.release(2)).toEqual({ kind: 'none' });
  });

  it('con indicador: Esc o clic derecho cancelan y al soltar ya no lanza', () => {
    const c = new CastInput('indicator');
    c.press(0, true);
    expect(c.cancel()).toEqual({ kind: 'cancel', slot: 0 });
    expect(c.release(0)).toEqual({ kind: 'none' });
    expect(c.cancel()).toEqual({ kind: 'none' });
  });

  it('con indicador: pulsar otro hueco cambia de hechizo', () => {
    const c = new CastInput('indicator');
    c.press(0, true);
    expect(c.press(3, true)).toEqual({ kind: 'aim', slot: 3 });
    expect(c.release(0)).toEqual({ kind: 'none' });
    expect(c.release(3)).toEqual({ kind: 'cast', slot: 3 });
  });

  it('«al pulsar» lanza en el acto, sin apuntar', () => {
    const c = new CastInput('press');
    expect(c.press(1, true)).toEqual({ kind: 'cast', slot: 1 });
    expect(c.aiming).toBeNull();
    expect(c.release(1)).toEqual({ kind: 'none' });
  });

  it('«pulsar y clic»: la tecla apunta; el clic (o la misma tecla) confirma; soltar no hace nada', () => {
    const c = new CastInput('pressClick');
    expect(c.press(4, true)).toEqual({ kind: 'aim', slot: 4 });
    expect(c.release(4)).toEqual({ kind: 'none' });
    expect(c.aiming).toBe(4);
    expect(c.confirm()).toEqual({ kind: 'cast', slot: 4 });
    expect(c.confirm()).toEqual({ kind: 'none' });
    c.press(4, true);
    expect(c.press(4, true)).toEqual({ kind: 'cast', slot: 4 });
  });

  it('los hechizos sobre el lanzador salen al pulsar en todos los modos', () => {
    for (const m of ['indicator', 'press', 'pressClick'] as const) {
      const c = new CastInput(m);
      expect(c.press(0, false)).toEqual({ kind: 'cast', slot: 0 });
      expect(c.aiming).toBeNull();
    }
  });

  it('cambiar de modo cancela lo apuntado', () => {
    const c = new CastInput('indicator');
    c.press(0, true);
    c.setMode('press');
    expect(c.aiming).toBeNull();
  });
});

describe('modos de lanzamiento: opción y mundo', () => {
  it('la opción vive en GameOptions, por defecto «con indicador», y se valida al cargar', () => {
    expect(DEFAULT_OPTIONS.castMode).toBe('indicator');
    expect(normalizeOptions({ castMode: 'pressClick' }).castMode).toBe('pressClick');
    expect(normalizeOptions({ castMode: 'teletransporte' }).castMode).toBe('indicator');
  });

  it('con la puerta puesta, la tecla no lanza: la interfaz apunta y lanza al soltar', () => {
    const data = loadGameData();
    const w = new World(data, { encounter: false, character: Character.create(data.rpg, 'storm_weaver', 'x', new Rng(1)) });
    w.player.pos = { x: 10, y: 10 };
    // Lanza glacial y Espejo de tormenta se aprenden al subir de nivel y van solos a la barra.
    prepareSpells(w.character, 'glacial_lance', 'storm_mirror');
    const input = new CastInput('indicator');
    w.slotGate = (i, s) => input.press(i, needsAim(s)).kind === 'aim';
    w.aimProvider = () => ({ point: { x: 14, y: 10 }, targetId: null });
    const lance = w.character.spellbook.hotbar.indexOf('glacial_lance');
    expect(w.castSlot(lance)).toBeNull();
    expect(w.drainEvents().some((e) => e.type === 'cast')).toBe(false);
    expect(input.aiming).toBe(lance);
    expect(input.release(lance).kind).toBe('cast');
    expect(w.commandCastSlot(lance, { point: { x: 14, y: 10 }, targetId: null })).toBeNull();
    expect(w.drainEvents().some((e) => e.type === 'cast' && e.ability === 'glacial_lance')).toBe(true);
    // Un hechizo sobre uno mismo sale al pulsar; uno en enfriamiento se bloquea antes de apuntar.
    const mirror = w.character.spellbook.hotbar.indexOf('storm_mirror');
    w.player.gcd = 0;
    expect(w.castSlot(mirror)).toBeNull();
    expect(w.drainEvents().some((e) => e.type === 'cast' && e.ability === 'storm_mirror')).toBe(true);
    w.player.gcd = 0;
    expect(w.castSlot(lance)).toBe('cooldown');
    expect(input.aiming).toBeNull();
  });
});
