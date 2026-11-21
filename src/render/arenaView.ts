// Traduce el estado de `World` a la escena Babylon: terreno, jugador y marcadores.
import {
    Color3,
    Color4,
    Engine,
    FxaaPostProcess,
    Matrix,
    MeshBuilder,
    Scene,
    Vector3,
    TransformNode,
    type LinesMesh,
    type StandardMaterial,
    type Mesh,
} from '@babylonjs/core';
import type { GameData } from '../data';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import type { Overworld } from '../world/overworld';
import { terrainHeight, type HeightField } from '../world/terrain';
import { atlasToShape } from '../world/pageContext';
import { CameraRig } from './cameraRig';
import { ChaserView } from './chaserView';
import { EnemyView } from './enemyView';
import { levelColor } from '../sim/zones';
import { loadFx } from '../data/fxSchema';
import { loadSpellFx } from '../data/spellFxSchema';
import { SpellFx } from './fx/spellFx';
import { StatusFx } from './fx/statusFx';
import { FloatingText } from './fx/floatingText';
import { ReactionFx } from './fx/reactionFx';
import { ArrowFx } from './fx/arrowFx';
import { OcclusionController, OcclusionPlugin, occlusionPicks, type OcclusionTarget } from './occlusion';
import { particleDetail } from './fx/particles';
import type { FxDef } from '../data/fxSchema';
import { PetView } from './petView';
import { solidMaterial } from './materials';
import { AssetCache } from './assetCache';
import { Atmosphere } from './atmosphere';
import { loadWorldData } from '../data/worldData';
import { createCharacter } from './characters/characterModel';
import { MountView, mountBasePalette, type MountRenderLook } from './mountView';
import { customMountColors, isCustomMountLook } from '../rpg/mountColor';
import { PaintStyle } from './paintStyle';
import { SceneLook } from './sceneLook';
import { RIDE_SEAT_DROP } from './characters/gltfCharacter';
import { PlayerAvatar } from './characters/playerAvatar';
import type { AnimEvent } from '../world/anim';
import type { Character } from '../rpg/character';
import type { AnimationDataDef, AssetManifest } from '../data/worldSchema';
import { playerLookSpec } from './characters/playerLook';
import { FarWorldView } from './farWorldView';
import { useLinearFog } from './linearFog';
import { SeaView } from './seaView';
import { TerrainView } from './terrainView';
import type { WorldStream } from '../world/stream';
import { groundTintAt } from '../world/scatter';
import { tr } from '../i18n';
import { buildVegetation, type VegetationView } from './vegetationView';
import { visibleEnemyLabelIds } from './enemyLabels';
import { AmbientView } from './ambientView';
import { HitPauseController } from './hitPause';
import type { DetailDef } from '../world/detail';

/** Calidad gráfica que se puede cambiar en marcha (Opciones → Gráficos). */
export interface GraphicsQuality {
    shadows: 'no' | 'bajas' | 'altas';
    /** Fracción de hierba, flores y arbustos (0–1). */
    vegetationDensity: number;
    /** Metros hasta el plano lejano. */
    viewDistance: number;
    /** Multiplicador de partículas. */
    particles: number;
    /** Resolución interna respecto a la de la pantalla (0,5–1). */
    renderScale: number;
    /** MSAA sólo cuenta al crear el motor; FXAA se pone y se quita. */
    antialias: 'no' | 'fxaa' | 'msaa';
    occlusionCut: boolean;
    /** «pintura»: contorno, luz en bandas y color vivo (estilo anime); «natural»: como antes. */
    visualStyle?: 'pintura' | 'natural';
}

/** Lo que se decide al crear el motor (no se puede cambiar después). */
export interface ArenaViewOptions {
    /** MSAA del contexto WebGL. */
    msaa?: boolean;
}

/** Hasta dónde llega la cámara: las cordilleras de Panamá. */
const FAR_PLANE = 4200;
/** Visión con la que se midieron las distancias de data/detail.json. */
const REFERENCE_VIEW = 200;
/** Un clic en el cielo no recorre todo el atlas. */
const CLICK_REACH = 400;

export class ArenaView {
    readonly engine: Engine;
    readonly scene: Scene;
    readonly rig: CameraRig;
    readonly ground: TransformNode;
    readonly terrain: TerrainView;
    private readonly far: FarWorldView;
    private readonly sea: SeaView;
    readonly stream: WorldStream;
    readonly heights: HeightField;
    /**
     * El terreno calculado, sin depender de las páginas cargadas: con él se asientan las
     * estructuras, que se colocan al arrancar, cuando el suelo lejano aún no ha llegado.
     */
    readonly groundExact: { sample(x: number, z: number): number };
    readonly vegetation: VegetationView;
    readonly ambient: AmbientView;
    readonly atmosphere: Atmosphere;
    readonly assets: AssetCache;
    private readonly mountView: MountView;
    readonly player: PlayerAvatar;
    private readonly chars: { assets: AssetManifest; animation: AnimationDataDef };
    /** Paleta y aspecto con los que está hecho el modelo del jugador (clave de `syncPlayerLook`). */
    private playerLookKey = 'default';
    readonly spellFx: SpellFx;
    readonly statusFx: StatusFx;
    readonly pets: PetView;
    readonly floating: FloatingText;
    /** Nombre y efecto de las reacciones elementales (FX-R01). */
    readonly reactions: ReactionFx;
    private readonly occlusion: OcclusionController;
    readonly arrows: ArrowFx;
    private readonly occlusionDef: FxDef['occlusion'];
    /** Punto del suelo bajo el cursor (lo pone `main`); para apuntar los efectos. */
    cursorGround: () => { x: number; y: number } | null = () => null;
    /** Eventos de animación del último fotograma (jugador y enemigos). */
    animEvents: AnimEvent[] = [];
    private readonly marker: Mesh;
    private readonly tmp = new Vector3();
    readonly chasers: ChaserView;
    readonly enemies: EnemyView;
    /** Alcance de los modelos de enemigos fuera y dentro (`data/detail.json`). */
    private readonly enemyDetail: DetailDef['enemies'];
    private readonly enemyDetailInside: DetailDef['enemies'];
    private pathLine: LinesMesh | null = null;
    private drawnPath: unknown = null;
    private drawnPathLen = 0;
    /** Dibuja el camino del jugador (depuración, tecla L). */
    showPath = true;
    /** Números de daño y curación flotantes. */
    showDamageNumbers = true;
    /** Cartel de nombre y nivel sobre los enemigos. */
    showEnemyLabels = true;
    private fxaa: FxaaPostProcess | null = null;
    private paint: PaintStyle | null = null;
    /** Revelado de la imagen (LUZ-01): curva de tono, contraste, color y viñeta. */
    readonly sceneLook: SceneLook;
    /** JUG-03: pausa de impacto y sacudida de cámara. */
    readonly hitPause: HitPauseController;
    private readonly msaa: boolean;
    private renderScale = 1;

    constructor(canvas: HTMLCanvasElement, data: GameData, overworld: Overworld, opts: ArenaViewOptions = {}) {
        this.msaa = opts.msaa ?? true;
        this.engine = new Engine(
            canvas,
            this.msaa,
            { preserveDrawingBuffer: false, stencil: false, powerPreference: 'high-performance' },
            true,
        );
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.106, 0.114, 0.133, 1);
        this.scene.skipPointerMovePicking = true; // el picking se hace a mano, sólo cuando hace falta

        this.rig = new CameraRig(this.scene, data.camera);

        const z = data.zone;
        this.heights = overworld.heights;
        useLinearFog(this.scene);
        const biomes = overworld.vegetation.biomes;
        this.terrain = new TerrainView(
            this.scene,
            overworld.def,
            overworld.heights,
            overworld.detail.terrain,
            (x, z) => groundTintAt(biomes, x, z),
            overworld.stream,
        );
        this.ground = this.terrain.root;
        const shape = atlasToShape(overworld.stream.ctx);
        this.groundExact = { sample: (x, z) => terrainHeight(overworld.def, x, z, shape) };
        this.far = new FarWorldView(this.scene, overworld.atlas, overworld.def, this.ground, {
            bounds: overworld.stream.ctx.bounds,
            height: (x, z) => terrainHeight(overworld.def, x, z, shape),
        });
        this.sea = new SeaView(this.scene, overworld.atlas.seaLevel, this.ground);
        this.stream = overworld.stream;
        this.vegetation = buildVegetation(this.scene, overworld, overworld.detail);

        // Personajes: procedurales o glTF según data/assets.json.
        const chars = overworld.characters;
        this.chars = chars;
        this.assets = new AssetCache(this.scene, chars.assets);
        const playerEntry = chars.assets['player'];
        if (!playerEntry) throw new Error('[assets] falta la entrada «player»');
        this.player = new PlayerAvatar(
            this.scene,
            createCharacter(this.scene, 'player', 'player', playerEntry, chars.animation, this.assets),
            this.heights,
        );
        const fx = loadFx();
        const spellProfiles = loadSpellFx();
        this.spellFx = new SpellFx(
            this.scene,
            fx,
            this.heights,
            () => this.cursorGround(),
            (out) => this.player.model.socket('handR', out),
            spellProfiles,
        );

        this.marker = MeshBuilder.CreateTorus(
            'moveMarker',
            { diameter: 0.8, thickness: 0.06, tessellation: 24 },
            this.scene,
        );
        this.marker.material = solidMaterial(this.scene, 'markerMat', [0.95, 0.85, 0.3]);
        this.marker.isPickable = false;
        this.marker.isVisible = false;

        this.chasers = new ChaserView(this.scene, data.loadTest.radius);
        this.atmosphere = new Atmosphere(
            this.scene,
            overworld.lighting,
            this.vegetation.lamps,
            this.vegetation.lanternMaterial,
        );
        this.sceneLook = new SceneLook(this.scene, this.rig.camera);
        this.hitPause = new HitPauseController();
        this.atmosphere.addCasters([...this.vegetation.casters, ...this.player.model.meshes]);
        this.vegetation.bindShadows(this.atmosphere);
        this.ambient = new AmbientView(this.scene, overworld, this.atmosphere);
        this.mountView = new MountView(this.scene, this.atmosphere);
        this.enemies = new EnemyView(this.scene, { ...chars, cache: this.assets, shadows: this.atmosphere });
        this.enemyDetail = loadWorldData().detail.enemies;
        this.enemyDetailInside = { ...this.enemyDetail, ...this.enemyDetail.inside };
        this.enemies.detail = this.enemyDetail;
        this.enemies.ground = this.heights;
        this.pets = new PetView(
            this.scene,
            { ...chars, cache: this.assets },
            this.heights,
            this.atmosphere,
            this.spellFx.bursts,
        );
        this.statusFx = new StatusFx(
            this.scene,
            fx,
            this.heights,
            (id) => this.enemies.heightOf(id) ?? this.heightOfOther(id),
        );
        this.floating = new FloatingText(this.scene, fx, this.spellFx.bursts);
        this.reactions = new ReactionFx(this.scene, this.floating);
        this.occlusion = new OcclusionController(this.engine, fx.occlusion.fadeSeconds);
        this.occlusionDef = fx.occlusion;
        this.arrows = new ArrowFx(this.scene, fx, this.heights, (id, out) => this.enemies.socketOf(id, 'handL', out));
        this.rig.ground = this.heights;
        this.rig.blockers = this.vegetation.solids;
    }

    /**
     * Aplica la calidad gráfica sin reconstruir la escena: sombras (tamaño y
     * filtrado del mapa), densidad de la vegetación decorativa (número de thin
     * instances por trozo), plano lejano + niebla mínima, partículas, resolución
     * interna (escalado del lienzo), FXAA y recorte de oclusión.
     */
    applyGraphics(g: GraphicsQuality): void {
        this.atmosphere.setShadowQuality(g.shadows);
        this.vegetation.setDensity(g.vegetationDensity);
        this.ambient.setDensity(g.vegetationDensity);
        // El plano lejano llega a las cordilleras; lo que dibuja cada cosa lo decide su anillo.
        this.rig.camera.maxZ = FAR_PLANE;
        this.vegetation.setRange(g.viewDistance / REFERENCE_VIEW);
        this.ambient.setRange(g.viewDistance / REFERENCE_VIEW);
        // Niebla exponencial al ~95 % en el plano lejano: exp(-(d·k)²) = 0,05 → d·k ≈ 1,73.
        this.atmosphere.minFogDensity = 1.73 / g.viewDistance;
        particleDetail.density = g.particles;
        this.setRenderScale(g.renderScale);
        // Estilo pintura antes que el FXAA, para que el contorno salga suavizado.
        const wantPaint = (g.visualStyle ?? 'pintura') === 'pintura';
        if (wantPaint && !this.paint) {
            this.fxaa?.dispose(this.rig.camera);
            this.fxaa = null;
            this.paint = new PaintStyle(this.scene, this.rig.camera);
        } else if (!wantPaint && this.paint) {
            this.paint.dispose();
            this.paint = null;
        }
        this.sceneLook.setPaintGrading(this.paint !== null);
        const wantFxaa = g.antialias === 'fxaa';
        if (wantFxaa && !this.fxaa) this.fxaa = new FxaaPostProcess('fxaa', 1, this.rig.camera);
        else if (!wantFxaa && this.fxaa) {
            this.fxaa.dispose(this.rig.camera);
            this.fxaa = null;
        }
        OcclusionPlugin.setEnabled(g.occlusionCut);
        this.sceneLook.setSamples(!wantPaint && this.msaa ? 4 : 1);
    }

    /** Resolución interna: 1 = píxeles reales de la pantalla (con su devicePixelRatio). */
    setRenderScale(scale: number): void {
        this.renderScale = scale;
        this.engine.setHardwareScalingLevel(1 / (Math.max(0.25, scale) * (window.devicePixelRatio || 1)));
    }

    /** Tras cambiar el tamaño de la ventana (o de pantalla, con otro devicePixelRatio). */
    resize(): void {
        this.setRenderScale(this.renderScale);
        this.engine.resize();
    }

    /**
     * Rayo del cursor contra el campo de alturas del terreno. Es geometría del
     * render, independiente de la rejilla de colisión de la simulación.
     */
    pickGround(screenX: number, screenY: number): { x: number; y: number } | null {
        const ray = this.scene.createPickingRay(screenX, screenY, Matrix.Identity(), this.rig.camera);
        const o = ray.origin;
        const d = ray.direction;
        const hit = this.heights.raycast(o.x, o.y, o.z, d.x, d.y, d.z, CLICK_REACH);
        return hit ? { x: hit.x, y: hit.z } : null;
    }

    /** Picking de la malla de un enemigo bajo el cursor (no usa la rejilla). */
    pickEnemy(screenX: number, screenY: number): number | null {
        const hit = this.scene.pick(
            screenX,
            screenY,
            (m) => m.isPickable && m.isEnabled() && EnemyView.enemyIdOf(m) !== null,
            false,
            this.rig.camera,
        );
        return hit?.hit ? EnemyView.enemyIdOf(hit.pickedMesh) : null;
    }

    private syncPathLine(world: World, x: number, z: number): void {
        const path = world.player.path;
        if (!this.showPath || path.length === 0) {
            if (this.pathLine) this.pathLine.isVisible = false;
            return;
        }
        if (path !== this.drawnPath || path.length !== this.drawnPathLen || !this.pathLine) {
            this.pathLine?.dispose();
            const pts = this.drapedLine([{ x, y: z }, ...path]);
            this.pathLine = MeshBuilder.CreateLines('pathLine', { points: pts }, this.scene);
            this.pathLine.color = new Color3(0.95, 0.85, 0.3);
            this.pathLine.isPickable = false;
            this.drawnPath = path;
            this.drawnPathLen = path.length;
        }
        this.pathLine.isVisible = true;
    }

    /** Polilínea pegada al terreno (un punto cada metro). */
    private drapedLine(points: ReadonlyArray<{ x: number; y: number }>): Vector3[] {
        const out: Vector3[] = [];
        for (let i = 0; i + 1 < points.length; i++) {
            const a = points[i]!;
            const b = points[i + 1]!;
            const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
            for (let k = 0; k < n; k++) {
                const px = a.x + ((b.x - a.x) * k) / n;
                const pz = a.y + ((b.y - a.y) * k) / n;
                out.push(new Vector3(px, this.heights.sample(px, pz) + 0.08, pz));
            }
        }
        const last = points[points.length - 1]!;
        out.push(new Vector3(last.x, this.heights.sample(last.x, last.y) + 0.08, last.y));
        return out;
    }

    /** Respuesta visual a los sucesos del último fotograma. */
    handleEvents(world: World, events: readonly GameEvent[]): void {
        this.player.entityId = world.player.id;
        for (const e of events) {
            this.player.onGameEvent(e);
            if (e.type === 'damage' && !e.toPlayer) this.enemies.flashHit(e.targetId);
            // JUG-03: activar pausa de impacto y sacudida al recibir/infligir daño.
            if (e.type === 'damage') {
                this.hitPause.trigger(e.amount, e.crit);
            }
        }
        this.spellFx.handleEvents(world, events);
        this.arrows.handleEvents(world, events);
        // Números flotantes y subida de nivel.
        const at = this.tmp;
        const heightOf = (id: number): number => this.enemies.heightOf(id) ?? this.heightOfOther(id);
        for (const e of events) {
            if (e.type === 'damage') {
                if (this.showDamageNumbers && this.spellFx.entityPos(world, e.targetId, at, heightOf(e.targetId) + 0.3))
                    this.floating.damage(e.amount, e.crit, e.toPlayer, at);
            } else if (
                e.type === 'heal' &&
                this.showDamageNumbers &&
                e.amount >= 1 &&
                this.spellFx.entityPos(world, e.targetId, at, heightOf(e.targetId) + 0.3)
            )
                this.floating.heal(e.amount, at);
            else if (e.type === 'levelUp' && this.spellFx.entityPos(world, world.player.id, at, 0))
                this.floating.levelUp(e.level, at.clone(), this.player.model.height);
            else if (e.type === 'reaction' && this.spellFx.entityPos(world, e.targetId, at, heightOf(e.targetId) + 0.6))
                this.reactions.play(e.reactionId, at);
        }
    }

    /** Quita todo lo que dependa de una partida (reinicio). */
    resetRun(): void {
        this.enemies.dispose();
        this.spellFx.reset();
        this.statusFx.reset();
        this.pets.reset();
        this.floating.reset();
        this.reactions.reset();
        this.arrows.reset();
        this.player.reset();
        this.hitPause.reset();
    }

    /**
     * Aspecto del jugador según su clase (paleta y `looks` de data/assets.json) y
     * lo que lleva en las manos. Si cambia (otra partida, otra arma, escudo
     * puesto o quitado) se rehace el modelo; si no, no cuesta nada.
     */
    syncPlayerLook(ch: Character): void {
        const spec = playerLookSpec(ch, this.chars);
        if (!spec) return;
        const { assetId, entry, palette, look, colors, key } = spec;
        if (key === this.playerLookKey) return;
        this.playerLookKey = key;
        const m = createCharacter(
            this.scene,
            assetId,
            'player',
            entry,
            this.chars.animation,
            this.assets,
            palette,
            look,
            colors,
        );
        const old = this.player.replaceModel(m);
        this.atmosphere.removeCasters(old.meshes);
        old.dispose();
        if (m.ready) void m.ready.then(() => this.atmosphere.addCasters(m.meshes));
        else this.atmosphere.addCasters(m.meshes);
    }

    sync(world: World, alpha: number, frameSeconds: number, simulationRunning = true): void {
        this.syncPlayerLook(world.character);
        const p = world.player;
        const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
        const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
        // En vuelo, la montura y el jinete suben sobre el suelo (la cámara los sigue).
        const y = this.heights.sample(x, z) + (p.flight?.altitude ?? 0);
        // MUE-03: cuando el jugador es espectral, la montura no se ve.
        const isSpectral = world.character.spectral.active;
        const mount = isSpectral ? null : world.character.equipment.get('mount');
        const baseLook = mount ? (world.content.items[mount.itemId]?.mount ?? null) : null;
        // La apariencia elegida en el inventario (`look`) cambia el color, no el modelo: una variante de
        // la paleta, el camuflaje (la ropa del jinete) o un color fijo.
        const chosen = mount?.look ?? baseLook?.variant;
        const colors =
            baseLook?.model && chosen
                ? customMountColors(chosen, mountBasePalette(baseLook.model), world.character.appearance)
                : null;
        const variant = chosen && isCustomMountLook(chosen) ? baseLook?.variant : chosen;
        const look: MountRenderLook | null = !baseLook
            ? null
            : colors
              ? { ...baseLook, variant, colors }
              : variant !== baseLook.variant
                ? { ...baseLook, variant }
                : baseLook;
        const ride = this.mountView.sync(
            mount ? `${mount.itemId}#${variant ?? ''}#${colors ? Object.values(colors).join(',') : ''}` : null,
            look,
            x,
            y,
            z,
            this.player.model.root.rotation.y,
            (p.path.length > 0 || (!!p.flight && (p.pos.x !== p.prevPos.x || p.pos.y !== p.prevPos.y))) &&
                simulationRunning,
            frameSeconds,
            !!p.flight,
        );
        // Sentado: la cadera baja hasta la silla. Cada montura define su fracción (seatDrop);
        // sin ella usa el valor por defecto (RIDE_SEAT_DROP = 0.42).
        const seat = look ? this.player.model.height * (look.seatDrop ?? RIDE_SEAT_DROP) : 0;
        this.animEvents = this.player.sync(p, x, y + ride - seat, z, frameSeconds, simulationRunning, look !== null);
        this.spellFx.sync(world, frameSeconds);
        this.pets.sync(world, alpha, frameSeconds);
        this.statusFx.sync(world, frameSeconds);
        this.floating.update(frameSeconds);
        this.reactions.update(frameSeconds);
        if (p.moveTarget) {
            this.marker.isVisible = true;
            this.marker.position.set(
                p.moveTarget.x,
                this.heights.sample(p.moveTarget.x, p.moveTarget.y) + 0.05,
                p.moveTarget.y,
            );
        } else {
            this.marker.isVisible = false;
        }
        this.syncPathLine(world, x, z);
        const focus = this.rig.camera.position;
        this.vegetation.update(frameSeconds, p.pos.x, p.pos.y);
        this.ambient.update(frameSeconds, p.pos.x, p.pos.y);
        if (this.ground.isEnabled()) {
            // En vuelo se ve más lejos: más páginas cargadas, plano lejano más allá y menos bruma.
            const alt = p.flight?.altitude ?? 0;
            this.stream.scale = 1 + Math.min(0.75, alt / 40);
            this.atmosphere.altitude = alt;
            this.rig.camera.maxZ = FAR_PLANE + alt * 25;
            this.stream.update(p.pos.x, p.pos.y);
            this.terrain.update(p.pos.x, p.pos.y);
            this.sea.update(p.pos.x, p.pos.y, frameSeconds);
            const light = this.atmosphere.state;
            this.far.update(focus, light.haze, Math.min(1, light.sun * 0.7 + light.ambient * 0.6));
        }
        this.chasers.sync(world.chasers.list, alpha, this.heights);
        this.enemies.targetId = p.attackTarget ?? p.lastTarget;
        this.enemies.focus = p.pos;
        // Dentro se ve menos lejos: los modelos de más allá sólo gastarían animación.
        this.enemies.detail = world.interior ? this.enemyDetailInside : this.enemyDetail;
        // En una pelea grande, un cartel por criatura tapa tanto a los modelos como
        // a los avisos de ataque. El HUD superior ya resume el grupo completo: en
        // el mundo dejamos el objetivo y las amenazas más cercanas como referencia.
        const labelIds = visibleEnemyLabelIds(world.enemies.list, p.pos, this.enemies.targetId);
        this.enemies.sync(
            world.enemies.list,
            alpha,
            frameSeconds,
            !this.showEnemyLabels
                ? null
                : (e) => {
                      if (!labelIds.has(e.id)) return null;
                      // Nombre y nivel; el color dice cuánto se aleja del nivel del jugador.
                      const name = world.content.enemies[e.def.id]?.name;
                      return name
                          ? {
                                text: tr(`${name} · niv. ${e.level}`),
                                color: levelColor(e.level - world.character.level, world.data.zones.levelColors),
                            }
                          : null;
                  },
        );
        this.animEvents.push(...this.enemies.animEvents);
        this.arrows.update(world, frameSeconds);
        this.tmp.set(x, y, z);
        this.atmosphere.cameraDistance = this.rig.viewDistance;
        this.atmosphere.update(frameSeconds, this.tmp, world.timeOfDay);
        // Encuadre de combate y automático encuadran a quien pelea contigo; cerca de 18 m.
        this.rig.threats =
            this.rig.mode === 'manual' || this.rig.mode === 'semiAuto' || this.rig.mode === 'zone'
                ? []
                : world.enemies.list
                      .filter(
                          (e) => e.state !== 'dead' && e.state !== 'idle' && Math.hypot(e.pos.x - x, e.pos.y - z) < 18,
                      )
                      .map((e) => ({ x: e.pos.x, z: e.pos.y, radius: e.radius }));
        this.rig.update(this.tmp, frameSeconds);
        // JUG-03: actualizar pausa de impacto y aplicar sacudida a la cámara.
        this.hitPause.update(frameSeconds);
        {
            const hs = this.hitPause.state;
            // Desplazar la cámara según la sacudida.
            if (hs.shakeIntensity > 0.001) {
                const cp = this.rig.camera.position;
                cp.x += hs.shakeOffset.x;
                cp.z += hs.shakeOffset.z;
            }
        }
        this.updateOcclusion(world, x, y, z, frameSeconds);
        // JL-71: en Manual/Semiautomático, los obstáculos que tapan al personaje
        // se recortan más para que se le vea a través de ellos.
        this.updateOccludingBlockers(x, y, z, frameSeconds);
    }

    /**
     * JL-71: Cuando un obstáculo tapa al personaje en modo Manual, se añade un círculo
     * de oclusión extra en la posición del obstáculo para que el recorte de oclusión
     * existente (OcclusionPlugin) haga un "hoyo" más grande, dejando ver al personaje.
     * La transición es suave: el radio crece y decrece con fadeRate.
     */
    private occludingExtraRadius = 0;
    private updateOccludingBlockers(x: number, y: number, z: number, dt: number): void {
        const indices = this.rig.occludingBlockerIndices;
        const blockers = this.rig.blockers;
        const fadeRate = this.rig.occludingFadeRate;
        const step = dt * fadeRate;

        if (indices.length === 0) {
            // Sin blockers ocluyentes: reducimos el radio extra.
            this.occludingExtraRadius = Math.max(0, this.occludingExtraRadius - step);
            return;
        }

        // Calculamos el radio necesario: el mayor ancho de los blockers ocluyentes.
        let maxHalfWidth = 0;
        for (const idx of indices) {
            const b = blockers[idx];
            if (b) maxHalfWidth = Math.max(maxHalfWidth, b.hw, b.hd);
        }
        // Radio suficiente para recortar el obstáculo completo alrededor del personaje.
        const targetRadius = Math.max(maxHalfWidth * 1.5, 2);
        this.occludingExtraRadius = Math.min(targetRadius, this.occludingExtraRadius + step);
    }

    /** Círculos de recorte: el jugador, su objetivo y los enemigos vivos más cercanos. */
    private updateOcclusion(world: World, x: number, y: number, z: number, dt: number): void {
        const o = this.occlusionDef;
        const targets: OcclusionTarget[] = [];
        // JL-71: en modo Manual/Semiautomático, el radio de oclusión del jugador crece
        // cuando un obstáculo lo tapa, para que el recorte de oclusión haga un "hoyo"
        // más grande y se vea al personaje a través del obstáculo.
        const playerRadius = o.playerRadius + this.occludingExtraRadius;
        if (playerRadius > 0) targets.push({ x, y: y + this.player.model.height * 0.5, z, radius: playerRadius });
        const p = world.player;
        for (const e of occlusionPicks(
            world.enemies.list,
            { x, y: z },
            p.attackTarget ?? p.lastTarget,
            o.enemyRange,
            o.maxEnemies,
        )) {
            const h = this.enemies.heightOf(e.id) ?? 1;
            targets.push({
                x: e.pos.x,
                y: this.heights.sample(e.pos.x, e.pos.y) + h * 0.5,
                z: e.pos.y,
                radius: o.enemyRadius,
            });
        }
        this.occlusion.update(this.rig.camera, targets, dt);
    }

    /** Altura del mar ahora mismo, con su oleaje (para lo que flota). */
    get seaY(): number {
        return this.sea.surfaceY;
    }

    /** Altura de quien no es enemigo: una mascota o, si no, el jugador. */
    heightOfOther = (id: number): number => this.pets.heightOf(id) ?? this.player.model.height;

    render(): void {
        this.scene.render();
    }
}
