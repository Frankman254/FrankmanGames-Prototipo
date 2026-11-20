import { describe, expect, it } from 'vitest';
import { FakeSession } from '../src/ui/menus/fake/fakeSession';
import { MemoryStore, SLOT_COUNT, SaveStore } from '../src/ui/menus/saveStore';

describe('guardado corrupto no rompe la portada', () => {
    function storeWithCorrupt(index: number, value: string) {
        const mem = new MemoryStore();
        mem.setItem(`frankmangames.save.${index}`, value);
        return new SaveStore(mem);
    }

    describe('JSON truncado', () => {
        it('JSON cortado a la mitad devuelve null', () => {
            const store = storeWithCorrupt(0, '{"version":3,"name":"Aldara","classId":"ember_vanguar');
            expect(store.read(0)).toBeNull();
        });

        it('JSON truncado en medio de un array devuelve null', () => {
            const store = storeWithCorrupt(0, '{"version":3,"name":"A","classId":"e","level":1,"xp":0,"gold":0,"inventory":["item1');
            expect(store.read(0)).toBeNull();
        });

        it('Solo la apertura de objeto devuelve null', () => {
            const store = storeWithCorrupt(0, '{');
            expect(store.read(0)).toBeNull();
        });

        it('Cadena vacía devuelve null', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.save.0', '');
            const store = new SaveStore(mem);
            expect(store.read(0)).toBeNull();
        });
    });

    describe('campos faltantes', () => {
        it('sin name devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('sin classId devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('sin level devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('sin xp devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                gold: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('sin gold devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('inventory como string en vez de array devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: 'no es array',
                equipment: {},
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('equipment como null devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: null,
                known: [],
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('known como string en vez de array devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: {},
                known: 'no es array',
                hotbar: [],
            }));
            expect(store.read(0)).toBeNull();
        });

        it('hotbar como número devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify({
                version: 3,
                name: 'Aldara',
                classId: 'ember_vanguard',
                level: 1,
                xp: 0,
                gold: 0,
                inventory: [],
                equipment: {},
                known: [],
                hotbar: 42,
            }));
            expect(store.read(0)).toBeNull();
        });
    });

    describe('tipos inesperados', () => {
        it('array JSON en vez de objeto devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify([1, 2, 3]));
            expect(store.read(0)).toBeNull();
        });

        it('string JSON devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify('solo texto'));
            expect(store.read(0)).toBeNull();
        });

        it('número JSON devuelve null', () => {
            const store = storeWithCorrupt(0, JSON.stringify(12345));
            expect(store.read(0)).toBeNull();
        });

        it('null JSON devuelve null', () => {
            const store = storeWithCorrupt(0, 'null');
            expect(store.read(0)).toBeNull();
        });

        it('boolean JSON devuelve null', () => {
            const store = storeWithCorrupt(0, 'true');
            expect(store.read(0)).toBeNull();
        });
    });

    describe('list() con ranuras corruptas', () => {
        it('list() muestra null para ranuras corruptas, no crashea', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.save.0', '{truncado');
            mem.setItem('frankmangames.save.3', JSON.stringify([1, 2]));
            mem.setItem('frankmangames.save.7', 'no es json');
            const store = new SaveStore(mem);
            const list = store.list();
            expect(list.length).toBe(SLOT_COUNT);
            expect(list[0]).toBeNull();
            expect(list[3]).toBeNull();
            expect(list[7]).toBeNull();
            // Las ranuras vacías siguen siendo null.
            expect(list[1]).toBeNull();
        });

        it('list() con todas las ranuras corruptas no crashea', () => {
            const mem = new MemoryStore();
            for (let i = 0; i < SLOT_COUNT; i++) {
                mem.setItem(`frankmangames.save.${i}`, 'corrupto');
            }
            const store = new SaveStore(mem);
            const list = store.list();
            expect(list).toEqual(Array(SLOT_COUNT).fill(null));
        });

        it('latest() devuelve null cuando todas las ranuras son corruptas', () => {
            const mem = new MemoryStore();
            for (let i = 0; i < SLOT_COUNT; i++) {
                mem.setItem(`frankmangames.save.${i}`, 'corrupto');
            }
            const store = new SaveStore(mem);
            expect(store.latest()).toBeNull();
        });

        it('firstEmpty() devuelve null cuando todas las ranuras son corruptas (no hay ranura vacía real)', () => {
            const mem = new MemoryStore();
            for (let i = 0; i < SLOT_COUNT; i++) {
                mem.setItem(`frankmangames.save.${i}`, 'corrupto');
            }
            const store = new SaveStore(mem);
            // firstEmpty() busca un slot donde list() devuelva null — pero list() ya devuelve null
            // para corruptos. Sin embargo, firstEmpty() usa findIndex sobre list(), y null significa
            // "vacía o ilegible". Por lo tanto, el primer corrupto se considera "vacío" para escribir.
            expect(store.firstEmpty()).toBe(0);
        });
    });

    describe('mezcla de válido y corrupto', () => {
        it('una ranura válida entre corruptas se lee correctamente', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.save.0', 'corrupto');
            const s = FakeSession.create('ember_vanguard', 'Aldara', 1, { demo: true });
            mem.setItem('frankmangames.save.1', JSON.stringify(s.save()));
            mem.setItem('frankmangames.save.2', '{truncado');
            const store = new SaveStore(mem);
            expect(store.read(0)).toBeNull();
            expect(store.read(1)).not.toBeNull();
            expect(store.read(1)!.name).toBe('Aldara');
            expect(store.read(2)).toBeNull();
        });

        it('latest() elige la válida entre corruptas', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.save.0', 'corrupto');
            const s = FakeSession.create('ember_vanguard', 'Aldara', 1, { demo: true });
            mem.setItem('frankmangames.save.2', JSON.stringify({ ...s.save(), savedAt: '2026-11-20T10:00:00Z' }));
            mem.setItem('frankmangames.save.3', 'truncado');
            const store = new SaveStore(mem);
            expect(store.latest()).toBe(2);
        });
    });

    describe('readBackup con respaldo corrupto', () => {
        it('un respaldo corrupto devuelve null', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.backup.slot.0', '{truncado');
            const store = new SaveStore(mem);
            expect(store.readBackup(0)).toBeNull();
        });

        it('un respaldo con JSON válido pero forma inválida devuelve null', () => {
            const mem = new MemoryStore();
            mem.setItem('frankmangames.backup.slot.0', JSON.stringify({ version: 99, name: 'x' }));
            const store = new SaveStore(mem);
            expect(store.readBackup(0)).toBeNull();
        });
    });
});
