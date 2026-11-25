// GRP-01: laboratorio de combate en grupo. El jugador y hasta tres compañeros simulados en el
// mismo `World` (WorldOptions.lab.companions), cada uno con su sesión, su equipo, su barra y su
// bot. Cada bot es un `PlayerBot` normal que decide y da órdenes dentro de `world.as(id, …)`:
// ahí `world.player`, `world.character` y `world.command*` son los de su compañero.
// Solo mide (GroupLedger): no reparte XP ni botín nuevos.
import type { GameData } from '../../src/data';
import { GroupLedger } from '../../src/sim/groupLedger';
import { Rng } from '../../src/sim/rng';
import type { Vec2 } from '../../src/sim/vec2';
import { World } from '../../src/sim/world';
import type { GameSession } from '../../src/rpg/session';
import { PlayerBot } from './bot';
import { FIELD_CENTER, openField } from './data';
import { DT, makeSessionAt, SKILLS, type SkillId } from './scenarios';

export interface MemberSpec {
    classId: string;
    level: number;
    skill?: SkillId;
}

export interface EnemySpec {
    archetype: string;
    count: number;
    /** Nivel del enemigo; sin él, el de su arquetipo. */
    level?: number;
}

export interface GroupLabOptions {
    seed: number;
    enemies: readonly EnemySpec[];
    /** Distancia (m) a la que aparecen los enemigos del centro del grupo. */
    enemyDistance?: number;
    /** Datos ya preparados (p. ej. con paredes); sin ellos, el campo abierto de 80 × 80 m. */
    data?: GameData;
    /** Dónde empieza el grupo; sin él, el centro del campo. */
    at?: Vec2;
}

export interface GroupLab {
    world: World;
    sessions: GameSession[];
    /** Id de cada participante, en el orden de los miembros (el primero es el jugador). */
    ids: number[];
    bots: PlayerBot[];
    ledger: GroupLedger;
    /** Un paso: cada bot decide como su participante y el mundo avanza `DT`. */
    step(): void;
}

/** Los compañeros no invocan: hoy las mascotas solo pueden ser del jugador (ver REPORTE de GRP-01). */
function dropSummons(s: GameSession): void {
    const book = s.character.spellbook;
    book.hotbar.forEach((id, i) => {
        if (id && s.content.spells[id]?.effects.some((e) => e.type === 'summon')) book.hotbar[i] = null;
    });
}

export function makeGroupLab(base: GameData, members: readonly MemberSpec[], opts: GroupLabOptions): GroupLab {
    if (members.length < 1 || members.length > 4) throw new Error('makeGroupLab: de 1 a 4 miembros');
    const data = opts.data ?? openField(base);
    const sessions = members.map((m, i) => makeSessionAt(data, m.classId, m.level, opts.seed * 7919 + 17 + i * 101));
    const world = new World(data, {
        encounter: false,
        character: sessions[0]!.character,
        seed: opts.seed,
        lab: { companions: true },
    });
    sessions[0]!.attach(world);
    const at = opts.at ?? FIELD_CENTER;
    world.player.pos = { ...at };
    world.player.prevPos = { ...at };
    const ids = [world.player.id];
    for (let i = 1; i < sessions.length; i++) {
        const a = (i / sessions.length) * Math.PI * 2;
        const id = world.addCompanion(sessions[i]!.character, {
            x: at.x + Math.cos(a) * 1.5,
            y: at.y + Math.sin(a) * 1.5,
        });
        sessions[i]!.attach(world);
        dropSummons(sessions[i]!);
        ids.push(id);
    }
    const rng = new Rng(opts.seed ^ 0x9e3779b9);
    const list = opts.enemies.flatMap((e) => Array.from({ length: e.count }, () => e));
    const base0 = rng.range(0, Math.PI * 2);
    const far = opts.enemyDistance ?? 10;
    list.forEach((e, i) => {
        const a = base0 + (list.length > 1 ? (i / (list.length - 1) - 0.5) * 1.4 : 0) + rng.range(-0.1, 0.1);
        const r = rng.range(far - 1, far + 1);
        const p = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
        world.spawnEnemy(
            e.archetype,
            world.grid.walkable(p) ? p : world.grid.center(world.grid.nearestWalkable(p)),
            e.level ?? null,
        );
    });
    const bots = sessions.map(
        (s, i) =>
            new PlayerBot(world, s, { dodge: SKILLS[members[i]!.skill ?? 'medio'], seed: opts.seed * 31 + 7 + i }),
    );
    const ledger = new GroupLedger(
        {
            participantIds: () => world.participantIds(),
            isAlive: (id) => world.participant(id)?.player.alive ?? false,
            petOwner: (id) => {
                // Hoy toda mascota es del jugador (plaza 0): los compañeros no invocan.
                return world.pets.some((p) => p.id === id) ? ids[0]! : null;
            },
            inCombat: () => world.enemies.list.some((e) => e.state !== 'dead' && e.state !== 'idle' && !e.returning),
        },
        data.rpg.spoils.weights,
    );
    return {
        world,
        sessions,
        ids,
        bots,
        ledger,
        step() {
            bots.forEach((b, i) => world.as(ids[i]!, () => b.think()));
            world.tick(DT);
            ledger.step(world.drainEvents(), DT);
        },
    };
}
