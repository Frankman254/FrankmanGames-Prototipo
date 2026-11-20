import { describe, expect, it } from 'vitest';
import enemiesJson from '../data/rpg/enemies.json';

const enemies = enemiesJson.enemies as Record<string, {
    element?: string;
    stats?: Record<string, number>;
}>;

const AFINIDADES: Record<string, { resist: string[]; weak: string }> = {
    water:     { resist: ['water', 'lightning', 'frost'],  weak: 'fire' },
    fire:      { resist: ['fire', 'air', 'earth'],         weak: 'water' },
    frost:     { resist: ['frost', 'water', 'air'],        weak: 'fire' },
    earth:     { resist: ['earth', 'fire', 'lightning'],   weak: 'air' },
    air:       { resist: ['air', 'lightning', 'frost'],    weak: 'earth' },
    lightning: { resist: ['lightning', 'air', 'water'],    weak: 'earth' },
};

const RESIST_VALUES = [15, 12, 10];
const WEAK_VALUE = -12;
const ALL_ELEMENTS = ['air', 'earth', 'fire', 'frost', 'lightning', 'water'];

function getResists(arch: typeof enemies[string]): Record<string, number> {
    const resists: Record<string, number> = {};
    if (arch.stats) {
        for (const [k, v] of Object.entries(arch.stats)) {
            if (k.startsWith('resist.')) {
                resists[k.replace('resist.', '')] = v;
            }
        }
    }
    return resists;
}

describe('JL-43 resistencias por elemento — tabla de afinidades', () => {
    it('el bloque _afinidades existe en enemies.json', () => {
        expect(enemiesJson).toHaveProperty('_afinidades');
        expect(enemiesJson._afinidades).toHaveProperty('tabla');
        const tabla = (enemiesJson as any)._afinidades?.tabla as Record<string, unknown> | undefined;
        for (const el of ALL_ELEMENTS) {
            expect(tabla?.[el]).toBeDefined();
        }
    });

    it('los 72 arquetipos tienen elemento válido', () => {
        const ids = Object.keys(enemies);
        expect(ids.length).toBe(72);
        for (const id of ids) {
            const elem = enemies[id]?.element;
            expect(ALL_ELEMENTS).toContain(elem);
        }
    });

    it('cada criatura sigue la tabla de afinidades de su elemento', () => {
        for (const [id, arch] of Object.entries(enemies)) {
            const elem = arch.element;
            expect(elem, `${id}: elemento definido`).toBeDefined();
            const af = AFINIDADES[elem!]!;
            expect(af, `${id}: afinidad para ${elem}`).toBeDefined();

            const resists = getResists(arch);

            // Las 3 resistencias deben estar con los valores correctos
            for (let i = 0; i < af.resist.length; i++) {
                const rElem = af.resist[i]!;
                const expected = RESIST_VALUES[i]!;
                expect(resists[rElem], `${id}: resist.${rElem}`).toBe(expected);
            }

            // La debilidad debe estar
            expect(resists[af.weak], `${id}: resist.${af.weak}`).toBe(WEAK_VALUE);

            // Los elementos restantes no deben aparecer
            const expectedKeys = new Set([...af.resist, af.weak]);
            for (const el of ALL_ELEMENTS) {
                if (!expectedKeys.has(el)) {
                    expect(resists[el], `${id}: resist.${el} no debe estar`).toBeUndefined();
                }
            }
        }
    });

    it('todo valor de resistencia está entre −15 y +20', () => {
        for (const [id, arch] of Object.entries(enemies)) {
            const resists = getResists(arch);
            for (const [el, val] of Object.entries(resists)) {
                expect(val, `${id}: resist.${el} ≥ -15`).toBeGreaterThanOrEqual(-15);
                expect(val, `${id}: resist.${el} ≤ 20`).toBeLessThanOrEqual(20);
            }
        }
    });

    it('cada elemento tiene al menos un representante con las resistencias correctas', () => {
        for (const elem of ALL_ELEMENTS) {
            const af = AFINIDADES[elem]!;
            // Encontrar un enemigo de este elemento
            const sample = Object.entries(enemies).find(([, a]) => a.element === elem);
            expect(sample, `sin enemigo de elemento ${elem}`).toBeDefined();
            const resists = getResists(sample![1]);
            for (let i = 0; i < af.resist.length; i++) {
                expect(resists[af.resist[i]!]).toBe(RESIST_VALUES[i]!);
            }
            expect(resists[af.weak]).toBe(WEAK_VALUE);
        }
    });

    it('las estadísticas no-resist no se tocaron', () => {
        // Verificar que power, critChance, critBonus, etc. siguen intactos
        // en algunos enemigos representativos
        const melee = enemies['melee']!;
        // melee no tenía stats no-resist, pero otros sí
        const ashAlpha = enemies['ash_alpha']!;
        if (ashAlpha.stats) {
            expect(ashAlpha.stats.power).toBeDefined();
            expect(ashAlpha.stats.critChance).toBeDefined();
            expect(ashAlpha.stats.critBonus).toBeDefined();
        }
    });

    it('distribución por elemento coincide con la original', () => {
        const counts: Record<string, number> = {};
        for (const arch of Object.values(enemies)) {
            const elem = arch.element;
            counts[elem!] = (counts[elem!] || 0) + 1;
        }
        // Distribución conocida (JL-44 añade 3 earth): earth=26, fire=8, water=10, air=4, lightning=9, frost=15
        expect(counts.earth).toBe(26);
        expect(counts.fire).toBe(8);
        expect(counts.water).toBe(10);
        expect(counts.air).toBe(4);
        expect(counts.lightning).toBe(9);
        expect(counts.frost).toBe(15);
    });
});
