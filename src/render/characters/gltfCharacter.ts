// Personaje desde un glTF/GLB de assets/ con sus AnimationGroups. Mismo
// contrato que el procedural: estados → animaciones por nombre (data/assets.json),
// fundido por pesos y eventos por tiempo normalizado. Mientras carga no se ve
// nada; si falla, lo dice en consola y queda vacío.
import {
    Color3,
    Matrix,
    Quaternion,
    TransformNode,
    Vector3,
    type AbstractMesh,
    type AnimationGroup,
    type Node,
    type Observer,
    type Scene,
} from '@babylonjs/core';
import type { AssetEntry } from '../../data/worldSchema';
import { crossedEvents, type AnimEvent } from '../../world/anim';
import { coversHair, modelPartsFor, type BodyType, type CharacterLook } from '../../world/look';
import type { AnimState } from '../../world/rigs';
import type { AssetCache } from '../assetCache';
import type { CharacterModel, PlayOptions } from './characterModel';
import ajusteEquipo from '../../../data/art/ajusteEquipo.json';
import {
    attachFitted,
    attachHeld,
    DESIGN_PARTS,
    HAIR_PARTS,
    heldJoint,
    WORN_PARTS,
    type BoneFit,
    type HeldSlot,
} from './heldGear';

/** Tabla de ajuste de las piezas a medida (EQ-10), por GLB (nombre sin `.glb`) y hueso. */
const FIT = ajusteEquipo as unknown as Readonly<Record<string, Readonly<Record<string, BoneFit>>>>;

type GltfEntry = Extract<AssetEntry, { kind: 'gltf' }>;
type Palette = GltfEntry['palettes'][string];
type Tintable = { name: string; albedoColor?: Color3; emissiveColor?: Color3 };

const GHOST_GLOW = new Color3(0.25, 0.35, 0.55);

/** Velocidad de un clip de hechizo para que su impacto (`t` de `seconds`) caiga al final del aviso. */
export function spellSpeed(t: number, seconds: number, telegraphSeconds: number): number {
    return Math.min(3, Math.max(0.25, (t * seconds) / Math.max(0.05, telegraphSeconds)));
}
const BODY_WIDTH: Readonly<Record<BodyType, number>> = { slim: 0.9, average: 1, stout: 1.14 };

/**
 * Postura de jinete (grados sobre el eje X local de cada hueso del esqueleto común,
 * `scripts/blender/fg_rig.py`): los muslos suben hacia delante y las rodillas se doblan.
 */
const RIDE_POSE: ReadonlyArray<readonly [string, number, number]> = [
    // [hueso, giro hacia delante (X), apertura (Z)]
    ['thighL', -62, 28],
    ['thighR', -62, -28],
    ['shinL', 78, 0],
    ['shinR', 78, 0],
    ['footL', -12, 0],
    ['footR', -12, 0],
];
/** Lo que baja el jinete sentado (la cadera queda sobre la silla), en altura del modelo. */
export const RIDE_SEAT_DROP = 0.42;

export class GltfCharacter implements CharacterModel {
    readonly root: TransformNode;
    readonly height: number;
    readonly meshes: AbstractMesh[] = [];
    /** Se cumple cuando el modelo ya está en la escena: entonces hay mallas que etiquetar. */
    readonly ready: Promise<void>;
    private readonly inner: TransformNode;
    private groups = new Map<AnimState, AnimationGroup>();
    /** Todos los AnimationGroups del GLB por nombre de pista (para `playNamed`). */
    private readonly byName = new Map<string, AnimationGroup>();
    /** Clip suelto en curso (máscara, saludo): se reproduce una vez y devuelve al reposo. */
    private gesture: { group: AnimationGroup; onDone?: () => void } | null = null;
    /** `playNamed` pedido antes de que el GLB terminara de cargar. */
    private pendingNamed: { clip: string; onDone?: () => void; speed?: number } | null = null;
    /** `spell`: el clip es una danza de hechizo (`spellClips`) que hace de `cast` hasta que cambie el estado. */
    private cur: { state: AnimState; key: string; group: AnimationGroup; last: number; spell?: boolean } | null = null;
    private fading: Array<{ group: AnimationGroup; w: number }> = [];
    private pending: { state: AnimState; opts: PlayOptions } | null = null;
    private disposed = false;
    /** Copia del modelo: esqueleto y clips no se van con el nodo y hay que soltarlos aparte. */
    private inst: { skeletons: Array<{ dispose(): void }>; animationGroups: Array<{ dispose(): void }> } | null = null;
    private readonly joints = new Map<string, Node>();
    /** Raíz del glTF instanciado: los sitios de `wear` se miden en su espacio. */
    private gltfRoot: Node | null = null;
    /** Montado: postura de jinete por encima del clip (la aplica cada fotograma tras las animaciones). */
    private pose: 'ride' | null = null;
    private readonly rest = new Map<string, Quaternion>();
    private poseObserver: Observer<Scene> | null = null;
    private readonly sceneRef: Scene;
    private readonly tints: Array<{ mat: Tintable; base: Color3 }> = [];
    private shade = 1;

    constructor(
        scene: Scene,
        assetId: string,
        name: string,
        private readonly entry: GltfEntry,
        cache: AssetCache,
        private readonly blendSeconds: number,
        private readonly palette?: Palette,
        private readonly look?: CharacterLook,
    ) {
        // Proporciones elegidas al crear el personaje (sólo el aspecto; la simulación no cambia).
        const [sy, sxz] = look?.bodyScale ?? [1, 1];
        this.height = entry.height * entry.scale * sy;
        this.sceneRef = scene;
        this.root = new TransformNode(name, scene);
        this.inner = new TransformNode(`${name}:inner`, scene);
        this.inner.parent = this.root;
        this.inner.rotation.y = (entry.yawDeg * Math.PI) / 180;
        this.inner.scaling.setAll(entry.scale);
        this.inner.scaling.y *= sy;
        this.inner.scaling.x *= sxz;
        this.inner.scaling.z *= sxz;
        if (look && entry.parts) {
            const k = BODY_WIDTH[look.bodyType];
            this.inner.scaling.x *= k;
            this.inner.scaling.z *= k;
        }
        this.ready = cache
            .instantiate(assetId, name)
            .then((inst) => {
                if (this.disposed) {
                    inst.dispose();
                    return;
                }
                this.inst = inst;
                for (const n of inst.rootNodes) n.parent = this.inner;
                this.gltfRoot = inst.rootNodes[0] ?? null;
                const wanted = look && entry.parts ? modelPartsFor(look) : null;
                const pick = pieceChooser(look);
                const unused: AbstractMesh[] = [];
                for (const n of inst.rootNodes) {
                    for (const d of n.getDescendants(false)) this.joints.set(d.name.slice(d.name.indexOf(':') + 1), d);
                    for (const m of n.getChildMeshes(false)) {
                        const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
                        if ((!wanted || wanted.has(part)) && pick(part)) this.meshes.push(m);
                        else unused.push(m);
                    }
                }
                // Un aspecto no cambia en una copia (otro aspecto es otra copia): lo que no usa se borra.
                const kept = new Set(this.meshes.map((m) => m.material));
                for (const m of unused) {
                    if (m.material && !kept.has(m.material)) {
                        kept.add(m.material);
                        m.material.dispose();
                    }
                    m.dispose(false, false);
                }
                this.applyPalette();
                void this.holdGear(scene, name);
                for (const [state, clip] of Object.entries(entry.clips)) {
                    const g = inst.animationGroups.find((a) => a.name.endsWith(clip));
                    if (g) this.groups.set(state as AnimState, g);
                    else console.warn(`[gltf] ${name}: no hay animación «${clip}» para ${state}`);
                }
                // Índice por nombre de pista para `playNamed` (clips extra: máscara, saludos).
                for (const g of inst.animationGroups) if (!this.byName.has(g.name)) this.byName.set(g.name, g);
                // La careta viaja por el hueso `careta` sólo en `MascaraOn`/`MascaraOff`. El
                // exportador glTF mete un canal por hueso en CADA animación, así que en el resto
                // la pista dejaría la careta pegada a la cara. Se quitan esos canales: tras
                // `MascaraOff` la máscara se queda en la mano y `Reposo` no la devuelve de golpe.
                for (const g of inst.animationGroups) {
                    const esGesto = /Mascara(On|Off)$/.test(g.name);
                    if (esGesto) continue;
                    for (const ta of [...g.targetedAnimations]) {
                        const nm = ta.target.name ?? '';
                        if (nm === 'careta' || nm.endsWith(':careta')) g.removeTargetedAnimation(ta.animation);
                    }
                }
                for (const g of inst.animationGroups) g.stop();
                const p = this.pending ?? { state: 'idle' as AnimState, opts: {} };
                this.pending = null;
                this.play(p.state, p.opts);
                if (this.pendingNamed) {
                    const n = this.pendingNamed;
                    this.pendingNamed = null;
                    this.playNamed(n.clip, n.onDone, n.speed);
                }
            })
            .catch((err: unknown) => console.error(`[gltf] ${name}: no se pudo cargar`, err));
    }

    /**
     * Lo que el personaje lleva en las manos (F17): el modelo del objeto equipado, si existe,
     * sustituye a la pieza del diseño o genérica de ese hueco. Sin nada equipado en un hueco,
     * la pieza del diseño solo se queda si es del tipo que lleva (p. ej. la lanza para una lanza).
     */
    private async holdGear(scene: Scene, name: string): Promise<void> {
        const look = this.look;
        if (!look || look.weaponItem === undefined) return;
        // Lo puesto se coloca con la pose de reposo, antes de que la animación mueva los huesos.
        const worn = this.wornPlacements(look);
        // Piezas a medida (EQ-10): una malla por hueso, pegadas con la tabla de ajuste de este GLB.
        const fitted = new Set<string>();
        const root = this.gltfRoot as TransformNode | null;
        const fit = FIT[this.entry.file.replace(/^.*\//, '').replace(/\.glb$/, '')];
        if (root && fit) {
            const rootInv = root.computeWorldMatrix(true).clone().invert();
            const items = [look.weaponItem, look.headItem, look.backItem, ...(look.bodyItems ?? [])];
            for (const item of items) {
                if (!item || fitted.has(item)) continue;
                const parts = await attachFitted(scene, item, this.joints, name, fit, rootInv);
                if (this.disposed) return;
                if (parts.length === 0) continue;
                fitted.add(item);
                this.meshes.push(...parts);
            }
            // La ropa del héroe asoma por las piezas a medida: la blusa tapa `Ropa` (torso y brazos),
            // la falda `Ropa2` (cadera y muslos) y el traje entero solo se quita con pecho, falda y pies.
            const slots = new Set(
                [...fitted].map((id) => /_(chest|waist|feet|hands|amulet|head|back|staff)$/.exec(id)?.[1]),
            );
            const drop = [
                ...(slots.has('chest') ? ['Ropa'] : []),
                ...(slots.has('waist') ? ['Ropa2'] : []),
                ...(slots.has('chest') && slots.has('waist') && slots.has('feet') ? ['Traje'] : []),
            ];
            for (const m of [...this.meshes]) {
                const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
                if (!drop.includes(part)) continue;
                this.meshes.splice(this.meshes.indexOf(m), 1);
                m.dispose(false, false);
            }
        }
        for (const slot of ['weapon', 'offhand'] as HeldSlot[]) {
            const item = slot === 'weapon' ? look.weaponItem : look.offhandItem;
            const hand = this.joints.get(heldJoint(slot, look.weapon));
            const own = item && fitted.has(item) ? true : item && hand ? await attachHeld(scene, item, hand, name) : false;
            if (this.disposed) return;
            const keepDesign = !own && (slot === 'weapon' ? look.weapon !== 'none' : look.offhand !== 'none');
            if (keepDesign) continue;
            for (const m of [...this.meshes]) {
                const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
                if (!DESIGN_PARTS[slot].includes(part)) continue;
                this.meshes.splice(this.meshes.indexOf(m), 1);
                m.dispose(false, false);
            }
        }
        for (const w of worn) {
            const own = fitted.has(w.item) || (await attachHeld(scene, w.item, w.joint, name, w.local));
            if (this.disposed) return;
            if (!own) continue;
            const drop: readonly string[] =
                w.slot === 'head' && coversHair(look.headKind)
                    ? [...WORN_PARTS.head, ...HAIR_PARTS]
                    : WORN_PARTS[w.slot];
            for (const m of [...this.meshes]) {
                const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
                if (!drop.includes(part)) continue;
                this.meshes.splice(this.meshes.indexOf(m), 1);
                m.dispose(false, false);
            }
        }
        const holders = new Set<Node>(worn.map((w) => w.joint));
        for (const slot of ['weapon', 'offhand'] as HeldSlot[]) {
            const hand = this.joints.get(heldJoint(slot, look.weapon));
            if (hand) holders.add(hand);
        }
        for (const h of holders)
            for (const m of (h as TransformNode).getChildMeshes(false))
                if (!this.meshes.includes(m)) this.meshes.push(m);
    }

    /**
     * Cabeza y espalda: el objeto va al hueso de su sitio en `wear`, con la transformación local
     * que lo deja en `at` (espacio del glTF) y a su escala con el hueso en reposo.
     */
    private wornPlacements(
        look: CharacterLook,
    ): Array<{ slot: 'head' | 'back'; item: string; joint: Node; local: Matrix }> {
        const out: Array<{ slot: 'head' | 'back'; item: string; joint: Node; local: Matrix }> = [];
        const root = this.gltfRoot as TransformNode | null;
        if (!root) return out;
        const rootInv = root.computeWorldMatrix(true).clone().invert();
        for (const slot of ['head', 'back'] as const) {
            const item = slot === 'head' ? look.headItem : look.backItem;
            const anchor = this.entry.wear[slot];
            const joint = anchor ? (this.joints.get(anchor.joint) as TransformNode | undefined) : undefined;
            if (!item || !anchor || !joint) continue;
            const place = (slot === 'head' && look.headKind && anchor.kinds[look.headKind]) || anchor;
            const rel = joint.computeWorldMatrix(true).multiply(rootInv);
            const local = Matrix.Scaling(place.scale, place.scale, place.scale)
                .multiply(Matrix.Translation(...place.at))
                .multiply(rel.invert());
            out.push({ slot, item, joint, local });
        }
        return out;
    }

    get state(): AnimState | null {
        return this.cur?.state ?? this.pending?.state ?? null;
    }

    /** Clip real para ese estado (los animales no traen «Caminar»). */
    hasClip(state: AnimState): boolean {
        return this.groups.has(state);
    }

    get runSpeed(): number {
        return this.entry.runSpeed;
    }

    get finished(): boolean {
        if (!this.cur) return false;
        return !this.isLoop(this.cur.state) && !this.cur.group.isPlaying;
    }

    private isLoop(state: AnimState): boolean {
        return state === 'idle' || state === 'walk' || state === 'run';
    }

    impactTime(state: AnimState): number {
        const ev = (this.entry.events[state] ?? []).find((e) => e.type === 'hit' || e.type === 'cast');
        return ev ? ev.t : 0.5;
    }

    clipSeconds(state: AnimState): number {
        const g = this.groups.get(state);
        if (!g) return 1;
        const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
        return (g.to - g.from) / fps;
    }

    private normalized(g: AnimationGroup): number {
        const a = g.animatables[0];
        if (!a || g.to <= g.from) return 0;
        return Math.min(1, Math.max(0, (a.masterFrame - g.from) / (g.to - g.from)));
    }

    play(state: AnimState, opts: PlayOptions = {}): void {
        if (this.groups.size === 0) {
            this.pending = { state, opts };
            return;
        }
        // Sin clip «Caminar» (animales, procedurales de bicho) el walk usa el de
        // correr y sus eventos: mismo aspecto que antes de existir la marcha.
        let key: string = state;
        let g = this.groups.get(state);
        if (!g && state === 'walk') {
            g = this.groups.get('run');
            key = 'run';
        }
        if (!g) {
            g = this.groups.get('idle')!;
            key = 'idle';
        }
        // Una danza de hechizo sigue sonando mientras dure su estado (aviso → ataque → recuperación).
        if (this.cur && !opts.restart && (this.cur.group === g || (this.cur.spell && this.cur.state === state))) {
            this.cur.group.speedRatio = opts.speed ?? 1;
            this.cur.state = state;
            return;
        }
        this.startGroup(g, state, key, this.isLoop(state), opts.speed ?? 1);
    }

    /** Arranca un grupo como estado base, fundiendo el anterior. */
    private startGroup(g: AnimationGroup, state: AnimState, key: string, loop: boolean, speed: number, spell = false): void {
        // Si vuelve a un clip que aún se apagaba, deja de apagarse: al terminar lo pararía y quedaría congelado.
        this.fading = this.fading.filter((f) => f.group !== g);
        if (this.cur && this.cur.group !== g) this.fading.push({ group: this.cur.group, w: 1 });
        g.start(loop, speed, g.from, g.to, false);
        g.setWeightForAllAnimatables(this.fading.length > 0 ? 0 : 1);
        this.cur = { state, key, group: g, last: 0, spell };
    }

    /**
     * Danza del hechizo `n` (de `spellClips`, el hechizo k usa el clip k mod n), acompasada para que
     * su impacto caiga al acabar el aviso. Devuelve false si el modelo no tiene danzas o el clip.
     */
    playSpell(n: number, telegraphSeconds: number): boolean {
        const list = this.entry.spellClips;
        if (list.length === 0 || this.groups.size === 0) return false;
        const pick = list[((n % list.length) + list.length) % list.length]!;
        const g = this.named(pick.clip);
        if (!g) return false;
        const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
        const seconds = (g.to - g.from) / fps;
        this.startGroup(g, 'cast', pick.clip, false, spellSpeed(pick.t, seconds, telegraphSeconds), true);
        return true;
    }

    /** El GLB puede traer el grupo como `clip` o `algo:clip`: busca exacto y luego por sufijo. */
    private named(clip: string): AnimationGroup | undefined {
        const g = this.byName.get(clip);
        if (g) return g;
        for (const [k, v] of this.byName) if (k.endsWith(clip)) return v;
        return undefined;
    }

    playNamed(clip: string, onDone?: () => void, speed = 1): boolean {
        const g = this.named(clip);
        if (!g) return false;
        const v = Math.max(0.25, speed);
        if (!this.cur) {
            this.pendingNamed = { clip, onDone, speed: v };
            return true;
        }
        this.gesture?.group.stop();
        this.cur.group.setWeightForAllAnimatables(0);
        g.start(false, v, g.from, g.to, false);
        g.setWeightForAllAnimatables(1);
        this.gesture = { group: g, onDone };
        return true;
    }

    get gesturing(): boolean {
        return this.gesture !== null;
    }

    /** Detiene el clip suelto en curso (emote, máscara…) y devuelve al estado base. */
    stopGesture(): void {
        if (this.gesture) {
            this.gesture.group.stop();
            this.gesture = null;
            this.pendingNamed = null;
            this.cur?.group.setWeightForAllAnimatables(1);
        }
    }

    /** El clip suelto terminó: se apaga y el estado base recupera el peso. */
    private endGesture(): void {
        if (!this.gesture) return;
        const { group, onDone } = this.gesture;
        this.gesture = null;
        group.stop();
        onDone?.();
        this.cur?.group.setWeightForAllAnimatables(1);
    }

    update(dt: number, moveSpeed: number): AnimEvent[] {
        const out: AnimEvent[] = [];
        if (!this.cur) return out;
        const c = this.cur;
        // Con un clip suelto en curso, el grupo base está a peso 0 y no se toca:
        // el gesto termina solo (no en bucle) y devuelve el peso al estado base.
        if (this.gesture) {
            if (!this.gesture.group.isPlaying) {
                this.endGesture();
                this.pendingNamed = null;
            }
            return out;
        }
        if (c.state === 'run' || c.state === 'walk') {
            // Cadencia: el clip de correr está hecho para `runSpeed`; caminar es el
            // mismo paso más lento, así que su velocidad natural es la proporción de
            // duraciones (medido en los GLB: 0,667 s correr / 1,067 s caminar). Sin
            // clip propio (c.key==='run') sigue valiendo la regla antigua.
            const natural =
                c.key === 'walk' && this.groups.has('walk')
                    ? this.entry.runSpeed * (this.clipSeconds('run') / this.clipSeconds('walk'))
                    : this.entry.runSpeed;
            c.group.speedRatio = Math.max(0.3, moveSpeed / natural);
        }
        const step = this.blendSeconds > 0 ? dt / this.blendSeconds : 1;
        let curW = 1;
        this.fading = this.fading.filter((f) => {
            f.w -= step;
            if (f.w <= 0) {
                f.group.stop();
                return false;
            }
            f.group.setWeightForAllAnimatables(f.w);
            curW = Math.min(curW, 1 - f.w);
            return true;
        });
        c.group.setWeightForAllAnimatables(curW);
        const t = this.normalized(c.group);
        const wrapped = t < c.last;
        for (const e of crossedEvents(this.entry.events[c.key] ?? [], c.last, t, wrapped))
            out.push({ type: e.type, clip: c.state });
        c.last = t;
        return out;
    }

    private applyPalette(): void {
        const seen = new Set<Tintable>();
        for (const m of this.meshes) {
            const mat = m.material as unknown as Tintable | null;
            if (!mat?.albedoColor || seen.has(mat)) continue;
            seen.add(mat);
            const slot = mat.name.slice(mat.name.indexOf(':') + 1).replace(/\.\d+$/, '');
            const glows = slot.startsWith('brillo_');
            const rgb = this.palette?.[(glows ? slot.slice(7) : slot) as keyof Palette];
            if (rgb) {
                mat.albedoColor = new Color3(rgb[0], rgb[1], rgb[2]).toLinearSpace();
                if (glows && mat.emissiveColor) mat.emissiveColor = mat.albedoColor.clone();
            }
            if (this.entry.ghost) {
                const t = mat as unknown as { alpha: number; disableDepthWrite: boolean };
                t.alpha = 0.55;
                t.disableDepthWrite = true;
                if (!slot.startsWith('brillo_')) mat.emissiveColor = GHOST_GLOW.clone();
            }
            this.tints.push({ mat, base: mat.albedoColor.clone() });
        }
        this.setShade(this.shade, true);
    }

    socket(joint: string, out: Vector3): Vector3 {
        const node = this.joints.get(joint) as TransformNode | undefined;
        if (node?.getAbsolutePosition) return out.copyFrom(node.getAbsolutePosition());
        // Sin ese hueso: a media altura del personaje.
        return out.copyFrom(this.root.getAbsolutePosition()).addInPlaceFromFloats(0, this.height * 0.6, 0);
    }

    lowestFoot(out: Vector3): Vector3 {
        const l = this.joints.get('footL') as TransformNode | undefined;
        const r = this.joints.get('footR') as TransformNode | undefined;
        if (!l || !r) return out.copyFrom(this.root.getAbsolutePosition());
        const a = l.getAbsolutePosition();
        const b = r.getAbsolutePosition();
        // El hueso está en el tobillo; la suela, un poco más abajo.
        out.copyFrom(a.y < b.y ? a : b);
        out.y -= 0.09 * this.entry.scale;
        return out;
    }

    setEmissive(r: number, g: number, b: number): void {
        for (const m of this.meshes) {
            const mat = m.material as {
                name: string;
                emissiveColor?: { set(r: number, g: number, b: number): void };
            } | null;
            if (mat?.name.includes('brillo_')) continue;
            if (this.entry.ghost) mat?.emissiveColor?.set(GHOST_GLOW.r + r, GHOST_GLOW.g + g, GHOST_GLOW.b + b);
            else mat?.emissiveColor?.set(r, g, b);
        }
    }

    setShade(k: number, force = false): void {
        // Asignar `albedoColor` marca el material para recompilar: sólo cuando cambia el tono
        // (se llama en cada fotograma por enemigo).
        if (k === this.shade && !force) return;
        this.shade = k;
        for (const { mat, base } of this.tints) mat.albedoColor = base.scale(k);
    }

    /** Jinete: muslos hacia delante y rodillas dobladas sobre el clip de reposo. */
    setPose(pose: 'ride' | null): void {
        if (pose === this.pose) return;
        this.pose = pose;
        if (pose && !this.poseObserver)
            this.poseObserver = this.sceneRef.onAfterAnimationsObservable.add(() => this.applyPose());
    }

    private applyPose(): void {
        if (!this.pose) return;
        for (const [joint, angle, spread] of RIDE_POSE) {
            const n = this.joints.get(joint) as TransformNode | undefined;
            if (!n?.rotationQuaternion) continue;
            let base = this.rest.get(joint);
            if (!base) this.rest.set(joint, (base = n.rotationQuaternion.clone()));
            const rad = Math.PI / 180;
            n.rotationQuaternion.copyFrom(base.multiply(Quaternion.RotationYawPitchRoll(0, angle * rad, spread * rad)));
        }
    }

    dispose(): void {
        this.disposed = true;
        if (this.poseObserver) this.sceneRef.onAfterAnimationsObservable.remove(this.poseObserver);
        for (const g of this.groups.values()) g.stop();
        // Las copias de equipo.glb comparten material y textura con el archivo cargado (y con los
        // demás personajes): se quitan antes, sin sus materiales, para que el siguiente modelo
        // (otro aspecto, otro sexo) no reciba un material ya borrado.
        for (const m of this.root.getChildMeshes(false))
            if (m.name.includes(':obj_') && !m.isDisposed()) m.dispose(false, false);
        this.root.dispose(false, true);
        for (const g of this.inst?.animationGroups ?? []) g.dispose();
        for (const s of this.inst?.skeletons ?? []) s.dispose();
        this.inst = null;
    }
}

/**
 * Héroes por piezas (scripts/blender/heroe_piezas.py): de las variantes `Cara_N` sólo queda
 * la elegida (la 0 si no hay elección) y de los peinados `Pelo_<corte>`, el elegido; `bald`
 * no deja ninguno. Sin corte elegido queda el primero que aparezca. El resto pasa siempre.
 */
export function pieceChooser(look?: CharacterLook): (part: string) => boolean {
    const face = `Cara_${look?.face ?? 0}`;
    let firstHair: string | null = null;
    return (part) => {
        if (/^Cara_\d+$/.test(part)) return part === face;
        if (!/^Pelo_(short|long|bun)$/.test(part)) return true;
        if (look?.hairCut !== undefined) return part === `Pelo_${look.hairCut}`;
        firstHair ??= part;
        return part === firstHair;
    };
}
