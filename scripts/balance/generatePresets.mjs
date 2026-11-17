#!/usr/bin/env node
// JEQ-05: Generador de presets dinámicos para todos los tipos de sets.
// Produce presets por franja y clase cubriendo:
// - 6 mono-elementales por franja
// - 4 especializados (aguante, ánimo, precisión, apoyo) por franja
// - Aprendizaje por franja (builds de leveo)
// - Bielementales y trielementales disponibles en la franja
// Reglas:
// - Una build de combate nunca selecciona equipo de Aprendizaje.
// - Una build de leveo equipa Aprendizaje en 4 huecos y se rotula como dependiente de grupo.
// - Para cada piso 1-100 de la cripta, una build legal por nivel.
// - Variantes ofensiva, defensiva y apoyo en pisos 10,20,…,100.
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const file = (name) => new URL(name, ROOT);
const itemsDoc = JSON.parse(readFileSync(file('data/rpg/items.json'), 'utf8'));
const setsDoc = JSON.parse(readFileSync(file('data/rpg/sets.json'), 'utf8'));
const classesDoc = JSON.parse(readFileSync(file('data/rpg/classes.json'), 'utf8'));

const WRITE = process.argv.includes('--write');

// ─── Clasificación de sets por tipo ─────────────────────────────────────────

function classifySetId(setId) {
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
    return 'mono'; // sets manuales se tratan como mono por defecto
}

const SET_TYPE_ROLE = {
    mono: 'daño',
    learning: 'leveo',
    endurance: 'aguante',
    spirit: 'ánimo',
    precision: 'precisión',
    support: 'apoyo',
    bi: 'daño dual',
    tri: 'daño triple',
};

// ─── Agrupar items por set ──────────────────────────────────────────────────

function groupSets() {
    const groups = new Map();
    for (const item of Object.values(itemsDoc.items)) {
        if (!item.setId) continue;
        if (!groups.has(item.setId)) {
            const setDef = setsDoc.sets[item.setId];
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

// ─── Clases y stats principales ─────────────────────────────────────────────

function getClasses() {
    return Object.entries(classesDoc.classes).map(([id, cls]) => ({
        id,
        name: cls.name,
        mainStat: cls.mainStat ?? 'strength',
    }));
}

// ─── Franjas de nivel ───────────────────────────────────────────────────────

const BANDS = [
    { id: 1, min: 1, max: 20, label: '1–20' },
    { id: 2, min: 21, max: 40, label: '21–40' },
    { id: 3, min: 41, max: 60, label: '41–60' },
    { id: 4, min: 61, max: 80, label: '61–80' },
    { id: 5, min: 81, max: 100, label: '81–100' },
    { id: 6, min: 101, max: 120, label: '101–120' },
    { id: 7, min: 121, max: 140, label: '121–140' },
    { id: 8, min: 141, max: 160, label: '141–160' },
    { id: 9, min: 161, max: 180, label: '161–180' },
    { id: 10, min: 181, max: 200, label: '181–200' },
];

function setsForBand(sets, band) {
    return sets.filter((s) => s.level >= band.min && s.level <= band.max);
}

// ─── Generar presets por franja y clase ─────────────────────────────────────

function generatePresets() {
    const sets = groupSets();
    const classes = getClasses();
    const presets = [];

    for (const band of BANDS) {
        for (const cls of classes) {
            const bandSets = setsForBand(sets, band);

            // Mono-elementales disponibles en la franja
            const monoSets = bandSets.filter((s) => s.type === 'mono');
            for (const set of monoSets) {
                presets.push({
                    id: `preset_${band.id}_${cls.id}_${set.setId}`,
                    classId: cls.id,
                    level: Math.floor((band.min + band.max) / 2),
                    setId: set.setId,
                    setType: 'mono',
                    role: SET_TYPE_ROLE.mono,
                    buildType: 'combat',
                    band: band.id,
                });
            }

            // Especializados disponibles en la franja
            const specTypes = ['endurance', 'spirit', 'precision', 'support'];
            for (const st of specTypes) {
                const specSets = bandSets.filter((s) => s.type === st);
                for (const set of specSets) {
                    presets.push({
                        id: `preset_${band.id}_${cls.id}_${set.setId}`,
                        classId: cls.id,
                        level: Math.floor((band.min + band.max) / 2),
                        setId: set.setId,
                        setType: st,
                        role: SET_TYPE_ROLE[st],
                        buildType: 'combat',
                        band: band.id,
                    });
                }
            }

            // Aprendizaje (build de leveo)
            const learningSets = bandSets.filter((s) => s.type === 'learning');
            for (const set of learningSets) {
                presets.push({
                    id: `preset_${band.id}_${cls.id}_${set.setId}_leveo`,
                    classId: cls.id,
                    level: Math.floor((band.min + band.max) / 2),
                    setId: set.setId,
                    setType: 'learning',
                    role: SET_TYPE_ROLE.learning,
                    buildType: 'leveo',
                    band: band.id,
                });
            }

            // Bielementales disponibles en la franja
            const biSets = bandSets.filter((s) => s.type === 'bi');
            for (const set of biSets) {
                presets.push({
                    id: `preset_${band.id}_${cls.id}_${set.setId}`,
                    classId: cls.id,
                    level: Math.floor((band.min + band.max) / 2),
                    setId: set.setId,
                    setType: 'bi',
                    role: SET_TYPE_ROLE.bi,
                    buildType: 'combat',
                    band: band.id,
                });
            }

            // Trielementales disponibles en la franja
            const triSets = bandSets.filter((s) => s.type === 'tri');
            for (const set of triSets) {
                presets.push({
                    id: `preset_${band.id}_${cls.id}_${set.setId}`,
                    classId: cls.id,
                    level: Math.floor((band.min + band.max) / 2),
                    setId: set.setId,
                    setType: 'tri',
                    role: SET_TYPE_ROLE.tri,
                    buildType: 'combat',
                    band: band.id,
                });
            }
        }
    }

    return presets;
}

// ─── Builds de cripta por piso ──────────────────────────────────────────────

function generateCryptBuilds() {
    const sets = groupSets();
    const classes = getClasses();
    const builds = [];

    for (let floor = 1; floor <= 100; floor++) {
        const level = floor; // piso N ≈ nivel N
        const band = BANDS.find((b) => level >= b.min && level <= b.max) ?? BANDS[BANDS.length - 1];
        const bandSets = setsForBand(sets, band);

        for (const cls of classes) {
            // Build base legal para el piso
            const monoSets = bandSets.filter((s) => s.type === 'mono');
            if (monoSets.length > 0) {
                builds.push({
                    id: `crypt_${floor}_${cls.id}_base`,
                    classId: cls.id,
                    level,
                    setId: monoSets[0].setId,
                    setType: 'mono',
                    role: 'daño',
                    buildType: 'combat',
                    floor,
                });
            }

            // Variantes en pisos 10, 20, …, 100
            if (floor % 10 === 0) {
                // Ofensiva
                const specPrecision = bandSets.filter((s) => s.type === 'precision');
                if (specPrecision.length > 0) {
                    builds.push({
                        id: `crypt_${floor}_${cls.id}_offense`,
                        classId: cls.id,
                        level,
                        setId: specPrecision[0].setId,
                        setType: 'precision',
                        role: 'precisión',
                        buildType: 'combat',
                        floor,
                    });
                }

                // Defensiva
                const specEndurance = bandSets.filter((s) => s.type === 'endurance');
                if (specEndurance.length > 0) {
                    builds.push({
                        id: `crypt_${floor}_${cls.id}_defense`,
                        classId: cls.id,
                        level,
                        setId: specEndurance[0].setId,
                        setType: 'endurance',
                        role: 'aguante',
                        buildType: 'combat',
                        floor,
                    });
                }

                // Apoyo
                const specSupport = bandSets.filter((s) => s.type === 'support');
                if (specSupport.length > 0) {
                    builds.push({
                        id: `crypt_${floor}_${cls.id}_support`,
                        classId: cls.id,
                        level,
                        setId: specSupport[0].setId,
                        setType: 'support',
                        role: 'apoyo',
                        buildType: 'combat',
                        floor,
                    });
                }
            }
        }
    }

    return builds;
}

// ─── Validación ──────────────────────────────────────────────────────────────

function validatePresets(presets) {
    const errors = [];
    const seen = new Set();

    for (const p of presets) {
        // ID único
        if (seen.has(p.id)) {
            errors.push(`ID duplicado: ${p.id}`);
        }
        seen.add(p.id);

        // Set existe
        if (!setsDoc.sets[p.setId]) {
            errors.push(`Set desconocido: ${p.setId} en ${p.id}`);
        }

        // Build de combate no usa Aprendizaje
        if (p.buildType === 'combat' && p.setType === 'learning') {
            errors.push(`Build de combate con Aprendizaje: ${p.id}`);
        }

        // Build de leveo usa Aprendizaje
        if (p.buildType === 'leveo' && p.setType !== 'learning') {
            errors.push(`Build de leveo sin Aprendizaje: ${p.id}`);
        }

        // Nivel dentro de la franja
        const band = BANDS[p.band - 1];
        if (band && (p.level < band.min || p.level > band.max)) {
            errors.push(`Nivel ${p.level} fuera de franja ${band.label} en ${p.id}`);
        }
    }

    return errors;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const presets = generatePresets();
const cryptBuilds = generateCryptBuilds();
const allPresets = [...presets, ...cryptBuilds];
const errors = validatePresets(allPresets);

console.log(`Presets por franja: ${presets.length}`);
console.log(`Builds de cripta: ${cryptBuilds.length}`);
console.log(`Total: ${allPresets.length}`);

if (errors.length > 0) {
    console.error(`Errores de validación: ${errors.length}`);
    for (const e of errors.slice(0, 10)) console.error(`  - ${e}`);
    if (errors.length > 10) console.error(`  ... y ${errors.length - 10} más`);
    process.exit(1);
}

// Estadísticas por tipo
const byType = {};
for (const p of allPresets) {
    byType[p.setType] = (byType[p.setType] || 0) + 1;
}
console.log('Por tipo:', JSON.stringify(byType, null, 2));

// Estadísticas por buildType
const byBuildType = {};
for (const p of allPresets) {
    byBuildType[p.buildType] = (byBuildType[p.buildType] || 0) + 1;
}
console.log('Por buildType:', JSON.stringify(byBuildType, null, 2));

if (WRITE) {
    writeFileSync(file('data/dev/presets_generated.json'), JSON.stringify(allPresets, null, 2));
    console.log('Escrito en data/dev/presets_generated.json');
}
