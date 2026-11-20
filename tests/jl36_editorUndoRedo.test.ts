// JL-36: pruebas dedicadas de deshacer/rehacer del editor del mundo.
// Cada operación (colocar, mover, girar, borrar) se envuelve en edit() para
// que quede un paso de deshacer. Se verifica undo → redo, undo múltiple,
// y que un cambio nuevo borra el rehacer.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseNavPaint, parseTerrain, parseVegetation } from '../src/data/worldSchema';
import { EditorDoc, FILE_IDS, EDITOR_FILES, type FileId, type ScatterFn } from '../src/editor/doc';
import { scatterVegetation } from '../src/world/scatter';
import { generateHeightField } from '../src/world/terrain';

const readData = (f: FileId): string => readFileSync(EDITOR_FILES[f], 'utf-8');
const originals = Object.fromEntries(FILE_IDS.map((f) => [f, readData(f)])) as Record<FileId, string>;
const questsRef = JSON.parse(readFileSync('data/rpg/quests.json', 'utf-8')) as unknown;

function makeDoc(): EditorDoc {
    const wd = loadWorldData();
    const hf = generateHeightField(wd.terrain);
    const blocking = new Set(
        Object.entries(wd.vegetation.kinds)
            .filter(([, k]) => k.blockRadius > 0)
            .map(([id]) => id),
    );
    const scatterFn: ScatterFn = (veg, terrain) => {
        const s = scatterVegetation(parseVegetation(veg), parseTerrain(terrain), hf, blocking);
        const items = [...s.byKind].flatMap(([kind, list]) =>
            list.map((i) => ({
                kind,
                x: i.x,
                y: i.z,
                scale: i.scale,
                rotDeg: (i.rotY * 180) / Math.PI,
                ...(i.placement !== undefined ? { placement: i.placement } : {}),
            })),
        );
        return { items, obstacles: s.obstacles };
    };
    return new EditorDoc(originals, scatterFn, { cols: 512, rows: 512, cellSize: 0.5 }, [], { quests: questsRef });
}

describe('JL-36: deshacer/rehacer del editor — colocar', () => {
    it('colocar una casa → undo la quita → redo la restaura', () => {
        const doc = makeDoc();
        const n = doc.objects().filter((o) => o.category === 'props').length;
        const key = doc.edit('colocar casa', () => doc.add('prop:house', 50, 50))!;
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n + 1);
        expect(doc.find(key)).toMatchObject({ x: 50, y: 50, kind: 'house' });

        expect(doc.undo()).toBe('colocar casa');
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n);
        expect(doc.find(key)).toBeNull();

        doc.redo();
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n + 1);
        expect(doc.find(key)).toMatchObject({ x: 50, y: 50 });
    });

    it('colocar un árbol → undo → redo', () => {
        const doc = makeDoc();
        const veg = parseVegetation(doc.copyOf('vegetation'));
        const pBefore = veg.placements?.length ?? 0;
        const key = doc.edit('colocar palma', () => doc.add('plant:palma', 60, 60))!;
        expect(key).toMatch(/^placement:/);
        expect(doc.find(key)).not.toBeNull();

        expect(doc.undo()).toBe('colocar palma');
        const vegAfter = parseVegetation(doc.copyOf('vegetation'));
        expect(vegAfter.placements?.length ?? 0).toBe(pBefore);

        doc.redo();
        expect(doc.find(key)).not.toBeNull();
    });

    it('colocar un estanque → undo → redo', () => {
        const doc = makeDoc();
        const pondsBefore = (doc.copyOf('terrain') as { ponds?: unknown[] }).ponds?.length ?? 0;
        const key = doc.edit('colocar estanque', () => doc.add('pond', 90, 180))!;
        expect(key).toMatch(/^pond:/);
        expect(doc.find(key)).toMatchObject({ kind: 'pond', x: 90, y: 180 });

        expect(doc.undo()).toBe('colocar estanque');
        const pondsAfter = (doc.copyOf('terrain') as { ponds?: unknown[] }).ponds?.length ?? 0;
        expect(pondsAfter).toBe(pondsBefore);

        doc.redo();
        expect(doc.find(key)).toMatchObject({ kind: 'pond' });
    });
});

describe('JL-36: deshacer/rehacer del editor — mover', () => {
    it('mover un prop → undo restaura posición → redo vuelve a mover', () => {
        const doc = makeDoc();
        const orig = doc.find('prop:0')!;
        const origX = orig.x;
        const origY = orig.y;

        doc.edit('mover prop', () => doc.moveTo('prop:0', 200, 200));
        expect(doc.find('prop:0')).toMatchObject({ x: 200, y: 200 });

        expect(doc.undo()).toBe('mover prop');
        expect(doc.find('prop:0')).toMatchObject({ x: origX, y: origY });

        doc.redo();
        expect(doc.find('prop:0')).toMatchObject({ x: 200, y: 200 });
    });

    it('mover un PNJ → undo → redo', () => {
        const doc = makeDoc();
        const orig = doc.find('npc:fisher')!;

        doc.edit('mover PNJ', () => doc.moveTo('npc:fisher', 150, 150));
        expect(doc.find('npc:fisher')).toMatchObject({ x: 150, y: 150 });

        expect(doc.undo()).toBe('mover PNJ');
        expect(doc.find('npc:fisher')).toMatchObject({ x: orig.x, y: orig.y });

        doc.redo();
        expect(doc.find('npc:fisher')).toMatchObject({ x: 150, y: 150 });
    });

    it('mover un árbol generado lo adopta; undo deshace la adopción', () => {
        const doc = makeDoc();
        const tree = doc.objects().find((o) => o.key.startsWith('scatter:palma'))!;
        const origKey = tree.key;

        const newKey = doc.edit('mover árbol', () => doc.moveTo(origKey, tree.x + 5, tree.y));
        expect(newKey).toMatch(/^placement:/);
        expect(doc.find(origKey)).toBeNull(); // el scatter ya no existe
        expect(doc.find(newKey)).not.toBeNull();

        expect(doc.undo()).toBe('mover árbol');
        // Tras undo, el scatter vuelve y el placement desaparece
        expect(doc.find(origKey)).not.toBeNull();
        expect(doc.find(newKey)).toBeNull();

        doc.redo();
        expect(doc.find(origKey)).toBeNull();
        expect(doc.find(newKey)).not.toBeNull();
    });
});

describe('JL-36: deshacer/rehacer del editor — girar', () => {
    it('girar una casa 90° → undo restaura el giro → redo vuelve a girar', () => {
        const doc = makeDoc();
        const origRot = doc.find('prop:0')!.rotDeg;
        const origShape = doc.find('prop:0')!.shape as { type: 'box'; w: number; d: number; h: number };

        doc.edit('girar casa', () => doc.rotate('prop:0', 1));
        expect(doc.find('prop:0')!.rotDeg).toBe(90);
        // Girar casa intercambia w y d
        const newShape = doc.find('prop:0')!.shape as { type: 'box'; w: number; d: number; h: number };
        expect(newShape.w).toBe(origShape.d);
        expect(newShape.d).toBe(origShape.w);

        expect(doc.undo()).toBe('girar casa');
        expect(doc.find('prop:0')!.rotDeg).toBe(origRot);
        const undoShape = doc.find('prop:0')!.shape as { type: 'box'; w: number; d: number; h: number };
        expect(undoShape.w).toBe(origShape.w);
        expect(undoShape.d).toBe(origShape.d);

        doc.redo();
        expect(doc.find('prop:0')!.rotDeg).toBe(90);
    });

    it('girar un placement 15° → undo → redo', () => {
        const doc = makeDoc();
        // Adoptar un scatter para tener un placement
        const tree = doc.objects().find((o) => o.key.startsWith('scatter:palma'))!;
        const pKey = doc.edit('adoptar', () => doc.moveTo(tree.key, tree.x + 1, tree.y))!;
        const p = doc.find(pKey)!;
        const origRot = p.rotDeg;

        doc.edit('girar árbol', () => doc.rotate(pKey, 1));
        expect(doc.find(pKey)!.rotDeg).toBe(((origRot + 15) % 360 + 360) % 360);

        expect(doc.undo()).toBe('girar árbol');
        expect(doc.find(pKey)!.rotDeg).toBe(origRot);

        doc.redo();
        expect(doc.find(pKey)!.rotDeg).toBe(((origRot + 15) % 360 + 360) % 360);
    });
});

describe('JL-36: deshacer/rehacer del editor — borrar', () => {
    it('borrar un prop → undo lo restaura → redo lo borra de nuevo', () => {
        const doc = makeDoc();
        // Añadir un prop para borrarlo
        const key = doc.edit('añadir barril', () => doc.add('prop:boulder', 55, 55))!;
        expect(doc.find(key)).not.toBeNull();
        const n = doc.objects().filter((o) => o.category === 'props').length;

        expect(doc.edit('borrar barril', () => doc.remove(key))).toBe(true);
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n - 1);
        expect(doc.find(key)).toBeNull();

        expect(doc.undo()).toBe('borrar barril');
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n);
        expect(doc.find(key)).not.toBeNull();

        doc.redo();
        expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n - 1);
        expect(doc.find(key)).toBeNull();
    });

    it('borrar un placement → undo → redo', () => {
        const doc = makeDoc();
        const tree = doc.objects().find((o) => o.key.startsWith('scatter:palma'))!;
        const pKey = doc.edit('adoptar', () => doc.moveTo(tree.key, tree.x + 1, tree.y))!;
        expect(doc.find(pKey)).not.toBeNull();

        expect(doc.edit('borrar árbol', () => doc.remove(pKey))).toBe(true);
        expect(doc.find(pKey)).toBeNull();

        expect(doc.undo()).toBe('borrar árbol');
        expect(doc.find(pKey)).not.toBeNull();

        doc.redo();
        expect(doc.find(pKey)).toBeNull();
    });
});

describe('JL-36: deshacer/rehacer del editor — casos compuestos', () => {
    it('undo múltiple: tres operaciones, tres undos secuenciales', () => {
        const doc = makeDoc();
        doc.edit('colocar', () => doc.add('prop:log', 70, 70));
        doc.edit('mover', () => doc.moveTo('prop:0', 200, 200));
        doc.edit('girar', () => doc.rotate('prop:0', 1));

        expect(doc.undo()).toBe('girar');
        expect(doc.undo()).toBe('mover');
        expect(doc.undo()).toBe('colocar');
        expect(doc.undo()).toBeNull(); // no hay más pasos
        expect(doc.history.canUndo).toBe(false);
    });

    it('redo tras nuevo cambio borra el stack de rehacer', () => {
        const doc = makeDoc();
        doc.edit('colocar', () => doc.add('prop:log', 70, 70));
        doc.edit('mover', () => doc.moveTo('prop:0', 200, 200));

        doc.undo(); // deshace 'mover'
        expect(doc.history.canRedo).toBe(true);

        // Nuevo cambio: debe limpiar redo
        doc.edit('girar', () => doc.rotate('prop:0', 1));
        expect(doc.history.canRedo).toBe(false);
    });

    it('deshacer sin cambios devuelve null y no rompe', () => {
        const doc = makeDoc();
        expect(doc.undo()).toBeNull();
        expect(doc.redo()).toBeNull();
        // El documento sigue intacto
        expect(doc.find('prop:0')).not.toBeNull();
    });

    it('begin/commit sin cambios no crea paso de deshacer', () => {
        const doc = makeDoc();
        doc.begin('nada');
        doc.commit();
        expect(doc.history.canUndo).toBe(false);
    });

    it('begin/commit con cambios crea un solo paso aunque haya varias llamadas', () => {
        const doc = makeDoc();
        doc.begin('mover y girar');
        doc.dragging = true;
        doc.moveTo('prop:0', 200, 200);
        doc.rotate('prop:0', 1);
        doc.commit();
        expect(doc.history.canUndo).toBe(true);
        expect(doc.history.undoLabel).toBe('mover y girar');

        // Un solo undo restaura todo
        doc.undo();
        expect(doc.find('prop:0')).toMatchObject({ x: 110, y: 146, rotDeg: 0 });
    });

    it('dirtyFiles vacío tras undo completo', () => {
        const doc = makeDoc();
        doc.edit('colocar', () => doc.add('prop:house', 50, 50));
        expect(doc.dirtyFiles()).toContain('vegetation');

        doc.undo();
        expect(doc.dirtyFiles()).toEqual([]);

        doc.redo();
        expect(doc.dirtyFiles()).toContain('vegetation');
    });
});
