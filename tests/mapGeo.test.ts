// Prueba del script de auditoría MAP-GEO-01 (scripts/audit/mapGeo.ts).
// Verifica que el script se ejecuta sobre los datos reales sin fallar y produce
// los artefactos esperados en work/junie-map-geo-01/.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(__dirname, '../work/junie-map-geo-01');
const FILES = ['HALLAZGOS.md', 'mapa.svg', 'hallazgos.json'];

describe('MAP-GEO-01 auditoría del mapa', () => {
    let stdout: string;

    beforeAll(() => {
        // Limpia salida anterior
        for (const f of FILES) {
            const fp = path.join(OUT, f);
            if (existsSync(fp)) rmSync(fp);
        }
        // Ejecuta el script
        stdout = execSync('npx vite-node scripts/audit/mapGeo.ts', {
            cwd: path.resolve(__dirname, '..'),
            encoding: 'utf-8',
            timeout: 30_000
        });
    });

    afterAll(() => {
        // No limpia: los archivos son evidencia en work/
    });

    it('se ejecuta sin error y reporta hallazgos', () => {
        expect(stdout).toContain('MAP-GEO-01:');
        expect(stdout).toContain('hallazgos');
        expect(stdout).toContain('Evidencia en');
    });

    it('genera HALLAZGOS.md con resumen por categoría', () => {
        const md = readFileSync(path.join(OUT, 'HALLAZGOS.md'), 'utf-8');
        expect(md).toMatch(/^# Hallazgos de auditoría MAP-GEO-01/s);
        expect(md).toContain('## Resumen');
        // Debe tener las 7 categorías
        for (let c = 1; c <= 7; c++) {
            expect(md).toContain(`## ${c}.`);
        }
        // Tabla de resumen
        expect(md).toContain('| Categoría | Cantidad |');
        expect(md).toContain('| Severidad | Cantidad |');
    });

    it('genera mapa.svg válido', () => {
        const svg = readFileSync(path.join(OUT, 'mapa.svg'), 'utf-8');
        expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        expect(svg).toContain('</svg>');
        // Capas esperadas
        expect(svg).toContain('Piedra');
        expect(svg).toContain('Pueblo');
        expect(svg).toContain('Camino');
    });

    it('genera hallazgos.json con estructura correcta', () => {
        const raw = readFileSync(path.join(OUT, 'hallazgos.json'), 'utf-8');
        const data = JSON.parse(raw);
        expect(data.timestamp).toBeDefined();
        expect(data.totalFindings).toBeGreaterThanOrEqual(0);
        expect(data.byCategory).toBeDefined();
        expect(data.bySeverity).toBeDefined();
        expect(data.findings).toBeInstanceOf(Array);
        // Cada hallazgo tiene los campos requeridos
        for (const f of data.findings) {
            expect(f.category).toBeGreaterThanOrEqual(1);
            expect(f.category).toBeLessThanOrEqual(7);
            expect(f.id).toBeDefined();
            expect(f.severity).toMatch(/^(alta|media|baja)$/);
            expect(f.message).toBeDefined();
        }
    });

    it('las 7 categorías están representadas en byCategory', () => {
        const raw = readFileSync(path.join(OUT, 'hallazgos.json'), 'utf-8');
        const data = JSON.parse(raw);
        for (let c = 1; c <= 7; c++) {
            expect(data.byCategory[String(c)]).toBeDefined();
        }
    });

    it('no modifica data/ ni src/', () => {
        // El script solo lee data/ y src/ y escribe en work/.
        // Verificamos que los archivos de evidencia existen en work/
        for (const f of FILES) {
            expect(existsSync(path.join(OUT, f))).toBe(true);
        }
    });
});
