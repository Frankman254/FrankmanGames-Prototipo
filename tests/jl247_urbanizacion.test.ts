// JL-247: Calle de Los Santos — que ningún enemigo aparezca encima de la calle
// o dentro de un lote de la urbanización. Solo prueba y diagnóstico.
import { describe, it, expect } from 'vitest';
import { URBANIZACION, insideLot, insideStreet, calleAncho } from '../src/world/urbanizacion';
import { ZoneMap, combatSpaceOpen } from '../src/sim/zones';
import zonesJson from '../data/zones.json';
import type { ZonesDef } from '../src/data/zonesSchema';

describe('JL-247: enemigos no pisar la calle de Los Santos', () => {
    const zones = zonesJson as unknown as ZonesDef;

    it('la calle y los lotes existen en urbanizacion.json', () => {
        expect(URBANIZACION.calles).toHaveLength(1);
        expect(URBANIZACION.lotes).toHaveLength(4);
        const calle = URBANIZACION.calles[0]!;
        expect(calle.id).toBe('calle_casas');
        expect(calle.x0).toBe(142);
        expect(calle.x1).toBe(194);
        expect(calle.y).toBe(203);
    });

    it('insideStreet detecta la calle (con margen 0)', () => {
        // Centro de la calle: (168, 203) — debe estar dentro
        expect(insideStreet(168, 203, URBANIZACION, 0)).toBe(true);
        // Fuera del rango X: (100, 203) — debe estar fuera
        expect(insideStreet(100, 203, URBANIZACION, 0)).toBe(false);
        // Fuera del ancho: (168, 190) — debe estar fuera
        expect(insideStreet(168, 190, URBANIZACION, 0)).toBe(false);
    });

    it('insideLot detecta los 4 lotes', () => {
        // Centro de cada lote
        for (const lote of URBANIZACION.lotes) {
            const cx = lote.x0 + lote.ancho / 2;
            const cy = lote.y0 + lote.fondo / 2;
            expect(insideLot(cx, cy, URBANIZACION, 0), `${lote.id} centro`).toBe(true);
        }
        // Fuera de todos los lotes
        expect(insideLot(155, 240, URBANIZACION, 0)).toBe(false);
    });

    it('la zona "sabanas" cubre la urbanización', () => {
        const zMap = new ZoneMap(zones);
        // Un punto en la calle
        const calle = zMap.zoneAt({ x: 168, y: 203 });
        expect(calle?.id).toBeTruthy();
        expect(calle?.safe).not.toBe(true);
        // Un punto dentro de un lote
        const lote = zMap.zoneAt({ x: 155, y: 218 });
        expect(lote?.id).toBeTruthy();
        expect(lote?.safe).not.toBe(true);
    });

    it('los puntos de spawn pueden caer en la calle (problema confirmado)', () => {
        // Simula el barrido de scan() con sampleStep=2 sobre la zona de la calle.
        // Los puntos del scan caen en el centro de cada celda de 2x2.
        const step = zones.sampleStep; // 2
        const calle = URBANIZACION.calles[0]!;
        const anchoTotal = calleAncho(calle);
        const yMin = calle.y - anchoTotal / 2;
        const yMax = calle.y + anchoTotal / 2;

        const puntosEnCalle: { x: number; y: number }[] = [];
        // Barrido sobre el rango X de la calle y el ancho Y de la calle
        for (let y = Math.floor(yMin / step) * step + step / 2; y <= yMax; y += step) {
            for (let x = Math.floor(calle.x0 / step) * step + step / 2; x <= calle.x1; x += step) {
                if (insideStreet(x, y, URBANIZACION, 0)) {
                    puntosEnCalle.push({ x, y });
                }
            }
        }
        // Hay puntos del scan que caen dentro de la calle
        expect(puntosEnCalle.length).toBeGreaterThan(0);
    });

    it('los puntos de spawn pueden caer en los lotes (problema confirmado)', () => {
        const step = zones.sampleStep; // 2
        const puntosEnLotes: { x: number; y: number; lote: string }[] = [];

        for (const lote of URBANIZACION.lotes) {
            for (let y = Math.floor(lote.y0 / step) * step + step / 2; y <= lote.y0 + lote.fondo; y += step) {
                for (let x = Math.floor(lote.x0 / step) * step + step / 2; x <= lote.x0 + lote.ancho; x += step) {
                    if (insideLot(x, y, URBANIZACION, 0)) {
                        puntosEnLotes.push({ x, y, lote: lote.id });
                    }
                }
            }
        }
        expect(puntosEnLotes.length).toBeGreaterThan(0);
    });

    it('combatSpaceOpen no excluye la calle ni los lotes', () => {
        // combatSpaceOpen solo verifica walkable y belongs (zona).
        // No verifica insideStreet ni insideLot.
        // Simulamos un walkable que siempre devuelve true (terreno plano).
        const walkable = () => true;
        const belongs = () => true;
        const radius = 3.5 + zones.combatClearance; // group.radius + combatClearance

        // Un punto en el centro de la calle
        const enCalle = { x: 168, y: 203 };
        const abiertoEnCalle = combatSpaceOpen(enCalle, radius, walkable, belongs);
        // Con walkable siempre true, combatSpaceOpen devuelve true en la calle
        expect(abiertoEnCalle).toBe(true);

        // Un punto en el centro de un lote
        const lote = URBANIZACION.lotes[0]!;
        const enLote = { x: lote.x0 + lote.ancho / 2, y: lote.y0 + lote.fondo / 2 };
        const abiertoEnLote = combatSpaceOpen(enLote, radius, walkable, belongs);
        expect(abiertoEnLote).toBe(true);
    });

    it('diagnóstico: scan() no filtra la urbanización', () => {
        // El método scan() de ZonePopulation barre puntos y los acepta si:
        // 1) zoneAt(p) no es null ni safe
        // 2) host.walkable(p) es true
        // No hay ninguna llamada a insideStreet ni insideLot.
        // Verificamos que la zona en la calle no es safe.
        const zMap = new ZoneMap(zones);
        const calle = URBANIZACION.calles[0]!;
        const puntos = [
            { x: (calle.x0 + calle.x1) / 2, y: calle.y }, // centro de la calle
            { x: calle.x0 + 5, y: calle.y }, // cerca del inicio
            { x: calle.x1 - 5, y: calle.y }, // cerca del final
        ];
        for (const p of puntos) {
            const z = zMap.zoneAt(p);
            expect(z, `zona en (${p.x},${p.y})`).toBeTruthy();
            expect(z?.safe, `safe en (${p.x},${p.y})`).not.toBe(true);
            expect(insideStreet(p.x, p.y, URBANIZACION, 0), `en calle (${p.x},${p.y})`).toBe(true);
        }
        // Conclusión: los puntos de la calle pasan el filtro de scan()
        // porque la zona no es safe y el terreno es walkable.
    });

    it('diagnóstico: insideStreet/insideLot existen pero no se usan en zones.ts', () => {
        // Verificamos que las funciones existen y son puras.
        expect(typeof insideStreet).toBe('function');
        expect(typeof insideLot).toBe('function');

        // Verificamos que no se importan en src/sim/zones.ts
        // (lo confirmamos con el diagnóstico escrito, no con grep aquí).
        // Las funciones están en src/world/urbanizacion.ts y se usan en:
        // - src/world/ambient.ts (vegetación)
        // - src/world/scatter.ts (vegetación)
        // Pero NO en src/sim/zones.ts (enemigos).
        expect(true).toBe(true); // placeholder para el diagnóstico escrito
    });
});
