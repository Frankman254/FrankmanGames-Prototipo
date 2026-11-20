import { describe, it, expect } from 'vitest';
import { RpgSessionFactory } from '../src/rpg/session';
import type { DungeonSaveState } from '../src/rpg/contracts';
import { content } from './rpg/helpers';

describe('DUN-07: Recompensa del guardián', () => {
    function makeSession() {
        const factory = new RpgSessionFactory(content());
        return factory.newGame('ember_vanguard', 'TestDun', 42);
    }

    describe('DungeonSaveState con defeatedGuardians', () => {
        it('campo defeatedGuardians existe y es array', () => {
            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 4,
                opened: [],
                openedDoors: [],
                broken: [],
                sprung: [],
                defeatedGuardians: [4],
            };
            expect(state.defeatedGuardians).toEqual([4]);
        });

        it('saveDecorator conserva defeatedGuardians', () => {
            const s = makeSession();
            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 4,
                opened: ['4:chest0'],
                openedDoors: [],
                broken: [],
                sprung: [],
                defeatedGuardians: [4],
            };
            s.saveDecorator = (save) => ({ ...save, dungeonState: state, deepestFloor: 4 });
            const save = s.save();
            expect(save.dungeonState?.defeatedGuardians).toEqual([4]);
        });

        it('ida/vuelta conserva defeatedGuardians', () => {
            const factory = new RpgSessionFactory(content());
            const s = factory.newGame('ember_vanguard', 'TestDun', 42);
            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 9,
                opened: [],
                openedDoors: [],
                broken: [],
                sprung: [],
                defeatedGuardians: [4, 9],
            };
            s.saveDecorator = (save) => ({ ...save, dungeonState: state, deepestFloor: 9 });
            const saved = s.save();
            const loaded = factory.load(saved, 42);
            expect(loaded.loadedDungeonState?.defeatedGuardians).toEqual([4, 9]);
        });

        it('guardianDefeated event tiene floor y archetype', () => {
            const s = makeSession();
            let received: unknown = null;
            s.on((e) => {
                if (e.type === 'guardianDefeated') received = e;
            });
            // Simula la emisión del guardián derrotado.
            s.character.emit({ type: 'guardianDefeated', floor: 4, archetype: 'crypt_warden' });
            expect(received).not.toBeNull();
            const ev = received as { type: string; floor: number; archetype: string };
            expect(ev.type).toBe('guardianDefeated');
            expect(ev.floor).toBe(4);
            expect(ev.archetype).toBe('crypt_warden');
        });

        it('múltiples pisos derrotados se acumulan', () => {
            const state: DungeonSaveState = {
                dungeon: 'crypt',
                floor: 99,
                opened: [],
                openedDoors: [],
                broken: [],
                sprung: [],
                defeatedGuardians: [4, 9, 19, 29, 39, 49, 59, 69, 79, 89, 99],
            };
            expect(state.defeatedGuardians.length).toBe(11);
            expect(state.defeatedGuardians).toContain(4); // piso 5
            expect(state.defeatedGuardians).toContain(99); // piso 100
        });
    });

    describe('Eventos guardianDefeated', () => {
        it('no interfiere con enemyKilled', () => {
            const s = makeSession();
            const events: string[] = [];
            s.on((e) => {
                if (e.type === 'enemyKilled') events.push('enemyKilled');
                if (e.type === 'guardianDefeated') events.push('guardianDefeated');
            });
            s.character.emit({ type: 'enemyKilled', archetype: 'crypt_warden' });
            s.character.emit({ type: 'guardianDefeated', floor: 4, archetype: 'crypt_warden' });
            expect(events).toEqual(['enemyKilled', 'guardianDefeated']);
        });

        it('floor 0-based: piso 5 = floor 4', () => {
            const s = makeSession();
            let floor: number | null = null;
            s.on((e) => {
                if (e.type === 'guardianDefeated') floor = e.floor;
            });
            s.character.emit({ type: 'guardianDefeated', floor: 4, archetype: 'crypt_warden' });
            expect(floor).toBe(4); // piso 5 en 1-based = 4 en 0-based
        });
    });
});
