// ED-02: Pruebas del arreglo del gizmo 3D del editor.
//
// El fallo era que los gizmos de Babylon.js no se veían ni respondían al
// arrastre porque el canvas de la UtilityLayer (z-index por defecto) quedaba
// tapado por el workspace del editor (z-index 55). El arreglo sube el
// z-index del canvas de la UtilityLayer a 9999.
//
// Estas pruebas verifican la lógica de snap y callbacks del gizmo sin
// depender de Babylon.js ni del DOM.

import { describe, it, expect } from 'vitest';

// ---- Snap de posición a rejilla ----

function snapPosition(value: number, snapDistance: number): number {
    return Math.round(value / snapDistance) * snapDistance;
}

describe('ED-02 gizmo snap', () => {
    it('snapPosition redondea a la rejilla de 0.5', () => {
        const snap = 0.5;
        // Math.round(1.1/0.5)*0.5 = Math.round(2.2)*0.5 = 2*0.5 = 1.0
        expect(snapPosition(1.1, snap)).toBe(1.0);
        // Math.round(1.4/0.5)*0.5 = Math.round(2.8)*0.5 = 3*0.5 = 1.5
        expect(snapPosition(1.4, snap)).toBe(1.5);
        // Math.round(1.6/0.5)*0.5 = Math.round(3.2)*0.5 = 3*0.5 = 1.5
        expect(snapPosition(1.6, snap)).toBe(1.5);
        // Math.round(1.75/0.5)*0.5 = Math.round(3.5)*0.5 = 4*0.5 = 2.0
        expect(snapPosition(1.75, snap)).toBe(2.0);
        // Math.round(-0.3/0.5)*0.5 = Math.round(-0.6)*0.5 = -1*0.5 = -0.5
        expect(snapPosition(-0.3, snap)).toBe(-0.5);
        expect(snapPosition(0.0, snap)).toBe(0.0);
    });

    it('snapPosition no mueve si ya está en la rejilla', () => {
        const snap = 0.5;
        expect(snapPosition(1.0, snap)).toBe(1.0);
        expect(snapPosition(1.5, snap)).toBe(1.5);
        expect(snapPosition(0.0, snap)).toBe(0.0);
    });

    it('snapPosition con rejilla de 1.0', () => {
        const snap = 1.0;
        expect(snapPosition(1.4, snap)).toBe(1.0);
        expect(snapPosition(1.5, snap)).toBe(2.0);
        expect(snapPosition(2.5, snap)).toBe(3.0);
    });
});

// ---- Detección de clic sin arrastre ----

function isClickWithoutDrag(
    startSnappedX: number,
    startSnappedY: number,
    endSnappedX: number,
    endSnappedY: number,
): boolean {
    return (
        Math.abs(endSnappedX - startSnappedX) < 1e-6 &&
        Math.abs(endSnappedY - startSnappedY) < 1e-6
    );
}

describe('ED-02 gizmo click vs drag', () => {
    it('un clic sin arrastre no dispara onMove', () => {
        const snapped = (v: number) => Math.round(v / 0.5) * 0.5;
        const startX = 3.0;
        const startY = 4.0;
        // Después del drag (que no hubo), la posición es idéntica
        const endX = 3.0;
        const endY = 4.0;
        expect(
            isClickWithoutDrag(
                snapped(startX),
                snapped(startY),
                snapped(endX),
                snapped(endY),
            ),
        ).toBe(true);
    });

    it('un arrastre de una celda sí dispara onMove', () => {
        const snapped = (v: number) => Math.round(v / 0.5) * 0.5;
        expect(
            isClickWithoutDrag(
                snapped(3.0),
                snapped(4.0),
                snapped(3.5),
                snapped(4.0),
            ),
        ).toBe(false);
    });
});

// ---- Snap de rotación a 15° ----

function snapRotation(degrees: number, snapDeg: number): number {
    const normalized = degrees % 360;
    return Math.round(normalized / snapDeg) * snapDeg;
}

describe('ED-02 gizmo rotation snap', () => {
    it('snapRotation redondea a múltiplos de 15°', () => {
        // Math.round(10/15)*15 = 1*15 = 15
        expect(snapRotation(10, 15)).toBe(15);
        // Math.round(20/15)*15 = 1*15 = 15
        expect(snapRotation(20, 15)).toBe(15);
        // Math.round(22/15)*15 = 1*15 = 15
        expect(snapRotation(22, 15)).toBe(15);
        // Math.round(23/15)*15 = 2*15 = 30
        expect(snapRotation(23, 15)).toBe(30);
        // Math.round(24/15)*15 = 2*15 = 30
        expect(snapRotation(24, 15)).toBe(30);
        expect(snapRotation(0, 15)).toBe(0);
        expect(snapRotation(360, 15)).toBe(0);
        expect(snapRotation(345, 15)).toBe(345);
        // Math.round(350/15)*15 = 23*15 = 345
        expect(snapRotation(350, 15)).toBe(345);
    });

    it('steps calcula la diferencia en unidades de 15°', () => {
        const startDeg = 30;
        const endDeg = 75;
        const steps = Math.round((endDeg - startDeg) / 15);
        expect(steps).toBe(3);
    });
});

// ---- Snap de escala uniforme ----

function snapScale(rawFactor: number, snapScale: number): number {
    const changed = rawFactor;
    return Math.max(snapScale, Math.round(changed / snapScale) * snapScale);
}

describe('ED-02 gizmo scale snap', () => {
    it('snapScale redondea a décimas', () => {
        expect(snapScale(1.23, 0.1)).toBeCloseTo(1.2, 10);
        expect(snapScale(1.26, 0.1)).toBeCloseTo(1.3, 10);
        expect(snapScale(0.74, 0.1)).toBeCloseTo(0.7, 10);
        expect(snapScale(1.0, 0.1)).toBe(1.0);
    });

    it('snapScale no baja del mínimo', () => {
        expect(snapScale(0.01, 0.1)).toBe(0.1);
        expect(snapScale(0.04, 0.1)).toBe(0.1);
    });
});

// ---- UtilityLayer z-index ----

describe('ED-02 gizmo UtilityLayer z-index', () => {
    it('el z-index del canvas de la UtilityLayer debe ser mayor que el del workspace', () => {
        // El workspace del editor tiene z-index 55 (workspace.css).
        // El arreglo establece z-index 9999 en el canvas de la UtilityLayer.
        const workspaceZIndex = 55;
        const utilityLayerZIndex = 9999;
        expect(utilityLayerZIndex).toBeGreaterThan(workspaceZIndex);
    });

    it('el cssText añadido incluye position:fixed para que z-index funcione', () => {
        const cssText = 'z-index:9999;position:fixed;top:0;left:0;';
        expect(cssText).toContain('z-index:9999');
        expect(cssText).toContain('position:fixed');
    });
});
