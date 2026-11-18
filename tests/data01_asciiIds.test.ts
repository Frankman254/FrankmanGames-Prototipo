import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { migrateSave } from '../src/ui/menus/saveStore';

const DATA_DIR = resolve(__dirname, '../data');

/** Recorre recursivamente data/ y devuelve la lista de archivos .json. */
function jsonFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...jsonFiles(full));
        } else if (entry.endsWith('.json')) {
            out.push(full);
        }
    }
    return out;
}

/** Extrae todos los keys de nivel superior y los itemId/setId anidados de un JSON. */
function extractIds(text: string): string[] {
    const ids: string[] = [];
    // Buscamos cualquier "key": value donde key parezca un id (sin espacios).
    // Estrategia simple: extraer todas las keys de objeto JSON.
    const keyRe = /"([^"]+)"\s*:/g;
    let m;
    while ((m = keyRe.exec(text)) !== null) {
        ids.push(m[1]);
    }
    return ids;
}

describe('DATA-01: IDs ASCII en data/', () => {
    it('ningún id de data/**/*.json contiene caracteres fuera de ASCII', () => {
        const files = jsonFiles(DATA_DIR);
        const nonAscii: { file: string; id: string; char: string; code: string }[] = [];

        for (const file of files) {
            const rel = file.replace(DATA_DIR + '/', '');
            // Excluimos i18n/ porque sus keys son texto traducible (español con acentos, ñ, etc.).
            // La regla ASCII solo aplica a los ids de entidades del juego.
            if (rel.startsWith('i18n/') || rel.startsWith('i18n\\')) continue;
            const text = readFileSync(file, 'utf-8');
            const ids = extractIds(text);
            for (const id of ids) {
                for (let i = 0; i < id.length; i++) {
                    const cp = id.charCodeAt(i);
                    if (cp > 127) {
                        nonAscii.push({
                            file: rel,
                            id,
                            char: id[i],
                            code: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
                        });
                    }
                }
            }
        }

        expect(
            nonAscii,
            `Se encontraron ${nonAscii.length} id(s) con caracteres no-ASCII en data/ (excluyendo i18n/)`,
        ).toEqual([]);
    });
});

describe('DATA-01: Alias de IDs obsoletos en guardados', () => {
    const CYRILLIC_O = '\u043e'; // о cirílica

    function makeSaveData(overrides: Record<string, unknown> = {}) {
        return {
            version: 3,
            name: 'TestChar',
            classId: 'guerrero',
            level: 10,
            xp: 0,
            gold: 0,
            inventory: [],
            equipment: {},
            bank: [],
            known: [],
            hotbar: [],
            allocated: {},
            unspentStatPoints: 0,
            place: { scene: 'overworld' as const, dungeon: null, floor: null, x: null, y: null },
            ...overrides,
        };
    }

    it('migrata itemId con о cirílica a o latina en inventory', () => {
        const save = makeSaveData({
            inventory: [
                { id: `tri_tambor_azuer${CYRILLIC_O}_head`, qty: 1 },
                { id: `tri_tambor_azuer${CYRILLIC_O}_chest`, qty: 1 },
            ],
        });
        const migrated = migrateSave(save);
        expect(migrated).not.toBeNull();
        const inv = migrated!.inventory as { id?: string }[];
        expect(inv[0].id).toBe('tri_tambor_azuerо_head');
        expect(inv[1].id).toBe('tri_tambor_azuerо_chest');
    });

    it('migrata setId con о cirílica en un item de inventory', () => {
        const save = makeSaveData({
            inventory: [
                { id: 'tri_tambor_azuerо_head', setId: `tri_tambor_azuer${CYRILLIC_O}` },
            ],
        });
        const migrated = migrateSave(save);
        expect(migrated).not.toBeNull();
        const item = migrated!.inventory[0] as { setId?: string };
        expect(item.setId).toBe('tri_tambor_azuerо');
    });

    it('migrata itemId en equipment', () => {
        const save = makeSaveData({
            equipment: {
                head: { id: `tri_tambor_azuer${CYRILLIC_O}_head`, setId: `tri_tambor_azuer${CYRILLIC_O}` },
            },
        });
        const migrated = migrateSave(save);
        expect(migrated).not.toBeNull();
        const eq = migrated!.equipment as Record<string, { id?: string; setId?: string }>;
        expect(eq.head.id).toBe('tri_tambor_azuerо_head');
        expect(eq.head.setId).toBe('tri_tambor_azuerо');
    });

    it('no modifica un id ya correcto', () => {
        const save = makeSaveData({
            inventory: [{ id: 'tri_tambor_azuerо_head', qty: 1 }],
        });
        const migrated = migrateSave(save);
        expect(migrated).not.toBeNull();
        const inv = migrated!.inventory as { id?: string }[];
        expect(inv[0].id).toBe('tri_tambor_azuerо_head');
    });

    it('migrata el setId del set (sin sufijo de pieza)', () => {
        const save = makeSaveData({
            inventory: [{ id: 'tri_tambor_azuerо_back', setId: `tri_tambor_azuer${CYRILLIC_O}` }],
        });
        const migrated = migrateSave(save);
        expect(migrated).not.toBeNull();
        const item = migrated!.inventory[0] as { id?: string; setId?: string };
        expect(item.id).toBe('tri_tambor_azuerо_back');
        expect(item.setId).toBe('tri_tambor_azuerо');
    });
});
