import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../data/i18n/en.json';
import enContent from '../data/i18n/en.content.json';
import enUi from '../data/i18n/en.ui.json';

/** Recorre `src/` y devuelve la lista de archivos .ts (salvo node_modules). */
function findTsFiles(dir: string, out: string[] = []): string[] {
    for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (statSync(full).isDirectory() && f !== 'node_modules') {
            findTsFiles(full, out);
        } else if (f.endsWith('.ts')) {
            out.push(full);
        }
    }
    return out;
}

/** Extrae las cadenas literales de tr('…') y trf('…') en un archivo. */
function extractI18nKeys(src: string): string[] {
    const keys: string[] = [];
    const re = /(?:tr|trf)\(\s*(['"])([^]*?)\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
        keys.push(m[2] ?? '');
    }
    return keys;
}

const allTables: Record<string, string> = { ...en, ...enContent, ...enUi };

describe('JL-98: cobertura i18n', () => {
    it('todas las claves tr()/trf() de src/ existen en al menos una tabla de inglés', () => {
        const keys = new Set<string>();
        for (const file of findTsFiles(join(__dirname, '..', 'src'))) {
            const src = readFileSync(file, 'utf8');
            for (const k of extractI18nKeys(src)) {
                keys.add(k);
            }
        }

        const missing: string[] = [];
        for (const k of keys) {
            if (allTables[k] === undefined) {
                missing.push(k);
            }
        }

        if (missing.length > 0) {
            // Filtra las que son puramente dinámicas (solo marcadores, sin texto fijo).
            const trulyMissing = missing.filter(
                (k) => !/^\s*$/.test(k) && k.length > 0
            );
            expect(
                trulyMissing,
                `Faltan traducciones en inglés para ${trulyMissing.length} clave(s):\n  ` +
                    trulyMissing.map((k) => JSON.stringify(k)).join('\n  ')
            ).toEqual([]);
        }
    });

    it('cada tabla de inglés no tiene traducciones vacías', () => {
        for (const [label, table] of [
            ['en.json', en],
            ['en.ui.json', enUi],
            ['en.content.json', enContent],
        ] as const) {
            for (const [k, v] of Object.entries(table)) {
                if (!k.startsWith('_')) {
                    expect(v?.trim(), `${label}: "${k}"`).not.toBe('');
                }
            }
        }
    });

    it('las 8 claves antes faltantes ya están traducidas', () => {
        const expected = [
            'Cofre',
            'Cofre abierto',
            'Escalera de bajada',
            'Escalera de subida',
            'Fila {n}: {state}',
            'Hilo de retorno',
            'Marca de {element}',
            'Reaparecer en {where}',
        ];
        for (const k of expected) {
            expect(allTables[k], `Falta traducción para "${k}"`).toBeDefined();
        }
    });
});
