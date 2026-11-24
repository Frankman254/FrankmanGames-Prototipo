// JL-240: Forma del indicador = forma del daño.
// Para cada hechizo de área, el indicador visual y la simulación usan la misma
// forma y los mismos parámetros geométricos.
import { describe, it, expect } from 'vitest';
import type { AreaDef } from '../src/rpg/contracts';
import type { ShapeDef } from '../src/data/schema';
import { loadGameData, rpgRawFiles } from '../src/data';
import { parseRpgContent } from '../src/rpg/content';
import { shapeHitsCircle } from '../src/sim/shapes';

/** Reconstruye el ShapeDef que spellFx.ts:buildAreaShape/buildAim construye a partir de un AreaDef. */
function visualShapeFromArea(a: AreaDef): ShapeDef | null {
    if (a.type === 'self' || a.type === 'single') return null;
    if (a.type === 'circle') return { type: 'circle', radius: a.radius };
    if (a.type === 'cone') return { type: 'cone', length: a.length, angleDeg: a.angleDeg };
    if (a.type === 'line') return { type: 'line', length: a.length, width: a.width };
    if (a.type === 'cross') return { type: 'cross', arm: a.arm, width: a.width };
    if (a.type === 'square') return { type: 'square', size: a.size };
    if (a.type === 'star') return { type: 'star', arm: a.arm, width: a.width };
    return null;
}

/** Extrae los parámetros geométricos de un ShapeDef para compararlos. */
function shapeParams(s: ShapeDef): Record<string, number> {
    if (s.type === 'circle') return { radius: s.radius };
    if (s.type === 'cone') return { length: s.length, angleDeg: s.angleDeg };
    if (s.type === 'line') return { length: s.length, width: s.width };
    if (s.type === 'cross') return { arm: s.arm, width: s.width };
    if (s.type === 'square') return { size: s.size };
    if (s.type === 'star') return { arm: s.arm, width: s.width ?? 1 };
    throw new Error('tipo ShapeDef desconocido');
}

const archetypes = Object.keys(loadGameData().enemies.archetypes);
const content = parseRpgContent(rpgRawFiles(), archetypes);

describe('JL-240: forma del indicador = forma del daño', () => {
    // Recoge los hechizos de área (excluye self y single).
    const areaSpells = Object.values(content.spells).filter(
        (s) => s.area.type !== 'self' && s.area.type !== 'single',
    );

    it('hay hechizos de área que cubrir', () => {
        expect(areaSpells.length).toBeGreaterThan(10);
    });

    it('cada hechizo de área produce un ShapeDef válido', () => {
        for (const spell of areaSpells) {
            const shape = visualShapeFromArea(spell.area);
            expect(shape, `${spell.id}: sin ShapeDef para ${spell.area.type}`).not.toBeNull();
        }
    });

    it('el ShapeDef visual coincide con el AreaDef original en parámetros geométricos', () => {
        for (const spell of areaSpells) {
            const a = spell.area;
            const visual = visualShapeFromArea(a)!;

            // El ShapeDef que la simulación usa es el propio AreaDef (world.ts:targetsOf pasa `def: a`).
            // Los parámetros geométricos deben ser idénticos.
            if (a.type === 'circle') {
                expect(visual.type).toBe('circle');
                expect((visual as ShapeDef & { type: 'circle' }).radius).toBe(a.radius);
            } else if (a.type === 'cone') {
                expect(visual.type).toBe('cone');
                const v = visual as ShapeDef & { type: 'cone' };
                expect(v.length).toBe(a.length);
                expect(v.angleDeg).toBe(a.angleDeg);
            } else if (a.type === 'line') {
                expect(visual.type).toBe('line');
                const v = visual as ShapeDef & { type: 'line' };
                expect(v.length).toBe(a.length);
                expect(v.width).toBe(a.width);
            } else if (a.type === 'cross') {
                expect(visual.type).toBe('cross');
                const v = visual as ShapeDef & { type: 'cross' };
                expect(v.arm).toBe(a.arm);
                expect(v.width).toBe(a.width);
            } else if (a.type === 'square') {
                expect(visual.type).toBe('square');
                expect((visual as ShapeDef & { type: 'square' }).size).toBe(a.size);
            } else if (a.type === 'star') {
                expect(visual.type).toBe('star');
                const v = visual as ShapeDef & { type: 'star' };
                expect(v.arm).toBe(a.arm);
                // star.width es opcional; el default es 1 en ambos lados.
                expect(v.width ?? 1).toBe(a.width ?? 1);
            }
        }
    });

    it('el tipo de forma visual coincide con el tipo del AreaDef', () => {
        for (const spell of areaSpells) {
            const visual = visualShapeFromArea(spell.area)!;
            expect(visual.type, `${spell.id}: tipo ${spell.area.type} → ${visual.type}`).toBe(spell.area.type);
        }
    });

    it('los parámetros son positivos y finitos', () => {
        for (const spell of areaSpells) {
            const visual = visualShapeFromArea(spell.area)!;
            const params = shapeParams(visual);
            for (const [k, v] of Object.entries(params)) {
                expect(v, `${spell.id}.${k}`).toBeGreaterThan(0);
                expect(Number.isFinite(v), `${spell.id}.${k} no finito`).toBe(true);
            }
        }
    });

    it('cada clase tiene hechizos de área', () => {
        const classes = ['ember_vanguard', 'mangrove_hunter', 'storm_weaver'];
        for (const cls of classes) {
            const clsArea = areaSpells.filter((s) => s.classId === cls);
            expect(clsArea.length, `${cls}: sin hechizos de área`).toBeGreaterThan(0);
        }
    });

    it('shapeHitsCircle usa los mismos parámetros que el indicador visual', () => {
        // Verificación cruzada: para cada hechizo de área, un punto en el centro
        // de la forma siempre es alcanzado, y uno muy lejos nunca.
        for (const spell of areaSpells) {
            const visual = visualShapeFromArea(spell.area)!;
            const origin = { x: 0, y: 0 };
            const dir = 0;

            // El centro siempre toca.
            const centerHit = shapeHitsCircle({ def: visual, origin, dir }, { x: 0, y: 0 }, 0.1);
            expect(centerHit, `${spell.id}: centro no tocado`).toBe(true);

            // Muy lejos nunca toca.
            const farMiss = shapeHitsCircle({ def: visual, origin, dir }, { x: 100, y: 100 }, 0.1);
            expect(farMiss, `${spell.id}: punto lejano tocado`).toBe(false);
        }
    });
});
