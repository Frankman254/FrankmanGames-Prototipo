import { describe, expect, it } from 'vitest';
import { runT12Audit } from '../../scripts/balance/t12';

describe('T12: progresión por cercanía de nivel', () => {
  it('es reproducible, ordena las bandas y conserva progresión lenta', () => {
    const audit = runT12Audit();
    expect(audit.seeds).toBe(32);
    expect(audit.gates).toEqual({
      orderedBands: true,
      superiorBelowDouble: true,
      noEquivalentLevelSkip: true,
      slowFromLevel10: true,
      reproducible: true,
    });
  });

  it('hace visible que los oficios aún no tienen contenido cercano hasta nivel 20', () => {
    const audit = runT12Audit();
    expect(audit.contentCeilings).toEqual({ gathering: 5, crafting: 8 });
    expect(audit.professions.find((row) => row.level === 20)!.contentLevel).toBe(8);
    expect(audit.professions.find((row) => row.level === 19)!.actionsToNext).toBeGreaterThan(audit.professions.find((row) => row.level === 8)!.actionsToNext);
  });
});
