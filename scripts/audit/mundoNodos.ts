// MAP-NOD-01 (creador, 2026-11-20: «podemos hacer algo para yo entender el proyecto por nodos»).
// Saca de data/ el mundo como grafo: provincia → zona → piedras → monstruos (y su modelo), con
// las incoherencias marcadas. SOLO lectura: no toca data/ ni src/.
//
// Ejecución: npx vite-node scripts/audit/mundoNodos.ts
// Escribe work/claude-map-nod-01/mundo.json y mapa_nodos.html (plantilla: mundoNodos.plantilla.html).
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadWorldData } from '../../src/data/worldData';
import { regionAt } from '../../src/world/atlas';
import assetsJson from '../../data/assets.json';
import rpgEnemiesJson from '../../data/rpg/enemies.json';
import stonesJson from '../../data/stones.json';
import zonesJson from '../../data/zones.json';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'work', 'claude-map-nod-01');

type Area = { type: 'circle'; x: number; y: number; radius: number } | { type: 'rect'; x0: number; y0: number; x1: number; y1: number };
interface Zone {
    id: string;
    name?: string;
    _rol?: string;
    planned?: string;
    safe?: boolean;
    levelMin?: number;
    levelMax?: number;
    climate?: string;
    extends?: string;
    areas?: Area[];
    spawns?: { archetype: string; weight: number; time?: string }[];
}

const atlas = loadWorldData().atlas;
const zones = (zonesJson as unknown as { zones: Zone[] }).zones;
const enemies = (rpgEnemiesJson as unknown as { enemies: Record<string, { name: string; level: number; element?: string }> }).enemies;
const assets = (assetsJson as unknown as { assets: Record<string, { template?: string; model?: string }> }).assets;
const stones = (stonesJson as unknown as { stones: { id: string; name: string; x: number; y: number }[] }).stones;

const GENERIC = new Set(['wolf', 'archer', 'humanoid', 'shaman', 'imp']);
const center = (a: Area) => (a.type === 'circle' ? { x: a.x, y: a.y } : { x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 });
const regionOf = (x: number, y: number) => regionAt(atlas, x, y)?.id ?? 'mar';

/** Prefijo de arquetipo → hábitat de origen (la «familia» de hoy es la zona de donde vino). */
const ORIGIN: Record<string, string> = {
    chame: 'manglar',
    boquete: 'cafetal de montaña',
    cerropunta: 'neblina y huertas',
    baru: 'cumbre volcánica',
    darien: 'selva húmeda',
    bocas: 'mar Caribe e islas',
    perlas: 'mar Pacífico e islas',
    fortuna: 'páramo frío',
    ancon: 'ciudad y leyenda',
    cripta: 'cripta',
    espejo: 'diablicos (máscara)',
};
const originOf = (id: string) => ORIGIN[id.split('_')[0]!] ?? 'Azuero genérico';

const zoneHabitat: Record<string, string> = {
    raspadura: 'pueblo',
    azuero: 'sabana y bosque seco',
    iguanera: 'costa e isla',
    iguanera_muelle: 'muelle',
    pedasol: 'pueblo costero',
    punta_venada: 'pueblo costero',
    cambutal: 'pueblo costero',
    canajagua: 'bosque seco de cerro',
    chitri: 'pueblo',
    cane_pese: 'cañaveral',
    parrita: 'sabana y salinas',
    ocua: 'sabana y cerros',
    macanas: 'ciénaga',
    sarigua: 'desierto salino',
    sabanas: 'sabana y bosque seco',
};

/** Provincia real del lugar en que se inspira la zona (Panamá), para comparar con el atlas. */
const REAL_PROVINCE: Record<string, string> = {
    raspadura: 'los_santos',
    azuero: 'los_santos',
    iguanera: 'los_santos',
    iguanera_muelle: 'los_santos',
    pedasol: 'los_santos',
    punta_venada: 'los_santos',
    cambutal: 'los_santos',
    canajagua: 'los_santos',
    sabanas: 'los_santos',
    chitri: 'herrera',
    cane_pese: 'herrera',
    parrita: 'herrera',
    ocua: 'herrera',
    macanas: 'herrera',
    sarigua: 'herrera',
};

const creatures = Object.entries(enemies)
    .filter(([id]) => !id.startsWith('_'))
    .map(([id, e]) => {
        const a = assets[`enemy.${id}`];
        const model = a?.model ?? a?.template ?? '—';
        return { id, name: e.name, level: e.level, element: e.element ?? null, model, ownModel: !GENERIC.has(model) && model !== '—', origin: originOf(id) };
    });

const zoneNodes = zones.map((z) => {
    const areas = z.areas ?? [];
    const regions = [...new Set(areas.map((a) => center(a)).map((c) => regionOf(c.x, c.y)))];
    const spawns = (z.spawns ?? []).map((s) => s.archetype);
    const origins = [...new Set(spawns.map(originOf))];
    const habitat = zoneHabitat[z.id] ?? null;
    const issues: string[] = [];
    if (!areas.length) issues.push('Sin áreas en el mapa: solo existe en datos');
    if (regions.includes('mar')) issues.push('El centro de su área cae en el mar según el atlas');
    const real = REAL_PROVINCE[z.id];
    const land = regions.filter((r) => r !== 'mar');
    if (real && land.length && !land.includes(real)) issues.push(`Su lugar real es de ${real}, pero el atlas la pone en ${land.join(', ')}`);
    if (z.extends && origins.some((o) => o !== 'Azuero genérico'))
        issues.push(`Hereda los monstruos de «${z.extends}» (${origins.join(', ')}) aunque su hábitat es ${habitat ?? '¿?'}`);
    return {
        id: z.id,
        name: z.name ?? z.id,
        safe: !!z.safe,
        levels: z.levelMin != null ? [z.levelMin, z.levelMax] : null,
        climate: z.climate ?? null,
        habitat,
        extends: z.extends ?? null,
        regions,
        rol: z._rol ?? null,
        planned: z.planned ?? null,
        spawns,
        stones: stones
            .filter((s) => areas.some((a) => (a.type === 'circle' ? Math.hypot(s.x - a.x, s.y - a.y) <= a.radius : s.x >= a.x0 && s.x <= a.x1 && s.y >= a.y0 && s.y <= a.y1)))
            .map((s) => s.id),
        realProvince: real ?? null,
        issues,
    };
});

const provinces = atlas.regions
    .filter((r) => r.kind !== 'pais')
    .map((r) => {
        const raw = r as unknown as { official?: string; name: string; kind: string; levels?: number[]; biome?: unknown; wildlife?: unknown; climate?: string };
        return { id: r.id, name: raw.name, official: raw.official ?? null, kind: raw.kind, levels: raw.levels ?? null, climate: raw.climate ?? null, biome: raw.biome ?? null, wildlife: raw.wildlife ?? null };
    });

/** Tamaño de cada carpeta de src/ (archivos .ts y líneas), para la vista «Proyecto». */
function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
        const p = path.join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });
}
const code = Object.fromEntries(
    readdirSync(path.join(ROOT, 'src'))
        .filter((d) => statSync(path.join(ROOT, 'src', d)).isDirectory())
        .map((d) => {
            const files = walk(path.join(ROOT, 'src', d));
            const lines = files.reduce((n, f) => n + readFileSync(f, 'utf8').split('\n').length, 0);
            return [d, { files: files.length, lines }];
        }),
);

const out = {
    code,
    generated: new Date().toISOString().slice(0, 10),
    provinces,
    zones: zoneNodes,
    stones: stones.map((s) => ({ ...s, region: regionOf(s.x, s.y) })),
    creatures,
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'mundo.json'), `${JSON.stringify(out, null, 1)}\n`);
const template = readFileSync(path.join(ROOT, 'scripts', 'audit', 'mundoNodos.plantilla.html'), 'utf8');
writeFileSync(path.join(OUT_DIR, 'mapa_nodos.html'), template.replace('/*MUNDO*/null', JSON.stringify(out)));
console.log(`${provinces.length} territorios, ${zoneNodes.length} zonas, ${stones.length} piedras, ${creatures.length} criaturas → ${OUT_DIR}/mundo.json`);
