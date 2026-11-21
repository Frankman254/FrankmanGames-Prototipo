// JL-90: fantasma.glb — animación de reserva sin error de consola
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const GLB_PATH = join(ROOT, 'assets/models/fantasma.glb');

/** Extrae los nombres de AnimationGroup de un GLB binario. */
function glbAnimationNames(path: string): string[] {
    const buf = readFileSync(path);
    const str = buf.toString('latin1');
    const names: string[] = [];
    // Los nombres de animación aparecen como "name":"<clip>" en el JSON interno del glTF
    const re = /"name"\s*:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(str)) !== null) {
        if (m[1] !== undefined) names.push(m[1]);
    }
    return names;
}

describe('JL-90: fantasma.glb', () => {
    it('el archivo existe', () => {
        expect(existsSync(GLB_PATH)).toBe(true);
    });

    it('tiene el clip Reposo', () => {
        const names = glbAnimationNames(GLB_PATH);
        const reposo = names.find((n) => n.endsWith('Reposo'));
        expect(reposo).toBeDefined();
    });

    it('tiene el clip Avanzar', () => {
        const names = glbAnimationNames(GLB_PATH);
        const avanzar = names.find((n) => n.endsWith('Avanzar'));
        expect(avanzar).toBeDefined();
    });

    it('no tiene los clips de enemigo estándar (Caminar, Atacar, Golpeado, Morir)', () => {
        const names = glbAnimationNames(GLB_PATH);
        const missing: string[] = [];
        for (const clip of ['Caminar', 'Atacar', 'Golpeado', 'Morir']) {
            if (!names.some((n) => n.endsWith(clip))) {
                missing.push(clip);
            }
        }
        // Se espera que falten estos clips — la prueba documenta el estado actual.
        expect(missing).toContain('Caminar');
        expect(missing).toContain('Atacar');
        expect(missing).toContain('Golpeado');
        expect(missing).toContain('Morir');
    });

    it('ghostBody.ts no lanza error si un clip es null', () => {
        // Verificación estática: el código de ghostBody.ts debe proteger g.start()
        // con un guard if (g). Leemos el archivo y verificamos el patrón.
        const code = readFileSync(join(ROOT, 'src/render/characters/ghostBody.ts'), 'utf-8');
        // Buscamos que g.start esté dentro de un bloque if (g)
        expect(code).toMatch(/if\s*\(\s*g\s*\)\s*\{[\s\S]*?g\.start/);
    });
});
