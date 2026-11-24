import { describe, it, expect } from 'vitest';
import {
    BARRIADA,
    barriadaCasas,
    barriadaLosas,
    barriadaPiedra,
    barriadaInicio,
    barriadaBounds,
} from '../src/world/barriada';
import {
    drawBarriadaWorldMap,
    barriadaWorldBounds,
    barriadaStoneWorldPos,
    barriadaStartWorldPos,
} from '../src/ui/map/barriadaMap';

describe('JL-218: Mapa grande de la barriada', () => {
    it('barriadaWorldBounds devuelve el rectángulo de la zona', () => {
        const b = barriadaWorldBounds();
        expect(b.x0).toBe(BARRIADA.origen.x);
        expect(b.y0).toBe(BARRIADA.origen.y);
        expect(b.x1).toBe(BARRIADA.origen.x + BARRIADA.ancho);
        expect(b.y1).toBe(BARRIADA.origen.y + BARRIADA.fondo);
    });

    it('barriadaWorldBounds coincide con barriadaBounds', () => {
        const wb = barriadaWorldBounds();
        const bb = barriadaBounds();
        expect(wb).toEqual(bb);
    });

    it('barriadaStoneWorldPos coincide con barriadaPiedra', () => {
        const stone = barriadaStoneWorldPos();
        const piedra = barriadaPiedra();
        expect(stone).toEqual(piedra);
    });

    it('barriadaStartWorldPos coincide con barriadaInicio', () => {
        const start = barriadaStartWorldPos();
        const inicio = barriadaInicio();
        expect(start).toEqual(inicio);
    });

    it('la piedra y la entrada están dentro de los bounds', () => {
        const b = barriadaWorldBounds();
        const stone = barriadaStoneWorldPos();
        const start = barriadaStartWorldPos();
        expect(stone.x).toBeGreaterThanOrEqual(b.x0);
        expect(stone.x).toBeLessThanOrEqual(b.x1);
        expect(stone.y).toBeGreaterThanOrEqual(b.y0);
        expect(stone.y).toBeLessThanOrEqual(b.y1);
        expect(start.x).toBeGreaterThanOrEqual(b.x0);
        expect(start.x).toBeLessThanOrEqual(b.x1);
        expect(start.y).toBeGreaterThanOrEqual(b.y0);
        expect(start.y).toBeLessThanOrEqual(b.y1);
    });

    it('drawBarriadaWorldMap no lanza con contexto mock', () => {
        const bounds = barriadaWorldBounds();
        const cx = (bounds.x0 + bounds.x1) / 2;
        const cy = (bounds.y0 + bounds.y1) / 2;
        const player = { x: cx, y: cy };
        // Contexto mock mínimo que registra las llamadas.
        const calls: string[] = [];
        const mockCtx = {
            fillStyle: '',
            fillRect: (...args: unknown[]) => calls.push(`fillRect ${JSON.stringify(args)}`),
            save: () => calls.push('save'),
            restore: () => calls.push('restore'),
            translate: (...args: unknown[]) => calls.push(`translate ${JSON.stringify(args)}`),
            scale: (...args: unknown[]) => calls.push(`scale ${JSON.stringify(args)}`),
            imageSmoothingEnabled: false,
            fillStyle_setter(v: string) { mockCtx.fillStyle = v; },
            strokeStyle: '',
            lineWidth: 0,
            strokeRect: (...args: unknown[]) => calls.push(`strokeRect ${JSON.stringify(args)}`),
            fillStyle_getter() { return mockCtx.fillStyle; },
            beginPath: () => calls.push('beginPath'),
            arc: (...args: unknown[]) => calls.push(`arc ${JSON.stringify(args)}`),
            fill: () => calls.push('fill'),
            stroke: () => calls.push('stroke'),
        } as unknown as CanvasRenderingContext2D;
        expect(() => {
            drawBarriadaWorldMap(mockCtx, 2, player, cx, cy, 400, 300);
        }).not.toThrow();
        // Verifica que se dibujó algo.
        expect(calls.length).toBeGreaterThan(0);
        expect(calls.some((c) => c.includes('fillRect'))).toBe(true);
    });

    it('las losas cubren las calles dentro de los bounds', () => {
        const bounds = barriadaWorldBounds();
        const losas = barriadaLosas();
        expect(losas.length).toBeGreaterThan(0);
        for (const l of losas) {
            // Cada losa debe estar dentro o en el borde de los bounds.
            expect(l.x0).toBeGreaterThanOrEqual(bounds.x0 - 0.1);
            expect(l.y0).toBeGreaterThanOrEqual(bounds.y0 - 0.1);
            expect(l.x1).toBeLessThanOrEqual(bounds.x1 + 0.1);
            expect(l.y1).toBeLessThanOrEqual(bounds.y1 + 0.1);
        }
    });

    it('las casas están dentro de los bounds de la barriada (coordenadas absolutas)', () => {
        const bounds = barriadaWorldBounds();
        const casas = barriadaCasas();
        expect(casas.length).toBeGreaterThan(0);
        // barriadaCasas() devuelve coordenadas absolutas del mundo.
        for (const c of casas) {
            expect(c.x).toBeGreaterThanOrEqual(bounds.x0 - 10);
            expect(c.x).toBeLessThanOrEqual(bounds.x1 + 10);
            expect(c.y).toBeGreaterThanOrEqual(bounds.y0 - 10);
            expect(c.y).toBeLessThanOrEqual(bounds.y1 + 10);
        }
    });

    it('hay muchas casas (barriada densa)', () => {
        const casas = barriadaCasas();
        // La barriada tiene ~430 casas según el coordinador.
        expect(casas.length).toBeGreaterThan(100);
    });

    it('drawBarriadaWorldMap con zoom diferente no lanza', () => {
        const bounds = barriadaWorldBounds();
        const cx = (bounds.x0 + bounds.x1) / 2;
        const cy = (bounds.y0 + bounds.y1) / 2;
        const player = { x: cx, y: cy };
        const calls: string[] = [];
        const mockCtx = {
            fillStyle: '',
            fillRect: () => calls.push('fillRect'),
            save: () => calls.push('save'),
            restore: () => calls.push('restore'),
            translate: () => calls.push('translate'),
            scale: () => calls.push('scale'),
            imageSmoothingEnabled: false,
            strokeStyle: '',
            lineWidth: 0,
            strokeRect: () => calls.push('strokeRect'),
            beginPath: () => calls.push('beginPath'),
            arc: () => calls.push('arc'),
            fill: () => calls.push('fill'),
            stroke: () => calls.push('stroke'),
        } as unknown as CanvasRenderingContext2D;
        // Zoom bajo.
        calls.length = 0;
        expect(() => {
            drawBarriadaWorldMap(mockCtx, 0.5, player, cx, cy, 800, 600);
        }).not.toThrow();
        expect(calls.length).toBeGreaterThan(0);
        // Zoom alto.
        calls.length = 0;
        expect(() => {
            drawBarriadaWorldMap(mockCtx, 5, player, cx, cy, 800, 600);
        }).not.toThrow();
        expect(calls.length).toBeGreaterThan(0);
    });
});
