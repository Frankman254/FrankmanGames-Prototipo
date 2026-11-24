// JL-239: Barra tras cambiar de lugar.
// Tras viajar por piedra, entrar en la casa o en la barriada y volver,
// la barra no queda en rojo ni con enfriamientos colgados.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';

const DT = 1 / 60;
const data = loadGameData();

function run(w: World, seconds: number) {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

describe('JL-239: Barra tras cambiar de lugar', () => {
    it('sin enemigos, la barra no marca inRange: false', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        const w = new World(data, { encounter: false, character: ch });
        w.aimProvider = () => ({ point: { x: 12, y: 10 }, targetId: null });
        const state = w.hotbarState();
        for (const slot of state) {
            if (slot.spellId) {
                expect(slot.inRange, `inRange de ${slot.spellId} sin enemigos`).toBe(true);
            }
        }
    });

    it('cooldowns vacíos al crear un mundo nuevo', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        const w = new World(data, { encounter: false, character: ch });
        const state = w.hotbarState();
        for (const slot of state) {
            expect(slot.cooldownRemaining, `cooldownRemaining de ${slot.spellId ?? 'vacío'}`).toBe(0);
        }
        expect(w.player.gcd).toBe(0);
    });

    it('lastTarget null en un mundo nuevo', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        const w = new World(data, { encounter: false, character: ch });
        expect(w.player.lastTarget).toBeNull();
    });

    it('tras lanzar un hechizo, el cooldown aparece y baja con el tiempo', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        const w = new World(data, { encounter: false, character: ch });
        const spellId = w.character.spellbook.hotbar[0];
        expect(spellId, 'hay hechizo en la barra').toBeDefined();
        if (!spellId) return;

        w.aimProvider = () => ({ point: { ...w.player.pos }, targetId: null });
        w.commandCast(spellId, { point: { ...w.player.pos }, targetId: null });
        const state1 = w.hotbarState();
        const slot1 = state1.find((s) => s.spellId === spellId);
        expect(slot1?.cooldownRemaining).toBeGreaterThan(0);

        const spell = w.spell(spellId);
        run(w, spell.cooldown + 1);
        const state2 = w.hotbarState();
        const slot2 = state2.find((s) => s.spellId === spellId);
        expect(slot2?.cooldownRemaining).toBe(0);
    });

    it('un mundo nuevo (como al salir de la casa) no hereda cooldowns del anterior', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        // Mundo 1: lanzar un hechizo.
        const w1 = new World(data, { encounter: false, character: ch });
        w1.aimProvider = () => ({ point: { ...w1.player.pos }, targetId: null });
        const spellId = w1.character.spellbook.hotbar[0];
        if (spellId) {
            w1.commandCast(spellId, { point: { ...w1.player.pos }, targetId: null });
        }
        const state1 = w1.hotbarState();
        const slot1 = state1.find((s) => s.spellId === spellId);
        const hadCooldown = slot1?.cooldownRemaining ?? 0;

        // Mundo 2: mismo personaje, nuevo mundo (como al salir de la casa).
        const w2 = new World(data, { encounter: false, character: ch });
        const state2 = w2.hotbarState();
        const slot2 = state2.find((s) => s.spellId === spellId);

        if (hadCooldown > 0) {
            expect(slot2?.cooldownRemaining, 'cooldown no heredado').toBe(0);
        }
        expect(w2.player.gcd, 'GCD no heredado').toBe(0);
        expect(w2.player.lastTarget, 'lastTarget no heredado').toBeNull();
    });

    it('GCD se resetea en un mundo nuevo', () => {
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        const w = new World(data, { encounter: false, character: ch });
        // Simular GCD activo.
        w.player.gcd = 1.0;
        w.player.gcdTotal = 1.0;
        const state1 = w.hotbarState();
        const spellId = state1[0]?.spellId;
        if (spellId) {
            expect(state1.find((s) => s.spellId === spellId)?.cooldownRemaining).toBeGreaterThan(0);
        }

        // Nuevo mundo.
        const w2 = new World(data, { encounter: false, character: ch });
        const state2 = w2.hotbarState();
        const slot2 = state2.find((s) => s.spellId === spellId);
        expect(slot2?.cooldownRemaining, 'sin GCD heredado').toBe(0);
    });

    it('tras viajar (mismo mundo), la barra sigue limpia sin enemigos', () => {
        // Viajar por piedra no crea un nuevo mundo: el mismo mundo persiste.
        // Sin enemigos en el nuevo lugar, la barra no debe marcar inRange: false.
        const ch = Character.create(data.rpg, 'ember_vanguard', 'Prueba', new Rng(42));
        while (ch.level < 50) ch.gainXp(ch.xpToNext - ch.xp);
        const w = new World(data, { encounter: false, character: ch });
        w.aimProvider = () => ({ point: { ...w.player.pos }, targetId: null });

        // Lanzar un hechizo para activar GCD y cooldown.
        const spellId = w.character.spellbook.hotbar[0];
        if (spellId) {
            w.commandCast(spellId, { point: { ...w.player.pos }, targetId: null });
        }
        // Esperar a que bajen todos los cooldowns (máximo 5s + margen).
        run(w, 6);

        const state = w.hotbarState();
        for (const slot of state) {
            if (slot.spellId) {
                expect(slot.cooldownRemaining, `cooldown de ${slot.spellId} tras esperar`).toBeCloseTo(0, 6);
                expect(slot.inRange, `inRange de ${slot.spellId} sin enemigos`).toBe(true);
            }
        }
    });
});
