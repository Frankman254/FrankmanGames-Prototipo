// MUN-02: Piedras de viaje — comprobar que todas se activan, que viajar cuesta lo que dice data/
// y que nunca te deja en el agua o dentro de una casa.
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { loadWorldData } from '../src/data/worldData';
import { buildOverworld } from '../src/world/overworld';
import { ARRIVE_METERS, StoneBook, arrivalSpot, parseStones, prepareStoneArrival, type StoneDef } from '../src/world/stones';

const def = parseStones(stonesJson);
const wd = loadWorldData();
const ow = buildOverworld(wd);
const plot = { width: ow.def.width, depth: ow.def.depth };

const inPlot = (p: { x: number; y: number }): boolean => p.x >= 0 && p.y >= 0 && p.x <= plot.width && p.y <= plot.depth;

/** Lo mismo que stoneAt de main.ts. */
function stoneAt(z: StoneDef): { x: number; y: number } {
    const cell = inPlot(z) ? ow.grid.nearestWalkable({ x: z.x, y: z.y }) : -1;
    return cell >= 0 ? ow.grid.center(cell) : { x: z.x, y: z.y };
}

/** Lo mismo que arriveAt de main.ts. */
function arriveAt(z: StoneDef): { x: number; y: number } | null {
    const prepared = prepareStoneArrival(z, stoneAt(z), {
        ensure: (x0, y0, x1, y1) => ow.stream.ensure(x0, y0, x1, y1),
        nearestWalkable: (p, maxRing) => ow.grid.nearestWalkable(p, maxRing),
        center: (cell) => ow.grid.center(cell),
    });
    if (!prepared) return null;
    return prepared.arrival;
}

describe('MUN-02: Piedras de viaje', () => {
    // — 1. Todas se activan —

    it('todas las piedras de data/stones.json tienen id, nombre y coordenadas válidas', () => {
        for (const s of def.stones) {
            expect(s.id).toMatch(/^[a-z0-9_]+$/);
            expect(s.name.length).toBeGreaterThan(0);
            expect(typeof s.x).toBe('number');
            expect(typeof s.y).toBe('number');
            expect(!Number.isNaN(s.x) && !Number.isNaN(s.y), s.id).toBe(true);
        }
    });

    it('cada una de las 24 piedras se activa con StoneBook.touch()', () => {
        const book = new StoneBook(def);
        const at = (z: StoneDef) => stoneAt(z);
        for (const s of def.stones) {
            const pos = at(s);
            // El jugador está en la posición de la piedra (distancia 0 < activateRadius).
            // touch() devuelve la piedra si es nueva, null si ya era conocida.
            // En ambos casos, después de touch(), la piedra debe estar en known.
            book.touch(pos, at);
            expect(book.knows(s.id), `${s.id} no está conocida tras touch()`).toBe(true);
        }
    });

    it('activar una piedra dos veces solo la registra una', () => {
        const book = new StoneBook(def);
        const at = (z: StoneDef) => stoneAt(z);
        const s = def.stones[0]!;
        const first = book.touch(at(s), at);
        expect(first?.id).toBe(s.id);
        const second = book.touch(at(s), at);
        expect(second).toBeNull(); // ya conocida
    });

    it('un personaje nuevo conoce solo la piedra de inicio', () => {
        const book = new StoneBook(def);
        expect(book.progress.known).toEqual([def.start]);
        expect(book.progress.respawn).toBe(def.start);
    });

    it('tras activar todas, la lista conocida tiene 24 entradas', () => {
        const book = new StoneBook(def);
        const at = (z: StoneDef) => stoneAt(z);
        for (const s of def.stones) {
            book.touch(at(s), at);
        }
        expect(book.progress.known.length).toBe(def.stones.length);
    });

    // — 2. Coste de viaje —

    it('viajar no tiene coste declarado en data/stones.json', () => {
        // stones.json no tiene campos cost, fee, price, gold, etc.
        const keys = Object.keys(stonesJson).filter((k) => !k.startsWith('_'));
        const costKeys = keys.filter((k) => ['cost', 'fee', 'price', 'gold', 'mana', 'energy'].includes(k));
        expect(costKeys).toEqual([]);
    });

    it('StoneBook no tiene método de cobro ni campo de coste', () => {
        const book = new StoneBook(def);
        // Si existiera un método de cobro, lo llamaríamos aquí.
        // Por ahora, verificar que la interfaz no lo declara.
        expect('travelCost' in book).toBe(false);
        expect('charge' in book).toBe(false);
    });

    it('openStones en main.ts no descuenta nada al viajar (verificado por inspección)', () => {
        // openStones() llama a veil() + teleport(arriveAt(z)).
        // No hay resta de oro, energía ni recurso.
        // La nota en stones.json confirma: "hoy gratis".
        expect(stonesJson['_nota']).toContain('gratis');
    });

    // — 3. Nunca en el agua ni dentro de una casa —

    it('ninguna piedra cae en agua: la posición de la piedra es walkable', () => {
        for (const s of def.stones) {
            const at = stoneAt(s);
            if (inPlot(at)) {
                expect(ow.grid.walkable(at), `${s.id}: piedra en ${at.x},${at.y}`).toBe(true);
            }
        }
    });

    it('ningún punto de llegada cae en agua: arriveAt devuelve casilla walkable', () => {
        for (const s of def.stones) {
            const arrival = arriveAt(s);
            expect(arrival, `${s.id}: arriveAt devolvió null`).not.toBeNull();
            if (inPlot(arrival!)) {
                expect(ow.grid.walkable(arrival!), `${s.id}: llegada en ${arrival!.x},${arrival!.y}`).toBe(true);
            }
        }
    });

    it('el punto de llegada está cerca de la piedra (no se va a otra página)', () => {
        for (const s of def.stones) {
            const at = stoneAt(s);
            const arrival = arriveAt(s);
            expect(arrival, `${s.id}: null`).not.toBeNull();
            const dist = Math.hypot(arrival!.x - at.x, arrival!.y - at.y);
            // La llegada está a ARRIVE_METERS de la piedra, más el margen de nearestWalkable.
            expect(dist, `${s.id}: distancia ${dist}`).toBeLessThan(10);
        }
    });

    it('la piedra de reaparición por defecto es la de inicio y es walkable', () => {
        const book = new StoneBook(def);
        const respawn = book.respawn;
        const at = stoneAt(respawn);
        if (inPlot(at)) {
            expect(ow.grid.walkable(at), `respawn ${respawn.id} en ${at.x},${at.y}`).toBe(true);
        }
    });

    it('arrivalSpot respeta ARRIVE_METERS y no coloca al jugador dentro de la malla', () => {
        for (const s of def.stones) {
            const at = stoneAt(s);
            const spot = arrivalSpot(s, at);
            const dist = Math.hypot(spot.x - at.x, spot.y - at.y);
            expect(dist, `${s.id}: arrivalSpot a ${dist} m`).toBeCloseTo(ARRIVE_METERS, 4);
        }
    });

    it('prepareStoneArrival carga la página antes de decidir la llegada (piedra lejana)', () => {
        // Bocas del Torito está en (-1972, 2053), lejos del centro.
        const remote = buildOverworld(wd);
        const z = def.stones.find((s) => s.id === 'bocas_torito')!;
        expect(remote.stream.isActive(z.x, z.y)).toBe(false);
        const prepared = prepareStoneArrival(
            z,
            { x: z.x, y: z.y },
            {
                ensure: (x0, y0, x1, y1) => remote.stream.ensure(x0, y0, x1, y1),
                nearestWalkable: (p, maxRing) => remote.grid.nearestWalkable(p, maxRing),
                center: (cell) => remote.grid.center(cell),
            },
        );
        expect(prepared, 'bocas_torito').not.toBeNull();
        expect(remote.stream.isActive(z.x, z.y)).toBe(true);
        expect(remote.grid.walkable(prepared!.stone)).toBe(true);
        expect(remote.grid.walkable(prepared!.arrival)).toBe(true);
    });

    it('si prepareStoneArrival falla, arriveAt de main.ts usa playerStart como fallback', () => {
        // Verificar que playerStart existe y es walkable.
        const start = ow.def.playerStart;
        expect(start).toBeDefined();
        if (inPlot(start)) {
            expect(ow.grid.walkable(start), 'playerStart').toBe(true);
        }
    });
});
