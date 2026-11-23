// CLA-MON1 (creador, 2026-11-22): los jinetes parecen flotar sobre la montura.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RiderSeat, SEAT_SETTLE_FRAMES, SEAT_SINK, seatCorrection } from '../src/render/riderSeat';

describe('CLA-MON1: corrección del asiento del jinete', () => {
    it('baja al jinete que flota y lo deja hundido SEAT_SINK en el lomo', () => {
        expect(seatCorrection(1.2, 1.5)).toBeCloseTo(1.2 - SEAT_SINK - 1.5);
        expect(seatCorrection(1.2, 1.1)).toBeCloseTo(1.2 - SEAT_SINK - 1.1);
    });

    it('acota la corrección si un rayo da en un ala o en la cabeza', () => {
        expect(seatCorrection(3, 1)).toBeLessThanOrEqual(0.3);
        expect(seatCorrection(0, 3)).toBeGreaterThanOrEqual(-0.8);
    });

    it('mide una sola vez tras asentarse y vuelve a medir al cambiar de montura', () => {
        const seat = new RiderSeat();
        let calls = 0;
        const measure = () => (calls++, { back: 1.2, riderBottom: 1.5 });
        for (let i = 1; i < SEAT_SETTLE_FRAMES; i++) expect(seat.update('mula|1.8', measure)).toBe(0);
        const dy = seat.update('mula|1.8', measure);
        expect(dy).toBeCloseTo(-0.33);
        expect(seat.settled).toBe(true);
        for (let i = 0; i < 30; i++) seat.update('mula|1.8', measure);
        expect(calls).toBe(1);
        expect(seat.update('arpia|1.8', measure)).toBe(0);
        expect(seat.settled).toBe(false);
    });

    it('si la medida falla, vuelve a intentarlo el fotograma siguiente', () => {
        const seat = new RiderSeat();
        let n = 0;
        const measure = () => (++n < 2 ? null : { back: 1, riderBottom: 1 });
        for (let i = 0; i < SEAT_SETTLE_FRAMES + 1; i++) seat.update('k', measure);
        expect(seat.settled).toBe(true);
        expect(n).toBe(2);
    });

    it('la vista de arena aplica la corrección al jinete', () => {
        const src = readFileSync(new URL('../src/render/arenaView.ts', import.meta.url), 'utf-8');
        expect(src).toMatch(/riderSeat\.update\(/);
        expect(src).toMatch(/\+ seatFix/);
    });
});
