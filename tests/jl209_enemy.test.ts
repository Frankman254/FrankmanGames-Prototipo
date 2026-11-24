// JL-209: Pruebas de src/rpg/enemy.ts — EnemyActor
import { describe, expect, it } from 'vitest';
import { content } from './rpg/helpers';
import { EnemyActor } from '../src/rpg/enemy';
import type { EnemyBody, EnemyLevelScale } from '../src/rpg/enemy';

function makeBody(overrides: Partial<EnemyBody> = {}): EnemyBody {
    return {
        id: 1,
        pos: { x: 0, y: 0 },
        health: 100,
        def: {
            id: 'minion',
            maxHealth: 100,
            speed: 3,
        },
        ...overrides,
    };
}

function makeScale(overrides: Partial<EnemyLevelScale> = {}): EnemyLevelScale {
    return {
        stats: {},
        xp: 1,
        gold: 1,
        extraRolls: 0,
        ...overrides,
    };
}

describe('EnemyActor: creación desde la definición', () => {
    it('lee la ficha del enemigo y expone nombre, nivel y XP', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.name).toBe('Diablico Sucio');
        expect(enemy.level).toBe(content().enemies['minion']!.level);
        expect(enemy.xp).toBe(content().enemies['minion']!.xp);
        expect(enemy.team).toBe('enemy');
    });

    it('usa el nivel del cuerpo cuando está presente', () => {
        const body = makeBody({ level: 42 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.level).toBe(42);
    });

    it('usa el nivel de la ficha cuando no hay nivel en el cuerpo', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.level).toBe(content().enemies['minion']!.level);
    });

    it('lanza si el id no tiene ficha', () => {
        const body = makeBody({ def: { id: 'inexistente_xyz', maxHealth: 10, speed: 2 } });
        expect(() => new EnemyActor(content(), body, () => {})).toThrow(/inexistente_xyz/);
    });

    it('guarda el id del cuerpo', () => {
        const body = makeBody({ id: 42 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.id).toBe(42);
    });
});

describe('EnemyActor: escalado por nivel', () => {
    it('sin escala, XP y oro son los de la ficha', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.xp).toBe(content().enemies['minion']!.xp);
        expect(enemy.goldScale).toBe(1);
        expect(enemy.extraLootRolls).toBe(0);
    });

    it('con escala, multiplica XP, oro y tiradas extra', () => {
        const body = makeBody();
        const scale = makeScale({ xp: 2, gold: 3, extraRolls: 2 });
        const enemy = new EnemyActor(content(), body, () => {});
        const enemyScaled = new EnemyActor(content(), body, () => {}, scale);
        expect(enemyScaled.xp).toBe(Math.round(content().enemies['minion']!.xp * 2));
        expect(enemyScaled.goldScale).toBe(3);
        expect(enemyScaled.extraLootRolls).toBe(2);
    });

    it('aplica las estadísticas de la escala como fuente "level"', () => {
        const body = makeBody();
        // minion tiene resist.earth = 15; la escala añade +10
        const scale = makeScale({ stats: { 'resist.earth': 10 } });
        const enemy = new EnemyActor(content(), body, () => {}, scale);
        // La escala se registra como fuente 'level'
        expect(enemy.stats.has('level')).toBe(true);
        // Sin escala, no hay fuente 'level'
        const enemyNoScale = new EnemyActor(content(), body, () => {});
        expect(enemyNoScale.stats.has('level')).toBe(false);
    });
});

describe('EnemyActor: estadísticas base', () => {
    it('maxHealth viene de body.def.maxHealth', () => {
        const body = makeBody({ def: { id: 'minion', maxHealth: 200, speed: 4 } });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.stats.get('maxHealth')).toBe(200);
    });

    it('moveSpeed viene de body.def.speed', () => {
        const body = makeBody({ def: { id: 'minion', maxHealth: 100, speed: 5 } });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.stats.get('moveSpeed')).toBe(5);
    });

    it('tackle y escape dependen de si es melee o a distancia', () => {
        // Melee: ataque con rango <= 2.5
        const meleeBody = makeBody({
            def: { id: 'minion', maxHealth: 100, speed: 3, attack: { range: 1.5 } },
            level: 10,
        });
        const melee = new EnemyActor(content(), meleeBody, () => {});
        // Melee: tackle = 4 + level*1.0 = 14, escape = 1 + level*0.5 = 6
        expect(melee.stats.get('tackle')).toBe(14);
        expect(melee.stats.get('escape')).toBe(6);

        // Ranged: ataque > 2.5 y todos los hechizos > 2.5
        const rangedBody = makeBody({
            def: { id: 'minion', maxHealth: 100, speed: 3, attack: { range: 10 }, spells: [{ range: 12 }] },
            level: 10,
        });
        const ranged = new EnemyActor(content(), rangedBody, () => {});
        // Ranged: tackle = 1 + level*0.5 = 6, escape = 3 + level*0.8 = 11
        expect(ranged.stats.get('tackle')).toBe(6);
        expect(ranged.stats.get('escape')).toBe(11);
    });

    it('un hechizo de corto alcance lo marca como melee', () => {
        const body = makeBody({
            def: { id: 'minion', maxHealth: 100, speed: 3, attack: { range: 10 }, spells: [{ range: 2 }] },
            level: 5,
        });
        const enemy = new EnemyActor(content(), body, () => {});
        // melee por el hechizo: tackle = 4 + 5*1.0 = 9
        expect(enemy.stats.get('tackle')).toBe(9);
    });

    it('aplica las estadísticas de la ficha del enemigo', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        // minion tiene stats en su ficha; se aplican
        const info = content().enemies['minion']!;
        expect(enemy.info.stats).toBe(info.stats);
    });
});

describe('EnemyActor: vida y daño', () => {
    it('expone la vida del cuerpo', () => {
        const body = makeBody({ health: 80 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.health).toBe(80);
    });

    it('modificar health actualiza el cuerpo', () => {
        const body = makeBody({ health: 100 });
        const enemy = new EnemyActor(content(), body, () => {});
        enemy.health = 50;
        expect(body.health).toBe(50);
        expect(enemy.health).toBe(50);
    });

    it('takeDamage llama a onDamage con la cantidad', () => {
        const calls: number[] = [];
        const body = makeBody({ health: 100 });
        const enemy = new EnemyActor(content(), body, (amount) => {
            calls.push(amount);
            body.health -= amount; // la sim actualiza el cuerpo
        });
        const absorbed = enemy.takeDamage(30);
        expect(absorbed).toBe(30); // sin escudos, todo llega
        expect(calls).toEqual([30]);
        expect(body.health).toBe(70);
    });

    it('takeDamage no hace nada si ya está muerto', () => {
        const body = makeBody({ health: 0 });
        const enemy = new EnemyActor(content(), body, () => {});
        const absorbed = enemy.takeDamage(50);
        expect(absorbed).toBe(0);
        expect(enemy.health).toBe(0);
    });

    it('takeDamage ignora el daño cero o negativo', () => {
        const body = makeBody({ health: 100 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.takeDamage(0)).toBe(0);
        expect(enemy.takeDamage(-10)).toBe(0);
        expect(enemy.health).toBe(100);
    });

    it('heal cura hasta maxHealth', () => {
        const body = makeBody({ health: 50 });
        const enemy = new EnemyActor(content(), body, () => {});
        const maxHp = enemy.maxHealth;
        const healed = enemy.heal(maxHp + 50); // cura más de lo necesario
        expect(healed).toBe(maxHp - 50);
        expect(enemy.health).toBe(maxHp);
    });

    it('heal no cura a un muerto', () => {
        const body = makeBody({ health: 0 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.heal(50)).toBe(0);
    });

    it('alive es falso cuando health es 0', () => {
        const body = makeBody({ health: 0 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.alive).toBe(false);
    });

    it('alive es verdadero cuando health es positivo', () => {
        const body = makeBody({ health: 1 });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.alive).toBe(true);
    });
});

describe('EnemyActor: posición', () => {
    it('expone la posición del cuerpo', () => {
        const body = makeBody({ pos: { x: 10, y: 20 } });
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.pos.x).toBe(10);
        expect(enemy.pos.y).toBe(20);
    });

    it('si el cuerpo se mueve, la posición cambia', () => {
        const body = makeBody({ pos: { x: 0, y: 0 } });
        const enemy = new EnemyActor(content(), body, () => {});
        body.pos.x = 5;
        body.pos.y = 7;
        expect(enemy.pos.x).toBe(5);
        expect(enemy.pos.y).toBe(7);
    });
});

describe('EnemyActor: recompensa', () => {
    it('rewarded empieza en false', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.rewarded).toBe(false);
    });
});

describe('EnemyActor: info', () => {
    it('expone el elemento y la tabla de botín de la ficha', () => {
        const body = makeBody();
        const enemy = new EnemyActor(content(), body, () => {});
        expect(enemy.info.element).toBeDefined();
        expect(typeof enemy.info.lootTable).toBe('string');
    });
});
