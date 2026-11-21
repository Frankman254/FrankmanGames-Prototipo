// El jugador en pantalla: elige la animación a partir del estado de la
// simulación y de sus sucesos, y comprueba cada `footstep` (el pie de apoyo
// tiene que estar en el suelo en ese instante) dejando una nube de polvo.
import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { FrameStats } from '../../sim/frameStats';
import { dampRadians } from '../../camera';
import type { GameEvent } from '../../sim/events';
import type { Player } from '../../sim/world';
import type { AnimEvent } from '../../world/anim';
import { pickGait, type Gait } from '../../world/locomotion';
import type { AnimState } from '../../world/rigs';
import type { HeightField } from '../../world/terrain';
import type { CharacterModel } from './characterModel';
import { GhostBody } from './ghostBody';

/** Velocidad base típica del jugador (moveSpeed de data/rpg/classes.json).
 *  Se usa como referencia para los umbrales walk/run de pickGait(), de modo
 *  que la decisión se expresa en relación con la velocidad de juego y no con
 *  la velocidad del clip GLB (runSpeed). */
const DEFAULT_MOVE_SPEED = 6;

/** Emotes que se repiten en bucle corto (máximo 4 s). */
const LOOPING_EMOTES = new Set(['dance', 'sleep']);

/** Duración máxima de un emote en bucle, en segundos. */
const EMOTE_LOOP_MAX = 4;

/**
 * La ruta y la velocidad expresan la intención de movimiento; la animación
 * cambia en cuanto se asigna la ruta, sin esperar el primer tick de
 * desplazamiento físico. `simulationRunning` corta la animación durante
 * bloqueos que siguen renderizando sin avanzar el mundo.
 */
export function isPlayerMoving(
    p: Pick<Player, 'alive' | 'path' | 'pos' | 'prevPos' | 'speed'>,
    simulationRunning: boolean,
): boolean {
    return simulationRunning && p.alive && p.path.length > 0 && p.speed > 0;
}

/** Nubecillas de polvo en el suelo para ver dónde cae cada paso. */
class Puffs {
    private readonly pool: Array<{ mesh: Mesh; ttl: number }> = [];
    private next = 0;
    private readonly mat: StandardMaterial;

    constructor(scene: Scene, size = 8) {
        this.mat = new StandardMaterial('puffMat', scene);
        this.mat.diffuseColor = new Color3(0.75, 0.68, 0.55);
        this.mat.specularColor = Color3.Black();
        this.mat.alpha = 0.55;
        for (let i = 0; i < size; i++) {
            const mesh = MeshBuilder.CreateDisc(`puff${i}`, { radius: 0.18, tessellation: 12 }, scene);
            mesh.rotation.x = Math.PI / 2;
            mesh.material = this.mat;
            mesh.isPickable = false;
            mesh.setEnabled(false);
            this.pool.push({ mesh, ttl: 0 });
        }
    }

    spawn(p: Vector3): void {
        const s = this.pool[this.next]!;
        this.next = (this.next + 1) % this.pool.length;
        s.mesh.position.set(p.x, p.y + 0.03, p.z);
        s.mesh.scaling.setAll(1);
        s.ttl = 0.45;
        s.mesh.setEnabled(true);
    }

    update(dt: number): void {
        for (const s of this.pool) {
            if (s.ttl <= 0) continue;
            s.ttl -= dt;
            s.mesh.scaling.setAll(1 + (0.45 - s.ttl) * 2.5);
            if (s.ttl <= 0) s.mesh.setEnabled(false);
        }
    }
}

export class PlayerAvatar {
    /** Pasos vistos y distancia (cm) entre el pie de apoyo y el suelo en cada uno. */
    footsteps = 0;
    readonly footError = new FrameStats(64);
    /** Recuento de eventos de animación por tipo (los recoge `main`). */
    private oneShot: AnimState | null = null;
    /** DW-01: si el último ataque básico fue con la mano izquierda, espejar el modelo. */
    private offhandAttack = false;
    /** Emote en curso: id del emote y tiempo restante (para los de bucle). */
    private emoteActive: { id: string; remaining: number } | null = null;
    /** Última marcha elegida (caminar/correr): se conserva al pararse. */
    private gait: Gait = 'run';
    /** Id del jugador en la simulación (lo pone la vista con cada lote de sucesos). */
    entityId = -1;
    /** Velocidad del fotograma anterior (para calcular la aceleración). */
    private prevSpeed = 0;
    /** Yaw del fotograma anterior (para calcular la velocidad de giro). */
    private prevYaw: number | null = null;
    private readonly puffs: Puffs;
    private readonly ghost: GhostBody;
    private readonly foot = new Vector3();
    private visualYaw: number | null = null;

    constructor(
        scene: Scene,
        private current: CharacterModel,
        private readonly ground: HeightField,
    ) {
        this.puffs = new Puffs(scene);
        this.ghost = new GhostBody(scene);
    }

    get model(): CharacterModel {
        return this.current;
    }

    /**
     * Cambia de modelo (otra clase u otro equipo a la vista) en el mismo sitio y
     * con la misma animación. Devuelve el anterior para que la vista lo retire.
     */
    replaceModel(m: CharacterModel): CharacterModel {
        const old = this.current;
        m.root.position.copyFrom(old.root.position);
        m.root.rotation.y = old.root.rotation.y;
        this.visualYaw = old.root.rotation.y;
        m.play(old.state ?? 'idle');
        this.current = m;
        return old;
    }

    /** Sucesos de la simulación que disparan animaciones de una vez. */
    onGameEvent(e: GameEvent): void {
        // El emote se corta al recibir daño, lanzar o teletransportarse.
        if (e.type === 'damage' && e.toPlayer) {
            this.cancelEmote();
        }
        if (e.type === 'cast' || (e.type === 'teleport' && e.entityId === this.entityId)) {
            this.cancelEmote();
        }
        let s: AnimState | null = null;
        if (e.type === 'cast') {
            s = e.ability === 'basic' ? 'attack' : 'cast';
            // DW-01: ataque básico con la mano izquierda → espejar el modelo.
            if (e.ability === 'basic' && e.hand === 'offhand') {
                this.offhandAttack = true;
            }
        }
        // Combate v2: sin evasión genérica; el salto de los desplazamientos propios (blink, intercambio, retroceso) usa su animación.
        else if (e.type === 'teleport' && e.entityId === this.entityId) s = 'evade';
        else if (e.type === 'damage' && e.toPlayer && this.model.state !== 'evade') s = 'hit';
        if (s === null) return;
        this.oneShot = s;
        this.model.play(s, { restart: true });
    }

    /**
     * Reproduce el clip de un emote del chat. Los emotes `dance` y `sleep`
     * se repiten en bucle corto (máximo 4 s); los demás, una sola vez.
     * Moverse, lanzar o recibir daño lo corta.
     */
    playEmote(emoteId: string): void {
        const clip = `Emote_${emoteId}`;
        const ok = this.model.playNamed?.(clip, () => {
            // Clip de una sola vez terminó.
            if (this.emoteActive?.id === emoteId) {
                this.emoteActive = null;
            }
        });
        if (!ok) return;
        // Cancela el emote anterior.
        this.emoteActive = LOOPING_EMOTES.has(emoteId)
            ? { id: emoteId, remaining: EMOTE_LOOP_MAX }
            : { id: emoteId, remaining: 0 };
    }

    /** Cancela el emote en curso y vuelve al estado base. */
    private cancelEmote(): void {
        if (this.emoteActive === null) return;
        this.emoteActive = null;
        this.model.stopGesture?.();
    }

    /** Devuelve true si hay un emote activo. */
    get isEmoting(): boolean {
        return this.emoteActive !== null;
    }

    /** Coloca, orienta y anima. Devuelve los eventos de animación del fotograma. */
    sync(
        p: Player,
        x: number,
        y: number,
        z: number,
        dt: number,
        simulationRunning = true,
        riding = false,
    ): AnimEvent[] {
        const m = this.model;
        m.root.position.set(x, y, z);
        const targetYaw = -p.facing;
        this.visualYaw = this.visualYaw === null ? targetYaw : dampRadians(this.visualYaw, targetYaw, 22, dt);
        m.root.rotation.y = this.visualYaw;

        // Montado no camina: anda la montura; el jinete va sentado (reposo + postura de jinete).
        const moving = !riding && isPlayerMoving(p, simulationRunning);

        // Moverse corta el emote.
        if (moving && this.emoteActive) {
            this.cancelEmote();
        }

        // Cuenta atrás del emote en bucle (dance, sleep).
        if (this.emoteActive && this.emoteActive.remaining > 0) {
            this.emoteActive.remaining -= dt;
            if (this.emoteActive.remaining <= 0) {
                this.cancelEmote();
            }
        }

        m.setPose?.(riding && p.alive ? 'ride' : null);
        // DW-01: espejar el modelo durante el ataque de la mano izquierda.
        if (this.offhandAttack && m.state === 'attack') {
            m.root.scaling.x = -1;
        } else {
            m.root.scaling.x = 1;
            // Cuando la animación deja de ser 'attack', limpiar la bandera.
            if (this.offhandAttack && m.state !== 'attack') {
                this.offhandAttack = false;
            }
        }
        if (!p.alive) {
            if (m.state !== 'death') m.play('death');
            this.oneShot = null;
        } else if (this.oneShot && !m.finished && m.state === this.oneShot) {
            // Deja terminar el golpe, el hechizo, la evasión o el impacto.
        } else if (p.casting) {
            m.play('cast');
        } else if (this.emoteActive && m.gesturing) {
            // El emote está en curso: no tocar la animación.
        } else if (this.emoteActive && !m.gesturing) {
            // El clip del emote terminó (no era bucle y ya se soltó): limpiar.
            this.emoteActive = null;
            m.play('idle');
        } else {
            this.oneShot = null;
            if (!moving) {
                m.play('idle');
            } else {
                // Marcha con histéresis: paso tranquilo si el modelo sabe caminar y
                // la velocidad cae de la banda; si no tiene clip «Caminar», correr
                // como siempre. `this.gait` no se pisa al pararse: al volver a andar
                // se retoma la marcha que correspondía.
                // La referencia es la velocidad de juego (moveSpeed), no la del
                // clip GLB (runSpeed), para que los umbrales walk/run se expresen
                // en relación con la velocidad real de juego.
                const canWalk = m.hasClip?.('walk') ?? false;
                this.gait = pickGait(this.gait, p.speed, DEFAULT_MOVE_SPEED, canWalk);
                m.play(this.gait);
            }
        }
        const ghost = p.alive && p.spectral === true;
        m.root.setEnabled(!ghost);
        this.ghost.root.setEnabled(ghost);
        if (ghost) this.ghost.sync(x, y, z, p.facing, moving, dt);
        if (!p.alive) m.setEmissive(0, 0, 0);
        else if (p.invulnerable > 0) m.setEmissive(0.25, 0.35, 0.45);
        else m.setEmissive(0, 0, 0);

        // Físicas secundarias: calcular aceleración y velocidad de giro.
        const currentSpeed = moving ? p.speed : 0;
        const accel = dt > 0 ? (currentSpeed - this.prevSpeed) / dt : 0;
        const currentYaw = this.visualYaw ?? 0;
        const yawRate = dt > 0 && this.prevYaw !== null ? (currentYaw - this.prevYaw) / dt : 0;
        m.setInertia?.(accel, yawRate, dt);
        this.prevSpeed = currentSpeed;
        this.prevYaw = currentYaw;

        const events = m.update(dt, currentSpeed);
        for (const ev of events) {
            if (ev.type !== 'footstep' || ghost) continue;
            m.lowestFoot(this.foot);
            this.footsteps++;
            this.footError.push(Math.abs(this.foot.y - this.ground.sample(this.foot.x, this.foot.z)) * 100);
            this.puffs.spawn(this.foot);
        }
        this.puffs.update(dt);
        return events;
    }

    /** Reinicio de partida: vuelve a reposo aunque estuviera muerto. */
    reset(): void {
        this.oneShot = null;
        this.offhandAttack = false;
        this.emoteActive = null;
        this.prevSpeed = 0;
        this.prevYaw = null;
        this.model.play('idle', { restart: true });
    }
}
