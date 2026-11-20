// Auditoría de solo lectura del mapa contra el atlas (MAP-GEO-01).
// Cruza zonas, piedras, caminos y provincias con regionAt() de atlas.ts.
// No modifica data/ ni src/. Escribe solo en work/junie-map-geo-01/.
//
// Ejecución: npx vite-node scripts/audit/mapGeo.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { regionAt, farHeight, type AtlasDef } from '../../src/world/atlas';
import zonesJson from '../../data/zones.json';
import stonesJson from '../../data/stones.json';
import terrainJson from '../../data/terrain.json';
import panamaJson from '../../data/panama.json';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'work', 'junie-map-geo-01');
mkdirSync(OUT, { recursive: true });

const atlas: AtlasDef = panamaJson as unknown as AtlasDef;
const zones = zonesJson.zones as Array<Record<string, unknown>>;
const stones = stonesJson.stones as Array<{ id: string; name: string; x: number; y: number }>;
const paths = terrainJson.paths as Array<{ width?: number; senda?: boolean; points: Array<{ x: number; y: number }> }>;
const seaLevel = panamaJson.seaLevel;

// --- Helpers geométricos ---

function dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Puntos de un área (círculo o rect)
function areaPoints(area: Record<string, unknown>): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    if (area.type === 'circle') {
        const cx = area.x as number, cy = area.y as number, r = area.radius as number;
        pts.push({ x: cx, y: cy });
        // 8 puntos del perímetro
        for (let a = 0; a < 8; a++) {
            const ang = (a * Math.PI) / 4;
            pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
        }
    } else if (area.type === 'rect') {
        const x0 = area.x0 as number, y0 = area.y0 as number;
        const x1 = area.x1 as number, y1 = area.y1 as number;
        pts.push({ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x0, y: y1 }, { x: x1, y: y1 });
        pts.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
    }
    return pts;
}

// Todos los puntos de una zona
function zonePoints(z: Record<string, unknown>): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    const areas = z.areas as Array<Record<string, unknown>> | undefined;
    if (areas) {
        for (const a of areas) pts.push(...areaPoints(a));
    }
    return pts;
}

// Muestra puntos a lo largo de un camino (cada 10 m)
function pathSamples(p: { points: Array<{ x: number; y: number }> }): Array<{ x: number; y: number }> {
    const samples: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < p.points.length; i++) {
        const pt = p.points[i];
        if (pt) samples.push(pt);
    }
    // Interpola entre puntos consecutivos
    for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i];
        const b = p.points[i + 1];
        if (!a || !b) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const steps = Math.floor(d / 10);
        for (let s = 1; s < steps; s++) {
            const t = s / steps;
            samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
    }
    return samples;
}

// --- Incoherencias ---

interface Finding {
    category: number;
    id: string;
    x: number;
    y: number;
    severity: 'alta' | 'media' | 'baja';
    message: string;
}

const findings: Finding[] = [];

// Categoría 1: caminos con un extremo que no llega a un pueblo, piedra, otro camino ni entrada
{
    // Colecciona todos los puntos de interés
    const poi: Array<{ x: number; y: number; label: string }> = [];
    // Pueblos (zonas safe)
    for (const z of zones) {
        if (z.safe === true) {
            const pts = zonePoints(z);
            for (const p of pts) poi.push({ x: p.x, y: p.y, label: `pueblo/${z.id}` });
        }
    }
    // Piedras
    for (const s of stones) poi.push({ x: s.x, y: s.y, label: `piedra/${s.id}` });
    // Entradas de cripta (estructuras de tipo crypt si las hay)

    // Extremos de cada camino
    for (let pi = 0; pi < paths.length; pi++) {
        const p = paths[pi];
        if (!p) continue;
        const label = `camino/${pi}`;
        const firstPt = p.points[0];
        const lastPt = p.points[p.points.length - 1];
        if (!firstPt || !lastPt) continue;
        const ends = [firstPt, lastPt];
        for (const end of ends) {
            // Busca POI cercano (< 15 m) u otro camino cercano
            let connected = false;
            for (const po of poi) {
                if (dist(end.x, end.y, po.x, po.y) < 15) { connected = true; break; }
            }
            if (!connected) {
                // Revisa si otro camino tiene un punto cercano
                for (let pj = 0; pj < paths.length; pj++) {
                    if (pj === pi) continue;
                    const otherPath = paths[pj];
                    if (!otherPath) continue;
                    for (const q of otherPath.points) {
                        if (q && dist(end.x, end.y, q.x, q.y) < 15) { connected = true; break; }
                    }
                    if (connected) break;
                }
            }
            if (!connected) {
                findings.push({
                    category: 1,
                    id: `${label}-extremo-${end.x},${end.y}`,
                    x: end.x, y: end.y,
                    severity: 'media',
                    message: `Extremo de ${label} en (${end.x},${end.y}) sin POI ni camino a ≤15 m`
                });
            }
        }
    }
}

// Categoría 2: caminos que pasan por agua
for (let pi = 0; pi < paths.length; pi++) {
    const p = paths[pi];
    if (!p) continue;
    const samples = pathSamples(p);
    const label = `camino/${pi}`;
    let waterCount = 0;
    for (const s of samples) {
        const h = farHeight(atlas, s.x, s.y);
        if (h <= seaLevel) waterCount++;
    }
    const firstPt = p.points[0];
    if (waterCount > 0 && firstPt) {
        findings.push({
            category: 2,
            id: `${label}-agua`,
            x: firstPt.x, y: firstPt.y,
            severity: 'alta',
            message: `${label}: ${waterCount}/${samples.length} muestras por agua (seaLevel=${seaLevel})`
        });
    }
}

// Categoría 3: pueblos y casas sin camino a menos de 15 m
for (const z of zones) {
    if (z.safe !== true) continue;
    const pts = zonePoints(z);
    for (const p of pts) {
        let minDist = Infinity;
        for (const path of paths) {
            for (const q of path.points) {
                const d = dist(p.x, p.y, q.x, q.y);
                if (d < minDist) minDist = d;
            }
        }
        if (minDist > 15) {
            findings.push({
                category: 3,
                id: `pueblo/${z.id}-sin-camino`,
                x: p.x, y: p.y,
                severity: 'media',
                message: `Pueblo ${z.id} en (${p.x},${p.y}): camino más cercano a ${minDist.toFixed(1)} m (>15 m)`
            });
        }
    }
}

// Categoría 4: áreas hostiles que pisan zona segura o camino
for (const z of zones) {
    if (z.safe === true) continue;
    const zId = z.id as string;
    const pts = zonePoints(z);
    if (pts.length === 0) continue;

    // Contra zonas seguras
    for (const sz of zones) {
        if (sz.safe !== true) continue;
        const szId = sz.id as string;
        const szPts = zonePoints(sz);
        for (const p of pts) {
            for (const sp of szPts) {
                if (dist(p.x, p.y, sp.x, sp.y) < 5) {
                    findings.push({
                        category: 4,
                        id: `zona/${zId}-pisa-${szId}`,
                        x: p.x, y: p.y,
                        severity: 'alta',
                        message: `Zona hostil ${zId} pisa zona segura ${szId} en (${p.x.toFixed(1)},${p.y.toFixed(1)})`
                    });
                    break;
                }
            }
        }
    }

    // Contra caminos
    for (let pi = 0; pi < paths.length; pi++) {
        const ph = paths[pi];
        if (!ph) continue;
        const w = (ph.width as number) ?? 3;
        for (const p of pts) {
            for (const q of ph.points) {
                if (dist(p.x, p.y, q.x, q.y) < w) {
                    findings.push({
                        category: 4,
                        id: `zona/${zId}-pisa-camino/${pi}`,
                        x: p.x, y: p.y,
                        severity: 'media',
                        message: `Zona hostil ${zId} cerca de camino/${pi} en (${p.x.toFixed(1)},${p.y.toFixed(1)})`
                    });
                    break;
                }
            }
        }
    }
}

// Categoría 5: zonas sin areas
for (const z of zones) {
    const zId = z.id as string;
    const areas = z.areas as Array<Record<string, unknown>> | undefined;
    if (!areas || areas.length === 0) {
        findings.push({
            category: 5,
            id: `zona/${zId}-sin-areas`,
            x: 0, y: 0,
            severity: 'baja',
            message: `Zona ${zId} (${z.name as string}) sin areas definidas`
        });
    }
}

// Categoría 6: zonas cuya provincia según el atlas no coincide con _rol o nombre
for (const z of zones) {
    const zId = z.id as string;
    const pts = zonePoints(z);
    if (pts.length === 0) continue;
    const center = pts[0];
    if (!center) continue;
    const region = regionAt(atlas, center.x, center.y);
    if (!region) continue;

    const rol = (z._rol as string) ?? '';
    const name = (z.name as string) ?? '';
    const regionName = region.name ?? region.official;

    // Extrae la provincia esperada del _rol (busca palabras clave)
    const provinceHints: Record<string, string[]> = {
        'los_santos': ['Los Santos', 'Raspadura', 'Iguanera', 'Pedasol', 'Azuero', 'Canajagua', 'Sabanas'],
        'herrera': ['Herrera', 'Chitrí', 'Pesé', 'Parrita', 'Ocúa', 'Macanas', 'Sarigua', 'Ocú'],
        'veraguas': ['Veraguas'],
        'cocle': ['Coclé', 'Cocle'],
        'panama_oeste': ['Panamá Oeste', 'Panama Oeste'],
        'colon': ['Colón', 'Colon'],
        'panama': ['Panamá', 'Panama'],
        'guna_yala': ['Guna Yala', 'San Blas'],
        'darien': ['Darién', 'Darien'],
        'ngabe': ['Ngäbe', 'Ngabe'],
        'bocas': ['Bocas'],
        'chiriqui': ['Chiriquí', 'Chiriqui'],
        'embera': ['Emberá', 'Embera']
    };

    let expectedRegion: string | null = null;
    for (const [regId, keywords] of Object.entries(provinceHints)) {
        for (const kw of keywords) {
            if (rol.includes(kw) || name.includes(kw)) {
                expectedRegion = regId;
                break;
            }
        }
        if (expectedRegion) break;
    }

    if (expectedRegion && expectedRegion !== region.id) {
        findings.push({
            category: 6,
            id: `zona/${zId}-provincia`,
            x: center.x, y: center.y,
            severity: 'media',
            message: `Zona ${zId}: _rol/nombre sugiere ${expectedRegion}, atlas dice ${region.id} (${regionName})`
        });
    }
}

// Categoría 7: zonas que heredan con extends monstruos de otro hábitat
const knownExtends = [
    { zone: 'cane_pese', extends: 'chame', habitat: 'Chame' },
    { zone: 'parrita', extends: 'boquete', habitat: 'Boquete' },
    { zone: 'ocua', extends: 'baru', habitat: 'Barú' },
    { zone: 'macanas', extends: 'darien', habitat: 'Darién' },
    { zone: 'sarigua', extends: 'bocas', habitat: 'Bocas' },
];

for (const z of zones) {
    const ext = z.extends as string | undefined;
    if (!ext) continue;
    const zId = z.id as string;
    const pts = zonePoints(z);
    if (pts.length === 0) continue;
    const center = pts[0];
    if (!center) continue;
    const region = regionAt(atlas, center.x, center.y);

    // Busca en la lista conocida
    const known = knownExtends.find(k => k.zone === zId);
    if (known) {
        findings.push({
            category: 7,
            id: `zona/${zId}-extends-${ext}`,
            x: center.x, y: center.y,
            severity: 'baja',
            message: `Zona ${zId} (${z.name as string}) hereda de ${ext} (${known.habitat}) — ya conocida`
        });
    } else {
        // Extends no documentado
        findings.push({
            category: 7,
            id: `zona/${zId}-extends-${ext}`,
            x: center.x, y: center.y,
            severity: 'media',
            message: `Zona ${zId} (${z.name as string}) hereda de ${ext} — no documentado en la lista conocida`
        });
    }
}

// --- Genera HALLAZGOS.md ---

const categoryNames: Record<number, string> = {
    1: 'Caminos sin conexión',
    2: 'Caminos por agua',
    3: 'Pueblos sin camino cercano',
    4: 'Áreas hostiles sobre seguras/caminos',
    5: 'Zonas sin areas',
    6: 'Provincia incorrecta',
    7: 'Extends de otro hábitat'
};

let md = '# Hallazgos de auditoría MAP-GEO-01\n\n';
md += `Generado: ${new Date().toISOString()}\n`;
md += `Total: ${findings.length} hallazgos\n\n`;

// Resumen por categoría
md += '## Resumen\n\n';
md += '| Categoría | Cantidad |\n|---|---|\n';
for (let c = 1; c <= 7; c++) {
    const count = findings.filter(f => f.category === c).length;
    md += `| ${c}. ${categoryNames[c]} | ${count} |\n`;
}
md += '\n';

// Resumen por severidad
const sevCount = { alta: 0, media: 0, baja: 0 };
for (const f of findings) sevCount[f.severity]++;
md += '| Severidad | Cantidad |\n|---|---|\n';
md += `| Alta | ${sevCount.alta} |\n`;
md += `| Media | ${sevCount.media} |\n`;
md += `| Baja | ${sevCount.baja} |\n\n`;

// Detalle por categoría
for (let c = 1; c <= 7; c++) {
    const catFindings = findings.filter(f => f.category === c);
    md += `## ${c}. ${categoryNames[c]}\n\n`;
    if (catFindings.length === 0) {
        md += 'Sin hallazgos.\n\n';
    } else {
        for (const f of catFindings) {
            md += `- **${f.id}** (${f.severity}): ${f.message} [(${f.x.toFixed(1)},${f.y.toFixed(1)})]\n`;
        }
        md += '\n';
    }
}

writeFileSync(path.join(OUT, 'HALLAZGOS.md'), md);

// --- Genera mapa SVG ---

// Calcula el bounding box de todos los datos
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const f of findings) {
    if (f.x !== 0 || f.y !== 0) {
        minX = Math.min(minX, f.x); minY = Math.min(minY, f.y);
        maxX = Math.max(maxX, f.x); maxY = Math.max(maxY, f.y);
    }
}
for (const s of stones) {
    minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x); maxY = Math.max(maxY, s.y);
}
for (const p of paths) {
    for (const pt of p.points) {
        minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
    }
}
for (const z of zones) {
    const pts = zonePoints(z);
    for (const p of pts) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
}

// Margen
const padX = (maxX - minX) * 0.05 || 50;
const padY = (maxY - minY) * 0.05 || 50;
minX -= padX; minY -= padY; maxX += padX; maxY += padY;

const svgW = 1200, svgH = 1000;
const scaleX = svgW / (maxX - minX);
const scaleY = svgH / (maxY - minY);
const scale = Math.min(scaleX, scaleY);
const offX = (svgW - (maxX - minX) * scale) / 2;
const offY = (svgH - (maxY - minY) * scale) / 2;

const toSvgX = (x: number) => offX + (x - minX) * scale;
const toSvgY = (y: number) => svgH - (offY + (y - minY) * scale); // invierte Y

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">\n`;
svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>\n`;
svg += `<text x="${svgW / 2}" y="20" text-anchor="middle" fill="#e0e0e0" font-size="14" font-family="sans-serif">Auditoría MAP-GEO-01 — Mapa del mundo</text>\n`;

// Capa de provincias (muestra las regiones del atlas en los puntos de las zonas)
const regionColors: Record<string, string> = {};
const colorPalette = ['#2d4a2d', '#4a3d2d', '#2d3d4a', '#4a2d3d', '#3d4a2d', '#3d2d4a', '#4a4a2d', '#2d4a4a', '#4a2d4a', '#2d2d4a', '#4a3d3d', '#3d4a4a', '#4a4a3d'];
let ci = 0;
for (const z of zones) {
    const pts = zonePoints(z);
    if (pts.length === 0) continue;
    const first = pts[0];
    if (!first) continue;
    const region = regionAt(atlas, first.x, first.y);
    const regId = region?.id ?? 'unknown';
    if (!regionColors[regId]) regionColors[regId] = colorPalette[(ci++ % colorPalette.length)]!;
}

// Dibuja las zonas
for (const z of zones) {
    const areas = z.areas as Array<Record<string, unknown>> | undefined;
    if (!areas) continue;
    const pts = zonePoints(z);
    if (pts.length === 0) continue;
    const first = pts[0];
    if (!first) continue;
    const region = regionAt(atlas, first.x, first.y);
    const regId = region?.id ?? 'unknown';
    const fill = regionColors[regId] ?? '#333';
    const stroke = z.safe === true ? '#4a4' : '#a44';

    for (const area of areas) {
        if (area.type === 'circle') {
            const cx = toSvgX(area.x as number);
            const cy = toSvgY(area.y as number);
            const r = (area.radius as number) * scale;
            svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="0.3" stroke="${stroke}" stroke-width="1"/>\n`;
        } else if (area.type === 'rect') {
            const x0 = toSvgX(area.x1 as number); //右上
            const y0 = toSvgY(area.y1 as number);
            const x1 = toSvgX(area.x0 as number); //左下
            const y1 = toSvgY(area.y0 as number);
            const rx = Math.abs(x1 - x0), ry = Math.abs(y1 - y0);
            const rx0 = Math.min(x0, x1), ry0 = Math.min(y0, y1);
            svg += `<rect x="${rx0.toFixed(1)}" y="${ry0.toFixed(1)}" width="${rx.toFixed(1)}" height="${ry.toFixed(1)}" fill="${fill}" fill-opacity="0.3" stroke="${stroke}" stroke-width="1"/>\n`;
        }
    }
}

// Capa de caminos
svg += '<g stroke="#c8a" stroke-width="2" fill="none">\n';
for (const ph of paths) {
    let d = '';
    for (let i = 0; i < ph.points.length; i++) {
        const pt = ph.points[i];
        if (!pt) continue;
        const sx = toSvgX(pt.x), sy = toSvgY(pt.y);
        d += (i === 0 ? 'M' : 'L') + `${sx.toFixed(1)},${sy.toFixed(1)} `;
    }
    if (d) svg += `<path d="${d.trim()}"/>\n`;
}
svg += '</g>\n';

// Capa de piedras
svg += '<g fill="#ff0">\n';
for (const s of stones) {
    const sx = toSvgX(s.x), sy = toSvgY(s.y);
    svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" />\n`;
}
svg += '</g>\n';

// Capa de pueblos
svg += '<g fill="#4f4">\n';
for (const z of zones) {
    if (z.safe !== true) continue;
    const pts = zonePoints(z);
    for (const p of pts) {
        if (p === pts[0]) { // solo el centro
            const sx = toSvgX(p.x), sy = toSvgY(p.y);
            svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" />\n`;
        }
    }
}
svg += '</g>\n';

// Capa de hallazgos
const sevColors: Record<string, string> = { alta: '#f00', media: '#fa0', baja: '#0af' };
for (const sev of ['alta', 'media', 'baja'] as const) {
    const catFindings = findings.filter(f => f.severity === sev && (f.x !== 0 || f.y !== 0));
    if (catFindings.length === 0) continue;
    svg += `<g fill="${sevColors[sev]}">\n`;
    for (const f of catFindings) {
        const sx = toSvgX(f.x), sy = toSvgY(f.y);
        svg += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3" />\n`;
    }
    svg += '</g>\n';
}

// Leyenda
const legendX = svgW - 160, legendY = 40;
svg += `<rect x="${legendX - 10}" y="${legendY - 5}" width="165" height="130" fill="#000" fill-opacity="0.7" rx="4"/>\n`;
svg += `<text x="${legendX}" y="${legendY + 10}" fill="#e0e0e0" font-size="11" font-family="sans-serif">Leyenda</text>\n`;
let ly = legendY + 28;
svg += `<circle cx="${legendX + 5}" cy="${ly}" r="4" fill="#ff0"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Piedra</text>\n`;
ly += 18;
svg += `<circle cx="${legendX + 5}" cy="${ly}" r="4" fill="#4f4"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Pueblo</text>\n`;
ly += 18;
svg += `<line x1="${legendX}" y1="${ly}" x2="${legendX + 12}" y2="${ly}" stroke="#c8a" stroke-width="2"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Camino</text>\n`;
ly += 18;
svg += `<circle cx="${legendX + 5}" cy="${ly}" r="3" fill="#f00"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Hallazgo alta</text>\n`;
ly += 18;
svg += `<circle cx="${legendX + 5}" cy="${ly}" r="3" fill="#fa0"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Hallazgo media</text>\n`;
ly += 18;
svg += `<circle cx="${legendX + 5}" cy="${ly}" r="3" fill="#0af"/><text x="${legendX + 15}" y="${ly + 4}" fill="#e0e0e0" font-size="10" font-family="sans-serif">Hallazgo baja</text>\n`;

svg += '</svg>\n';
writeFileSync(path.join(OUT, 'mapa.svg'), svg);

// --- JSON crudo ---
const rawOutput = {
    timestamp: new Date().toISOString(),
    totalFindings: findings.length,
    byCategory: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, findings.filter(f => f.category === i + 1).length])),
    bySeverity: sevCount,
    findings: findings.map(f => ({
        category: f.category,
        categoryId: categoryNames[f.category],
        id: f.id,
        x: f.x,
        y: f.y,
        severity: f.severity,
        message: f.message
    }))
};
writeFileSync(path.join(OUT, 'hallazgos.json'), JSON.stringify(rawOutput, null, 2));

// --- Resumen en stdout ---
console.log(`MAP-GEO-01: ${findings.length} hallazgos (${sevCount.alta} alta, ${sevCount.media} media, ${sevCount.baja} baja)`);
for (let c = 1; c <= 7; c++) {
    const count = findings.filter(f => f.category === c).length;
    console.log(`  ${c}. ${categoryNames[c]}: ${count}`);
}
console.log(`Evidencia en ${OUT}/`);
