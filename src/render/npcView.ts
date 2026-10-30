// PNJ del pueblo en pantalla. Slice 05: mercaderes (personaje procedural en
// reposo que mira al jugador cuando está cerca, cartel con nombre y oficio, y
// una moneda que flota encima para que se reconozcan como tienda desde lejos).
// Slice 06: cualquier PNJ, con «!» (misión disponible) o «?» (misión por
// entregar) flotando encima; el signo tapa la moneda mientras está.
import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { NpcMarker } from '../rpg/contracts';
import type { World } from '../sim/world';
import type { AnimationDataDef, AssetManifest } from '../data/worldSchema';
import type { HeightField } from '../world/terrain';
import type { AssetCache } from './assetCache';
import { createCharacter, type CharacterModel } from './characters/characterModel';

interface NpcEls {
  model: CharacterModel;
  sign: Mesh;
  /** Sólo los mercaderes. */
  coin: Mesh | null;
  marker: Mesh;
  x: number;
  z: number;
}

/** Lo que la vista necesita de un PNJ o mercader (`MerchantDef` y `NpcDef` lo cumplen). */
export interface NpcLook {
  name: string;
  title: string;
  /** Paleta de `data/assets.json` → `npc`. */
  look: string;
}

/** Distancia a la que el PNJ se gira hacia el jugador. */
const LOOK_RANGE = 8;

export class NpcView {
  private readonly npcs = new Map<string, NpcEls>();
  private readonly coinMat: StandardMaterial;
  private readonly markerMats: Record<NpcMarker, StandardMaterial>;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly chars: { assets: AssetManifest; animation: AnimationDataDef },
    private readonly cache: AssetCache,
    private readonly ground: HeightField,
    /** Mercaderes y PNJ por id (Slice 05 pasaba sólo los mercaderes). */
    private readonly defs: Record<string, NpcLook>,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {
    this.coinMat = new StandardMaterial('npcCoin', scene);
    this.coinMat.diffuseColor = new Color3(1, 0.82, 0.25);
    this.coinMat.emissiveColor = new Color3(0.55, 0.42, 0.1);
    this.markerMats = { available: this.markerMaterial('available', '!', '#ffd34d'), ready: this.markerMaterial('ready', '?', '#ffe98a') };
  }

  /** Malla de un PNJ → su id (picking del clic). */
  static npcIdOf(mesh: { metadata?: unknown } | null | undefined): string | null {
    const md = mesh?.metadata as { npcId?: string } | undefined;
    return typeof md?.npcId === 'string' ? md.npcId : null;
  }

  /** Id del PNJ bajo el cursor (en un mercader, el id del mercader). */
  pick(screenX: number, screenY: number): string | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && NpcView.npcIdOf(m) !== null);
    return hit?.hit ? NpcView.npcIdOf(hit.pickedMesh) : null;
  }

  /** Muestra u oculta todos los PNJ ya creados (interiores: el mundo no los tiene). */
  setVisible(on: boolean): void {
    for (const els of this.npcs.values()) {
      els.model.root.setEnabled(on);
      els.sign.setEnabled(on);
      if (!on) els.marker.setEnabled(false);
      els.coin?.setEnabled(on);
    }
  }

  /** `marker` dice qué signo lleva encima cada PNJ (sin él, ninguno). */
  sync(world: World, dt: number, marker?: (npcId: string) => NpcMarker | null): void {
    this.time += dt;
    for (const n of world.npcs) {
      let els = this.npcs.get(n.npcId);
      if (!els) {
        els = this.create(n.npcId, n.merchantId !== null);
        this.npcs.set(n.npcId, els);
      }
      els.x = n.pos.x;
      els.z = n.pos.y;
      const y = this.ground.sample(els.x, els.z);
      const m = els.model;
      m.root.position.set(els.x, y, els.z);
      const p = world.player.pos;
      const dx = p.x - els.x;
      const dz = p.y - els.z;
      if (dx * dx + dz * dz < LOOK_RANGE * LOOK_RANGE) m.root.rotation.y = -Math.atan2(dz, dx);
      if (m.state !== 'idle') m.play('idle');
      m.update(dt, 0);
      const top = y + m.height;
      els.sign.position.set(els.x, top + 0.7, els.z);
      const mk = marker?.(n.npcId) ?? null;
      els.marker.setEnabled(mk !== null);
      if (mk) {
        els.marker.material = this.markerMats[mk];
        els.marker.position.set(els.x, top + 1.65 + Math.sin(this.time * 2.6) * 0.1, els.z);
      }
      if (els.coin) {
        els.coin.setEnabled(mk === null);
        els.coin.position.set(els.x, top + 1.5 + Math.sin(this.time * 2) * 0.08, els.z);
        els.coin.rotation.y = this.time * 1.8;
      }
    }
  }

  private create(id: string, merchant: boolean): NpcEls {
    const def = this.defs[id] ?? { name: id, title: '', look: 'default' };
    const entry = this.chars.assets['npc'] ?? this.chars.assets['player'];
    if (!entry) throw new Error('[assets] falta la entrada «npc» (o «player»)');
    const model = createCharacter(this.scene, 'npc', `npc-${id}`, entry, this.chars.animation, this.cache, def.look);
    for (const mesh of model.meshes) {
      mesh.isPickable = true;
      mesh.metadata = { ...(mesh.metadata as object | undefined), npcId: id };
    }
    this.shadows.addCasters(model.meshes);
    model.play('idle');

    const sign = this.nameplate(id, def.name, def.title);
    let coin: Mesh | null = null;
    if (merchant) {
      coin = MeshBuilder.CreateCylinder(`npc-coin-${id}`, { diameter: 0.42, height: 0.06, tessellation: 20 }, this.scene);
      coin.rotation.x = Math.PI / 2;
      coin.bakeCurrentTransformIntoVertices();
      coin.material = this.coinMat;
      coin.isPickable = false;
    }
    const marker = MeshBuilder.CreatePlane(`npc-marker-${id}`, { width: 0.75, height: 0.75 }, this.scene);
    marker.billboardMode = Mesh.BILLBOARDMODE_ALL;
    marker.isPickable = false;
    marker.setEnabled(false);
    return { model, sign, coin, marker, x: 0, z: 0 };
  }

  /** Signo de misión («!» o «?»): letra dorada con borde oscuro y halo, sin luz de escena (se ve de noche). */
  private markerMaterial(kind: NpcMarker, glyph: string, color: string): StandardMaterial {
    const size = 128;
    const tex = new DynamicTexture(`npc-marker-tex-${kind}`, { width: size, height: size }, this.scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, size, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 112px Georgia, serif';
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(40, 24, 6, 0.95)';
    ctx.strokeText(glyph, size / 2, size / 2 + 6);
    ctx.fillStyle = color;
    ctx.fillText(glyph, size / 2, size / 2 + 6);
    tex.update();
    const mat = new StandardMaterial(`npc-marker-mat-${kind}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = Color3.White();
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    return mat;
  }

  /** Cartel que siempre mira a la cámara, con el nombre y el oficio. */
  private nameplate(id: string, name: string, title: string): Mesh {
    const w = 512;
    const h = 128;
    const tex = new DynamicTexture(`npc-sign-tex-${id}`, { width: w, height: h }, this.scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20, 16, 12, 0.72)';
    ctx.beginPath();
    ctx.roundRect(36, 10, w - 72, h - 20, 24);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2d98a';
    ctx.font = 'bold 46px Georgia, serif';
    ctx.fillText(name, w / 2, 60);
    ctx.fillStyle = '#d8cbb0';
    ctx.font = '30px Georgia, serif';
    ctx.fillText(title, w / 2, 100);
    tex.update();
    const mat = new StandardMaterial(`npc-sign-mat-${id}`, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = Color3.White();
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    const plane = MeshBuilder.CreatePlane(`npc-sign-${id}`, { width: 3.4, height: 0.85 }, this.scene);
    plane.material = mat;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    return plane;
  }
}
