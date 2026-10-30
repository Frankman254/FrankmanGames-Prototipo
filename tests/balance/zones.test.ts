import { describe, expect, it } from 'vitest';
import { buildData, rawData } from '../../scripts/balance/data';
import { aggregateZone, runZone, ZONE_FULL } from '../../scripts/balance/zones';
import { renderZonesReport } from '../../scripts/balance/zonesReport';

const data = buildData(rawData());
const zone = (id: string) => data.zones.zones.find((z) => z.id === id)!;

describe('equilibrio: zona contra nivel del jugador', () => {
  it('un nivel 20 limpia la primera zona y un nivel 1 que no esquiva cae de un golpe en la élite', () => {
    const easy = runZone(data, zone('azuero'), 20, 'ember_vanguard', 'medio', 1, ZONE_FULL);
    expect(easy.win).toBe(true);
    expect(easy.kills).toBe(ZONE_FULL.group);
    expect(easy.xp).toBeGreaterThan(0);
    const elite = [1, 2, 3, 4, 5, 6].map((seed) => runZone(data, zone('baru'), 1, seed % 2 ? 'storm_weaver' : 'ember_vanguard', 'malo', seed, ZONE_FULL));
    expect(elite.every((r) => r.died)).toBe(true);
    expect(elite.filter((r) => r.oneShot).length).toBeGreaterThanOrEqual(4);
  });

  it('agrega y escribe el informe con una tabla por zona', () => {
    const rs = [1, 2].map((seed) => runZone(data, zone('chame'), 5, 'ember_vanguard', 'bueno', seed, ZONE_FULL));
    const a = aggregateZone(rs);
    expect(a.n).toBe(2);
    const md = renderZonesReport(
      { options: ZONE_FULL, classes: ['ember_vanguard'], zones: [{ id: 'chame', name: 'Manglares de Chame', levelMin: 10, levelMax: 20 }], rows: [a] },
      '2026-10-30',
      'abcd1234',
    );
    expect(md).toContain('### Manglares de Chame · niv. 10–20');
  });
});
