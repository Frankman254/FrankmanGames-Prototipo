import type { GameData } from '../../src/data';
import type { EnemySpec, MemberSpec } from './grupo';

export function rosterForMode(
    roster: readonly MemberSpec[],
    enemies: readonly EnemySpec[],
    data: GameData,
    sameLevel: boolean,
): MemberSpec[] {
    if (!sameLevel) return roster.map((member) => ({ ...member }));
    if (enemies.length === 0) throw new Error('--mismo-nivel requiere al menos un enemigo');

    const level = Math.max(
        ...enemies.map((enemy) => {
            const definition = data.rpg.enemies[enemy.archetype];
            if (!definition) throw new Error(`arquetipo enemigo desconocido: ${enemy.archetype}`);
            return definition.level;
        }),
    );
    return roster.map((member) => ({ ...member, level }));
}
