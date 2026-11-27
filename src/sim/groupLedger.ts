// GRP-01: métricas de cada participante de un combate en grupo, leídas de los sucesos del mundo.
// Solo mide: no da XP, oro ni botín (eso es GRP-03). La participación usa la misma fórmula que el
// reparto del fin de combate (`shares` de `src/rpg/spoils.ts`, pesos de `data/rpg/spoils.json`).
import { shares, type Contribution, type SpoilsRules } from '../rpg/spoils';
import type { GameEvent } from './events';

export interface ParticipantMetrics {
    id: number;
    /** Daño bruto antes de escudos que hizo a enemigos (el de sus mascotas cuenta para él). */
    damageDealt: number;
    /** Daño que llegó a la vida de enemigos tras resistencias y escudos. */
    effectiveDamageDealt: number;
    /** Daño que le llegó. */
    damageTaken: number;
    /** Curación efectiva recibida de sus hechizos y objetos (sin la regeneración pasiva). */
    healing: number;
    /** Segundos con vida mientras algún enemigo estaba en pelea. */
    activeSeconds: number;
    /** Enemigos cuyo último golpe fue suyo. */
    kills: number;
    deaths: number;
    /** Parte del combate (0–1, suman 1) con la fórmula del reparto. */
    participation: number;
}

/** Lo que el registro necesita saber del mundo en cada paso. */
export interface LedgerView {
    participantIds(): number[];
    /** ¿Vive el participante? */
    isAlive(id: number): boolean;
    /** Dueño (participante) de una mascota, o null si `id` no es una mascota. */
    petOwner(id: number): number | null;
    /** ¿Hay algún enemigo en pelea? */
    inCombat(): boolean;
}

export class GroupLedger {
    private readonly rows = new Map<number, ParticipantMetrics>();
    private readonly lastHitBy = new Map<number, number>();
    private readonly wasAlive = new Map<number, boolean>();

    constructor(
        private readonly view: LedgerView,
        private readonly weights: SpoilsRules['weights'],
    ) {
        for (const id of view.participantIds()) this.row(id);
    }

    private row(id: number): ParticipantMetrics {
        let r = this.rows.get(id);
        if (!r) {
            r = {
                id,
                damageDealt: 0,
                effectiveDamageDealt: 0,
                damageTaken: 0,
                healing: 0,
                activeSeconds: 0,
                kills: 0,
                deaths: 0,
                participation: 0,
            };
            this.rows.set(id, r);
            this.wasAlive.set(id, this.view.isAlive(id));
        }
        return r;
    }

    /** Participante al que cuenta un cuerpo: él mismo, o el dueño de la mascota. */
    private owner(id: number): number | null {
        if (this.rows.has(id)) return id;
        return this.view.petOwner(id);
    }

    /** Un paso de simulación: los sucesos de ese paso y su duración. */
    step(events: readonly GameEvent[], dt: number): void {
        for (const id of this.view.participantIds()) this.row(id);
        for (const ev of events) {
            if (ev.type === 'damage') {
                const from = this.owner(ev.sourceId);
                const toPart = this.rows.get(ev.targetId);
                if (toPart) {
                    toPart.damageTaken += ev.amount;
                } else if (from !== null) {
                    this.row(from).damageDealt += ev.amount;
                    this.row(from).effectiveDamageDealt += ev.effectiveAmount ?? ev.amount;
                    this.lastHitBy.set(ev.targetId, from);
                }
            } else if (ev.type === 'heal' && ev.source !== 'regen') {
                const r = this.rows.get(ev.targetId);
                if (r) r.healing += ev.amount;
            } else if (ev.type === 'enemyDeath') {
                const k = this.lastHitBy.get(ev.enemyId);
                if (k !== undefined) this.row(k).kills++;
            }
        }
        const fighting = this.view.inCombat();
        for (const r of this.rows.values()) {
            const alive = this.view.isAlive(r.id);
            if (this.wasAlive.get(r.id) && !alive) r.deaths++;
            this.wasAlive.set(r.id, alive);
            if (alive && fighting) r.activeSeconds += dt;
        }
    }

    /** Métricas de cada participante, con la participación ya calculada. */
    report(): ParticipantMetrics[] {
        const parts = new Map<string, Contribution>();
        for (const r of this.rows.values())
            parts.set(String(r.id), { damage: r.damageDealt, healing: r.healing, time: r.activeSeconds });
        const sh = shares(parts, this.weights);
        return [...this.rows.values()].map((r) => ({ ...r, participation: sh.get(String(r.id)) ?? 0 }));
    }
}
