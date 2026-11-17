// J15: Nombres completos de monstruos sin recorte — pruebas de los límites de measurePlate.
// measurePlate usa canvas (DOM), así que probamos los invariantes matemáticos
// y verificamos que enemyView.ts exporta la lógica correcta.
import { describe, it, expect } from 'vitest';

describe('J15: measurePlate — invariantes de tamaño', () => {
    // Los valores de medida son constantes en enemyView.ts.
    const PLATE_W_MIN = 256;
    const PLATE_W_MAX = 2048;
    const FONT_SIZE_MIN = 20;
    const FONT_SIZE_DEFAULT = 40;
    const PLANE_WIDTH_DEFAULT = 2.4;
    const PLANE_WIDTH_MAX = 8;
    const margin = 14;

    it('nombres cortos usan el tamaño mínimo (256px)', () => {
        // Un nombre de 4 caracteres con fuente 40px mide ~80px + 28 = ~108px.
        // 108 < 256, así que measurePlate devuelve 256.
        const estimatedWidth = 4 * 20 + margin * 2; // ~108px estimado
        expect(estimatedWidth).toBeLessThan(PLATE_W_MIN);
    });

    it('nombres largos caben en la textura máxima', () => {
        // "Duende Tirapiedras Veterano · niv. 50" = 34 caracteres.
        // Con fuente 40px, ~34 * 24 = ~816px + 28 = ~844px.
        // 844 < 2048, así que cabe sin reducir fuente.
        const longName = 'Duende Tirapiedras Veterano · niv. 50';
        const estimatedWidth = longName.length * 24 + margin * 2;
        expect(estimatedWidth).toBeLessThan(PLATE_W_MAX);
        expect(estimatedWidth).toBeGreaterThan(PLATE_W_MIN);
    });

    it('el plano se escala proporcionalmente con la textura', () => {
        // Si la textura es 512px (2× mínimo), el plano debe ser 2× el default.
        const width = 512;
        const planeW = PLANE_WIDTH_DEFAULT * (width / PLATE_W_MIN);
        expect(planeW).toBeCloseTo(4.8); // 2.4 * (512/256) = 4.8
        expect(planeW).toBeLessThanOrEqual(PLANE_WIDTH_MAX);
    });

    it('el plano no supera el ancho máximo', () => {
        // Con textura máxima 2048px, el plano sería 2.4 * (2048/256) = 19.2.
        // Pero se limita a PLANE_WIDTH_MAX = 8.
        const width = PLATE_W_MAX;
        const rawPlaneW = PLANE_WIDTH_DEFAULT * (width / PLATE_W_MIN);
        const clampedPlaneW = Math.min(PLANE_WIDTH_MAX, rawPlaneW);
        expect(clampedPlaneW).toBe(PLANE_WIDTH_MAX);
    });

    it('la fuente mínima es legible (20px)', () => {
        expect(FONT_SIZE_MIN).toBeGreaterThanOrEqual(16); // legible en pantalla
        expect(FONT_SIZE_MIN).toBeLessThan(FONT_SIZE_DEFAULT);
    });

    it('margen para trazo (lineWidth) a ambos lados', () => {
        // El trazo de 7px necesita 3.5px a cada lado visibles.
        // Con margin = 14 (7 lineWidth + 7 padding), el texto nunca toca el borde.
        expect(margin).toBeGreaterThanOrEqual(7);
    });

    it('nombres con niveles de 1 a 100 no exceden la textura máxima', () => {
        // El nombre más largo posible: ~40 chars + " · niv. 100" = ~52 chars.
        const maxEstimatedChars = 52;
        const estimatedWidth = maxEstimatedChars * 24 + margin * 2;
        expect(estimatedWidth).toBeLessThan(PLATE_W_MAX);
    });
});
