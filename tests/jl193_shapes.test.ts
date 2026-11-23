import { describe, it, expect } from 'vitest';
import { shapeHitsCircle } from '../src/sim/shapes';
import type { PlacedShape } from '../src/sim/shapes';
import type { Vec2 } from '../src/sim/vec2';

const origin: Vec2 = { x: 0, y: 0 };
const dir = 0; // apunta a +X

function make(def: any): PlacedShape {
    return { def, origin, dir };
}

/* ─── Circle ─── */

describe('shapeHitsCircle: circle', () => {
    const s = make({ type: 'circle', radius: 3 });

    it('punto en el centro, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto a 2 m del centro, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 3 m del centro, radio 0 → en el borde, dentro', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0)).toBe(true);
    });

    it('punto a 4 m del centro, radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0)).toBe(false);
    });

    it('punto a 2 m del centro, radio 1.5 → toca (2+1.5 > 3)', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 1.5)).toBe(true);
    });

    it('punto a 4 m del centro, radio 0.5 → fuera (dist²=16 > (3+0.5)²=12.25)', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0.5)).toBe(false);
    });

    it('punto a 3 m del centro, radio 0.5 → toca (dist²=9 <= (3+0.5)²=12.25)', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0.5)).toBe(true);
    });

    it('punto a 5 m del centro, radio 0.5 → fuera (5-0.5 > 3)', () => {
        expect(shapeHitsCircle(s, { x: 5, y: 0 }, 0.5)).toBe(false);
    });

    it('punto en diagonal a √18 ≈ 4.24, radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 3 }, 0)).toBe(false);
    });

    it('punto en diagonal a √8 ≈ 2.83, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 2 }, 0)).toBe(true);
    });
});

/* ─── Line ─── */

describe('shapeHitsCircle: line', () => {
    const s = make({ type: 'line', length: 4, width: 1 });

    it('punto en el centro de la línea, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto en el inicio (0,0), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto en el final (4,0), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0)).toBe(true);
    });

    it('punto fuera del largo (5,0), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 5, y: 0 }, 0)).toBe(false);
    });

    it('punto antes del inicio (-1,0), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: -1, y: 0 }, 0)).toBe(false);
    });

    it('punto fuera del ancho (2, 1), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 1 }, 0)).toBe(false);
    });

    it('punto en el borde del ancho (2, 0.5), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0.5 }, 0)).toBe(true);
    });

    it('punto fuera del ancho con radio 0 → fuera (|across|=0.6 > width/2=0.5)', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0.6 }, 0)).toBe(false);
    });

    it('punto fuera del ancho con radio 0.6 → toca (|across|=0.6 <= width/2+r=1.1)', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0.6 }, 0.6)).toBe(true);
    });

    it('punto fuera del largo con radio 1 → toca el borde', () => {
        expect(shapeHitsCircle(s, { x: 5, y: 0 }, 1)).toBe(true);
    });

    it('punto antes del inicio con radio 1 → toca el borde', () => {
        expect(shapeHitsCircle(s, { x: -1, y: 0 }, 1)).toBe(true);
    });

    it('rotado 90°: la línea va a +Z (eje Y en Vec2)', () => {
        const rotated: PlacedShape = { def: s.def, origin, dir: Math.PI / 2 };
        expect(shapeHitsCircle(rotated, { x: 0, y: 2 }, 0)).toBe(true);
        expect(shapeHitsCircle(rotated, { x: 2, y: 0 }, 0)).toBe(false);
    });
});

/* ─── Square ─── */

describe('shapeHitsCircle: square', () => {
    const s = make({ type: 'square', size: 4 });

    it('punto en el centro, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto a 2 m en X, radio 0 → en el borde, dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 2 m en Y, radio 0 → en el borde, dentro', () => {
        expect(shapeHitsCircle(s, { x: 0, y: 2 }, 0)).toBe(true);
    });

    it('punto a 3 m en X, radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0)).toBe(false);
    });

    it('esquina (2,2), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 2 }, 0)).toBe(true);
    });

    it('esquina (2.1, 2.1), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 2.1, y: 2.1 }, 0)).toBe(false);
    });

    it('esquina (2.1, 2.1) con radio 0.2 → toca', () => {
        expect(shapeHitsCircle(s, { x: 2.1, y: 2.1 }, 0.2)).toBe(true);
    });

    it('rotado 90°: el cuadrado gira pero sigue centrado', () => {
        const rotated: PlacedShape = { def: s.def, origin, dir: Math.PI / 2 };
        expect(shapeHitsCircle(rotated, { x: 0, y: 2 }, 0)).toBe(true);
        expect(shapeHitsCircle(rotated, { x: 2, y: 0 }, 0)).toBe(true);
    });
});

/* ─── Cross ─── */

describe('shapeHitsCircle: cross', () => {
    const s = make({ type: 'cross', arm: 3, width: 1 });

    it('punto en el centro, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto a 2 m en X (brazo horizontal), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 2 m en Y (brazo vertical), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 0, y: 2 }, 0)).toBe(true);
    });

    it('punto a 3 m en X (fin del brazo), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0)).toBe(true);
    });

    it('punto a 4 m en X (fuera del brazo), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0)).toBe(false);
    });

    it('punto en la esquina entre brazos (2, 2) → fuera (no es parte de la cruz)', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 2 }, 0)).toBe(false);
    });

    it('punto a 0.6 m en Y (fuera del ancho 0.5), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0.6 }, 0)).toBe(false);
    });

    it('punto a 0.6 m en Y con radio 0.2 → toca', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0.6 }, 0.2)).toBe(true);
    });

    it('punto a 3.5 m en X con radio 0.6 → toca', () => {
        expect(shapeHitsCircle(s, { x: 3.5, y: 0 }, 0.6)).toBe(true);
    });

    it('punto a 4 m en X con radio 0.5 → fuera (|along|=4 > arm+r=3.5)', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0.5)).toBe(false);
    });

    it('punto a 3.5 m en X con radio 0.5 → toca (|along|=3.5 <= arm+r=3.5)', () => {
        expect(shapeHitsCircle(s, { x: 3.5, y: 0 }, 0.5)).toBe(true);
    });

    it('rotado 45°: los brazos se alinean en diagonal', () => {
        const rotated: PlacedShape = { def: s.def, origin, dir: Math.PI / 4 };
        // En diagonal, el punto (2,2) está a lo largo de un brazo
        const d = Math.cos(Math.PI / 4);
        expect(shapeHitsCircle(rotated, { x: 2 * d, y: 2 * d }, 0)).toBe(true);
    });
});

/* ─── Star ─── */

describe('shapeHitsCircle: star', () => {
    const s = make({ type: 'star', arm: 3, width: 1 });

    it('punto en el centro, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto a 2 m en X (brazo horizontal), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 2 m en Y (brazo vertical), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 0, y: 2 }, 0)).toBe(true);
    });

    it('punto a 3 m en X (fin del brazo), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0)).toBe(true);
    });

    it('punto a 4 m en X (fuera del brazo), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0)).toBe(false);
    });

    it('brazo diagonal: punto (2,2) → dentro (la primera cruz lo captura: along=2.83, across=0)', () => {
        // La estrella usa dos cruces superpuestas: una alineada con dir y otra rotada 45°.
        // Con dir=0: along=2*cos(0)+2*sin(0)=2, across=-2*sin(0)+2*cos(0)=2.
        // Primera cruz: |across|<=0.5? |2|<=0.5 → no. |along|<=0.5? |2|<=0.5 → no.
        // Segunda cruz (diagonal): d1=(2+2)*0.707=2.83, d2=(-2+2)*0.707=0.
        // |d2|<=0.5? sí. |d1|<=3? 2.83<=3 → sí → dentro.
        expect(shapeHitsCircle(s, { x: 2, y: 2 }, 0)).toBe(true);
    });

    it('brazo diagonal: punto cerca del eje diagonal', () => {
        // Un punto muy cerca del eje diagonal a distancia 2 del centro
        // along ≈ 2, across ≈ 0 → primera cruz: |across|<=0.5 && |along|<=3 → dentro
        expect(shapeHitsCircle(s, { x: 2, y: 0.1 }, 0)).toBe(true);
    });

    it('sin width definido (default 1)', () => {
        const sNoWidth = make({ type: 'star', arm: 3 });
        expect(shapeHitsCircle(sNoWidth, origin, 0)).toBe(true);
        expect(shapeHitsCircle(sNoWidth, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 3.5 m en X con radio 0.6 → toca', () => {
        expect(shapeHitsCircle(s, { x: 3.5, y: 0 }, 0.6)).toBe(true);
    });
});

/* ─── Cone ─── */

describe('shapeHitsCircle: cone', () => {
    const s = make({ type: 'cone', length: 4, angleDeg: 90 });

    it('punto en el vértice, radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
    });

    it('punto a 2 m en el eje (dentro del ángulo), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('punto a 4 m en el eje (fin del cono), radio 0 → dentro', () => {
        expect(shapeHitsCircle(s, { x: 4, y: 0 }, 0)).toBe(true);
    });

    it('punto a 5 m en el eje (fuera del largo), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: 5, y: 0 }, 0)).toBe(false);
    });

    it('punto detrás del vértice (-1, 0), radio 0 → fuera', () => {
        expect(shapeHitsCircle(s, { x: -1, y: 0 }, 0)).toBe(false);
    });

    it('punto fuera del ángulo (2, 3), radio 0 → fuera', () => {
        // angleDeg=90 → halfAngle=45°. El punto (2,3) tiene ángulo atan2(3,2)=56.3° > 45°.
        expect(shapeHitsCircle(s, { x: 2, y: 3 }, 0)).toBe(false);
    });

    it('punto en el borde del ángulo (2, 2), radio 0 → dentro (45° exacto)', () => {
        // angleDeg=90 → halfAngle=45°. El punto (2,2) tiene ángulo 45°.
        expect(shapeHitsCircle(s, { x: 2, y: 2 }, 0)).toBe(true);
    });

    it('punto fuera del cono con radio 1 → toca si está cerca', () => {
        // (5, 0) está a 5 m, radio 1: d-r = 4 <= length=4 → dentro
        expect(shapeHitsCircle(s, { x: 5, y: 0 }, 1)).toBe(true);
    });

    it('cono estrecho (30°): punto a 2 m en el eje → dentro', () => {
        const narrow: PlacedShape = { def: { type: 'cone', length: 4, angleDeg: 30 }, origin, dir };
        expect(shapeHitsCircle(narrow, { x: 2, y: 0 }, 0)).toBe(true);
    });

    it('cono estrecho (30°): punto a 2 m con desviación 10° → fuera', () => {
        const narrow: PlacedShape = { def: { type: 'cone', length: 4, angleDeg: 30 }, origin, dir };
        // halfAngle = 15°. Un punto a 10° del eje está dentro.
        // (2, 0.35) ≈ 10° del eje.
        expect(shapeHitsCircle(narrow, { x: 2, y: 0.35 }, 0)).toBe(true);
    });

    it('cono estrecho (30°): punto a 2 m con desviación 20° → fuera', () => {
        const narrow: PlacedShape = { def: { type: 'cone', length: 4, angleDeg: 30 }, origin, dir };
        // halfAngle = 15°. Un punto a 20° del eje está fuera.
        // (2, 0.73) ≈ 20° del eje.
        expect(shapeHitsCircle(narrow, { x: 2, y: 0.73 }, 0)).toBe(false);
    });

    it('cono de 360°: solo los puntos dentro del largo son dentro', () => {
        const full: PlacedShape = { def: { type: 'cone', length: 4, angleDeg: 360 }, origin, dir };
        // half=PI, pero el check d-r > length va ANTES del check de ángulo.
        // (3,3): d=4.24 > 4 → false (fuera por distancia, no por ángulo).
        expect(shapeHitsCircle(full, { x: 3, y: 3 }, 0)).toBe(false);
        // (3,0): d=3 <= 4 → dentro
        expect(shapeHitsCircle(full, { x: 3, y: 0 }, 0)).toBe(true);
        // (-3,0): d=3, along=-3 < 0 → off=atan2(across,along) → fuera por ángulo
        // En realidad: half>=PI → true, pero d-r > length? 3-0>4? no. d<=r? no.
        // off=|atan2(0,-3)|=PI. half=PI. off<=half+asin(0)=PI → true.
        expect(shapeHitsCircle(full, { x: -3, y: 0 }, 0)).toBe(true);
        expect(shapeHitsCircle(full, { x: 5, y: 0 }, 0)).toBe(false);
    });

    it('cono rotado 90°: apunta a +Z (eje Y en Vec2)', () => {
        const rotated: PlacedShape = { def: s.def, origin, dir: Math.PI / 2 };
        expect(shapeHitsCircle(rotated, { x: 0, y: 2 }, 0)).toBe(true);
        expect(shapeHitsCircle(rotated, { x: 2, y: 0 }, 0)).toBe(false);
    });

    it('punto muy cerca del vértice con radio grande → dentro aunque esté fuera del ángulo', () => {
        // d <= r → dentro sin importar el ángulo
        expect(shapeHitsCircle(s, { x: 0.1, y: 0.1 }, 1)).toBe(true);
    });
});

/* ─── Edge cases ─── */

describe('shapeHitsCircle: edge cases', () => {
    it('radio 0 con punto exactamente en el borde del círculo', () => {
        const s = make({ type: 'circle', radius: 3 });
        // (3, 0) está exactamente a 3 m del centro
        expect(shapeHitsCircle(s, { x: 3, y: 0 }, 0)).toBe(true);
        // (3.001, 0) está fuera
        expect(shapeHitsCircle(s, { x: 3.001, y: 0 }, 0)).toBe(false);
    });

    it('radio grande engloba la forma entera', () => {
        const s = make({ type: 'square', size: 4 });
        // Un actor de radio 10 en el centro toca todo
        expect(shapeHitsCircle(s, origin, 10)).toBe(true);
    });

    it('coordenadas negativas', () => {
        const s = make({ type: 'circle', radius: 5 });
        expect(shapeHitsCircle(s, { x: -3, y: -4 }, 0)).toBe(true); // √(9+16)=5
        expect(shapeHitsCircle(s, { x: -4, y: -4 }, 0)).toBe(false); // √(16+16)=5.66
    });

    it('origin desplazado', () => {
        const s: PlacedShape = { def: { type: 'circle', radius: 2 }, origin: { x: 10, y: 10 }, dir: 0 };
        expect(shapeHitsCircle(s, { x: 10, y: 10 }, 0)).toBe(true);
        expect(shapeHitsCircle(s, { x: 12, y: 10 }, 0)).toBe(true);
        expect(shapeHitsCircle(s, { x: 13, y: 10 }, 0)).toBe(false);
    });

    it('línea muy delgada (width 0.1)', () => {
        const s = make({ type: 'line', length: 4, width: 0.1 });
        expect(shapeHitsCircle(s, { x: 2, y: 0 }, 0)).toBe(true);
        expect(shapeHitsCircle(s, { x: 2, y: 0.06 }, 0)).toBe(false);
        expect(shapeHitsCircle(s, { x: 2, y: 0.06 }, 0.06)).toBe(true);
    });

    it('cuadrado pequeño (size 0.5)', () => {
        const s = make({ type: 'square', size: 0.5 });
        expect(shapeHitsCircle(s, origin, 0)).toBe(true);
        expect(shapeHitsCircle(s, { x: 0.26, y: 0 }, 0)).toBe(false);
        expect(shapeHitsCircle(s, { x: 0.26, y: 0 }, 0.01)).toBe(true);
    });
});
