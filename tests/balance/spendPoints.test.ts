// BAL-P0-FIEL: con costes escalonados, `spendPoints` giraba sin fin cuando sobraban puntos que no
// llegaban al siguiente coste (nivel 45 colgaba la batería fiel). Debe parar y dejar el resto.
import { describe, expect, it } from 'vitest';
import { buildData, rawData } from '../../scripts/balance/data';
import { makeSessionAt } from '../../scripts/balance/scenarios';

describe('spendPoints del arnés de balance', () => {
    it('termina a nivel alto aunque sobren puntos que no llegan a ningún coste', () => {
        const data = buildData(rawData());
        const t = Date.now();
        const s = makeSessionAt(data, 'storm_weaver', 45, 1, true);
        expect(Date.now() - t).toBeLessThan(5000);
        const ch = s.character;
        expect(ch.unspentStatPoints).toBeLessThan(ch.costOfNextStatPoint(ch.mainStat ?? 'strength'));
    });
});
