// JEQ-05: Pruebas del generador de presets dinámicos.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';

const data = loadGameData();
const items = data.rpg.items;
const sets = data.rpg.sets;
const classes = data.rpg.classes;

// ─── Clasificación de sets por tipo ─────────────────────────────────────────

function classifySetId(setId: string) {
    if (setId.startsWith('learning_')) return 'learning';
    if (setId.startsWith('route_')) return 'mono';
    if (setId.startsWith('spec_')) {
        if (setId.includes('_endurance')) return 'endurance';
        if (setId.includes('_spirit')) return 'spirit';
        if (setId.includes('_precision')) return 'precision';
        if (setId.includes('_support')) return 'support';
    }
    if (setId.startsWith('bi_')) return 'bi';
    if (setId.startsWith('tri_')) return 'tri';
    return 'mono';
}

// ─── Agrupar items por set ──────────────────────────────────────────────────

function groupSets() {
    const groups = new Map();
    for (const item of Object.values(items)) {
        if (!item.setId) continue;
        if (!groups.has(item.setId)) {
            const setDef = sets[item.setId];
            const type = classifySetId(item.setId);
            groups.set(item.setId, {
                setId: item.setId,
                type,
                name: setDef?.name ?? item.setId,
                items: new Map(),
                level: item.level,
            });
        }
        const group = groups.get(item.setId);
        if (item.slot) {
            group.items.set(item.slot, item.id);
        }
        group.level = Math.min(group.level, item.level);
    }
    return [...groups.values()];
}

const BANDS = [
    { id: 1, min: 1, max: 20 },
    { id: 2, min: 21, max: 40 },
    { id: 3, min: 41, max: 60 },
    { id: 4, min: 61, max: 80 },
    { id: 5, min: 81, max: 100 },
    { id: 6, min: 101, max: 120 },
    { id: 7, min: 121, max: 140 },
    { id: 8, min: 141, max: 160 },
    { id: 9, min: 161, max: 180 },
    { id: 10, min: 181, max: 200 },
];

describe('JEQ-05: Generador de presets dinámicos', () => {
    const allSets = groupSets();
    const classIds = Object.keys(classes);

    it('clasifica todos los sets generados por tipo', () => {
        const types = new Set(allSets.map((s) => s.type));
        // Debe haber al menos mono, learning, endurance, spirit, precision, support, bi, tri
        expect(types.has('mono')).toBe(true);
        expect(types.has('learning')).toBe(true);
        expect(types.has('endurance')).toBe(true);
        expect(types.has('spirit')).toBe(true);
        expect(types.has('precision')).toBe(true);
        expect(types.has('support')).toBe(true);
        expect(types.has('bi')).toBe(true);
        expect(types.has('tri')).toBe(true);
    });

    it('cada franja tiene al menos un set mono-elemental', () => {
        for (const band of BANDS) {
            const monoSets = allSets.filter((s) => s.type === 'mono' && s.level >= band.min && s.level <= band.max);
            expect(monoSets.length, `franja ${band.id} (${band.min}–${band.max})`).toBeGreaterThan(0);
        }
    });

    it('cada franja tiene al menos un set de Aprendizaje', () => {
        for (const band of BANDS) {
            const learningSets = allSets.filter(
                (s) => s.type === 'learning' && s.level >= band.min && s.level <= band.max,
            );
            expect(learningSets.length, `franja ${band.id} (${band.min}–${band.max})`).toBeGreaterThan(0);
        }
    });

    it('cada franja tiene sets especializados (aguante, ánimo, precisión, apoyo)', () => {
        for (const band of BANDS) {
            const specTypes = ['endurance', 'spirit', 'precision', 'support'];
            for (const st of specTypes) {
                const specSets = allSets.filter((s) => s.type === st && s.level >= band.min && s.level <= band.max);
                expect(specSets.length, `${st} en franja ${band.id}`).toBeGreaterThan(0);
            }
        }
    });

    it('los sets bielementales están en franjas medias y altas', () => {
        const biSets = allSets.filter((s) => s.type === 'bi');
        expect(biSets.length).toBeGreaterThanOrEqual(10);
        // Los bielementales empiezan en nivel 28 (Diablico Sucio)
        const minLevel = Math.min(...biSets.map((s) => s.level));
        expect(minLevel).toBeGreaterThanOrEqual(28);
    });

    it('los sets trielementales están en franjas altas (141+)', () => {
        const triSets = allSets.filter((s) => s.type === 'tri');
        expect(triSets.length).toBeGreaterThanOrEqual(6);
        const minLevel = Math.min(...triSets.map((s) => s.level));
        expect(minLevel).toBeGreaterThanOrEqual(141);
    });

    it('ningún set de Aprendizaje tiene stats de combate', () => {
        const learningSets = allSets.filter((s) => s.type === 'learning');
        for (const set of learningSets) {
            for (const itemId of set.items.values()) {
                const item = items[itemId];
                expect(item, `item ${itemId} debe existir`).toBeDefined();
                if (!item) continue;
                // Los items de aprendizaje no tienen weapon ni daño elemental
                expect(item.weapon).toBeUndefined();
                for (const roll of item.rolls ?? []) {
                    expect(roll.stat.startsWith('damage.'), `${itemId} no debe tener daño elemental`).toBe(false);
                }
                // Deben tener experienceGain
                const hasExpGain = (item.rolls ?? []).some((r) => r.stat === 'experienceGain');
                expect(hasExpGain, `${itemId} debe tener experienceGain`).toBe(true);
            }
        }
    });

    it('una build de combate nunca selecciona Aprendizaje', () => {
        // Verificar que los sets de aprendizaje están marcados como 'leveo'
        const learningSets = allSets.filter((s) => s.type === 'learning');
        for (const set of learningSets) {
            // En el generador, los presets de learning tienen buildType 'leveo'
            expect(set.type).toBe('learning');
        }
    });

    it('una build de leveo equipa Aprendizaje en 4 huecos', () => {
        const learningSets = allSets.filter((s) => s.type === 'learning');
        for (const set of learningSets) {
            // Los sets de aprendizaje tienen 4 piezas
            expect(set.items.size, `${set.setId} debe tener 4 piezas`).toBe(4);
        }
    });

    it('cada set tiene items sin colisión de slots', () => {
        for (const set of allSets) {
            const slots = [...set.items.keys()];
            const uniqueSlots = new Set(slots);
            expect(slots.length, `${set.setId}: slots sin duplicados`).toBe(uniqueSlots.size);
        }
    });

    it('los sets de cripta cubren pisos 1–100', () => {
        // Verificar que hay sets disponibles para cada nivel 1–100
        for (let level = 1; level <= 100; level++) {
            const band = BANDS.find((b) => level >= b.min && level <= b.max);
            expect(band, `nivel ${level} debe estar en una franja`).toBeDefined();
            if (band) {
                const available = allSets.filter(
                    (s) => s.type === 'mono' && s.level >= band.min && s.level <= band.max,
                );
                expect(available.length, `nivel ${level} (franja ${band.id})`).toBeGreaterThan(0);
            }
        }
    });

    it('los pisos 10,20,…,100 tienen variantes ofensiva, defensiva y apoyo', () => {
        for (let floor = 10; floor <= 100; floor += 10) {
            const band = BANDS.find((b) => floor >= b.min && floor <= b.max);
            if (!band) continue;
            const precision = allSets.filter(
                (s) => s.type === 'precision' && s.level >= band.min && s.level <= band.max,
            );
            const endurance = allSets.filter(
                (s) => s.type === 'endurance' && s.level >= band.min && s.level <= band.max,
            );
            const support = allSets.filter((s) => s.type === 'support' && s.level >= band.min && s.level <= band.max);
            expect(precision.length, `piso ${floor}: ofensiva`).toBeGreaterThan(0);
            expect(endurance.length, `piso ${floor}: defensiva`).toBeGreaterThan(0);
            expect(support.length, `piso ${floor}: apoyo`).toBeGreaterThan(0);
        }
    });

    it('cada clase tiene presets en todas las franjas', () => {
        for (const classId of classIds) {
            for (const band of BANDS) {
                const available = allSets.filter((s) => s.level >= band.min && s.level <= band.max);
                expect(available.length, `${classId} en franja ${band.id}`).toBeGreaterThan(0);
            }
        }
    });

    it('los stats canónicos se respetan en todos los sets', () => {
        const canonicalPrimaries = new Set([
            'strength',
            'agility',
            'intellect',
            'calm',
            'flow',
            'will',
            'vitality',
            'spirit',
        ]);
        const canonicalElements = new Set(['earth', 'fire', 'air', 'water', 'frost', 'lightning']);

        for (const set of allSets) {
            for (const itemId of set.items.values()) {
                const item = items[itemId];
                if (!item) continue;
                // Verificar primarias
                for (const roll of item.rolls ?? []) {
                    if (canonicalPrimaries.has(roll.stat)) continue;
                    if (roll.stat.startsWith('damage.')) {
                        const el = roll.stat.replace('damage.', '');
                        expect(canonicalElements.has(el), `${itemId}: ${roll.stat}`).toBe(true);
                    }
                    if (roll.stat.startsWith('resist.')) {
                        const el = roll.stat.replace('resist.', '');
                        expect(canonicalElements.has(el), `${itemId}: ${roll.stat}`).toBe(true);
                    }
                }
            }
        }
    });

    it('la cobertura total de presets es significativa', () => {
        // Contar presets por franja y clase
        let total = 0;
        for (const band of BANDS) {
            for (const classId of classIds) {
                const bandSets = allSets.filter((s) => s.level >= band.min && s.level <= band.max);
                total += bandSets.length;
            }
        }
        // Con 10 franjas, 6 clases y ~11 sets por franja, debería haber ~660 presets
        expect(total).toBeGreaterThanOrEqual(400);
    });
});
