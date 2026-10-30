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
import type { HeightField } from '../world/terrain';
import { CameraRig } from './cameraRig';
import { ChaserView } from './chaserView';
import { EnemyView } from './enemyView';
import { levelColor } from '../sim/zones';
import { loadFx } from '../data/fxSchema';
import { SpellFx } from './fx/spellFx';
import { StatusFx } from './fx/statusFx';
import { FloatingText } from './fx/floatingText';
import { ArrowFx } from './fx/arrowFx';
import { OcclusionController, OcclusionPlugin, type OcclusionTarget } from './occlusion';
import { particleDetail } from './fx/particles';
import type { FxDef } from '../data/fxSchema';
import { PetView } from './petView';
import { solidMaterial } from './materials';
import { AssetCache } from './assetCache';
import { Atmosphere } from './atmosphere';
import { createCharacter } from './characters/characterModel';
import { PlayerAvatar } from './characters/playerAvatar';
import type { AnimEvent } from '../world/anim';
import { lookFor, lookKey, withGear } from '../world/look';
import type { Character } from '../rpg/character';
import type { AnimationDataDef, AssetManifest } from '../data/worldSchema';
import { buildTerrain } from './terrainView';
import { buildVegetation, type VegetationView } from './vegetationView';

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
}

/** Lo que se decide al crear el motor (no se puede cambiar después). */
export interface ArenaViewOptions {
  /** MSAA del contexto WebGL. */
  msaa?: boolean;
}

export class ArenaView {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly rig: CameraRig;
  readonly ground: Mesh;
  readonly heights: HeightField;
  readonly vegetation: VegetationView;
  readonly atmosphere: Atmosphere;
  readonly assets: AssetCache;
  readonly player: PlayerAvatar;
  private readonly chars: { assets: AssetManifest; animation: AnimationDataDef };
  /** Paleta y aspecto con los que está hecho el modelo del jugador (clave de `syncPlayerLook`). */
  private playerLookKey = 'default';
  readonly spellFx: SpellFx;
  readonly statusFx: StatusFx;
  readonly pets: PetView;
  readonly floating: FloatingText;
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
  private renderScale = 1;

  constructor(canvas: HTMLCanvasElement, data: GameData, overworld: Overworld, opts: ArenaViewOptions = {}) {
    this.engine = new Engine(canvas, opts.msaa ?? true, { preserveDrawingBuffer: false, stencil: false }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.106, 0.114, 0.133, 1);
    this.scene.skipPointerMovePicking = true; // el picking se hace a mano, sólo cuando hace falta

    this.rig = new CameraRig(this.scene, data.camera);

    const z = data.zone;
    this.heights = overworld.heights;
    this.ground = buildTerrain(this.scene, overworld.def, overworld.heights).mesh;
    this.vegetation = buildVegetation(this.scene, overworld);

    // Personajes: procedurales o glTF según data/assets.json.
    const chars = overworld.characters;
    this.chars = chars;
    this.assets = new AssetCache(this.scene, chars.assets);
    const playerEntry = chars.assets['player'];
    if (!playerEntry) throw new Error('[assets] falta la entrada «player»');
    this.player = new PlayerAvatar(this.scene, createCharacter(this.scene, 'player', 'player', playerEntry, chars.animation, this.assets), this.heights);
    const fx = loadFx();
    this.spellFx = new SpellFx(this.scene, fx, this.heights, () => this.cursorGround(), (out) => this.player.model.socket('handR', out));

    this.marker = MeshBuilder.CreateTorus('moveMarker', { diameter: 0.8, thickness: 0.06, tessellation: 24 }, this.scene);
    this.marker.material = solidMaterial(this.scene, 'markerMat', [0.95, 0.85, 0.3]);
    this.marker.isPickable = false;
    this.marker.isVisible = false;

    this.chasers = new ChaserView(this.scene, data.loadTest.radius);
    this.atmosphere = new Atmosphere(this.scene, overworld.lighting, this.vegetation.lamps, this.vegetation.lanternMaterial);
    this.atmosphere.addCasters([...this.vegetation.casters, ...this.player.model.meshes]);
    this.enemies = new EnemyView(this.scene, { ...chars, cache: this.assets, shadows: this.atmosphere });
    this.enemies.ground = this.heights;
    this.pets = new PetView(this.scene, { ...chars, cache: this.assets }, this.heights, this.atmosphere, this.spellFx.bursts);
    this.statusFx = new StatusFx(this.scene, fx, this.heights, (id) => this.enemies.heightOf(id) ?? this.heightOfOther(id));
    this.floating = new FloatingText(this.scene, fx, this.spellFx.bursts);
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
    this.rig.camera.maxZ = g.viewDistance;
    // Niebla exponencial al ~95 % en el plano lejano: exp(-(d·k)²) = 0,05 → d·k ≈ 1,73.
    this.atmosphere.minFogDensity = 1.73 / g.viewDistance;
    particleDetail.density = g.particles;
    this.setRenderScale(g.renderScale);
    const wantFxaa = g.antialias === 'fxaa';
    if (wantFxaa && !this.fxaa) this.fxaa = new FxaaPostProcess('fxaa', 1, this.rig.camera);
    else if (!wantFxaa && this.fxaa) {
      this.fxaa.dispose(this.rig.camera);
      this.fxaa = null;
    }
    OcclusionPlugin.setEnabled(g.occlusionCut);
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
    const hit = this.heights.raycast(o.x, o.y, o.z, d.x, d.y, d.z, this.rig.camera.maxZ);
    return hit ? { x: hit.x, y: hit.z } : null;
  }

  /** Picking de la malla de un enemigo bajo el cursor (no usa la rejilla). */
  pickEnemy(screenX: number, screenY: number): number | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && EnemyView.enemyIdOf(m) !== null, false, this.rig.camera);
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
    for (const e of events) {
      this.player.onGameEvent(e);
      if (e.type === 'damage' && !e.toPlayer) this.enemies.flashHit(e.targetId);
    }
    this.spellFx.handleEvents(world, events);
    this.arrows.handleEvents(world, events);
    // Números flotantes y subida de nivel.
    const at = this.tmp;
    const heightOf = (id: number): number => this.enemies.heightOf(id) ?? this.heightOfOther(id);
    for (const e of events) {
      if (e.type === 'damage') {
        if (this.showDamageNumbers && this.spellFx.entityPos(world, e.targetId, at, heightOf(e.targetId) + 0.3)) this.floating.damage(e.amount, e.crit, e.toPlayer, at);
      } else if (e.type === 'heal' && this.showDamageNumbers && e.amount >= 1 && this.spellFx.entityPos(world, e.targetId, at, heightOf(e.targetId) + 0.3)) this.floating.heal(e.amount, at);
      else if (e.type === 'levelUp' && this.spellFx.entityPos(world, world.player.id, at, 0)) this.floating.levelUp(e.level, at.clone(), this.player.model.height);
    }
  }

  /** Quita todo lo que dependa de una partida (reinicio). */
  resetRun(): void {
    this.enemies.dispose();
    this.spellFx.reset();
    this.statusFx.reset();
    this.pets.reset();
    this.floating.reset();
    this.arrows.reset();
    this.player.reset();
  }

  /**
   * Aspecto del jugador según su clase (paleta y `looks` de data/assets.json) y
   * lo que lleva en las manos. Si cambia (otra partida, otra arma, escudo
   * puesto o quitado) se rehace el modelo; si no, no cuesta nada.
   */
  syncPlayerLook(ch: Character): void {
    const entry = this.chars.assets['player'];
    if (entry?.kind !== 'procedural') return;
    const classId = ch.classDef.id;
    const palette = entry.palettes[classId] ? classId : 'default';
    const look = withGear(lookFor(entry.looks, classId), entry.gear, ch.weapon()?.id ?? null, ch.equipment.get('offhand')?.itemId ?? null);
    const key = `${palette}|${lookKey(look)}`;
    if (key === this.playerLookKey) return;
    this.playerLookKey = key;
    const m = createCharacter(this.scene, 'player', 'player', entry, this.chars.animation, this.assets, palette, look);
    const old = this.player.replaceModel(m);
    this.atmosphere.removeCasters(old.meshes);
    old.dispose();
    this.atmosphere.addCasters(m.meshes);
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    this.syncPlayerLook(world.character);
    const p = world.player;
    const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
    const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
    const y = this.heights.sample(x, z);
    this.animEvents = this.player.sync(p, x, y, z, frameSeconds);
    this.spellFx.sync(world, frameSeconds);
    this.pets.sync(world, alpha, frameSeconds);
    this.statusFx.sync(world, frameSeconds);
    this.floating.update(frameSeconds);
    if (p.moveTarget) {
      this.marker.isVisible = true;
      this.marker.position.set(p.moveTarget.x, this.heights.sample(p.moveTarget.x, p.moveTarget.y) + 0.05, p.moveTarget.y);
    } else {
      this.marker.isVisible = false;
    }
    this.syncPathLine(world, x, z);
    this.vegetation.update(frameSeconds);
    this.chasers.sync(world.chasers.list, alpha, this.heights);
    this.enemies.targetId = p.attackTarget ?? p.lastTarget;
    this.enemies.sync(world.enemies.list, alpha, frameSeconds, !this.showEnemyLabels ? null : (e) => {
      // Nombre y nivel; el color dice cuánto se aleja del nivel del jugador.
      const name = world.content.enemies[e.def.id]?.name;
      return name ? { text: `${name} · niv. ${e.level}`, color: levelColor(e.level - world.character.level, world.data.zones.levelColors) } : null;
    });
    this.animEvents.push(...this.enemies.animEvents);
    this.arrows.update(world, frameSeconds);
    this.tmp.set(x, y, z);
    this.atmosphere.update(frameSeconds, this.tmp);
    this.rig.update(this.tmp, frameSeconds);
    this.updateOcclusion(world, x, y, z, frameSeconds);
  }

  /** Círculos de recorte: el jugador y los enemigos vivos más cercanos. */
  private updateOcclusion(world: World, x: number, y: number, z: number, dt: number): void {
    const o = this.occlusionDef;
    const targets: OcclusionTarget[] = [];
    if (o.playerRadius > 0) targets.push({ x, y: y + this.player.model.height * 0.5, z, radius: o.playerRadius });
    const near = world.enemies.list
      .filter((e) => e.state !== 'dead')
      .map((e) => ({ e, d: Math.hypot(e.pos.x - x, e.pos.y - z) }))
      .filter((c) => c.d <= o.enemyRange)
      .sort((a, b) => a.d - b.d)
      .slice(0, o.maxEnemies);
    for (const { e } of near) {
      const h = this.enemies.heightOf(e.id) ?? 1;
      targets.push({ x: e.pos.x, y: this.heights.sample(e.pos.x, e.pos.y) + h * 0.5, z: e.pos.y, radius: o.enemyRadius });
    }
    this.occlusion.update(this.rig.camera, targets, dt);
  }

  /** Altura de quien no es enemigo: una mascota o, si no, el jugador. */
  heightOfOther = (id: number): number => this.pets.heightOf(id) ?? this.player.model.height;

  render(): void {
    this.scene.render();
  }
}
