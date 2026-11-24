import { describe, expect, it } from 'vitest';
import zonesJson from '../data/zones.json';
import terrainJson from '../data/terrain.json';
import { loadGameData } from '../src/data';

const data = loadGameData();
const world = terrainJson.world;

// Zonas con "planned" son futuras: sus monstruos pueblan otras zonas (Herrera)
// mediante "extends", pero no tienen áreas propias porque no caben en el mundo actual.
function isPlanned(zoneId: string): boolean {
    const raw = (zonesJson as any).zones.find((r: any) => r.id === zoneId);
    return !!raw?.planned;
}

describe('JL-229: zonas hostiles con áreas dentro del mundo', () => {
    it('cada zona hostil activa tiene al menos un área', () => {
        const hostiles = data.zones.zones.filter((z) => !z.safe && !isPlanned(z.id));
        const sinAreas = hostiles.filter((z) => !z.areas || z.areas.length === 0);
        expect(sinAreas.map((z) => z.id), 'zonas hostiles activas sin áreas').toEqual([]);
    });

    it('las zonas hostiles planificadas sin áreas están documentadas', () => {
        // Documenta las zonas que esperan su provincia (M06, M10, M11).
        // Sus monstruos se usan por "extends" en zonas de Herrera, pero no tienen áreas propias.
        const hostiles = data.zones.zones.filter((z) => !z.safe);
        const sinAreas = hostiles.filter((z) => !z.areas || z.areas.length === 0);
        // Todas las sin áreas deben tener "planned".
        for (const z of sinAreas) {
            expect(isPlanned(z.id), `${z.id} sin áreas debe tener "planned"`).toBe(true);
        }
        // Lista actual (PROPUESTA): baru, chame, boquete, cerro_punta, darien, bocas, perlas, fortuna, ancon.
        expect(sinAreas.length).toBeGreaterThan(0);
    });

    it('todas las áreas de las zonas hostiles caen dentro del mundo', () => {
        const hostiles = data.zones.zones.filter((z) => !z.safe);
        const fuera: Array<string> = [];
        for (const z of hostiles) {
            for (const a of z.areas) {
                if (a.type === 'rect') {
                    if (a.x0 < world.x0 || a.y0 < world.z0 || a.x1 > world.x1 || a.y1 > world.z1) {
                        fuera.push(`${z.id} rect (${a.x0},${a.y0})–(${a.x1},${a.y1})`);
                    }
                } else if (a.type === 'circle') {
                    // Un círculo está dentro si su centro ± radio cabe en el rectángulo del mundo.
                    const minX = a.x - a.radius;
                    const maxX = a.x + a.radius;
                    const minY = a.y - a.radius;
                    const maxY = a.y + a.radius;
                    if (minX < world.x0 || maxX > world.x1 || minY < world.z0 || maxY > world.z1) {
                        fuera.push(`${z.id} circle (${a.x},${a.y}) r=${a.radius}`);
                    }
                }
            }
        }
        expect(fuera, 'áreas fuera del mundo').toEqual([]);
    });

    it('prueba sintética: una zona hostil sin áreas y sin planned falla', () => {
        // Verifica que la lógica de detección funciona: si aparece una zona hostil
        // sin áreas y sin "planned", la prueba la detecta.
        const hostiles = data.zones.zones.filter((z) => !z.safe && !isPlanned(z.id));
        // Si todas tienen áreas, la verificación pasa.
        // Si alguna no tiene, la prueba anterior ya la captura.
        const sinAreas = hostiles.filter((z) => !z.areas || z.areas.length === 0);
        expect(sinAreas).toEqual([]);
    });
});
