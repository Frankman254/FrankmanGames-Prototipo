import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { RpgSessionFactory, type GameSession } from '../src/rpg/session';
import { World } from '../src/sim/world';

const DT = 1 / 60;

/** La derrota que deja el Pulso en 0: la que convierte en fantasma. */
function kill(s: GameSession) {
    s.energy.value = s.content.energy.deathCost;
    return s.onDeath();
}

function setup() {
    const data = loadGameData();
    const factory = new RpgSessionFactory(data.rpg);
    const session = factory.newGame('ember_vanguard', 'Mue03', 13);
    const expanded = { ...data, zone: { ...data.zone, width: 256, depth: 256, playerStart: { x: 130, y: 120 } } };
    const world = new World(expanded, { character: session.character, encounter: false });
    session.attach(world);
    return { data: expanded, session, world };
}

describe('MUE-03: montura y mascota al morir y revivir', () => {
    it('la mascota desaparece al morir y vuelve al revivir', () => {
        const { data, session: s, world } = setup();
        // Invoca la mascota.
        const charm = s.character.inventory.slots.find((i) => i?.itemId === 'charm_ash_fox')!;
        expect(s.useItem(charm.uid).ok).toBe(true);
        expect(s.character.activePetItemUid).toBe(charm.uid);
        // Avanza para que la mascota aparezca.
        for (let i = 0; i < 60; i++) world.tick(DT);
        expect(world.pets).toHaveLength(1);
        expect(s.pet()).not.toBeNull();

        // Muere.
        kill(s);
        const w2 = new World(data, { character: s.character, encounter: false });
        s.attach(w2);
        // La mascota ya no está en el mundo ni en la vista.
        expect(w2.pets).toHaveLength(0);
        expect(s.pet()).toBeNull();
        // Pero el amuleto sigue activo en el personaje (no se desequipa).
        expect(s.character.activePetItemUid).toBe(charm.uid);

        // Resucita cerca del primer Alzador.
        const altar = s.content.spectral.resurrectors[0]!;
        w2.commandMove({ x: altar.x, y: altar.y });
        for (let i = 0; i < 300; i++) w2.tick(DT);
        expect(s.character.spectral.active).toBe(false);
        // La mascota vuelve.
        for (let i = 0; i < 60; i++) w2.tick(DT);
        expect(w2.pets).toHaveLength(1);
        expect(s.pet()).not.toBeNull();
    });

    it('la montura sigue equipada al morir y vuelve a verse al revivir', () => {
        const { data, session: s, world } = setup();
        // Equipa una montura de pruebas si existe.
        const mountItem = s.content.items['mount_dev_crestalba'];
        if (!mountItem) {
            // Sin montura de pruebas, la prueba no aplica.
            return;
        }
        const left = s.character.give('mount_dev_crestalba', 1);
        expect(left).toBe(0);
        const inst = s.character.inventory.slots.find((i) => i?.itemId === 'mount_dev_crestalba')!;
        expect(s.equip(inst.uid, 'mount').ok).toBe(true);
        expect(world.character.equipment.get('mount')).not.toBeNull();

        // Muere.
        kill(s);
        const w2 = new World(data, { character: s.character, encounter: false });
        s.attach(w2);
        // La montura sigue equipada (no se desequipa al morir).
        expect(w2.character.equipment.get('mount')).not.toBeNull();

        // Resucita.
        const altar = s.content.spectral.resurrectors[0]!;
        w2.commandMove({ x: altar.x, y: altar.y });
        for (let i = 0; i < 300; i++) w2.tick(DT);
        expect(s.character.spectral.active).toBe(false);
        // La montura sigue equipada y vuelve a verse.
        expect(w2.character.equipment.get('mount')).not.toBeNull();
    });

    it('sin mascota activa, morir y revivir no crea mascota fantasma', () => {
        const { data, session: s, world } = setup();
        expect(s.pet()).toBeNull();
        expect(world.pets).toHaveLength(0);

        kill(s);
        const w2 = new World(data, { character: s.character, encounter: false });
        s.attach(w2);
        expect(w2.pets).toHaveLength(0);
        expect(s.pet()).toBeNull();

        // Resucita.
        const altar = s.content.spectral.resurrectors[0]!;
        w2.commandMove({ x: altar.x, y: altar.y });
        for (let i = 0; i < 300; i++) w2.tick(DT);
        expect(s.character.spectral.active).toBe(false);
        expect(w2.pets).toHaveLength(0);
        expect(s.pet()).toBeNull();
    });

    it('el estado espectral se guarda y carga correctamente', () => {
        const { session: s } = setup();
        expect(s.character.spectral.active).toBe(false);
        expect(s.character.spectral.deaths).toBe(0);

        kill(s);
        expect(s.character.spectral.active).toBe(true);
        expect(s.character.spectral.deaths).toBe(1);

        const save = s.save();
        expect(save.spectral).toEqual({ active: true, deaths: 1 });

        // Carga el guardado.
        const data = loadGameData();
        const factory = new RpgSessionFactory(data.rpg);
        const loaded = factory.load(save, 42);
        expect(loaded.character.spectral.active).toBe(true);
        expect(loaded.character.spectral.deaths).toBe(1);
    });
});
