// TOR-01: Auditoría de antorchas en todos los pisos (1-100).
// Detecta: duplicados en misma celda, antorchas en puertas, normales incorrectas,
// antorchas muy cerca de puertas.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';
import fs from 'fs';
import path from 'path';

const data = loadGameData();
const def = loadDungeon(data);

describe('TOR-01: auditoría de antorchas (pisos 1-100)', () => {
    const issues: Array<{ floor: number; type: string; detail: string }> = [];

    for (let i = 0; i < Math.min(100, def.floors.length); i++) {
        const floor = generateFloor(def, i);
        const ts = floor.tileSize;

        // Mapa de celdas ocupadas por antorchas
        const torchCells = new Map<string, typeof floor.torches[number][]>();
        for (const t of floor.torches) {
            const rockX = t.x - t.nx * (ts * 0.5);
            const rockY = t.y - t.ny * (ts * 0.5);
            const tc = Math.floor(rockX / ts - 0.5);
            const tr = Math.floor(rockY / ts - 0.5);
            const key = `${tc},${tr}`;
            if (!torchCells.has(key)) torchCells.set(key, []);
            torchCells.get(key)!.push(t);
        }

        // 1. Duplicados en la misma celda
        for (const [key, torches] of torchCells) {
            if (torches.length > 1) {
                issues.push({
                    floor: i + 1,
                    type: 'DUPLICADO',
                    detail: `${torches.length} antorchas en baldosa ${key}`,
                });
            }
        }

        // 2. Antorchas en baldosas de puerta
        for (const t of floor.torches) {
            const rockX = t.x - t.nx * (ts * 0.5);
            const rockY = t.y - t.ny * (ts * 0.5);
            const tc = Math.floor(rockX / ts - 0.5);
            const tr = Math.floor(rockY / ts - 0.5);
            for (const door of floor.doors) {
                for (const cell of door.cells) {
                    if (tc === cell.c && tr === cell.r) {
                        issues.push({
                            floor: i + 1,
                            type: 'PUERTA',
                            detail: `Antorcha en baldosa de puerta ${door.id} (${tc},${tr})`,
                        });
                    }
                }
            }
        }

        // 3. Normales que no apuntan a suelo
        for (const t of floor.torches) {
            const tc = Math.floor((t.x - t.nx * ts * 0.45) / ts - 0.5);
            const tr = Math.floor((t.y - t.ny * ts * 0.45) / ts - 0.5);
            const nc = tc + t.nx;
            const nr = tr + t.ny;
            if (nc >= 0 && nr >= 0 && nc < floor.cols && nr < floor.rows) {
                const idx = nr * floor.cols + nc;
                if (!floor.cells[idx]) {
                    issues.push({
                        floor: i + 1,
                        type: 'NORMAL_MALA',
                        detail: `Normal (${t.nx},${t.ny}) desde (${tc},${tr}) apunta a roca en (${nc},${nr})`,
                    });
                }
            }
        }

        // 4. Antorchas muy cerca de puertas (no en la puerta, pero a menos de 1.5 tiles)
        for (const t of floor.torches) {
            for (const door of floor.doors) {
                const doorCenterX = door.cells.reduce((s, c) => s + (c.c + 0.5) * ts, 0) / door.cells.length;
                const doorCenterY = door.cells.reduce((s, c) => s + (c.r + 0.5) * ts, 0) / door.cells.length;
                const dist = Math.hypot(t.x - doorCenterX, t.y - doorCenterY);
                if (dist < ts * 1.5) {
                    const rockX = t.x - t.nx * (ts * 0.5);
                    const rockY = t.y - t.ny * (ts * 0.5);
                    const tc = Math.floor(rockX / ts - 0.5);
                    const tr = Math.floor(rockY / ts - 0.5);
                    const onDoor = door.cells.some((c) => c.c === tc && c.r === tr);
                    if (!onDoor) {
                        issues.push({
                            floor: i + 1,
                            type: 'CERCA_PUERTA',
                            detail: `Antorcha a ${dist.toFixed(2)}m de puerta ${door.id} en (${tc},${tr})`,
                        });
                    }
                }
            }
        }
    }

    // Guardar reporte
    const byType: Record<string, number> = {};
    for (const iss of issues) {
        byType[iss.type] = (byType[iss.type] || 0) + 1;
    }

    const reportPath = path.resolve(__dirname, '../work/junie-tor01/auditoria.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ total: issues.length, byType, issues }, null, 2));

    it('no hay antorchas duplicadas en la misma celda', () => {
        const dups = issues.filter((i) => i.type === 'DUPLICADO');
        if (dups.length > 0) {
            console.log('DUPLICADOS:', dups.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(dups.length, `duplicados encontrados`).toBe(0);
    });

    it('no hay antorchas en baldosas de puerta', () => {
        const doors = issues.filter((i) => i.type === 'PUERTA');
        if (doors.length > 0) {
            console.log('PUERTAS:', doors.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(doors.length, `antorchas en puertas`).toBe(0);
    });

    it('todas las normales apuntan a suelo', () => {
        const normals = issues.filter((i) => i.type === 'NORMAL_MALA');
        if (normals.length > 0) {
            console.log('NORMAL_MALA:', normals.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(normals.length, `normales incorrectas`).toBe(0);
    });

    it('resumen de hallazgos', () => {
        console.log(`\nTOR-01 Auditoría: ${issues.length} problemas en total`);
        for (const [type, count] of Object.entries(byType)) {
            console.log(`  ${type}: ${count}`);
        }
        // No fallamos por CERCA_PUERTA — es informativo, no un error de colocación
        const realIssues = issues.filter((i) => i.type !== 'CERCA_PUERTA');
        expect(realIssues.length, `problemas reales (excluyendo cerca de puerta)`).toBe(0);
    });
});
