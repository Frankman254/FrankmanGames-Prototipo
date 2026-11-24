// JL-231: Cada Piedra Pintada de data/stones.json cae dentro del mundo y en celda transitable,
// o es la entrada de una zona aparte conocida (hoy solo praderas_norte), y tiene nombre en inglés.
import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import enContent from '../data/i18n/en.content.json';
import { isPanama, regionAt } from '../src/world/atlas';
import { parseStones, prepareStoneArrival, type StoneDef } from '../src/world/stones';
import { overworld, worldData } from './fixtures/overworld';

const wd = worldData();
const atlas = wd.atlas;
const def = parseStones(stonesJson);
const ow = overworld();
const bounds = ow.stream.ctx.bounds;

// praderas_norte es la única piedra que lleva a una zona aparte (la barriada).
const ZONA_APARTE = new Set(['praderas_norte']);

const inPlot = (p: { x: number; y: number }): boolean =>
	p.x >= 0 && p.y >= 0 && p.x <= ow.def.width && p.y <= ow.def.depth;

/** Lo mismo que stoneAt de main: dentro de la parcela, la casilla caminable más cercana. */
function stoneAt(z: { x: number; y: number }): { x: number; y: number } {
	const cell = inPlot(z) ? ow.grid.nearestWalkable({ x: z.x, y: z.y }) : -1;
	return cell >= 0 ? ow.grid.center(cell) : { x: z.x, y: z.y };
}

/** Lo mismo que arriveAt de main: carga la página y devuelve la celda transitable. */
function arriveAt(s: StoneDef): { x: number; y: number } {
	const at = stoneAt(s);
	const prepared = prepareStoneArrival(s, at, {
		ensure: (x0, y0, x1, y1) => ow.stream.ensure(x0, y0, x1, y1),
		nearestWalkable: (p, maxRing) => ow.grid.nearestWalkable(p, maxRing),
		center: (cell) => ow.grid.center(cell),
	});
	expect(prepared, s.id).not.toBeNull();
	return prepared!.arrival;
}

describe('JL-231: Piedras Pintadas — posición y traducción', () => {
	it('cada piedra cae dentro del mundo por páginas', () => {
		for (const s of def.stones) {
			expect(
				s.x > bounds.x0 && s.x < bounds.x1 && s.y > bounds.z0 && s.y < bounds.z1,
				`${s.id} fuera del mundo (${s.x}, ${s.y})`,
			).toBe(true);
		}
	});

	it('cada piedra está en tierra de Panamá (no en país vecino)', () => {
		for (const s of def.stones) {
			const r = regionAt(atlas, s.x, s.y);
			expect(r && isPanama(r), `${s.id} no está en Panamá`).toBe(true);
		}
	});

	it('cada piedra (salvo praderas_norte) tiene sitio de llegada transitable', () => {
		for (const s of def.stones) {
			if (ZONA_APARTE.has(s.id)) continue;
			const arrive = arriveAt(s);
			expect(ow.grid.walkable(arrive), `${s.id}: llegada ${arrive.x},${arrive.y} no es walkable`).toBe(true);
		}
	});

	it('praderas_norte es la entrada de la barriada (zona aparte)', () => {
		const pn = def.stones.find((s) => s.id === 'praderas_norte');
		expect(pn, 'praderas_norte no existe en stones.json').toBeDefined();
		// Fuera de la parcela principal: la barriada está en (6000, 0).
		expect(inPlot(pn!), 'praderas_norte no debe estar en la parcela principal').toBe(false);
	});

	it('cada piedra tiene nombre en inglés en data/i18n/en.content.json', () => {
		for (const s of def.stones) {
			const enName = (enContent as Record<string, string>)[s.name];
			expect(enName, `${s.id}: "${s.name}" sin traducción en inglés`).toBeDefined();
			expect(enName!.length, `${s.id}: traducción vacía`).toBeGreaterThan(0);
			// La traducción no es idéntica al español (sería señal de que falta).
			expect(enName!, `${s.id}: traducción igual al original`).not.toBe(s.name);
		}
	});

	it('no hay duplicados de id entre piedras', () => {
		const ids = def.stones.map((s) => s.id);
		const unique = new Set(ids);
		expect(unique.size, 'ids duplicados').toBe(ids.length);
	});
});
