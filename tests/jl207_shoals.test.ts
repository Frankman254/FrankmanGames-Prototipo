// JL-207: Pruebas puras de src/sim/shoals.ts — ShoalField.
// Cubre: constructor, place(), tick(), at(), nearest(), consume(),
// determinismo con semilla fija, casos de borde.

import { describe, it, expect } from 'vitest';
import { ShoalField } from '../src/sim/shoals';
import type { ShoalSpot, ShoalRules } from '../src/sim/shoals';

const DT = 1 / 60;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function spot(id = 'estanque', x = 0, y = 0, radius = 10): ShoalSpot {
    return { id, x, y, radius };
}

function rules(perSpot = 3, radius = 2, charges = 5, respawnSeconds = 30): ShoalRules {
    return { perSpot, radius, charges, respawnSeconds };
}

function field(spots?: ShoalSpot[], r?: ShoalRules, seed = 42) {
    return new ShoalField(spots ?? [spot()], r ?? rules(), seed);
}

// ─── Constructor ─────────────────────────────────────────────────────────────

describe('ShoalField constructor', () => {
    it('crea perSpot bancos por spot', () => {
        const f = field([spot('a'), spot('b')], rules(2));
        expect(f.list.length).toBe(4);
        const porA = f.list.filter((s) => s.spotId === 'a');
        const porB = f.list.filter((s) => s.spotId === 'b');
        expect(porA.length).toBe(2);
        expect(porB.length).toBe(2);
    });

    it('IDs únicos y consecutivos desde 1', () => {
        const f = field([spot('a'), spot('b')], rules(2));
        const ids = f.list.map((s) => s.id);
        expect(ids).toEqual([1, 2, 3, 4]);
    });

    it('bancos dentro del radio del spot', () => {
        const f = field([spot('x', 50, 50, 8)], rules(4, 1.5));
        for (const s of f.list) {
            const dist = Math.hypot(s.x - 50, s.y - 50);
            expect(dist + s.radius).toBeLessThanOrEqual(8 * 0.8 + 1e-6);
        }
    });

    it('cargas y respawn iniciales', () => {
        const f = field([spot()], rules(1, 2, 7, 45));
        const s = f.list[0]!;
        expect(s.charges).toBe(7);
        expect(s.respawn).toBe(0);
        expect(s.radius).toBe(2);
    });

    it('spot vacío (perSpot 0) no crea bancos', () => {
        const f = field([spot()], rules(0));
        expect(f.list.length).toBe(0);
    });

    it('sin spots no crea bancos', () => {
        const f = field([], rules(3));
        expect(f.list.length).toBe(0);
    });
});

// ─── place() — posicionamiento ──────────────────────────────────────────────

describe('ShoalField place()', () => {
    it('misma semilla → mismas posiciones (determinismo)', () => {
        const a = field([spot()], rules(3), 99);
        const b = field([spot()], rules(3), 99);
        for (let i = 0; i < a.list.length; i++) {
            expect(a.list[i]!.x).toBeCloseTo(b.list[i]!.x);
            expect(a.list[i]!.y).toBeCloseTo(b.list[i]!.y);
        }
    });

    it('semilla diferente → posiciones diferentes', () => {
        const a = field([spot()], rules(3), 1);
        const b = field([spot()], rules(3), 2);
        let diff = false;
        for (let i = 0; i < a.list.length; i++) {
            if (a.list[i]!.x !== b.list[i]!.x || a.list[i]!.y !== b.list[i]!.y) {
                diff = true;
                break;
            }
        }
        expect(diff).toBe(true);
    });

    it('bancos del mismo spot intentan separarse', () => {
        const f = field([spot('s', 0, 0, 20)], rules(5, 1));
        for (let i = 0; i < f.list.length; i++) {
            for (let j = i + 1; j < f.list.length; j++) {
                const d = Math.hypot(
                    f.list[i]!.x - f.list[j]!.x,
                    f.list[i]!.y - f.list[j]!.y,
                );
                // No se superponen (distancia > 2×radio)
                expect(d).toBeGreaterThan(f.list[i]!.radius * 1.5);
            }
        }
    });

    it('spot pequeño con un solo banco: el banco queda en el centro', () => {
        const f = field([spot('p', 10, 10, 1)], rules(1, 0.5));
        const s = f.list[0]!;
        expect(Math.hypot(s.x - 10, s.y - 10)).toBeLessThanOrEqual(0.5);
    });
});

// ─── tick() — cuenta regresiva ──────────────────────────────────────────────

describe('ShoalField tick()', () => {
    it('no hace nada con bancos activos (respawn 0)', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        f.tick(5);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(3);
    });

    it('cuenta regresiva del respawn', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        s.respawn = 10;
        f.tick(3);
        expect(s.respawn).toBeCloseTo(7);
        f.tick(7);
        expect(s.respawn).toBe(0);
    });

    it('al llegar a 0 restaura cargas y reposiciona', () => {
        const f = field([spot('s', 0, 0, 15)], rules(1, 2, 5, 10));
        const s = f.list[0]!;
        const oldPos = { x: s.x, y: s.y };
        s.respawn = 10;
        f.tick(10);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(5);
        // Puede reposicionarse en otro punto
        const newPos = { x: s.x, y: s.y };
        // La posición está dentro del spot
        expect(Math.hypot(newPos.x, newPos.y) + s.radius).toBeLessThanOrEqual(15 * 0.8 + 1e-6);
    });

    it('tick parcial no activa el banco antes de tiempo', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        s.respawn = 10;
        f.tick(9);
        expect(s.respawn).toBeCloseTo(1);
        // El banco sigue inactivo
        expect(f.at({ x: s.x, y: s.y })).toBeNull();
    });

    it('tick con dt mayor que respawn: llega a 0 sin pasar a negativo', () => {
        const f = field([spot()], rules(1, 2, 3, 5));
        const s = f.list[0]!;
        s.respawn = 5;
        f.tick(100);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(3);
    });

    it('spot eliminado: si el spot ya no existe, no se reposiciona', () => {
        // Se crea con un spot, luego se "elimina" el spot del array
        const spots: ShoalSpot[] = [spot('temp', 0, 0, 10)];
        const f = new ShoalField(spots, rules(1, 2, 3, 5), 42);
        const s = f.list[0]!;
        const oldX = s.x;
        const oldY = s.y;
        s.respawn = 5;
        spots.length = 0; // "eliminar" el spot
        f.tick(5);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(3);
        // Sin spot, no se reposiciona: las coordenadas no cambian
        expect(s.x).toBe(oldX);
        expect(s.y).toBe(oldY);
    });
});

// ─── at() — consulta por punto ──────────────────────────────────────────────

describe('ShoalField at()', () => {
    it('punto dentro del radio devuelve el banco', () => {
        const f = field([spot('s', 0, 0, 10)], rules(1, 3, 5, 20));
        const s = f.list[0]!;
        const result = f.at({ x: s.x, y: s.y });
        expect(result).toBe(s);
    });

    it('punto en el borde del radio devuelve el banco (<=)', () => {
        const f = field([spot('s', 0, 0, 10)], rules(1, 3, 5, 20));
        const s = f.list[0]!;
        const borde = { x: s.x + s.radius, y: s.y };
        expect(f.at(borde)).toBe(s);
    });

    it('punto fuera del radio devuelve null', () => {
        const f = field([spot('s', 0, 0, 10)], rules(1, 3, 5, 20));
        const s = f.list[0]!;
        const fuera = { x: s.x + s.radius + 0.1, y: s.y };
        expect(f.at(fuera)).toBeNull();
    });

    it('banco en respawn no se devuelve', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        s.respawn = 5;
        expect(f.at({ x: s.x, y: s.y })).toBeNull();
    });

    it('con varios bancos, devuelve el primero que contiene el punto', () => {
        const f = field([spot('s', 0, 0, 20)], rules(2, 5, 3, 10));
        const s1 = f.list[0]!;
        expect(f.at({ x: s1.x, y: s1.y })).toBe(s1);
    });

    it('sin bancos activos devuelve null', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        s.respawn = 10;
        expect(f.at({ x: 0, y: 0 })).toBeNull();
    });

    it('lista vacía devuelve null', () => {
        const f = field([], rules(1));
        expect(f.at({ x: 0, y: 0 })).toBeNull();
    });
});

// ─── nearest() — más cercano ────────────────────────────────────────────────

describe('ShoalField nearest()', () => {
    it('devuelve el banco activo más cercano al punto', () => {
        const f = field([spot('s', 0, 0, 20)], rules(3, 1, 5, 10));
        const p = { x: 0, y: 0 };
        const n = f.nearest('s', p);
        expect(n).not.toBeNull();
        // Es el más cercano
        for (const s of f.list) {
            if (s.respawn > 0) continue;
            const dN = Math.hypot(n!.x - p.x, n!.y - p.y);
            const dS = Math.hypot(s.x - p.x, s.y - p.y);
            expect(dN).toBeLessThanOrEqual(dS + 1e-9);
        }
    });

    it('filtra por spotId', () => {
        const f = field([spot('a', 0, 0, 10), spot('b', 100, 100, 10)], rules(1, 1, 3, 10));
        const n = f.nearest('a', { x: 0, y: 0 });
        expect(n).not.toBeNull();
        expect(n!.spotId).toBe('a');
    });

    it('ignora bancos en respawn', () => {
        const f = field([spot('s', 0, 0, 10)], rules(2, 1, 3, 10));
        const s1 = f.list[0]!;
        const s2 = f.list[1]!;
        s1.respawn = 5; // solo s2 está activo
        const n = f.nearest('s', { x: s2.x, y: s2.y });
        expect(n).toBe(s2);
    });

    it('spotId inexistente devuelve null', () => {
        const f = field([spot('a')], rules(1));
        expect(f.nearest('no_existe', { x: 0, y: 0 })).toBeNull();
    });

    it('todos en respawn devuelve null', () => {
        const f = field([spot('s')], rules(2, 1, 3, 10));
        for (const s of f.list) s.respawn = 5;
        expect(f.nearest('s', { x: 0, y: 0 })).toBeNull();
    });

    it('lista vacía devuelve null', () => {
        const f = field([], rules(1));
        expect(f.nearest('x', { x: 0, y: 0 })).toBeNull();
    });
});

// ─── consume() — uso de cargas ──────────────────────────────────────────────

describe('ShoalField consume()', () => {
    it('resta una carga', () => {
        const f = field([spot()], rules(1, 2, 5, 20));
        const s = f.list[0]!;
        f.consume(s.id);
        expect(s.charges).toBe(4);
        expect(s.respawn).toBe(0);
    });

    it('al llegar a 0 cargas, activa el respawn', () => {
        const f = field([spot()], rules(1, 2, 2, 25));
        const s = f.list[0]!;
        f.consume(s.id);
        expect(s.charges).toBe(1);
        expect(s.respawn).toBe(0);
        f.consume(s.id);
        expect(s.charges).toBe(0);
        expect(s.respawn).toBe(25);
    });

    it('no afecta a un banco que ya está en respawn', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        const s = f.list[0]!;
        s.respawn = 5;
        f.consume(s.id);
        expect(s.charges).toBe(3); // no baja
        expect(s.respawn).toBe(5); // no cambia
    });

    it('id inexistente no hace nada', () => {
        const f = field([spot()], rules(1, 2, 3, 10));
        expect(() => f.consume(999)).not.toThrow();
        expect(f.list[0]!.charges).toBe(3);
    });

    it('consume + tick + reaparece con cargas', () => {
        const f = field([spot('s', 0, 0, 10)], rules(1, 2, 2, 5));
        const s = f.list[0]!;
        // Agotar
        f.consume(s.id);
        f.consume(s.id);
        expect(s.respawn).toBe(5);
        // Esperar
        f.tick(5);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(2);
        // Vuelve a ser consultable
        expect(f.at({ x: s.x, y: s.y })).toBe(s);
    });

    it('consume no afecta a otros bancos', () => {
        const f = field([spot('s', 0, 0, 20)], rules(2, 1, 3, 10));
        const s1 = f.list[0]!;
        const s2 = f.list[1]!;
        f.consume(s1.id);
        expect(s1.charges).toBe(2);
        expect(s2.charges).toBe(3);
    });
});

// ─── Flujo completo ─────────────────────────────────────────────────────────

describe('ShoalField flujo completo', () => {
    it('crear → consumir → respawn → reubicar → consumir de nuevo', () => {
        const f = field([spot('estanque', 0, 0, 15)], rules(1, 2, 3, 4));
        const s = f.list[0]!;
        const pos1 = { x: s.x, y: s.y };

        // Consumo total
        for (let i = 0; i < 3; i++) f.consume(s.id);
        expect(s.respawn).toBe(4);

        // Espera
        f.tick(4);
        expect(s.respawn).toBe(0);
        expect(s.charges).toBe(3);

        // Puede estar en otro sitio
        const pos2 = { x: s.x, y: s.y };
        // Dentro del estanque
        expect(Math.hypot(pos2.x, pos2.y) + s.radius).toBeLessThanOrEqual(15 * 0.8 + 1e-6);

        // Se puede consumir de nuevo
        f.consume(s.id);
        expect(s.charges).toBe(2);
    });

    it('dos spots independientes', () => {
        const f = field([spot('a', 0, 0, 10), spot('b', 50, 50, 10)], rules(1, 2, 2, 5));
        const sa = f.list.find((s) => s.spotId === 'a')!;
        const sb = f.list.find((s) => s.spotId === 'b')!;

        // Agotar solo 'a'
        f.consume(sa.id);
        f.consume(sa.id);
        expect(sa.respawn).toBe(5);
        expect(sb.respawn).toBe(0);
        expect(sb.charges).toBe(2);

        // 'b' sigue activo
        expect(f.nearest('b', { x: 50, y: 50 })).toBe(sb);
        // 'a' no
        expect(f.nearest('a', { x: 0, y: 0 })).toBeNull();
    });
});
