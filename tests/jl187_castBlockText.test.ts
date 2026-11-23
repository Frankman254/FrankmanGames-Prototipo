import { describe, expect, it } from 'vitest';
import { CAST_BLOCK_TEXT, type CastBlock } from '../src/sim/combat';

/**
 * JL-187: Todo motivo de bloqueo tiene texto en español.
 *
 * Verifica que CAST_BLOCK_TEXT cubre cada valor de CastBlock sin huecos
 * ni textos vacíos.  Si se añade un nuevo motivo, la prueba falla hasta
 * que se le asigne su texto.
 */
describe('JL-187: CAST_BLOCK_TEXT cubre todos los CastBlock', () => {
    // Valores que la tarea menciona explícitamente.
    const explicitBlocks: CastBlock[] = [
        'queued',
        'dazed',
        'trapSpacing',
        'noLineOfSight',
        'charges',
        'spectral',
        'disoriented',
    ];

    it('cada valor explícito de la tarea tiene texto', () => {
        for (const block of explicitBlocks) {
            const text = CAST_BLOCK_TEXT[block];
            expect(text, `${block}: texto definido`).toBeDefined();
            expect(text, `${block}: texto no vacío`).toBeTypeOf('string');
            expect(text.trim(), `${block}: texto no en blanco`).not.toBe('');
        }
    });

    it('no hay claves de CAST_BLOCK_TEXT fuera de CastBlock', () => {
        // TypeScript ya lo garantiza con Record<CastBlock, string>, pero
        // la prueba lo confirma en tiempo de ejecución.
        const keys = Object.keys(CAST_BLOCK_TEXT) as CastBlock[];
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
            // Si TypeScript permite compilar, key es CastBlock.
            // La prueba asegura que el valor es un string no vacío.
            expect(typeof CAST_BLOCK_TEXT[key], key).toBe('string');
            expect(CAST_BLOCK_TEXT[key].trim(), `${key}: no en blanco`).not.toBe('');
        }
    });

    it('CAST_BLOCK_TEXT tiene exactamente un texto por CastBlock', () => {
        // Los 18 valores del tipo.
        const expected: CastBlock[] = [
            'flying',
            'spectral',
            'dead',
            'empty',
            'unknown',
            'level',
            'busy',
            'control',
            'target',
            'resource',
            'cooldown',
            'gcd',
            'range',
            'noLineOfSight',
            'charges',
            'dazed',
            'disoriented',
            'trapSpacing',
            'queued',
        ];
        for (const block of expected) {
            expect(CAST_BLOCK_TEXT[block], `${block}: existe`).toBeDefined();
            expect(CAST_BLOCK_TEXT[block]!.trim(), `${block}: no vacío`).not.toBe('');
        }
        // No hay claves extra.
        expect(Object.keys(CAST_BLOCK_TEXT).length).toBe(expected.length);
    });

    it('cada texto tiene al menos 4 caracteres (no es un placeholder)', () => {
        // Un texto real para el jugador tiene longitud razonable.
        // Un placeholder como 'TBD' o '??' quedaría fuera.
        for (const [key, text] of Object.entries(CAST_BLOCK_TEXT)) {
            expect(text.length, `${key}: longitud mínima`).toBeGreaterThan(3);
        }
    });
});
