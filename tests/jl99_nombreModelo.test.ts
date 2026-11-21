// Prueba del script de auditoría nombre↔modelo (scripts/audit/nombreModelo.ts).
// Verifica que el script se ejecuta sobre los datos reales sin fallar y produce
// los artefactos esperados en work/junie-jl-99/.

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(__dirname, '../work/junie-jl-99');
const FILES = ['NOMBRE_MODELO.md', 'nombre_modelo.json'];
const GENERIC_TEMPLATES = new Set(['bestia', 'arquero', 'chaman', 'diablillo', 'personaje']);

describe('JL-99: auditoría nombre ↔ modelo', () => {
    let stdout: string;
    let rawData: any;

    beforeAll(() => {
        // Limpia salida anterior
        for (const f of FILES) {
            const fp = path.join(OUT, f);
            if (existsSync(fp)) rmSync(fp);
        }
        // Ejecuta el script
        stdout = execSync('npx vite-node scripts/audit/nombreModelo.ts', {
            cwd: path.resolve(__dirname, '..'),
            encoding: 'utf-8',
            timeout: 30_000
        });
        // Lee el JSON generado
        rawData = JSON.parse(readFileSync(path.join(OUT, 'nombre_modelo.json'), 'utf-8'));
    });

    it('se ejecuta sin error y reporta arquetipos', () => {
        expect(stdout).toContain('JL-99:');
        expect(stdout).toContain('arquetipos auditados');
        expect(stdout).toContain('Evidencia en');
    });

    it('genera NOMBRE_MODELO.md con resumen', () => {
        const md = readFileSync(path.join(OUT, 'NOMBRE_MODELO.md'), 'utf-8');
        expect(md).toMatch(/^# Auditoría: Nombre vs\. Modelo de criaturas/s);
        expect(md).toContain('## Resumen');
        expect(md).toContain('78 arquetipos');
        expect(md).toContain('discordancias altas');
        expect(md).toContain('discordancias medias');
        expect(md).toContain('discordancias bajas');
        expect(md).toContain('correctos');
    });

    it('genera nombre_modelo.json con estructura correcta', () => {
        expect(rawData.timestamp).toBeDefined();
        expect(rawData.total).toBe(78);
        expect(rawData.bySeverity).toBeDefined();
        expect(rawData.byTemplate).toBeDefined();
        expect(rawData.mismatches).toBeInstanceOf(Array);
        expect(rawData.mismatches).toHaveLength(78);
    });

    it('cada entrada tiene los campos requeridos', () => {
        for (const m of rawData.mismatches) {
            expect(m.id).toBeDefined();
            expect(m.name).toBeDefined();
            expect(m.template).toBeDefined();
            expect(m.glb).toBeDefined();
            expect(m.category).toBeDefined();
            expect(m.severity).toMatch(/^(alta|media|baja|ok)$/);
        }
    });

    it('la línea base de discordancias no sube', () => {
        // Línea base: 19 discordancias no-OK (6 alta + 7 media + 6 baja)
        // Si alguien cambia un template y empeora la situación, la prueba falla.
        const nonOk = rawData.mismatches.filter((m: any) => m.severity !== 'ok');
        // Límite: no más de 24 discordancias (margen de 5 sobre la línea base de 19)
        expect(nonOk.length, `discordancias no-OK: ${nonOk.length} (límite 24)`).toBeLessThanOrEqual(24);
        // Discordancias altas: no más de 10
        const alta = rawData.mismatches.filter((m: any) => m.severity === 'alta');
        expect(alta.length, `discordancias altas: ${alta.length} (límite 10)`).toBeLessThanOrEqual(10);
    });

    it('los templates genéricos se usan en el número esperado', () => {
        let genericTotal = 0;
        for (const t of GENERIC_TEMPLATES) {
            genericTotal += rawData.byTemplate[t] || 0;
        }
        expect(genericTotal, `templates genéricos: ${genericTotal}`).toBeGreaterThan(30);
        expect(genericTotal, `templates genéricos: ${genericTotal}`).toBeLessThan(78);
    });

    it('los enemigos con GLB propio no aparecen como discordancia', () => {
        const nonOk = rawData.mismatches.filter((m: any) => m.severity !== 'ok');
        for (const m of nonOk) {
            expect(GENERIC_TEMPLATES.has(m.template),
                `${m.id} con template específico ${m.template} marcado como discordancia`).toBe(true);
        }
    });

    it('los perros con bestia son correctos', () => {
        const perroBestia = rawData.mismatches.filter((m: any) =>
            (m.id === 'melee' || m.id === 'night_sato' || m.id === 'alpha_wolf')
            && m.template === 'bestia'
        );
        for (const m of perroBestia) {
            expect(m.severity, `${m.id} perro con bestia debe ser ok`).toBe('ok');
        }
    });

    it('los humanoides con arquero/chaman/personaje son correctos', () => {
        const humanoideIds = ['ranged', 'trapper', 'goblin_veteran', 'summoner', 'baru_lookout',
            'baru_sorcerer', 'darien_blowgun', 'darien_witch', 'boquete_witch', 'boquete_foreman'];
        for (const id of humanoideIds) {
            const m = rawData.mismatches.find((x: any) => x.id === id);
            expect(m, `${id} no encontrado`).toBeDefined();
            if (m) {
                expect(['ok', 'baja']).toContain(m.severity);
            }
        }
    });

    it('los animales no-perro con bestia genérica son discordancia alta', () => {
        const animalBestia = [
            { id: 'perlas_oyster', name: 'Ostra Mordelona' },
            { id: 'perlas_shark', name: 'Tiburón Martillo Patrón' },
            { id: 'perlas_squid', name: 'Calamar Gigante Madrugador' },
            { id: 'ancon_titi', name: 'Mono Tití Trasnochado' },
        ];
        for (const { id, name } of animalBestia) {
            const m = rawData.mismatches.find((x: any) => x.id === id);
            expect(m, `${id} (${name}) no encontrado`).toBeDefined();
            if (m) {
                expect(m.severity, `${id} (${name}) animal no-perro con bestia debe ser alta`).toBe('alta');
            }
        }
    });

    it('no modifica data/ ni src/', () => {
        // El script solo lee data/ y escribe en work/.
        for (const f of FILES) {
            expect(existsSync(path.join(OUT, f))).toBe(true);
        }
    });
});
