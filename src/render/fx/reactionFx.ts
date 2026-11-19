// FX-R01 (creador, 2026-11-19: «cada reacción debe tener su efecto gráfico (mostrar el nombre
// de la reacción) y también la animación»). Enganche ya cableado en `arenaView.handleEvents`:
// cada suceso `reaction` de la sim llega a `play` con la posición del objetivo.
// Aquí vive el nombre flotante y el efecto propio de cada una de las 15 reacciones de
// `data/rpg/reactions.json`. El color y el tipo de efecto se leen de la sección `reactions`
// de `data/fx.json` (ambos de la cola, no de la sim); la duración y el radio de las zonas
// son las de la sim.
import {
    Color3,
    Color4,
    MeshBuilder,
    ParticleSystem,
    Ray,
    Vector3,
    type LinesMesh,
    type Mesh,
    type Scene,
    type StandardMaterial,
} from '@babylonjs/core';
import fxJson from '../../../data/fx.json';
import reactionsJson from '../../../data/rpg/reactions.json';
import { tr } from '../../i18n';
import type { Rgb } from '../../world/dayNight';
import { BurstPool, glowMaterial, retire, softDot } from './particles';
import type { FloatingText } from './floatingText';

/** Los 15 efectos propios. Cada reacción de `data/fx.json` elige uno con `kind`. */
export const REACTION_KINDS = [
    'vapor', // nube de vapor
    'crystal', // cristal de hielo que envuelve
    'arc', // arco eléctrico que salta
    'pool', // charco (barro / lava)
    'rain', // lluvia corta
    'flash', // destello frío-caliente
    'blast', // explosión con onda
    'spread', // llamas que se reparten
    'cracks', // grietas de hielo
    'frost', // escarcha en el suelo
    'swirl', // remolino de nieve
    'strike', // rayo que baja al suelo
    'arcs', // rayos que saltan a varios
    'dust', // polvo
] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

/** Nombre, color, tipo y medida (lo que dura y lo que ocupa) de una reacción. */
export interface ReactionVisual {
    id: string;
    label: string;
    color: Rgb;
    kind: ReactionKind;
    /** Segundos que dura la zona/efecto continuo (0 para los instantáneos). */
    duration: number;
    /** Radio de la zona en metros (0 si no es de área). */
    radius: number;
}

interface ReactionRow {
    id: string;
    label: string;
    effect: string;
    duration?: number;
    radius?: number;
}
interface ReactionFxRow {
    color: Rgb;
    kind: ReactionKind;
}

// Los JSON importados pierden el tipo al leerlos; son fronteras internas estables del repo
// (mismo patrón que `data/fxSchema` y `sim/reactions`). Se nombran con su forma esperada.
const REACTIONS_JSON = reactionsJson as unknown as { reactions: readonly ReactionRow[] };
const FX_JSON = fxJson as unknown as { reactions: Readonly<Record<string, ReactionFxRow>> };

const REACTION_ROWS: readonly ReactionRow[] = REACTIONS_JSON.reactions;
const REACTION_FX: Readonly<Record<string, ReactionFxRow>> = FX_JSON.reactions;

/** Duración por defecto de los efectos sin zona propia (los instantáneos y las cadenas). */
const DEFAULT_SECONDS: Readonly<Partial<Record<ReactionKind, number>>> = {
    arc: 0.7,
    rain: 1.8,
    flash: 0.6,
    blast: 0.7,
    spread: 2.5,
    strike: 0.6,
    arcs: 1.0,
};

/**
 * La ficha visual de una reacción, unida desde `reactions.json` (nombre, duración, radio) y
 * `fx.json` (color, tipo). `null` si el id no es una reacción conocida: así un id desconocido
 * no rompe el dibujo (lo usa la prueba).
 */
export function reactionVisual(id: string): ReactionVisual | null {
    const sim = REACTION_ROWS.find((r) => r.id === id);
    const fx = REACTION_FX[id];
    if (!sim || !fx || !REACTION_KINDS.includes(fx.kind)) return null;
    const radius = sim.radius ?? 0;
    const duration =
        sim.duration ?? DEFAULT_SECONDS[fx.kind] ?? (radius > 0 ? 1.0 : 0.7);
    return { id, label: sim.label, color: fx.color, kind: fx.kind, duration, radius };
}

/** Todas las reacciones con ficha en `fx.json` (para la prueba de cobertura). */
export function reactionVisuals(): ReactionVisual[] {
    return REACTION_ROWS.map((r) => reactionVisual(r.id)).filter((v): v is ReactionVisual => v !== null);
}

/** Una pieza viva: avanza cada fotograma y se apaga sola al acabar (devuelve false). */
interface Live {
    step(dt: number): boolean;
    kill(): void;
}

const DOWN = new Vector3(0, -1, 0);

export class ReactionFx {
    private readonly live: Live[] = [];
    private readonly tmp = new Vector3();
    protected readonly scene: Scene;
    private readonly floating: FloatingText;
    private readonly bursts: BurstPool;

    constructor(scene: Scene, floating: FloatingText) {
        this.scene = scene;
        this.floating = floating;
        this.bursts = new BurstPool(scene, 8, 96);
    }

    /** Una reacción ha saltado sobre un objetivo; `at` es un punto sobre su cabeza. */
    play(reactionId: string, at: Vector3): void {
        const v = reactionVisual(reactionId);
        if (!v) return; // id desconocido: sin efecto, sin romper
        this.floating.show(tr(v.label), at.add(this.tmp.set(0, 0.5, 0)), v.color, 1.5, 2.2, { px: 60 });
        this.spawn(v, at);
    }

    /** Avanza los efectos vivos y apaga los que terminaron. */
    update(dt: number): void {
        if (!this.live.length) return;
        for (let i = this.live.length - 1; i >= 0; i--) {
            const l = this.live[i]!;
            if (!l.step(dt)) {
                l.kill();
                this.live.splice(i, 1);
            }
        }
    }

    /** Quita todo lo vivo al reiniciar la partida (el pool de ráfagas sobrevive: sus
     * partículas mueren solas en menos de 1,2 s, como en `spellFx`). */
    reset(): void {
        for (const l of this.live) l.kill();
        this.live.length = 0;
    }

    /** Altura del suelo bajo (x, z) por raycast; `fallback` si no hay malla de terreno a mano. */
    private groundY(x: number, z: number, fallback: number): number {
        const ray = new Ray(new Vector3(x, fallback + 60, z), DOWN, 200);
        const pick = this.scene.pickWithRay(ray, (m) => {
            const n = m.name;
            return m.isEnabled() && (n.startsWith('terrain:') || n === 'dUnder' || n.startsWith('dFloor'));
        });
        return pick?.hit && pick.pickedPoint ? pick.pickedPoint.y : fallback;
    }

    private spawn(v: ReactionVisual, at: Vector3): void {
        const x = at.x;
        const z = at.z;
        // Centro del cuerpo (aprox.): el ancla es la cabeza, la malla va un poco más abajo.
        const body = this.tmp.set(x, at.y - 0.5, z).clone();
        switch (v.kind) {
            case 'vapor':
                this.cloudZone(v, x, z, body.y, { rate: 60, size: [0.6, 1.4], life: [0.6, 1.4], speed: [0.1, 0.5], gravity: 0.6 });
                break;
            case 'crystal':
                this.crystal(v, body);
                break;
            case 'arc':
                this.arcVolley(v, body, 1);
                break;
            case 'pool':
                this.pool(v, x, z, body.y + 0.5);
                break;
            case 'rain':
                this.rain(v, x, z, body.y + 0.5);
                break;
            case 'flash':
                this.flash(v, body);
                break;
            case 'blast':
                this.blast(v, body, v.radius || 2);
                break;
            case 'spread':
                this.spread(v, x, z, body.y + 0.5);
                break;
            case 'cracks':
                this.cracks(v, x, z, body.y + 0.5);
                break;
            case 'frost':
                this.frost(v, x, z, body.y + 0.5);
                break;
            case 'swirl':
                this.swirl(v, x, z, body.y);
                break;
            case 'strike':
                this.strike(v, x, z, body.y + 0.5);
                break;
            case 'arcs':
                this.arcVolley(v, body, 3);
                break;
            case 'dust':
                this.cloudZone(v, x, z, body.y, { rate: 70, size: [0.5, 1.1], life: [0.5, 1.2], speed: [0.4, 1.2], gravity: 0.3 });
                break;
        }
    }

    // ── nubes y polvo (zonas continuas con partícula y disco tenue) ──────────
    private cloudZone(
        v: ReactionVisual,
        x: number,
        z: number,
        bodyY: number,
        o: { rate: number; size: [number, number]; life: [number, number]; speed: [number, number]; gravity: number },
    ): void {
        const gy = this.groundY(x, z, bodyY - 0.6);
        const emitter = new Vector3(x, gy + 0.4, z);
        const r = Math.max(0.6, v.radius * 0.9);
        const ps = new ParticleSystem(`fxReac:${v.id}`, Math.ceil(o.rate * o.life[1] * 2) + 16, this.scene);
        ps.particleTexture = softDot(this.scene);
        ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        ps.emitter = emitter;
        ps.createSphereEmitter(r, 0.4);
        ps.color1 = new Color4(v.color[0], v.color[1], v.color[2], 0.28);
        ps.color2 = new Color4(...v.color, 0.16);
        ps.colorDead = new Color4(v.color[0], v.color[1], v.color[2], 0);
        ps.minSize = o.size[0];
        ps.maxSize = o.size[1];
        ps.minLifeTime = o.life[0];
        ps.maxLifeTime = o.life[1];
        ps.minEmitPower = o.speed[0];
        ps.maxEmitPower = o.speed[1];
        ps.gravity.set(0, o.gravity, 0);
        ps.emitRate = o.rate;
        ps.targetStopDuration = v.duration;
        ps.disposeOnStop = true;
        ps.start();
        const ring = MeshBuilder.CreateDisc(`fxReacRing:${v.id}`, { radius: v.radius || r, tessellation: 36 }, this.scene);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, gy + 0.05, z);
        const mat = glowMaterial(this.scene, `fxReacMat:${v.id}`, v.color, 0.18, false);
        ring.material = mat;
        ring.isPickable = false;
        const total = v.duration;
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                ring.scaling.setAll(0.6 + 0.4 * Math.min(1, k / 0.2));
                mat.alpha = 0.18 * (k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1);
                return ttl > 0;
            },
            kill: () => {
                retire(ps);
                mat.dispose();
                ring.dispose();
            },
        });
    }

    // ── Congelado: cristal que envuelve el cuerpo ────────────────────────────
    private crystal(v: ReactionVisual, body: Vector3): void {
        const mesh = MeshBuilder.CreateIcoSphere(`fxReac:${v.id}`, { radius: 0.6, subdivisions: 1 }, this.scene);
        mesh.position.copyFrom(body);
        const mat = glowMaterial(this.scene, `fxReacMat:${v.id}`, v.color, 0.8);
        mesh.material = mat;
        mesh.isPickable = false;
        const total = Math.max(0.6, v.duration);
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                const grow = Math.min(1, k / 0.15);
                const shrink = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
                const s = (0.4 + 0.6 * grow) * shrink;
                mesh.scaling.setAll(s);
                mesh.rotation.y = k * 2;
                mat.alpha = 0.5 + 0.3 * Math.sin(k * 20) * shrink;
                if (ttl <= 0) this.spark(v.color, body);
                return ttl > 0;
            },
            kill: () => {
                mat.dispose();
                mesh.dispose();
            },
        });
    }

    // ── Calambre / Tormenta: arcos eléctricos que saltan ─────────────────────
    private arcVolley(v: ReactionVisual, body: Vector3, count: number): void {
        const meshes: LinesMesh[] = [];
        const mats: StandardMaterial[] = [];
        for (let i = 0; i < count; i++) {
            const from = body.add(new Vector3((Math.random() - 0.5) * 1.4, 0.6, (Math.random() - 0.5) * 1.4));
            const to = body.add(new Vector3((Math.random() - 0.5) * (v.radius || 3), -0.4 + Math.random() * 1.2, (Math.random() - 0.5) * (v.radius || 3)));
            const line = this.jaggedLine(`fxArc:${v.id}:${i}`, from, to, 6);
            const mat = glowMaterial(this.scene, `fxArcMat:${v.id}:${i}`, v.color, 1);
            line.material = mat;
            line.isPickable = false;
            meshes.push(line);
            mats.push(mat);
            this.spark(v.color, to);
        }
        const total = DEFAULT_SECONDS.arc ?? 0.7;
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const a = Math.max(0, ttl / total);
                for (const m of mats) m.alpha = a * (0.5 + Math.random() * 0.5);
                return ttl > 0;
            },
            kill: () => {
                for (const m of mats) m.dispose();
                for (const l of meshes) l.dispose();
            },
        });
    }

    /** Línea quebrada entre dos puntos (un rayo / arco). */
    private jaggedLine(name: string, from: Vector3, to: Vector3, segments: number): LinesMesh {
        const pts: Vector3[] = [from.clone()];
        const dir = to.subtract(from);
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const jitter = (1 - Math.abs(2 * t - 1)) * 0.5;
            pts.push(
                from.add(dir.scale(t)).add(
                    new Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter),
                ),
            );
        }
        pts.push(to.clone());
        return MeshBuilder.CreateLines(name, { points: pts }, this.scene);
    }

    // ── Barrial / Lava: charco en el suelo que dura la zona ──────────────────
    private pool(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const r = v.radius || 1.5;
        const disc = MeshBuilder.CreateDisc(`fxPool:${v.id}`, { radius: r, tessellation: 40 }, this.scene);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, gy + 0.06, z);
        const isLava = v.id === 'lava';
        const mat = glowMaterial(this.scene, `fxPoolMat:${v.id}`, v.color, isLava ? 0.7 : 0.55, isLava);
        disc.material = mat;
        disc.isPickable = false;
        let embers: ParticleSystem | null = null;
        if (isLava) {
            const em = new Vector3(x, gy + 0.1, z);
            embers = new ParticleSystem(`fxPoolEmber:${v.id}`, 80, this.scene);
            embers.particleTexture = softDot(this.scene);
            embers.blendMode = ParticleSystem.BLENDMODE_ADD;
            embers.emitter = em;
            embers.createCylinderEmitter(r * 0.9, 0.05, 0, 0.1);
            embers.color1 = new Color4(1, 0.6, 0.1, 1);
            embers.color2 = new Color4(...v.color, 1);
            embers.colorDead = new Color4(0.2, 0, 0, 0);
            embers.minSize = 0.04;
            embers.maxSize = 0.12;
            embers.minLifeTime = 0.3;
            embers.maxLifeTime = 0.8;
            embers.minEmitPower = 0.5;
            embers.maxEmitPower = 1.8;
            embers.gravity.set(0, 1.5, 0);
            embers.emitRate = 24;
            embers.start();
        }
        const total = v.duration;
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                mat.alpha = (isLava ? 0.6 + 0.15 * Math.sin(k * 12) : 0.55) * (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
                return ttl > 0;
            },
            kill: () => {
                if (embers) retire(embers);
                mat.dispose();
                disc.dispose();
            },
        });
    }

    // ── Chubasco: lluvia corta sobre el área ─────────────────────────────────
    private rain(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const r = v.radius || 2;
        const emitter = new Vector3(x, gy + 4, z);
        const ps = new ParticleSystem(`fxRain:${v.id}`, 200, this.scene);
        ps.particleTexture = softDot(this.scene);
        ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        ps.emitter = emitter;
        ps.createCylinderEmitter(r, 0.05, 0, 4);
        ps.color1 = new Color4(...v.color, 0.7);
        ps.color2 = new Color4(...v.color, 0.4);
        ps.colorDead = new Color4(v.color[0], v.color[1], v.color[2], 0);
        ps.minSize = 0.04;
        ps.maxSize = 0.09;
        ps.minLifeTime = 0.4;
        ps.maxLifeTime = 0.7;
        ps.minEmitPower = 6;
        ps.maxEmitPower = 9;
        ps.gravity.set(0, -20, 0);
        ps.emitRate = 220;
        ps.direction1 = new Vector3(-0.4, -1, -0.4);
        ps.direction2 = new Vector3(0.4, -1, 0.4);
        ps.minAngularSpeed = 0;
        ps.targetStopDuration = v.duration;
        ps.disposeOnStop = true;
        ps.start();
        let ttl = v.duration;
        this.add({ step: (dt) => (ttl -= dt) > 0, kill: () => retire(ps) });
    }

    // ── Choque térmico: destello frío-caliente ───────────────────────────────
    private flash(v: ReactionVisual, body: Vector3): void {
        const orb = MeshBuilder.CreateSphere(`fxFlash:${v.id}`, { diameter: 1, segments: 10 }, this.scene);
        orb.position.copyFrom(body);
        const mat = glowMaterial(this.scene, `fxFlashMat:${v.id}`, v.color, 1);
        orb.material = mat;
        orb.isPickable = false;
        this.bursts.burst(body, { count: 26, color: v.color, core: [1, 1, 0.9], radius: 0.2, speed: [3, 6], life: [0.2, 0.5], size: [0.06, 0.16] });
        const ring = this.shockwave(body, v.color, 3, 0.5);
        const total = DEFAULT_SECONDS.flash ?? 0.6;
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                orb.scaling.setAll(1 + k * 3);
                mat.alpha = 1 - k;
                return ttl > 0;
            },
            kill: () => {
                mat.dispose();
                orb.dispose();
                ring.kill();
            },
        });
    }

    // ── Estallido: explosión con onda expansiva ──────────────────────────────
    private blast(v: ReactionVisual, body: Vector3, radius: number): void {
        const gy = this.groundY(body.x, body.z, body.y);
        const at = this.tmp.set(body.x, gy + 0.5, body.z).clone();
        this.bursts.burst(at, { count: 48, color: v.color, core: [1, 0.9, 0.6], radius: 0.4, speed: [4, 9], life: [0.3, 0.7], size: [0.1, 0.3], gravity: -3 });
        this.bursts.burst(at, { count: 20, color: [0.4, 0.4, 0.4], core: [0.7, 0.7, 0.7], radius: 0.6, speed: [1, 3], life: [0.6, 1.2], size: [0.4, 0.9], gravity: 1 });
        this.add(this.shockwave(at, v.color, radius * 2, 0.6));
    }

    /** Onda expansiva horizontal que crece y se desvanece. */
    private shockwave(at: Vector3, color: Rgb, reach: number, seconds: number): Live {
        const ring = MeshBuilder.CreateTorus(`fxWave`, { diameter: 1, thickness: 0.12, tessellation: 40 }, this.scene);
        ring.position.copyFrom(at);
        ring.position.y = this.groundY(at.x, at.z, at.y) + 0.12;
        const mat = glowMaterial(this.scene, 'fxWaveMat', color, 0.9);
        ring.material = mat;
        ring.isPickable = false;
        let ttl = seconds;
        return {
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / seconds;
                const s = 0.3 + k * reach;
                ring.scaling.set(s, 1, s);
                mat.alpha = 0.9 * (1 - k);
                return ttl > 0;
            },
            kill: () => {
                mat.dispose();
                ring.dispose();
            },
        };
    }

    // ── Incendio: llamas que se reparten por el área ─────────────────────────
    private spread(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const r = v.radius || 2.5;
        const n = 7;
        const systems: ParticleSystem[] = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const d = i === 0 ? 0 : r * (0.4 + Math.random() * 0.6);
            const px = x + Math.cos(a) * d;
            const pz = z + Math.sin(a) * d;
            const em = new Vector3(px, this.groundY(px, pz, gy) + 0.15, pz);
            const ps = new ParticleSystem(`fxFire:${v.id}:${i}`, 60, this.scene);
            ps.particleTexture = softDot(this.scene);
            ps.blendMode = ParticleSystem.BLENDMODE_ADD;
            ps.emitter = em;
            ps.createCylinderEmitter(0.2, 0.05, 0, 0.2);
            ps.color1 = new Color4(1, 0.7, 0.2, 1);
            ps.color2 = new Color4(...v.color, 1);
            ps.colorDead = new Color4(0.3, 0, 0, 0);
            ps.minSize = 0.1;
            ps.maxSize = 0.3;
            ps.minLifeTime = 0.3;
            ps.maxLifeTime = 0.7;
            ps.minEmitPower = 0.8;
            ps.maxEmitPower = 2;
            ps.gravity.set(0, 2, 0);
            ps.emitRate = 40;
            ps.targetStopDuration = v.duration;
            ps.disposeOnStop = true;
            ps.start();
            systems.push(ps);
        }
        let ttl = v.duration;
        this.add({
            step: (dt) => (ttl -= dt) > 0,
            kill: () => {
                for (const ps of systems) retire(ps);
            },
        });
    }

    // ── Quiebre: grietas de hielo en el suelo ────────────────────────────────
    private cracks(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const lines: LinesMesh[] = [];
        const mats: StandardMaterial[] = [];
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
            const len = 0.8 + Math.random() * 1.4;
            const outer = new Vector3(x + Math.cos(a) * len, gy + 0.07, z + Math.sin(a) * len);
            const line = this.jaggedLine(`fxCrack:${i}`, new Vector3(x, gy + 0.07, z), outer, 4);
            const mat = glowMaterial(this.scene, `fxCrackMat:${i}`, v.color, 0.9);
            line.material = mat;
            line.isPickable = false;
            lines.push(line);
            mats.push(mat);
        }
        const total = Math.max(1, v.duration);
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                for (const m of mats) m.alpha = 0.9 * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
                return ttl > 0;
            },
            kill: () => {
                for (const m of mats) m.dispose();
                for (const l of lines) l.dispose();
            },
        });
    }

    // ── Helada dura: escarcha en el suelo con cristales ──────────────────────
    private frost(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const r = Math.max(1, v.radius || 1.5);
        const disc = MeshBuilder.CreateDisc(`fxFrost:${v.id}`, { radius: r, tessellation: 40 }, this.scene);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, gy + 0.05, z);
        const mat = glowMaterial(this.scene, `fxFrostMat:${v.id}`, v.color, 0.5, false);
        disc.material = mat;
        disc.isPickable = false;
        const shards: Mesh[] = [];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const s = MeshBuilder.CreatePolyhedron(`fxFrostShard:${i}`, { type: 1, size: 0.12 }, this.scene);
            s.position.set(x + Math.cos(a) * r * 0.7, gy + 0.1, z + Math.sin(a) * r * 0.7);
            s.rotation.set(Math.random(), Math.random(), Math.random());
            s.material = glowMaterial(this.scene, `fxFrostShardMat:${i}`, v.color, 0.9);
            s.isPickable = false;
            shards.push(s);
        }
        const total = Math.max(1, v.duration);
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                const grow = Math.min(1, k / 0.2);
                disc.scaling.set(grow, grow, grow);
                mat.alpha = 0.5 * (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
                return ttl > 0;
            },
            kill: () => {
                mat.dispose();
                disc.dispose();
                for (const s of shards) {
                    (s.material as StandardMaterial)?.dispose();
                    s.dispose();
                }
            },
        });
    }

    // ── Ventisca: remolino de nieve ──────────────────────────────────────────
    private swirl(v: ReactionVisual, x: number, z: number, bodyY: number): void {
        const gy = this.groundY(x, z, bodyY - 0.6);
        const r = v.radius || 3;
        const emitter = new Vector3(x, gy + 1.2, z);
        const ps = new ParticleSystem(`fxSwirl:${v.id}`, 240, this.scene);
        ps.particleTexture = softDot(this.scene);
        ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        ps.emitter = emitter;
        ps.color1 = new Color4(...v.color, 0.9);
        ps.color2 = new Color4(0.9, 0.95, 1, 0.6);
        ps.colorDead = new Color4(0.9, 0.95, 1, 0);
        ps.minSize = 0.05;
        ps.maxSize = 0.14;
        ps.minLifeTime = 0.6;
        ps.maxLifeTime = 1.4;
        ps.minEmitPower = 1;
        ps.maxEmitPower = 2.5;
        ps.gravity.set(0, -1, 0);
        ps.createSphereEmitter(r * 0.5, 0.6);
        ps.minAngularSpeed = -3;
        ps.maxAngularSpeed = 3;
        ps.emitRate = 160;
        ps.targetStopDuration = v.duration;
        ps.disposeOnStop = true;
        ps.start();
        let ttl = v.duration;
        this.add({ step: (dt) => (ttl -= dt) > 0, kill: () => retire(ps) });
    }

    // ── Toma de tierra: rayo que baja al suelo ───────────────────────────────
    private strike(v: ReactionVisual, x: number, z: number, refY: number): void {
        const gy = this.groundY(x, z, refY - 0.6);
        const from = new Vector3(x + (Math.random() - 0.5) * 1.5, gy + 12, z + (Math.random() - 0.5) * 1.5);
        const to = new Vector3(x, gy + 0.05, z);
        const line = this.jaggedLine(`fxStrike:${v.id}`, from, to, 12);
        const mat = glowMaterial(this.scene, `fxStrikeMat:${v.id}`, v.color, 1);
        line.material = mat;
        line.isPickable = false;
        const impact = this.tmp.set(x, gy + 0.1, z).clone();
        this.bursts.burst(impact, { count: 28, color: v.color, core: [1, 1, 1], radius: 0.3, speed: [2, 6], life: [0.2, 0.5], size: [0.06, 0.16], gravity: 2 });
        const wave = this.shockwave(impact, v.color, 4, 0.5);
        const total = DEFAULT_SECONDS.strike ?? 0.6;
        let ttl = total;
        this.add({
            step: (dt) => {
                ttl -= dt;
                const k = 1 - Math.max(0, ttl) / total;
                mat.alpha = (1 - k) * (0.5 + Math.random() * 0.5);
                return ttl > 0;
            },
            kill: () => {
                mat.dispose();
                line.dispose();
                wave.kill();
            },
        });
    }

    // ── polvo / chispas puntuales ────────────────────────────────────────────
    private spark(color: Rgb, at: Vector3): void {
        this.bursts.burst(at, { count: 10, color, core: [1, 1, 1], radius: 0.2, speed: [1, 3], life: [0.15, 0.35], size: [0.04, 0.1] });
    }

    private add(l: Live): void {
        this.live.push(l);
    }
}
