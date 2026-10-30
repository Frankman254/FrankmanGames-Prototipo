// Enemigos y avisos (telegraph). Cada arquetipo se dibuja con el personaje
// animado de `enemy.<arquetipo>` en data/assets.json (silueta procedural o
// glTF); si no hay entrada, un humanoide con el color de `look`. El aviso es el
// área exacta que la simulación va a resolver, con un relleno que crece hasta
// el golpe, y la animación de ataque se acompasa para golpear al acabar el aviso.
// Encima de la barra, un cartel con nombre y nivel (color según la diferencia
// de nivel con el jugador; lo decide quien llama a `sync`).
import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { ShapeDef } from '../data/schema';
import type { AnimationDataDef, AssetEntry, AssetManifest } from '../data/worldSchema';
import type { Enemy, EnemyState } from '../sim/enemies';
import type { PlacedShape } from '../sim/shapes';
import type { AnimEvent } from '../world/anim';
import type { AssetCache } from './assetCache';
import { createCharacter, type CharacterModel } from './characters/characterModel';

interface EnemyVisual {
  model: CharacterModel;
  /** Cápsula invisible para el picking (las piezas del modelo no son pickables). */
  proxy: Mesh;
  barBg: Mesh;
  barFill: Mesh;
  height: number;
  lastState: EnemyState | null;
  /** Cartel de nombre y nivel (se crea con el primer texto). */
  plate: { mesh: Mesh; tex: DynamicTexture; mat: StandardMaterial; key: string } | null;
}

/** Texto y color CSS del cartel de un enemigo, o null para no enseñarlo. */
export type EnemyLabel = (e: Enemy) => { text: string; color: string } | null;

export interface EnemyCharacters {
  assets: AssetManifest;
  animation: AnimationDataDef;
  cache: AssetCache;
  /** Registro de sombras (se añaden y quitan al nacer y desaparecer). */
  shadows: { addCasters(m: readonly AbstractMesh[]): void; removeCasters(m: readonly AbstractMesh[]): void };
}

interface TelegraphVisual {
  shape: PlacedShape;
  node: TransformNode;
  fill: Mesh;
}

const BAR_WIDTH = 1;
const PLATE_W = 512;
const PLATE_H = 80;

export class EnemyView {
  private readonly visuals = new Map<number, EnemyVisual>();
  private readonly telegraphs = new Map<number, TelegraphVisual>();
  /** Segundos de destello por golpe recibido, por id. */
  private readonly hitFlash = new Map<number, number>();
  private readonly outlineMat: StandardMaterial;
  private readonly fillMat: StandardMaterial;
  private readonly summonMat: StandardMaterial;
  private readonly barBgMat: StandardMaterial;
  private readonly barFillMat: StandardMaterial;

  /** Eventos de animación del último `sync` (hit, cast, footstep). */
  animEvents: AnimEvent[] = [];
  private readonly proxyMat: StandardMaterial;

  constructor(private readonly scene: Scene, private readonly chars: EnemyCharacters | null = null) {
    this.proxyMat = flatMaterial(scene, 'enemyProxy', [1, 1, 1], 0);
    this.outlineMat = flatMaterial(scene, 'teleOutline', [0.95, 0.25, 0.2], 0.25);
    this.fillMat = flatMaterial(scene, 'teleFill', [1, 0.35, 0.2], 0.55);
    this.summonMat = flatMaterial(scene, 'teleSummon', [0.7, 0.4, 1], 0.45);
    this.barBgMat = flatMaterial(scene, 'barBg', [0.1, 0.1, 0.1], 0.8);
    this.barFillMat = flatMaterial(scene, 'barFill', [0.9, 0.2, 0.2], 1);
  }

  /** Malla pickable → id de enemigo. */
  static enemyIdOf(mesh: { metadata?: unknown } | null | undefined): number | null {
    const md = mesh?.metadata as { enemyId?: number } | undefined;
    return typeof md?.enemyId === 'number' ? md.enemyId : null;
  }

  private entryFor(e: Enemy): AssetEntry {
    const entry = this.chars?.assets[`enemy.${e.def.id}`];
    if (entry) return entry;
    // Sin entrada en el manifiesto: humanoide con el color del arquetipo.
    const c = e.def.look.color;
    const dark: [number, number, number] = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
    return { kind: 'procedural', model: 'humanoid', scale: e.def.look.height / 1.8, palettes: { default: { skin: c, cloth: dark, trim: c, hair: dark, gear: c } }, ghost: false, looks: {}, gear: {} };
  }

  private create(e: Enemy): EnemyVisual {
    const r = e.radius;
    if (!this.chars) throw new Error('EnemyView: faltan los datos de personajes');
    const model = createCharacter(this.scene, `enemy.${e.def.id}`, `enemy${e.id}`, this.entryFor(e), this.chars.animation, this.chars.cache);
    this.chars.shadows.addCasters(model.meshes);
    const h = Math.max(model.height, 0.6);
    const proxy = MeshBuilder.CreateCapsule(`enemyHit${e.id}`, { radius: Math.max(r, 0.3), height: Math.max(h, 2 * Math.max(r, 0.3)), tessellation: 8 }, this.scene);
    proxy.parent = model.root;
    proxy.position.y = h / 2;
    proxy.material = this.proxyMat;
    proxy.isVisible = false;
    proxy.isPickable = true;
    proxy.metadata = { enemyId: e.id };

    const barBg = MeshBuilder.CreatePlane(`barBg${e.id}`, { width: BAR_WIDTH, height: 0.12 }, this.scene);
    barBg.billboardMode = Mesh.BILLBOARDMODE_ALL;
    barBg.material = this.barBgMat;
    barBg.isPickable = false;
    const barFill = MeshBuilder.CreatePlane(`barFill${e.id}`, { width: BAR_WIDTH, height: 0.1 }, this.scene);
    barFill.billboardMode = Mesh.BILLBOARDMODE_ALL;
    barFill.material = this.barFillMat;
    barFill.isPickable = false;
    const v: EnemyVisual = { model, proxy, barBg, barFill, height: h, lastState: null, plate: null };
    this.visuals.set(e.id, v);
    return v;
  }

  /** Posición en el mundo de una articulación del modelo de un enemigo (p. ej. su arco), o null. */
  socketOf(id: number, joint: string, out: Vector3): Vector3 | null {
    const v = this.visuals.get(id);
    return v ? v.model.socket(joint, out) : null;
  }

  /** Altura del modelo de un enemigo, o null si no está en pantalla. */
  heightOf(id: number): number | null {
    return this.visuals.get(id)?.height ?? null;
  }

  flashHit(id: number): void {
    this.hitFlash.set(id, 0.12);
  }

  /** Altura del suelo (terreno del Slice 02); sin ella, plano y = 0. */
  ground: { sample(x: number, z: number): number } | null = null;

  private groundY(x: number, z: number): number {
    return this.ground ? this.ground.sample(x, z) : 0;
  }

  /** Dibuja (o redibuja si cambió) el cartel de nombre y nivel. */
  private syncPlate(e: Enemy, v: EnemyVisual, label: { text: string; color: string } | null, x: number, y: number, z: number): void {
    if (!label) {
      v.plate?.mesh.setEnabled(false);
      return;
    }
    if (!v.plate) {
      const tex = new DynamicTexture(`enemyPlateTex${e.id}`, { width: PLATE_W, height: PLATE_H }, this.scene, true);
      tex.hasAlpha = true;
      const mat = new StandardMaterial(`enemyPlateMat${e.id}`, this.scene);
      mat.diffuseTexture = tex;
      mat.emissiveColor = Color3.White();
      mat.disableLighting = true;
      mat.useAlphaFromDiffuseTexture = true;
      mat.backFaceCulling = false;
      const mesh = MeshBuilder.CreatePlane(`enemyPlate${e.id}`, { width: 2.4, height: (2.4 * PLATE_H) / PLATE_W }, this.scene);
      mesh.material = mat;
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.isPickable = false;
      v.plate = { mesh, tex, mat, key: '' };
    }
    const p = v.plate;
    const key = `${label.text}|${label.color}`;
    if (p.key !== key) {
      p.key = key;
      const ctx = p.tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, PLATE_W, PLATE_H);
      ctx.textAlign = 'center';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeText(label.text, PLATE_W / 2, 54);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, PLATE_W / 2, 54);
      p.tex.update();
    }
    p.mesh.setEnabled(true);
    p.mesh.position.set(x, y, z);
  }

  private disposePlate(v: EnemyVisual): void {
    if (!v.plate) return;
    v.plate.mesh.dispose();
    v.plate.mat.dispose();
    v.plate.tex.dispose();
    v.plate = null;
  }

  sync(list: readonly Enemy[], alpha: number, frameSeconds = 0, label: EnemyLabel | null = null): void {
    this.animEvents = [];
    const seen = new Set<number>();
    for (const e of list) {
      seen.add(e.id);
      const v = this.visuals.get(e.id) ?? this.create(e);
      const x = e.prevPos.x + (e.pos.x - e.prevPos.x) * alpha;
      const z = e.prevPos.y + (e.pos.y - e.prevPos.y) * alpha;
      const dead = e.state === 'dead';
      const gone = dead && e.stateTime >= e.def.corpseSeconds;
      const m = v.model;
      m.root.setEnabled(!gone);
      v.proxy.isPickable = !dead;
      const gy = this.groundY(x, z);
      m.root.position.set(x, gy, z);
      m.root.rotation.y = -e.facing;
      if (e.state !== v.lastState) this.enterState(e, v);
      v.lastState = e.state;
      for (const ev of m.update(frameSeconds, e.state === 'pursue' ? e.def.speed : 0)) this.animEvents.push(ev);

      // Brillo según estado: el aviso parpadea, aturdido blanquea, muerto e inactivo oscurecen.
      m.setShade(dead ? 0.35 : e.state === 'idle' ? 0.8 : 1);
      m.setEmissive(0, 0, 0);
      if (e.state === 'telegraph') {
        const blink = 0.5 + 0.5 * Math.sin(e.stateTime * 30);
        m.setEmissive(0.6 * blink, 0.15 * blink, 0.05 * blink);
      } else if (e.state === 'stagger') {
        m.setEmissive(0.35, 0.35, 0.35);
      }
      const flash = this.hitFlash.get(e.id) ?? 0;
      if (flash > 0) {
        m.setEmissive(0.8, 0.8, 0.8);
        this.hitFlash.set(e.id, flash - frameSeconds);
      }

      const showBar = !dead && e.health < e.def.maxHealth;
      v.barBg.setEnabled(showBar);
      v.barFill.setEnabled(showBar);
      if (showBar) {
        const y = gy + v.height + 0.45;
        const f = Math.max(0, e.health / e.def.maxHealth);
        v.barBg.position.set(x, y, z);
        v.barFill.position.set(x, y + 0.001, z);
        v.barFill.scaling.x = Math.max(0.001, f);
      }
      this.syncPlate(e, v, dead || !label ? null : label(e), x, gy + v.height + 0.8, z);
      this.syncTelegraph(e);
    }
    for (const [id, v] of this.visuals) {
      if (seen.has(id)) continue;
      this.chars?.shadows.removeCasters(v.model.meshes);
      v.model.dispose();
      v.barBg.dispose();
      v.barFill.dispose();
      this.disposePlate(v);
      this.visuals.delete(id);
      this.hitFlash.delete(id);
      this.disposeTelegraph(id);
    }
  }

  /** Estado de la simulación → animación. El ataque se acompasa con el aviso. */
  private enterState(e: Enemy, v: EnemyVisual): void {
    const m = v.model;
    switch (e.state) {
      case 'idle':
      case 'acquire':
        m.play('idle');
        break;
      case 'pursue':
        m.play('run');
        break;
      case 'telegraph': {
        const state = e.current.effect === 'summon' ? 'cast' : 'attack';
        const impact = m.impactTime(state) * m.clipSeconds(state);
        m.play(state, { restart: true, speed: impact / e.current.telegraphSeconds });
        break;
      }
      case 'attack':
      case 'recover':
        // Sigue el clip del aviso, ya a velocidad normal.
        if (m.state === 'attack' || m.state === 'cast') m.play(m.state, { speed: 1 });
        break;
      case 'stagger':
        m.play('hit', { restart: true });
        break;
      case 'dead':
        m.play('death');
        break;
    }
  }

  private syncTelegraph(e: Enemy): void {
    const t = e.telegraph;
    let tv = this.telegraphs.get(e.id);
    if (tv && tv.shape !== t) {
      this.disposeTelegraph(e.id);
      tv = undefined;
    }
    if (!t) return;
    if (!tv) {
      tv = this.buildTelegraph(e.id, t, e.current.effect === 'summon');
      this.telegraphs.set(e.id, tv);
    }
    const progress = Math.min(1, e.stateTime / e.current.telegraphSeconds);
    setFill(tv.fill, t.def, progress);
  }

  private buildTelegraph(id: number, s: PlacedShape, summon: boolean): TelegraphVisual {
    const node = new TransformNode(`tele${id}`, this.scene);
    node.position.set(s.origin.x, this.groundY(s.origin.x, s.origin.y) + 0.08, s.origin.y);
    const outline = shapeMesh(this.scene, `teleOut${id}`, s.def);
    outline.parent = node;
    outline.material = summon ? this.summonMat : this.outlineMat;
    const fill = shapeMesh(this.scene, `teleFill${id}`, s.def);
    fill.parent = node;
    fill.position.y += 0.01;
    fill.material = summon ? this.summonMat : this.fillMat;
    if (s.def.type === 'cone') node.rotation.y = -(s.dir - (s.def.angleDeg * Math.PI) / 360);
    else node.rotation.y = -s.dir;
    return { shape: s, node, fill };
  }

  private disposeTelegraph(id: number): void {
    const tv = this.telegraphs.get(id);
    if (!tv) return;
    tv.node.dispose(false, false);
    this.telegraphs.delete(id);
  }

  dispose(): void {
    this.sync([], 0);
  }
}

/** Malla plana de la forma en el espacio local: el eje +X es la dirección del ataque. */
export function shapeMesh(scene: Scene, name: string, def: ShapeDef): Mesh {
  let m: Mesh;
  if (def.type === 'line') {
    m = MeshBuilder.CreateGround(name, { width: def.length, height: def.width }, scene);
    m.position.x = def.length / 2;
  } else {
    const radius = def.type === 'circle' ? def.radius : def.length;
    const arc = def.type === 'cone' ? Math.min(1, def.angleDeg / 360) : 1;
    // El disco nace en el plano XY empezando en +X; girado 90° en X queda en el
    // suelo y su arco avanza de +X hacia +Z, el mismo sentido que atan2 en la sim.
    m = MeshBuilder.CreateDisc(name, { radius, arc, tessellation: 48, sideOrientation: Mesh.DOUBLESIDE }, scene);
    m.rotation.x = Math.PI / 2;
  }
  m.isPickable = false;
  return m;
}

function setFill(fill: Mesh, def: ShapeDef, progress: number): void {
  const p = Math.max(0.001, progress);
  if (def.type === 'line') {
    fill.scaling.x = p;
    fill.position.x = (def.length * p) / 2;
  } else {
    fill.scaling.x = p;
    fill.scaling.y = p;
  }
}

export function flatMaterial(scene: Scene, name: string, rgb: [number, number, number], alpha: number): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.emissiveColor = new Color3(...rgb).scale(0.6);
  m.specularColor = Color3.Black();
  m.alpha = alpha;
  m.backFaceCulling = false;
  m.disableLighting = alpha < 1;
  return m;
}
