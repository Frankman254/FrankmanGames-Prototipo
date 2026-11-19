// MUE-01: Aviso de Pulso bajo (≤20) — se emite una sola vez hasta que sube de 20.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import type { SessionEvent } from '../../src/rpg/contracts';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';

function withSession() {
    const data = loadGameData();
    const rng = new Rng(42);
    const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng), rng);
    const events: SessionEvent[] = [];
    s.on((e) => events.push(e));
    return { s, events };
}

describe('MUE-01: Aviso de Pulso bajo', () => {
    it('emite pulseLow la primera vez que el Pulso cruza ≤20', () => {
        const { s, events } = withSession();
        const def = s.content.energy;
        // Bajar el Pulso a 25 para que la siguiente muerte lo cruce.
        s.energy.value = 25;
        expect(events).not.toContainEqual({ type: 'pulseLow' });
        s.onDeath();
        expect(s.energy.value).toBe(25 - def.deathCost);
        const pulseLow = events.find((e) => e.type === 'pulseLow');
        expect(pulseLow).toEqual({ type: 'pulseLow' });
    });

    it('no emite pulseLow si el Pulso ya estaba ≤20', () => {
        const { s, events } = withSession();
        s.energy.value = 15;
        s.onDeath();
        expect(events).not.toContainEqual({ type: 'pulseLow' });
    });

    it('no repite el aviso mientras el Pulso se queda ≤20', () => {
        const { s, events } = withSession();
        s.energy.value = 30;
        s.onDeath(); // cruza a ≤20 → primer aviso
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(1);
        s.character.spectral.resurrectByAlly();
        s.onDeath(); // otra muerte, sigue ≤20
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(1);
    });

    it('permite volver a avisar cuando el Pulso sube de 20 y luego baja', () => {
        const { s, events } = withSession();
        const def = s.content.energy;
        // Primera vez: cruza ≤20.
        s.energy.value = 30;
        s.onDeath();
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(1);
        // Sube de 20 con un consumible.
        s.character.give('pulse_draught', 1);
        const uid = s.character.inventory.slots.find((x) => x?.itemId === 'pulse_draught')!.uid;
        s.useItem(uid);
        expect(s.energy.value).toBeGreaterThan(20);
        // Baja de nuevo.
        s.energy.value = 25;
        s.onDeath();
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(2);
    });

    it('permite volver a avisar cuando el Pulso sube de 20 con un consumible y luego baja', () => {
        const { s, events } = withSession();
        // Primera vez: cruza ≤20 (pero no a 0, para no quedar espectro).
        s.energy.value = 30;
        s.onDeath();
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(1);
        // Sube de 20 con un consumible.
        s.character.give('pulse_draught', 1);
        const uid = s.character.inventory.slots.find((x) => x?.itemId === 'pulse_draught')!.uid;
        s.useItem(uid);
        expect(s.energy.value).toBeGreaterThan(20);
        // Baja de nuevo.
        s.energy.value = 25;
        s.onDeath();
        expect(events.filter((e) => e.type === 'pulseLow').length).toBe(2);
    });

    it('emite pulseLow cuando la muerte lleva el Pulso exactamente a 20', () => {
        const { s, events } = withSession();
        const def = s.content.energy;
        s.energy.value = 20 + def.deathCost; // exactamente 20 tras la muerte
        s.onDeath();
        expect(s.energy.value).toBe(20);
        expect(events).toContainEqual({ type: 'pulseLow' });
    });

    it('no emite pulseLow si la muerte deja el Pulso en 21', () => {
        const { s, events } = withSession();
        s.energy.value = 21 + s.content.energy.deathCost;
        s.onDeath();
        expect(s.energy.value).toBe(21);
        expect(events).not.toContainEqual({ type: 'pulseLow' });
    });

    it('no emite pulseLow si el personaje ya es espectro', () => {
        const { s, events } = withSession();
        s.character.spectral.die();
        s.onDeath();
        expect(events).not.toContainEqual({ type: 'pulseLow' });
    });
});
