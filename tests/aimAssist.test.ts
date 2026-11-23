// Creador (2026-11-20): «es problemático apuntar con hechizos de un solo objetivo (...) tener como
// una preselección dependiendo de la posición del cursor» y «los hechizos están marcados en rojo
// cuando no debería». Fijación suave: sin enemigo bajo el cursor, el vivo más cercano al cursor
// (≤ AIM_ASSIST_RADIUS); fuera de alcance, el personaje se acerca andando y lanza.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { AIM_ASSIST_RADIUS, World } from '../src/sim/world';
import { prepareSpells } from './levels';

const DT = 1 / 60;
const data = loadGameData();

function arena(): World {
    const character = Character.create(data.rpg, 'storm_weaver', 'Prueba', new Rng(1));
    prepareSpells(character, 'spark');
    const w = new World(data, { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return w;
}
function still(w: World, x: number, y: number) {
    const e = w.spawnEnemy('melee', { x, y });
    e.state = 'stagger';
    e.stateTime = -1e9;
    e.health = 1e6;
    return e;
}
const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });
const hitsOn = (ev: GameEvent[], id: number) => ev.filter((e) => e.type === 'damage' && e.targetId === id).length;
function run(w: World, s: number): GameEvent[] {
    for (let i = 0; i < Math.round(s / DT); i++) w.tick(DT);
    return w.drainEvents();
}

describe('apuntado flexible', () => {
    it('sin enemigo bajo el cursor toma el más cercano al cursor dentro del imán', () => {
        const w = arena();
        const s = w.spell('spark');
        const near = still(w, 13, 10);
        still(w, 13, 14);
        expect(w.targetFor(s, aim(13.8, 10.6))).toBe(near.id);
        expect(w.commandCast('spark', aim(13.8, 10.6))).toBeNull();
        expect(hitsOn(run(w, 1.5), near.id)).toBeGreaterThan(0);
    });

    it('lejos de todo enemigo no inventa objetivo (y sin último atacado, «Sin objetivo»)', () => {
        const w = arena();
        still(w, 13, 10);
        const far = 13 + AIM_ASSIST_RADIUS + 2;
        expect(w.targetFor(w.spell('spark'), aim(far, 10))).toBeNull();
        expect(w.commandCast('spark', aim(far, 10))).toBe('target');
    });

    it('la barra no marca en rojo un hechizo de un blanco cuando aún no hay blanco', () => {
        const w = arena();
        w.aimProvider = () => aim(30, 30);
        const i = w.character.spellbook.hotbar.indexOf('spark');
        expect(i).toBeGreaterThanOrEqual(0);
        expect(w.hotbarState()[i]!.inRange).toBe(true);
        // Con un blanco real fuera de alcance, sí.
        const e = still(w, 10 + w.spell('spark').range + 5, 10);
        w.aimProvider = () => aim(e.pos.x, e.pos.y, e.id);
        expect(w.hotbarState()[i]!.inRange).toBe(false);
    });

    // Creador (2026-11-23): «algunos salen en rojo y se resetean después de lanzar otro hechizo».
    // El último atacado (fallback al lanzar) no cuenta como blanco apuntado para la barra.
    it('la barra no marca en rojo por el último atacado si el cursor no apunta a nadie', () => {
        const w = arena();
        const i = w.character.spellbook.hotbar.indexOf('spark');
        const old = still(w, 13, 10);
        expect(w.commandCast('spark', aim(old.pos.x, old.pos.y, old.id))).toBeNull();
        run(w, 1.5);
        expect(w.player.lastTarget).toBe(old.id);
        old.pos = { x: 10 + w.spell('spark').range + 8, y: 10 };
        w.aimProvider = () => aim(10, 30);
        expect(w.hotbarState()[i]!.inRange).toBe(true);
        // El cursor sobre ese mismo enemigo lejano sí lo marca.
        w.aimProvider = () => aim(old.pos.x, old.pos.y, old.id);
        expect(w.hotbarState()[i]!.inRange).toBe(false);
    });

    it('fuera de alcance, con approachToCast, se acerca andando y lanza', () => {
        const w = arena();
        w.approachToCast = true;
        const e = still(w, 10 + w.spell('spark').range + 4, 10);
        expect(w.commandCast('spark', aim(e.pos.x, e.pos.y, e.id))).toBeNull();
        const ev = run(w, 4);
        expect(hitsOn(ev, e.id)).toBeGreaterThan(0);
        expect(w.player.pos.x).toBeGreaterThan(11);
    });

    it('moverse cancela el lanzamiento pendiente', () => {
        const w = arena();
        w.approachToCast = true;
        const e = still(w, 10 + w.spell('spark').range + 6, 10);
        expect(w.commandCast('spark', aim(e.pos.x, e.pos.y, e.id))).toBeNull();
        run(w, 0.2);
        w.commandMove({ x: 10, y: 14 });
        expect(hitsOn(run(w, 4), e.id)).toBe(0);
    });
});
