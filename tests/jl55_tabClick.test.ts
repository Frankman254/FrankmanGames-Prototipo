// JL-55: durante el vuelo, el clic en el suelo debe mover al jugador.
// Pruebas del flujo: FlightManager.click() establece el target y moveTarget,
// y commandMove() durante flight delega a flightManager.click().

import { describe, it, expect } from 'vitest';
import { FlightManager, type FlightHost } from '../src/sim/flight';
import { NavGrid } from '../src/sim/navGrid';
import { copy, type Vec2 } from '../src/sim/vec2';

describe('JL-55: clic en el aire durante vuelo', () => {
    function makeGrid() {
        return NavGrid.fromObstacles(200, 200, 1, [], 0.5);
    }

    function makeHost(grid: NavGrid) {
        const pos: Vec2 = { x: 100, y: 100 };
        const player: any = {
            pos,
            moveTarget: null,
            path: [],
            flight: { altitude: 10 },
            attackTarget: null,
            pickupTarget: null,
            casting: null,
            speed: 6, // velocidad de la montura
        };
        return {
            player,
            grid,
            canFly: () => true,
            stopFishing: () => {},
            stopTalk: () => {},
            landed: () => {},
        } as any;
    }

    it('FlightManager.click() establece moveTarget en el jugador', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        const target = { x: 106, y: 102 };
        fm.click(target);

        expect(host.player.moveTarget).not.toBeNull();
        expect(host.player.moveTarget.x).toBeCloseTo(target.x, 1);
        expect(host.player.moveTarget.y).toBeCloseTo(target.y, 1);
    });

    it('FlightManager.click() clampa el target dentro de la rejilla', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        // Target fuera de la rejilla: debe clamparse
        fm.click({ x: -10, y: 300 });

        expect(host.player.moveTarget.x).toBeGreaterThanOrEqual(grid.originX + 1);
        expect(host.player.moveTarget.x).toBeLessThanOrEqual(grid.originX + grid.width - 1);
        expect(host.player.moveTarget.y).toBeGreaterThanOrEqual(grid.originY + 1);
        expect(host.player.moveTarget.y).toBeLessThanOrEqual(grid.originY + grid.depth - 1);
    });

    it('FlightManager.targetActive es true tras click(), false sin target', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        expect(fm.targetActive).toBe(false);

        fm.click({ x: 106, y: 102 });
        expect(fm.targetActive).toBe(true);
    });

    it('FlightManager.tick() mueve hacia el target del clic', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        const start = copy(host.player.pos);
        fm.click({ x: 106, y: 102 });

        // tick con dt=0.1s: el jugador se mueve hacia el target
        fm.tick(0.1);

        const moved = Math.hypot(host.player.pos.x - start.x, host.player.pos.y - start.y);
        expect(moved).toBeGreaterThan(0);
        // Se mueve en la dirección correcta
        expect(host.player.pos.x).toBeGreaterThan(start.x);
        expect(host.player.pos.y).toBeGreaterThan(start.y);
    });

    it('FlightManager.tick() limpia target al llegar', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        // Target muy cerca: llega en un tick
        fm.click({ x: 100.1, y: 100.1 });
        fm.tick(0.5);

        expect(fm.targetActive).toBe(false);
        expect(host.player.moveTarget).toBeNull();
    });

    it('WASD cancela el target del clic', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        const fm = new FlightManager(host);

        fm.click({ x: 106, y: 102 });
        expect(fm.targetActive).toBe(true);

        // WASD input cancela el target
        fm.setInput({ x: 1, y: 0 }, false);
        fm.tick(0.1);

        expect(fm.targetActive).toBe(false);
    });

    it('toggle() despega y prepara el vuelo', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        host.player.flight = null; // en tierra
        const fm = new FlightManager(host);

        const flying = fm.toggle();
        expect(flying).toBe(true);
        expect(host.player.flight).not.toBeNull();
        expect(host.player.flight!.altitude).toBe(0);
        expect(host.player.path).toEqual([]);
        expect(host.player.moveTarget).toBeNull();
    });

    it('toggle() aterriza y limpia el vuelo', () => {
        const grid = makeGrid();
        const host = makeHost(grid);
        host.player.flight = { altitude: 15 };
        const fm = new FlightManager(host);

        fm.click({ x: 106, y: 102 });
        expect(fm.targetActive).toBe(true);

        const flying = fm.toggle();
        expect(flying).toBe(false);
        expect(host.player.flight).toBeNull();
        expect(fm.targetActive).toBe(false);
    });
});
