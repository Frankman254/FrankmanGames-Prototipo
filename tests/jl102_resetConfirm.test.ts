// JL-102: Botón "Restablecer posiciones" con confirmación antes de ejecutar.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getDefaultPositions } from '../src/ui/map/hudProfiles';

function readSrc(path: string): string {
    return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf-8');
}

describe('JL-102: resetWindows pide confirmación', () => {
    const indexTs = readSrc('../src/ui/menus/index.ts');

    it('resetWindows llama a ctx.confirm en lugar de resetear directamente', () => {
        // El handler resetWindows debe contener ctx.confirm
        expect(indexTs).toMatch(/resetWindows:\s*\(\)\s*=>\s*\{[\s\S]*ctx\.confirm/);
    });

    it('ctx.confirm dentro de resetWindows incluye title con "Restablecer posiciones"', () => {
        // title debe usar trf('Restablecer posiciones')
        expect(indexTs).toMatch(/resetWindows:[\s\S]*title:\s*trf\(['"]Restablecer posiciones['"]\)/);
    });

    it('ctx.confirm dentro de resetWindows incluye texto de advertencia', () => {
        // text debe advertir que se perderá la disposición actual
        expect(indexTs).toMatch(/resetWindows:[\s\S]*text:\s*trf\([\s\n]*['"]¿Volver a colocar/);
    });

    it('ctx.confirm dentro de resetWindows incluye botón "Restablecer"', () => {
        // yes debe usar trf('Restablecer')
        expect(indexTs).toMatch(/resetWindows:[\s\S]*yes:\s*trf\(['"]Restablecer['"]\)/);
    });

    it('onYes ejecuta windows.reset(), profiles.resetActive() y hudLayout.apply()', () => {
        // onYes debe contener los tres pasos del reset
        expect(indexTs).toMatch(/resetWindows:[\s\S]*onYes:[\s\S]*windows\.reset\(\)/);
        expect(indexTs).toMatch(/resetWindows:[\s\S]*onYes:[\s\S]*profiles\.resetActive\(\)/);
        expect(indexTs).toMatch(/resetWindows:[\s\S]*onYes:[\s\S]*hudLayout\.apply\(\)/);
    });

    it('onYes muestra toast tras el reset', () => {
        // toast debe aparecer dentro de onYes, después del reset
        expect(indexTs).toMatch(/resetWindows:[\s\S]*onYes:[\s\S]*toast\(/);
    });
});

describe('JL-102: getDefaultPositions devuelve posiciones para la relación de aspecto actual', () => {
    it('1920x1080 devuelve posiciones para los elementos principales del HUD', () => {
        const pos = getDefaultPositions(1920, 1080);
        // Los elementos principales (no las secciones de barra dinámicas) deben tener posición
        const mainKeys = ['minimap', 'quest-tracker', 'world-info', 'combat-bar', 'chat', 'hud-bar', 'hud-pet'];
        for (const key of mainKeys) {
            expect(pos[key], `Falta posición para ${key}`).toBeDefined();
        }
    });

    it('2560x1080 (ultrawide) devuelve posiciones dentro de zona segura', () => {
        const pos = getDefaultPositions(2560, 1080);
        // En ultrawide, el minimap no debe estar al borde derecho
        const minimapX = pos['minimap']!.x;
        // La fracción x del minimap debe ser menor que 1 (dentro del viewport)
        expect(minimapX).toBeLessThan(1);
    });

    it('3440x1440 (32:9) devuelve posiciones dentro de zona segura', () => {
        const pos = getDefaultPositions(3440, 1440);
        for (const p of Object.values(pos)) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(1);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(1);
        }
    });
});

describe('JL-102: claves i18n para confirmación', () => {
    const enJson = readSrc('../data/i18n/en.json');

    it('existe la clave del texto de confirmación en en.json', () => {
        expect(enJson).toContain('¿Volver a colocar todos los elementos del HUD en su posición por defecto para esta pantalla? Se perderá la disposición actual.');
    });

    it('la traducción al inglés del texto de confirmación existe', () => {
        expect(enJson).toContain('Reset all HUD elements to their default positions for this screen? Your current layout will be lost.');
    });
});
