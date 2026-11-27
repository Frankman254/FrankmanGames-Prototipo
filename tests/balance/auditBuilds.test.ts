import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../scripts/balance/auditBuilds.ts', import.meta.url), 'utf-8');

describe('JL-391: DPS en la auditoría de builds', () => {
    it('no aplica la resistencia del atacante al daño que inflige', () => {
        const start = source.indexOf('// DPS: use average weapon damage + elemental stat scaling');
        const end = source.indexOf('// Count active set bonuses', start);
        const calculation = source.slice(start, end);

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        expect(calculation).not.toContain('effectiveResistByElement[el]');
        expect(calculation).toContain('dpsBurst[el] = outgoingDamage;');
        expect(calculation).toMatch(/dpsSustainable\[el\].*outgoingDamage \/ speed/);
    });
});
