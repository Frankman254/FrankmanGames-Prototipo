import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

// Recoge todas las rutas .glb citadas en data/ JSON (campo "file" y comentarios _nota).
function collectDataGlbRefs(): string[] {
    const refs: string[] = [];
    const dataDir = join(ROOT, 'data');

    function walk(dir: string) {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            const stat = require('node:fs').statSync(p);
            if (stat.isDirectory()) {
                walk(p);
            } else if (name.endsWith('.json')) {
                const text = readFileSync(p, 'utf8');
                // Busca "file": "assets/models/xxx.glb"
                for (const m of text.matchAll(/"file"\s*:\s*"([^"]+\.glb)"/g)) {
                    const file = m[1]!;
                    if (file.startsWith('assets/models/')) {
                        refs.push(file);
                    }
                }
                // Busca menciones en comentarios _nota: assets/models/xxx.glb
                for (const m of text.matchAll(/assets\/models\/([^"\s,]+\.glb)/g)) {
                    refs.push('assets/models/' + m[1]);
                }
            }
        }
    }
    walk(dataDir);
    return refs;
}

// Recoge todas las rutas .glb citadas en src/ TypeScript (strings literales).
function collectSrcGlbRefs(): string[] {
    const refs: string[] = [];
    const srcDir = join(ROOT, 'src');

    function walk(dir: string) {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            const stat = require('node:fs').statSync(p);
            if (stat.isDirectory()) {
                walk(p);
            } else if (name.endsWith('.ts')) {
                const text = readFileSync(p, 'utf8');
                // Busca strings que contengan assets/models/xxx.glb (sin placeholders <name>, <model>)
                for (const m of text.matchAll(/['"`](assets\/models\/[^'"`<>]+\.glb)['"`]/g)) {
                    refs.push(m[1]!);
                }
                // Busca en import.meta.glob patterns: {mazmorra,vegetacion}.glb → expandimos
                for (const m of text.matchAll(/\/assets\/models\/\{([^}]+)\}\.glb/g)) {
                    const names = m[1]!.split(',');
                    for (const n of names) {
                        refs.push('assets/models/' + n.trim() + '.glb');
                    }
                }
                // Busca glob wildcard: /assets/models/*.glb — no lo verificamos (es un patrón)
            }
        }
    }
    walk(srcDir);
    return refs;
}

describe('JL-167: todo GLB citado existe en disco', () => {
    it('cada GLB citado en data/**/*.json existe en assets/models/', () => {
        const refs = collectDataGlbRefs();
        const missing: string[] = [];
        const seen = new Set<string>();

        for (const ref of refs) {
            if (seen.has(ref)) continue;
            seen.add(ref);
            if (!existsSync(join(ROOT, ref))) {
                missing.push(ref);
            }
        }
        expect(missing, `GLB citados en data/ que no existen: ${missing.join(', ')}`).toEqual([]);
    });

    it('cada GLB citado en src/**/*.ts existe en assets/models/', () => {
        const refs = collectSrcGlbRefs();
        const missing: string[] = [];
        const seen = new Set<string>();

        for (const ref of refs) {
            if (seen.has(ref)) continue;
            seen.add(ref);
            if (!existsSync(join(ROOT, ref))) {
                missing.push(ref);
            }
        }
        expect(missing, `GLB citados en src/ que no existen: ${missing.join(', ')}`).toEqual([]);
    });

    it('resumen: cantidad de referencias únicas', () => {
        const dataRefs = new Set(collectDataGlbRefs());
        const srcRefs = new Set(collectSrcGlbRefs());
        // Solo informamos; la prueba pasa siempre.
        console.log(`  data/ cita ${dataRefs.size} GLB únicos`);
        console.log(`  src/ cita ${srcRefs.size} GLB únicos`);
        expect(dataRefs.size).toBeGreaterThan(0);
        expect(srcRefs.size).toBeGreaterThan(0);
    });
});
