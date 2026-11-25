// GRP-01 (creador, 2026-11-24): participantes del bando del jugador dentro de un mismo `World`.
// Cada uno tiene su cuerpo (`Player`), su `Character` y su estado de órdenes (cola, hechizo
// pendiente, placajes…). El mundo simula a cada uno con el mismo código que al jugador: mientras
// lo hace, `world.player` y `world.character` apuntan a esa plaza (ver `World.as`).
// La plaza 0 es el jugador de siempre; las demás solo existen con `WorldOptions.lab.companions`.
import type { Character } from '../rpg/character';
import type { Vec2 } from './vec2';
import { copy } from './vec2';
import type { Aim, Player } from './world';

export interface PlayerSlot {
    readonly player: Player;
    readonly character: Character;
    /** Hechizo pedido fuera de alcance: anda hasta poder lanzarlo (ver `World.approachToCast`). */
    pendingCast: { spellId: string; targetId: number | null; point: Vec2 } | null;
    /** JUG-06 / CLA-COLA: una sola orden guardada. */
    readonly castQueue: { spellId: string; aim: Aim }[];
    /** Regeneración acumulada hasta emitir un `heal` de al menos 1. */
    regenAccum: number;
    /** Segundos sin avanzar por su camino (re-planificar). */
    stuckTime: number;
    /** Espera para volver a buscar camino hacia el objetivo del ataque básico. */
    attackRepath: number;
    /** Rivales pegados que ya dieron su placaje en este contacto. */
    readonly tackles: Set<string>;
}

/** Cuerpo de simulación de un personaje: vida y recurso son los del `Character`. */
export function makePlayerBody(ch: Character, id: number, start: Vec2, radius: number, basicCharges: number): Player {
    return {
        id,
        pos: copy(start),
        prevPos: copy(start),
        radius,
        speed: ch.stats.get('moveSpeed'),
        facing: 0,
        path: [],
        moveTarget: null,
        get health() {
            return ch.health;
        },
        set health(v: number) {
            ch.health = v;
        },
        get maxHealth() {
            return ch.maxHealth;
        },
        alive: true,
        get spectral() {
            return ch.spectral.active;
        },
        invulnerable: 0,
        get resource() {
            return ch.resource;
        },
        set resource(v: number) {
            ch.resource = v;
        },
        get maxResource() {
            return ch.maxResource;
        },
        cooldowns: {},
        gcd: 0,
        gcdTotal: 0,
        basicCharges,
        basicRecharge: 0,
        casting: null,
        attackTarget: null,
        lastTarget: null,
        pickupTarget: null,
    };
}

export function makeSlot(player: Player, character: Character): PlayerSlot {
    return {
        player,
        character,
        pendingCast: null,
        castQueue: [],
        regenAccum: 0,
        stuckTime: 0,
        attackRepath: 0,
        tackles: new Set(),
    };
}

/** Lo que un enemigo sabe de un participante para elegirlo como objetivo. */
export interface TargetRef {
    readonly id: number;
    readonly pos: Vec2;
    readonly radius: number;
    readonly alive: boolean;
    readonly hidden?: boolean;
}
