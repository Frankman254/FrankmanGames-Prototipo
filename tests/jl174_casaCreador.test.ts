import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

const vegetation = JSON.parse(readFileSync(join(__dirname, '../data/vegetation.json'), 'utf-8'));
const terrain = JSON.parse(readFileSync(join(__dirname, '../data/terrain.json'), 'utf-8'));

describe('JL-174: La casa del creador en el mundo', () => {
    const casa = vegetation.props.find((p: any) => p.kind === 'landmark' && p.model === 'casa_creador');

    it('existe como landmark en vegetation.json', () => {
        expect(casa).toBeDefined();
        expect(casa!.kind).toBe('landmark');
        expect(casa!.model).toBe('casa_creador');
    });

    it('tiene dimensiones coherentes con el GLB (6.3 × 12 m)', () => {
        expect(casa!.w).toBe(6.3);
        expect(casa!.d).toBe(12);
    });

    it('está en un solar libre, fuera del flatArea del pueblo', () => {
        // flatArea del pueblo: centro (128, 128), radio 24.
        const flatArea = terrain.flatAreas.find((a: any) => a.x === 128 && a.y === 128);
        expect(flatArea).toBeDefined();
        const dist = Math.hypot(casa!.x - flatArea!.x, casa!.y - flatArea!.y);
        // La casa (170, 175) está a ~69 m del centro, muy fuera del radio 24 + falloff 10.
        expect(dist).toBeGreaterThan(flatArea!.radius + flatArea!.falloff);
    });

    it('no colisiona con los props existentes (mínimo 3 m)', () => {
        for (const prop of vegetation.props) {
            if (prop === casa) continue;
            // Distancia centro a centro menos la semidiagonal de cada rectángulo.
            const dx = Math.abs(prop.x - casa!.x);
            const dy = Math.abs(prop.y - casa!.y);
            const sepX = dx - (prop.w / 2 + casa!.w / 2);
            const sepY = dy - (prop.d / 2 + casa!.d / 2);
            // Si ambos separadores son positivos, no hay solape.
            const gap = Math.max(sepX, 0) + Math.max(sepY, 0);
            expect(gap).toBeGreaterThan(3);
        }
    });

    it('no colisiona con los caminos (mínimo 2 m del borde)', () => {
        // Verifica que el centro de la casa está a más de 2 m de cada segmento de path.
        for (const path of terrain.paths) {
            let minDist = Infinity;
            for (let i = 0; i < path.points.length - 1; i++) {
                const a = path.points[i];
                const b = path.points[i + 1];
                const d = distPointToSegment(casa!.x, casa!.y, a.x, a.y, b.x, b.y);
                if (d < minDist) minDist = d;
            }
            // El borde de la casa está a ~4.3 m del centro (semidiagonal).
            // El path tiene un ancho. La distancia del centro al path debe ser > ancho/2 + semidiagonal + 2.
            const margin = path.width / 2 + Math.max(casa!.w, casa!.d) / 2 + 2;
            expect(minDist).toBeGreaterThan(margin);
        }
    });

    it('el GLB existe en assets/models/', () => {
        const glbPath = join(process.cwd(), 'assets/models/casa_creador.glb');
        expect(existsSync(glbPath)).toBe(true);
    });

    it('la rotación es múltiplo de 90 (alineada con ejes)', () => {
        expect(casa!.rotDeg % 90).toBe(0);
    });
});

function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.hypot(px - projX, py - projY);
}
