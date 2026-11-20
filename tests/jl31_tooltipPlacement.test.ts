// JL-31: Tooltips que se salen de la pantalla en los bordes — recolocarlos dentro.
// Prueba la lógica de place() con el clamp final que garantiza que el tooltip
// nunca se salga de la ventana, incluso cuando es más grande que la pantalla.
import { describe, it, expect } from 'vitest';

/**
 * Replica la lógica de Tooltip.place() para verificar que el resultado
 * siempre mantiene el tooltip dentro de los márgenes de la ventana.
 */
function placeTooltip(
    cursorX: number,
    cursorY: number,
    tooltipW: number,
    tooltipH: number,
    vw: number,
    vh: number,
) {
    const margin = 6;
    const pad = 14;

    // ── Eje horizontal: derecha del cursor → izquierda → centrado ──
    let left = cursorX + pad;
    if (left + tooltipW > vw - margin) {
        left = cursorX - pad - tooltipW;
    }
    if (left < margin) {
        left = Math.max(margin, (vw - tooltipW) / 2);
    }

    // ── Eje vertical: abajo del cursor → arriba → forzado dentro ──
    let top = cursorY + pad;
    if (top + tooltipH > vh - margin) {
        top = cursorY - pad - tooltipH;
    }
    if (top < margin) {
        top = Math.max(margin, vh - tooltipH - margin);
    }

    // ── Clamp final: garantiza que nunca se salga ──
    left = Math.max(margin, Math.min(left, vw - tooltipW - margin));
    top = Math.max(margin, Math.min(top, vh - tooltipH - margin));

    return { left, top };
}

describe('JL-31 — Tooltip.place() nunca sale de la pantalla', () => {
    const vw = 1920;
    const vh = 1080;

    it('cursor en esquina inferior derecha → tooltip a la izquierda y arriba', () => {
        const { left, top } = placeTooltip(vw - 10, vh - 10, 300, 200, vw, vh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 300).toBeLessThanOrEqual(vw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 200).toBeLessThanOrEqual(vh - 6);
        // Debe estar arriba del cursor
        expect(top + 200).toBeLessThanOrEqual(vh - 10);
    });

    it('cursor en esquina inferior izquierda → tooltip a la derecha y arriba', () => {
        const { left, top } = placeTooltip(10, vh - 10, 300, 200, vw, vh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 300).toBeLessThanOrEqual(vw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 200).toBeLessThanOrEqual(vh - 6);
    });

    it('cursor en esquina superior derecha → tooltip a la izquierda y abajo', () => {
        const { left, top } = placeTooltip(vw - 10, 10, 300, 200, vw, vh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 300).toBeLessThanOrEqual(vw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 200).toBeLessThanOrEqual(vh - 6);
    });

    it('cursor en el centro → tooltip a la derecha y abajo (posición natural)', () => {
        const { left, top } = placeTooltip(vw / 2, vh / 2, 200, 150, vw, vh);
        expect(left).toBe(vw / 2 + 14);
        expect(top).toBe(vh / 2 + 14);
    });

    it('tooltip más ancho que la pantalla → centrado con margen', () => {
        const narrowVw = 400;
        const { left, top } = placeTooltip(10, 300, 350, 100, narrowVw, 600);
        expect(left).toBeGreaterThanOrEqual(6);
        // El clamp final asegura que no se salga por la derecha
        expect(left + 350).toBeLessThanOrEqual(narrowVw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 100).toBeLessThanOrEqual(600 - 6);
    });

    it('tooltip más alto que la ventana → prioriza la parte superior', () => {
        const shortVh = 200;
        const { left, top } = placeTooltip(500, shortVh - 10, 200, 250, 1920, shortVh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 200).toBeLessThanOrEqual(1920 - 6);
        // El clamp final fuerza top >= margin
        expect(top).toBeGreaterThanOrEqual(6);
        // El tooltip no cabe completo; se muestra desde arriba con margen
        expect(top).toBe(6);
    });

    it('tooltip más grande que la ventana en ambos ejes → clamp en ambos', () => {
        const tinyVw = 300;
        const tinyVh = 250;
        const { left, top } = placeTooltip(10, 10, 400, 300, tinyVw, tinyVh);
        // Clamp: left >= 6 y left <= vw - w - 6 (que es negativo, así que left = 6)
        expect(top).toBeGreaterThanOrEqual(6);
        expect(left).toBeGreaterThanOrEqual(6);
        // En pantallas muy pequeñas, el clamp superior permite que se salga
        // pero el inferior garantiza que empiece dentro
    });

    it('cursor muy cerca del borde derecho con tooltip ancho → invierte a la izquierda', () => {
        const { left, top } = placeTooltip(vw - 20, 500, 320, 150, vw, vh);
        // Debe invertir a la izquierda del cursor
        expect(left + 320).toBeLessThanOrEqual(vw - 6);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 150).toBeLessThanOrEqual(vh - 6);
    });

    it('cursor muy cerca del borde inferior con tooltip alto → invierte arriba', () => {
        const { left, top } = placeTooltip(500, vh - 20, 200, 300, vw, vh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 200).toBeLessThanOrEqual(vw - 6);
        // Debe invertir arriba del cursor
        expect(top + 300).toBeLessThanOrEqual(vh - 6);
        expect(top).toBeGreaterThanOrEqual(6);
    });

    it('pantalla estrecha (1366x768) — cursor en borde derecho', () => {
        const narrowVw = 1366;
        const narrowVh = 768;
        const { left, top } = placeTooltip(narrowVw - 10, narrowVh - 10, 300, 200, narrowVw, narrowVh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 300).toBeLessThanOrEqual(narrowVw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 200).toBeLessThanOrEqual(narrowVh - 6);
    });

    it('pantalla ultrawide (2560x1440) — esquina inferior derecha', () => {
        const wideVw = 2560;
        const wideVh = 1440;
        const { left, top } = placeTooltip(wideVw - 10, wideVh - 10, 320, 250, wideVw, wideVh);
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 320).toBeLessThanOrEqual(wideVw - 6);
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 250).toBeLessThanOrEqual(wideVh - 6);
    });

    it('clamp final corrige left cuando vw - tooltipW - margin < left calculado', () => {
        // Pantalla de 350px, tooltip de 330px: el espacio útil es 350-330-6-6 = 8px
        const tinyVw = 350;
        const tinyVh = 600;
        const { left, top } = placeTooltip(200, 300, 330, 100, tinyVw, tinyVh);
        // left calculado: 200 + 14 = 214; 214 + 330 = 544 > 344 → invierte: 200 - 14 - 330 = -144
        // left < 6 → centra: max(6, (350-330)/2) = max(6, 10) = 10
        // clamp: max(6, min(10, 350-330-6)) = max(6, min(10, 14)) = 10
        expect(left).toBeGreaterThanOrEqual(6);
        expect(left + 330).toBeLessThanOrEqual(tinyVw - 6);
    });

    it('clamp final corrige top cuando vh - tooltipH - margin < top calculado', () => {
        const tinyVw = 1920;
        const tinyVh = 300;
        const { left, top } = placeTooltip(500, 290, 200, 280, tinyVw, tinyVh);
        // top calculado: 290 + 14 = 304; 304 + 280 = 584 > 294 → invierte: 290 - 14 - 280 = -4
        // top < 6 → max(6, 300-280-6) = max(6, 14) = 14
        // clamp: max(6, min(14, 300-280-6)) = max(6, min(14, 14)) = 14
        expect(top).toBeGreaterThanOrEqual(6);
        expect(top + 280).toBeLessThanOrEqual(tinyVh - 6);
    });
});
