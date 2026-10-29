// Mercaderes del pueblo en pantalla (Slice 05): personaje procedural en reposo
// que mira al jugador cuando está cerca, cartel con nombre y oficio, y una
// moneda que flota encima para que se reconozcan como tienda desde lejos.
import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { MerchantDef } from '../rpg/contracts';
import type { World } from '../sim/world';
import type { AnimationDataDef, AssetManifest } from '../data/worldSchema';
import type { HeightField } from '../world/terrain';
import type { AssetCache } from './assetCache';
import { createCharacter, type CharacterModel } from './characters/characterModel';

interface NpcEls {
  model: CharacterModel;
  sign: Mesh;
  coin: Mesh;
  x: number;
  z: number;
}

/** Distancia a la que el mercader se gira hacia el jugador. */
const LOOK_RANGE = 8;

export class NpcView {
  private readonly npcs = new Map<string, NpcEls>();
  private readonly coinMat: StandardMaterial;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly chars: { assets: AssetManifest; animation: AnimationDataDef },
    private readonly cache: AssetCache,
    private readonly ground: HeightField,
    private readonly merchants: Record<string, MerchantDef>,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {
    this.coinMat = new StandardMaterial('npcCoin', scene);
    this.coinMat.diffuseColor = new Color3(1, 0.82, 0.25);
    this.coinMat.emissiveColor = new Color3(0.55, 0.42, 0.1);
  }

  /** Malla de un mercader → su id (picking del clic). */
  static merchantIdOf(mesh: { metadata?: unknown } | null | undefined): string | null {
    const md = mesh?.metadata as { merchantId?: string } | undefined;
    return typeof md?.merchantId === 'string' ? md.merchantId : null;
  }

  pick(screenX: number, screenY: number): string | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && NpcView.merchantIdOf(m) !== null);
    return hit?.hit ? NpcView.merchantIdOf(hit.pickedMesh) : null;
  }

  sync(world: World, dt: number): void {
    this.time += dt;
    for (const n of world.npcs) {
      let els = this.npcs.get(n.merchantId);
      if (!els) {
        els = this.create(n.merchantId);
        this.npcs.set(n.merchantId, els);
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
      els.coin.position.set(els.x, top + 1.5 + Math.sin(this.time * 2) * 0.08, els.z);
      els.coin.rotation.y = this.time * 1.8;
    }
  }

  private create(id: string): NpcEls {
    const def = this.merchants[id]!;
    const entry = this.chars.assets['npc'] ?? this.chars.assets['player'];
    if (!entry) throw new Error('[assets] falta la entrada «npc» (o «player»)');
    const model = createCharacter(this.scene, 'npc', `npc-${id}`, entry, this.chars.animation, this.cache, def.look);
    for (const mesh of model.meshes) {
      mesh.isPickable = true;
      mesh.metadata = { ...(mesh.metadata as object | undefined), merchantId: id };
    }
    this.shadows.addCasters(model.meshes);
    model.play('idle');

    const sign = this.nameplate(id, def.name, def.title);
    const coin = MeshBuilder.CreateCylinder(`npc-coin-${id}`, { diameter: 0.42, height: 0.06, tessellation: 20 }, this.scene);
    coin.rotation.x = Math.PI / 2;
    coin.bakeCurrentTransformIntoVertices();
    coin.material = this.coinMat;
    coin.isPickable = false;
    return { model, sign, coin, x: def.position.x, z: def.position.y };
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
