import { describe, expect, it } from 'vitest';
import { buildData, rawData } from '../../scripts/balance/data';
import type { EnemySpec, MemberSpec } from '../../scripts/balance/grupo';
import { rosterForMode } from '../../scripts/balance/grupoRunConfig';

const data = buildData(rawData());
const roster: MemberSpec[] = [
    { classId: 'ember_vanguard', level: 10 },
    { classId: 'storm_weaver', level: 10 },
    { classId: 'mangrove_hunter', level: 10 },
    { classId: 'storm_weaver', level: 10 },
];
const enemies: EnemySpec[] = [
    { archetype: 'melee', count: 4 },
    { archetype: 'ranged', count: 2 },
];

describe('opciones del laboratorio de grupo', () => {
    it('mantiene el nivel 10 del roster cuando no se pide mismo nivel', () => {
        expect(rosterForMode(roster, enemies, data, false)).toEqual(roster);
    });

    it('sube a todos los jugadores al mayor nivel base de los enemigos', () => {
        expect(data.rpg.enemies.melee!.level).toBe(1);
        expect(data.rpg.enemies.ranged!.level).toBe(2);
        expect(rosterForMode(roster, enemies, data, true)).toEqual(roster.map((member) => ({ ...member, level: 2 })));
    });

    it('rechaza enemigos sin ficha de nivel base en el modo mismo nivel', () => {
        expect(() => rosterForMode(roster, [{ archetype: 'missing', count: 1 }], data, true)).toThrow(
            'arquetipo enemigo desconocido: missing',
        );
    });
});
