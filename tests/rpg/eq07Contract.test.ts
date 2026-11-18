// EQ-07 (creador, 2026-11-18): contrato del equipo 1–200. La curva y los factores
// viven en data/balance/equipmentCurve.json; el generador es
// scripts/balance/eq07Equipment.mjs. Esta prueba lee el catálogo ya escrito.
import { describe, expect, it } from 'vitest';
import curveDoc from '../../data/balance/equipmentCurve.json';
import { loadGameData } from '../../src/data';
import { ELEMENTS, type Element } from '../../src/rpg/contracts';

const data = loadGameData();
const items = Object.values(data.rpg.items);
const PRIMARY: Record<Element, string> = {
    earth: 'strength',
    fire: 'intellect',
    air: 'agility',
    water: 'flow',
    frost: 'calm',
    lightning: 'will',
};
const PRIMARIES = Object.values(PRIMARY);
const PATTERN = new Set(['tulivieja_staff']);
const gear = items.filter(
    (i) => i.slot && i.slot !== 'mount' && !i.setId?.startsWith('learning_') && !PATTERN.has(i.id),
);
const lines = (i: (typeof items)[number]): string[] => [
    ...i.implicit.map((l) => l.stat),
    ...i.rolls.map((r) => r.stat),
];

type Curve = keyof typeof curveDoc.curve;
function curveOf(stat: string): Curve | null {
    if (PRIMARIES.includes(stat)) return 'primary';
    if (stat.startsWith('damage.') || stat === 'elementalDamage') return 'damage';
    if (stat.startsWith('resist.')) return 'resist';
    if (stat === 'escape') return 'tackle';
    if (['slowResist', 'castStability', 'healingPower'].includes(stat)) return 'percentUtility';
    if (stat === 'healthRegen' || stat === 'resourceRegen') return 'regen';
    return stat in curveDoc.curve ? (stat as Curve) : null;
}
/** Máximo que la curva permite a una línea de una pieza principal de ese nivel (en las unidades guardadas). */
function ceiling(stat: string, level: number): number {
    const [lo, hi] = curveDoc.curve[curveOf(stat)!] as number[][];
    const t = Math.max(0, Math.min(1, (level - 1) / 199));
    const top = lo![3]! + (hi![3]! - lo![3]!) * t;
    const v = Math.max(2, Math.round(top));
    return curveDoc.fraction.includes(stat) ? v / 100 : v;
}

describe('EQ-07: contrato del equipo', () => {
    it('ninguna pieza repite una estadística', () => {
        const bad = gear.filter((i) => new Set(lines(i)).size !== lines(i).length).map((i) => i.id);
        expect(bad).toEqual([]);
    });

    it('las primarias de una pieza son de elementos distintos y como mucho tres', () => {
        for (const i of gear) {
            const p = lines(i).filter((s) => PRIMARIES.includes(s));
            expect(p.length, i.id).toBeLessThanOrEqual(3);
        }
    });

    it('un arma da la primaria de su elemento y ninguna otra', () => {
        for (const i of gear.filter((g) => g.weapon)) {
            const p = lines(i).filter((s) => PRIMARIES.includes(s));
            expect(p, i.id).toEqual([PRIMARY[i.weapon!.element]]);
        }
    });

    it('la Potencia solo va en piezas sin primaria, con daño a todos los elementos', () => {
        for (const i of gear.filter((g) => lines(g).includes('power'))) {
            expect(
                lines(i).some((s) => PRIMARIES.includes(s)),
                i.id,
            ).toBe(false);
            expect(lines(i), i.id).toContain('elementalDamage');
        }
    });

    it('cada línea cabe en la curva × ranura (con la parte de la primaria en multielemento)', () => {
        const over: string[] = [];
        for (const i of gear) {
            const factor = curveDoc.slotFactor[i.slot as keyof typeof curveDoc.slotFactor] ?? 1;
            const nPrim = lines(i).filter((s) => PRIMARIES.includes(s)).length;
            const share = curveDoc.elementShare[String(Math.max(1, nPrim)) as '1' | '2' | '3'];
            for (const r of i.rolls) {
                if (!curveOf(r.stat)) continue;
                const part = PRIMARIES.includes(r.stat) ? share : 1;
                const cap = ceiling(r.stat, i.level) * factor * part;
                const slack = curveDoc.fraction.includes(r.stat) ? 0.01 : 1;
                if (r.max > Math.max(cap + slack, ceiling(r.stat, 1)) || r.min > r.max)
                    over.push(`${i.id} ${r.stat} ${r.min}–${r.max} > ${cap.toFixed(2)}`);
            }
        }
        expect(over).toEqual([]);
    });

    it('una pieza de nivel 200 llega a las cifras del creador', () => {
        // El techo de la curva en 200 es el de las cifras: primaria 120, Vida 500, daño 20,
        // resistencia 10 %, Espíritu 70, crítico 10 %, Hallazgo 30.
        expect(ceiling('agility', 200)).toBe(120);
        expect(ceiling('maxHealth', 200)).toBe(500);
        expect(ceiling('damage.air', 200)).toBe(20);
        expect(ceiling('resist.air', 200)).toBe(10);
        expect(ceiling('spirit', 200)).toBe(70);
        expect(ceiling('critChance', 200)).toBe(0.1);
        expect(ceiling('discovery', 200)).toBe(30);
    });

    it('el crítico nunca está en todas las piezas de un conjunto', () => {
        const bySet = new Map<string, typeof gear>();
        for (const i of gear.filter((g) => g.setId)) bySet.set(i.setId!, [...(bySet.get(i.setId!) ?? []), i]);
        for (const [id, pieces] of bySet)
            if (pieces.length >= 2)
                expect(
                    pieces.every((p) => lines(p).includes('critChance')),
                    id,
                ).toBe(false);
    });

    it('toda pieza de agua da Hallazgo', () => {
        for (const i of gear.filter((g) => lines(g).includes('flow') || g.weapon?.element === 'water'))
            expect(lines(i), i.id).toContain('discovery');
    });

    it('cada franja de 20 niveles tiene, por elemento, sombrero, pechera, guantes, botas, anillo, amuleto, cinturón, capa y arma', () => {
        const missing: string[] = [];
        for (let band = 1; band <= 10; band++)
            for (const el of ELEMENTS) {
                const inBand = gear.filter(
                    (g) =>
                        g.level > (band - 1) * 20 &&
                        g.level <= band * 20 &&
                        (g.weapon?.element === el || lines(g).includes(PRIMARY[el])),
                );
                for (const slot of ['head', 'chest', 'hands', 'feet', 'ring', 'amulet', 'waist', 'back'])
                    if (!inBand.some((g) => g.slot === slot)) missing.push(`${band}:${el}:${slot}`);
                if (!inBand.some((g) => g.weapon?.element === el)) missing.push(`${band}:${el}:weapon`);
            }
        expect(missing).toEqual([]);
    });
});
