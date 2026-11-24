// JL-238: Hechizos montado — medición de qué se puede lanzar con montura de tierra
// y voladora (en el suelo y en vuelo). Solo mide; no cambia código del juego.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { grantDevMount } from '../src/rpg/devMount';
import { CAST_BLOCK_TEXT } from '../src/sim/combat';
import { World } from '../src/sim/world';

const data = loadGameData();

/** World con montura voladora de desarrollo equipada. */
function withFlyingMount(): World {
    const w = new World(data, { encounter: false });
    grantDevMount(w.character);
    return w;
}

/** World con montura de tierra (mount_mule) equipada. */
function withGroundMount(): World {
    const w = new World(data, { encounter: false });
    // Da la montura al personaje y la equipa (mismo patrón que grantDevMount).
    w.character.give('mount_mule', 1);
    const inst = w.character.inventory.slots.find((s) => s?.itemId === 'mount_mule');
    if (inst) w.character.equip(inst.uid, 'mount');
    return w;
}

/** World sin montura. */
function noMount(): World {
    return new World(data, { encounter: false });
}

/** Primer hechizo en la barra del personaje (si existe). */
function firstHotbarSpell(w: World): string | null {
    return w.character.spellbook.hotbar.find((id): id is string => id !== null) ?? null;
}

describe('JL-238: hechizos montado', () => {
    describe('sin montura', () => {
        it('los hechizos de la barra no están bloqueados por vuelo', () => {
            const w = noMount();
            expect(w.player.flight).toBeFalsy();
            const block = w.commandCastSlot(0, { point: w.player.pos, targetId: null });
            expect(block).not.toBe('flying');
        });
    });

    describe('con montura de tierra', () => {
        it('montura de tierra equipada: no se puede volar', () => {
            const w = withGroundMount();
            expect(w.canFly()).toBe(false);
            expect(w.player.flight).toBeFalsy();
        });

        it('montura de tierra: los hechizos no están bloqueados por vuelo', () => {
            const w = withGroundMount();
            const block = w.commandCastSlot(0, { point: w.player.pos, targetId: null });
            expect(block).not.toBe('flying');
        });

        it('montura de tierra: toggleFlight no despega', () => {
            const w = withGroundMount();
            expect(w.toggleFlight()).toBe(false);
            expect(w.player.flight).toBeFalsy();
        });
    });

    describe('con montura voladora en el suelo', () => {
        it('montura voladora equipada pero sin volar: hechizos no bloqueados', () => {
            const w = withFlyingMount();
            expect(w.canFly()).toBe(true);
            expect(w.player.flight).toBeFalsy();
            // Sin presionar F21, no vuela: los hechizos funcionan.
            const block = w.commandCastSlot(0, { point: w.player.pos, targetId: null });
            expect(block).not.toBe('flying');
        });

        it('montura voladora en el suelo: commandCast no devuelve flying', () => {
            const w = withFlyingMount();
            const spellId = firstHotbarSpell(w);
            if (spellId) {
                const block = w.commandCast(spellId, { point: w.player.pos, targetId: null });
                expect(block).not.toBe('flying');
            }
        });
    });

    describe('con montura voladora en vuelo (F21)', () => {
        it('al despegar, todos los hechizos de la barra devuelven flying', () => {
            const w = withFlyingMount();
            w.toggleFlight();
            expect(w.player.flight).toBeTruthy();

            // Recorre los 6 huecos de la barra.
            for (let i = 0; i < 6; i++) {
                const block = w.commandCastSlot(i, { point: w.player.pos, targetId: null });
                // Puede ser 'empty' si el hueco está vacío, o 'flying' si tiene hechizo.
                // Nunca es null (éxito) ni otro motivo que no sea empty/flying.
                expect(block === 'flying' || block === 'empty').toBe(true);
            }
        });

        it('commandCast con spellId devuelve flying en vuelo', () => {
            const w = withFlyingMount();
            const spellId = firstHotbarSpell(w);
            w.toggleFlight();
            if (spellId) {
                const block = w.commandCast(spellId, { point: w.player.pos, targetId: null });
                expect(block).toBe('flying');
            }
        });

        it('el texto de bloqueo es "En vuelo no se lanzan hechizos"', () => {
            expect(CAST_BLOCK_TEXT['flying']).toBe('En vuelo no se lanzan hechizos');
        });

        it('checkCast no llega a la comprobación porque commandCast intercepta antes', () => {
            // commandCast comprueba player.flight ANTES de llamar a checkCast.
            // checkCast en sí no conoce el vuelo; solo commandCast lo hace.
            const w = withFlyingMount();
            w.toggleFlight();
            const spellId = firstHotbarSpell(w);
            if (spellId) {
                // commandCast bloquea con 'flying' antes de llegar a checkCast.
                const block = w.commandCast(spellId, { point: w.player.pos, targetId: null });
                expect(block).toBe('flying');
            }
        });
    });

    describe('resumen de medición', () => {
        it('tabla completa: 3 escenarios × vuelo activo/inactivo', () => {
            // Escenario 1: sin montura
            const w1 = noMount();
            expect(w1.player.flight).toBeFalsy();
            expect(w1.commandCastSlot(0, { point: w1.player.pos, targetId: null }) ?? 'ok').not.toBe('flying');

            // Escenario 2: montura de tierra
            const w2 = withGroundMount();
            expect(w2.player.flight).toBeFalsy();
            expect(w2.canFly()).toBe(false);
            expect(w2.commandCastSlot(0, { point: w2.player.pos, targetId: null }) ?? 'ok').not.toBe('flying');

            // Escenario 3: montura voladora en el suelo
            const w3 = withFlyingMount();
            expect(w3.player.flight).toBeFalsy();
            expect(w3.canFly()).toBe(true);
            expect(w3.commandCastSlot(0, { point: w3.player.pos, targetId: null }) ?? 'ok').not.toBe('flying');

            // Escenario 4: montura voladora en vuelo
            w3.toggleFlight();
            expect(w3.player.flight).toBeTruthy();
            const block4 = w3.commandCastSlot(0, { point: w3.player.pos, targetId: null });
            // 'flying' si hay hechizo, 'empty' si no. En ambos casos, no es null.
            expect(block4 === 'flying' || block4 === 'empty').toBe(true);
        });
    });
});
