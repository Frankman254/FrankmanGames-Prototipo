import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { useDungeonKey } from '../src/world/dungeon';
import type { KeyRing } from '../src/world/dungeon';

const data = loadGameData();
const rpg = data.rpg;
const def = loadDungeon(data);

/** Archetipos de enemigos que sueltan la llave (por tabla de botín). */
const keyDroppingTables = new Set<string>();
for (const [tid, table] of Object.entries(rpg.lootTables)) {
    if (table.entries.some((e) => e.itemId === 'crypt_key')) {
        keyDroppingTables.add(tid);
    }
}

/** Archetipos de enemigos que usan esas tablas. */
const keyDroppingArchetypes = new Set<string>();
for (const [aid, enemy] of Object.entries(rpg.enemies)) {
    if (enemy.lootTable && keyDroppingTables.has(enemy.lootTable)) {
        keyDroppingArchetypes.add(aid);
    }
}

describe('DUN-05: Llave de la cripta — coherencia de punta a punta', () => {
    describe('Item crypt_key existe y es tipo key', () => {
        it('está definido en items.json', () => {
            const item = rpg.items['crypt_key'];
            expect(item).toBeDefined();
            expect(item!.kind).toBe('key');
        });

        it('tiene nombre y descripción', () => {
            const item = rpg.items['crypt_key']!;
            expect(item.name).toBeTruthy();
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.description).toBeTruthy();
            expect(item.description.length).toBeGreaterThan(0);
        });
    });

    describe('dungeon.json declara la llave con consume: true', () => {
        it('key.itemId es crypt_key', () => {
            expect(def.key).not.toBeNull();
            expect(def.key!.itemId).toBe('crypt_key');
        });

        it('key.consume es true', () => {
            expect(def.key!.consume).toBe(true);
        });

        it('key.hint no está vacío', () => {
            expect(def.key!.hint.length).toBeGreaterThan(0);
        });
    });

    describe('Diálogo del portero coincide con los datos', () => {
        it('Berto Candado existe y es el portero', () => {
            const npc = rpg.npcs['crypt_warden'];
            expect(npc).toBeDefined();
            expect(npc!.name).toBe('Berto Candado');
            expect(npc!.title).toBe('Portero de la cripta');
        });

        it('tiene nodo noKey con mención a la llave', () => {
            const npc = rpg.npcs['crypt_warden']!;
            const noKey = npc.dialogue.nodes['noKey'];
            expect(noKey).toBeDefined();
            expect(noKey!.text.toLowerCase()).toContain('llave');
        });

        it('tiene nodo hello con mención a piso', () => {
            const npc = rpg.npcs['crypt_warden']!;
            const hello = npc.dialogue.nodes['hello'];
            expect(hello).toBeDefined();
            expect(hello!.text.toLowerCase()).toContain('piso');
        });

        it('el hint de dungeon.json coincide con el texto del portero', () => {
            // El hint dice "satos, duendes y curanderos de los Llanos de Azuero".
            // El diálogo del portero debe mencionar lo mismo.
            const npc = rpg.npcs['crypt_warden']!;
            const noKey = npc.dialogue.nodes['noKey']!.text;
            const hint = def.key!.hint;
            // Ambos mencionan "satos"
            expect(noKey.toLowerCase()).toContain('satos');
            expect(hint.toLowerCase()).toContain('satos');
            // Ambos mencionan "duendes"
            expect(noKey.toLowerCase()).toContain('duendes');
            expect(hint.toLowerCase()).toContain('duendes');
            // Ambos mencionan "curanderos"
            expect(noKey.toLowerCase()).toContain('curanderos');
            expect(hint.toLowerCase()).toContain('curanderos');
            // Ambos mencionan "Llanos de Azuero"
            expect(noKey).toContain('Llanos de Azuero');
            expect(hint).toContain('Llanos de Azuero');
        });

        it('el nodo hello requiere hasItem crypt_key (vía condición)', () => {
            const npc = rpg.npcs['crypt_warden']!;
            // La entrada "noKey" tiene condición not(hasItem crypt_key).
            // La entrada "hello" es el default (con llave).
            const noKeyEntry = npc.dialogue.entry[0];
            expect(noKeyEntry).toBeDefined();
            expect(noKeyEntry!.node).toBe('noKey');
            // La condición debe verificar crypt_key
            const cond = noKeyEntry!.conditions![0];
            expect(cond).toBeDefined();
            expect(cond!.type).toBe('not');
            const notCond = cond! as { type: 'not'; condition: { type: 'hasItem'; itemId: string; quantity: number } };
            expect(notCond.condition.type).toBe('hasItem');
            expect(notCond.condition.itemId).toBe('crypt_key');
        });
    });

    describe('Enemigos que sueltan la llave', () => {
        it('hay al menos 3 tablas de botín con crypt_key', () => {
            expect(keyDroppingTables.size).toBeGreaterThanOrEqual(3);
        });

        it('las tablas incluyen prairie_wolf, goblin_skirmisher y bone_shaman', () => {
            expect(keyDroppingTables).toContain('prairie_wolf');
            expect(keyDroppingTables).toContain('goblin_skirmisher');
            expect(keyDroppingTables).toContain('bone_shaman');
        });

        it('los enemigos que sueltan la llave están en nivel 1-10 (rango de Azuero)', () => {
            for (const aid of keyDroppingArchetypes) {
                const enemy = rpg.enemies[aid]!;
                expect(enemy.level).toBeGreaterThanOrEqual(1);
                expect(enemy.level).toBeLessThanOrEqual(10);
            }
        });

        it('los nombres de los enemigos coinciden con "satos, duendes y curanderos"', () => {
            const names = [...keyDroppingArchetypes].map((a) => rpg.enemies[a]!.name.toLowerCase());
            // Al menos uno con "sato"
            expect(names.some((n) => n.includes('sato'))).toBe(true);
            // Al menos uno con "duende"
            expect(names.some((n) => n.includes('duende'))).toBe(true);
            // Al menos uno con "curandero"
            expect(names.some((n) => n.includes('curandero'))).toBe(true);
        });
    });

    describe('Ningún merchant vende la llave', () => {
        it('crypt_key no aparece en ningún merchant', () => {
            for (const [mid, merchant] of Object.entries(rpg.merchants)) {
                for (const entry of merchant.stock) {
                    expect(entry.itemId).not.toBe('crypt_key');
                }
            }
        });
    });

    describe('useDungeonKey consume la llave correctamente', () => {
        function fakeKeyRing(count: number): KeyRing {
            const slots: Array<{ uid: string; itemId: string } | null> = [];
            if (count > 0) {
                slots.push({ uid: 'slot-1', itemId: 'crypt_key' });
            }
            let remaining = count;
            const removed: string[] = [];
            return {
                count: (id: string) => id === 'crypt_key' ? remaining : 0,
                slots,
                remove: (uid: string, qty: number) => {
                    removed.push(`${uid}:${qty}`);
                    remaining -= qty;
                },
            };
        }

        it('sin llave devuelve ok: false con mensaje', () => {
            const inv = fakeKeyRing(0);
            const res = useDungeonKey(def, inv, 'Llave de la Tulivieja');
            expect(res.ok).toBe(false);
            expect(res.message.toLowerCase()).toContain('llave');
        });

        it('con llave y consume: true devuelve ok: true y consume', () => {
            const inv = fakeKeyRing(1);
            const res = useDungeonKey(def, inv, 'Llave de la Tulivieja');
            expect(res.ok).toBe(true);
            expect(res.message).toContain('reja');
            // Verifica que se llamó a remove
            expect(inv.count('crypt_key')).toBe(0);
        });

        it('sin llave definida en dungeonDef siempre permite entrar', () => {
            const noKeyDef = { ...def, key: null };
            const inv = fakeKeyRing(0);
            const res = useDungeonKey(noKeyDef, inv, '');
            expect(res.ok).toBe(true);
        });
    });

    describe('Acción enterDungeon en el diálogo del portero', () => {
        it('el nodo hello tiene opciones con enterDungeon', () => {
            const npc = rpg.npcs['crypt_warden']!;
            const hello = npc.dialogue.nodes['hello']!;
            const enterOptions = hello.options.filter((o) => o.actions && o.actions.some((a) => a.type === 'enterDungeon'));
            expect(enterOptions.length).toBeGreaterThan(0);
        });

        it('hay una opción para piso 1 (floor null) y otra para piso 10 (floor 9)', () => {
            const npc = rpg.npcs['crypt_warden']!;
            const hello = npc.dialogue.nodes['hello']!;
            const floors = hello.options
                .filter((o) => o.actions && o.actions.some((a) => a.type === 'enterDungeon'))
                .map((o) => o.actions!.find((a) => a.type === 'enterDungeon')!.floor);
            expect(floors).toContain(null); // piso 1
            expect(floors).toContain(9);    // piso 10
        });
    });
});
