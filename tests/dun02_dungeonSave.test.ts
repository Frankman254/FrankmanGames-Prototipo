import { describe, it, expect } from 'vitest';
import { RpgSessionFactory } from '../src/rpg/session';
import type { DungeonSaveState, SaveData } from '../src/rpg/contracts';
import { content } from './rpg/helpers';

describe('DUN-02: Guardado de la mazmorra', () => {
    function makeSession() {
        const factory = new RpgSessionFactory(content());
        return factory.newGame('ember_vanguard', 'TestDun', 42);
    }

    describe('DungeonSaveState en SaveData', () => {
        it('SaveData acepta dungeonState y deepestFloor', () => {
            const s = makeSession();
            const save = s.save();
            expect(save).toBeDefined();
            // Los campos son opcionales; en partida nueva no hay estado de mazmorra.
            expect(save.dungeonState).toBeUndefined();
            expect(save.deepestFloor).toBeUndefined();
        });

        it('saveDecorator inyecta dungeonState y deepestFloor', () => {
            const s = makeSession();
            const fakeState: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 5,
                opened: ['5:roomA'],
                openedDoors: ['5:door0'],
                broken: ['5:jar1'],
                sprung: ['5:ambush0'],
                defeatedGuardians: [],
            };
            s.saveDecorator = (save) => ({
                ...save,
                dungeonState: fakeState,
                deepestFloor: 5,
            });
            const save = s.save();
            expect(save.dungeonState).toEqual(fakeState);
            expect(save.deepestFloor).toBe(5);
        });

        it('saveDecorator puede limpiar dungeonState al salir', () => {
            const s = makeSession();
            const saveWithState: SaveData = {
                ...s.save(),
                dungeonState: {
                    dungeon: 'crypt',
                    floor: 3,
                    opened: ['3:roomA'],
                    openedDoors: [],
                    broken: [],
                    sprung: [],
                    defeatedGuardians: [],
                },
            };
            // Simula salir de la cripta: no hay crypt.inside, se limpia.
            s.saveDecorator = (save) => {
                const inside = false; // crypt no existe en tests
                if (!inside && save.dungeonState) {
                    const { dungeonState: _ds, ...rest } = save;
                    return rest;
                }
                return save;
            };
            const cleaned = s.saveDecorator(saveWithState);
            expect(cleaned.dungeonState).toBeUndefined();
        });

        it('deepestFloor se actualiza al bajar más', () => {
            const s = makeSession();
            let currentDeepest = 3;

            s.saveDecorator = (save) => {
                const newFloor = 7;
                const deepest = save.deepestFloor;
                if (newFloor > (deepest ?? 0)) {
                    return { ...save, deepestFloor: newFloor };
                }
                return { ...save, deepestFloor: deepest };
            };

            const save1 = s.save();
            expect(save1.deepestFloor).toBe(7);

            // Simula segundo guardado con piso 4 (no sube el récord).
            s.saveDecorator = (save) => {
                const newFloor = 4;
                const deepest = save.deepestFloor;
                if (newFloor > (deepest ?? 0)) {
                    return { ...save, deepestFloor: newFloor };
                }
                return { ...save, deepestFloor: deepest };
            };
            // Partiendo del guardado anterior (deepestFloor=7), el piso 4 no lo sube.
            const save2 = s.saveDecorator(save1);
            expect(save2.deepestFloor).toBe(7);
        });
    });

    describe('loadedDungeonState en GameSession', () => {
        it('fromSave conserva dungeonState en loadedDungeonState', () => {
            const factory = new RpgSessionFactory(content());
            const s = factory.newGame('ember_vanguard', 'TestDun', 42);
            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 10,
                opened: ['10:chestA', '10:chestB'],
                openedDoors: ['10:door0'],
                broken: ['10:jar2'],
                sprung: [],
                defeatedGuardians: [],
            };
            const save: SaveData = {
                ...s.save(),
                dungeonState: state,
                deepestFloor: 10,
            };
            const loaded = factory.load(save, 42);
            expect(loaded.loadedDungeonState).toEqual(state);
        });

        it('fromSave sin dungeonState deja loadedDungeonState null', () => {
            const factory = new RpgSessionFactory(content());
            const s = factory.newGame('ember_vanguard', 'TestDun', 42);
            const loaded = factory.load(s.save(), 42);
            expect(loaded.loadedDungeonState).toBeNull();
        });
    });

    describe('ida/vuelta del estado', () => {
        it('guardar y cargar conserva el estado del piso', () => {
            const factory = new RpgSessionFactory(content());
            const s = factory.newGame('ember_vanguard', 'TestDun', 42);

            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 7,
                opened: ['7:roomA:chest0'],
                openedDoors: ['7:door:0'],
                broken: ['7:breakable:1'],
                sprung: ['7:ambush:0'],
                defeatedGuardians: [],
            };

            // Simula el saveDecorator inyectando el estado.
            s.saveDecorator = (save) => ({ ...save, dungeonState: state, deepestFloor: 7 });
            const saved = s.save();

            // Cargar restaura loadedDungeonState.
            const loaded = factory.load(saved, 42);
            expect(loaded.loadedDungeonState).toEqual(state);
            // deepestFloor vive en SaveData, no en GameSession — el save lo conserva.
            expect(saved.deepestFloor).toBe(7);
        });
    });
});
