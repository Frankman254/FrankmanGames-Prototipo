import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { makeGroupLab } from '../scripts/balance/grupo';

describe('JL-388: daño efectivo del registro de grupo', () => {
    it('conserva el bruto y cuenta cero si el escudo absorbe el golpe entero', () => {
        const lab = makeGroupLab(loadGameData(), [{ classId: 'storm_weaver', level: 4 }], {
            seed: 388,
            enemies: [{ archetype: 'melee', count: 1 }],
        });
        const { world } = lab;
        const enemy = world.enemies.list[0]!;
        const target = world.enemyActor(enemy);
        const healthBefore = enemy.health;
        target.statuses.apply(world.content.statuses.shield!, {
            duration: 10,
            source: world.character,
            shield: 1_000_000,
        });

        world.effectContext('jl388').damage(target, {
            min: 20,
            max: 20,
            element: 'fire',
            scaling: 0,
            critChance: 0,
            critBonus: 0,
        });

        const events = world.drainEvents();
        const [damage] = events.filter((event) => event.type === 'damage');
        expect(damage).toBeDefined();
        expect(damage!.amount).toBeGreaterThan(0);
        expect(damage!.effectiveAmount).toBe(0);
        expect(enemy.health).toBe(healthBefore);
        expect(target.statuses.shieldTotal()).toBeLessThan(1_000_000);

        lab.ledger.step(events, 1 / 60);
        expect(lab.ledger.report()[0]).toMatchObject({
            damageDealt: damage!.amount,
            effectiveDamageDealt: 0,
        });
    });
});
