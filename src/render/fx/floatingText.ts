// Números flotantes en 3D (daño, críticos más grandes, curación) y destello de
// subida de nivel. Cada número es un plano que mira a la cámara con su propia
// textura dibujada por código; se reutilizan desde un pool.
import { Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import type { FxDef } from '../../data/fxSchema';
import type { Rgb } from '../../world/dayNight';
import { BurstPool, glowMaterial } from './particles';

interface Floater {
  mesh: Mesh;
  tex: DynamicTexture;
  mat: StandardMaterial;
  ttl: number;
  total: number;
  start: Vector3;
  drift: number;
  rise: number;
}

const TEX_W = 256;
const TEX_H = 96;

const css = (c: Rgb): string => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

export class FloatingText {
  private readonly pool: Floater[] = [];
  private next = 0;
  private rings: Array<{ mesh: Mesh; mat: StandardMaterial; ttl: number; total: number }> = [];

  constructor(
    private readonly scene: Scene,
    private readonly fx: FxDef,
    private readonly bursts: BurstPool,
    size = 32,
  ) {
    for (let i = 0; i < size; i++) {
      const tex = new DynamicTexture(`floatTex${i}`, { width: TEX_W, height: TEX_H }, scene, true);
      tex.hasAlpha = true;
      const mat = new StandardMaterial(`floatMat${i}`, scene);
      mat.diffuseTexture = tex;
      mat.emissiveTexture = tex;
      mat.useAlphaFromDiffuseTexture = true;
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.disableDepthWrite = true;
      const mesh = MeshBuilder.CreatePlane(`float${i}`, { width: TEX_W / TEX_H, height: 1 }, scene);
      mesh.material = mat;
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.isPickable = false;
      mesh.renderingGroupId = 1; // por encima del mundo, sin que lo tapen
      mesh.setEnabled(false);
      this.pool.push({ mesh, tex, mat, ttl: 0, total: 1, start: new Vector3(), drift: 0, rise: 0 });
    }
  }

  show(text: string, at: Vector3, color: Rgb, scale = 1, seconds = this.fx.damageNumbers.seconds): void {
    const f = this.pool[this.next]!;
    this.next = (this.next + 1) % this.pool.length;
    const ctx = f.tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    // La textura del plano llega invertida en vertical: se dibuja volteada.
    ctx.setTransform(1, 0, 0, -1, 0, TEX_H);
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, TEX_W / 2, TEX_H / 2);
    ctx.fillStyle = css(color);
    ctx.fillText(text, TEX_W / 2, TEX_H / 2);
    f.tex.update(false);
    f.mat.emissiveColor = new Color3(1, 1, 1);
    f.mat.alpha = 1;
    f.start.copyFrom(at);
    f.mesh.position.copyFrom(at);
    f.mesh.scaling.setAll(this.fx.damageNumbers.size * scale);
    f.ttl = f.total = seconds;
    f.drift = (Math.random() - 0.5) * 0.6;
    f.rise = this.fx.damageNumbers.rise * (scale > 1 ? 1.2 : 1);
    f.mesh.setEnabled(true);
  }

  damage(amount: number, crit: boolean, toPlayer: boolean, at: Vector3): void {
    const d = this.fx.damageNumbers;
    const color = toPlayer ? d.toPlayer : crit ? d.crit : d.toEnemy;
    this.show(crit ? `${Math.round(amount)}!` : `${Math.round(amount)}`, at, color, crit ? d.critScale : 1);
  }

  heal(amount: number, at: Vector3): void {
    this.show(`+${Math.round(amount)}`, at, this.fx.damageNumbers.heal, 0.9);
  }

  /** Subida de nivel: texto grande, anillo que se abre y columna de chispas. */
  levelUp(level: number, feet: Vector3, height: number): void {
    const c = this.fx.levelUp.color;
    const s = this.fx.levelUp.seconds;
    this.show(`¡Nivel ${level}!`, feet.add(new Vector3(0, height + 0.8, 0)), c, 2.2, s);
    for (let i = 0; i < 2; i++) {
      const mesh = MeshBuilder.CreateTorus('levelRing', { diameter: 1, thickness: 0.08, tessellation: 40 }, this.scene);
      mesh.position.copyFrom(feet).addInPlaceFromFloats(0, 0.1 + i * height * 0.5, 0);
      const mat = glowMaterial(this.scene, 'levelRingMat', c, 1);
      mesh.material = mat;
      mesh.isPickable = false;
      this.rings.push({ mesh, mat, ttl: s * (1 - i * 0.25), total: s * (1 - i * 0.25) });
    }
    for (let i = 0; i < 4; i++) {
      this.bursts.burst(feet.add(new Vector3(0, 0.2 + i * 0.45, 0)), { count: 26, color: c, core: [1, 1, 0.9], radius: 0.6, upward: true, speed: [1, 3], gravity: 2, life: [0.6, 1.1], size: [0.06, 0.18] });
    }
  }

  update(dt: number): void {
    for (const f of this.pool) {
      if (f.ttl <= 0) continue;
      f.ttl -= dt;
      const k = 1 - Math.max(0, f.ttl) / f.total;
      // Sube rápido al principio y se frena; se desvanece en el último tercio.
      const up = f.rise * (1 - (1 - k) * (1 - k));
      f.mesh.position.set(f.start.x + f.drift * k, f.start.y + up, f.start.z);
      f.mat.alpha = k < 0.66 ? 1 : 1 - (k - 0.66) / 0.34;
      if (f.ttl <= 0) f.mesh.setEnabled(false);
    }
    this.rings = this.rings.filter((r) => {
      r.ttl -= dt;
      const k = 1 - Math.max(0, r.ttl) / r.total;
      r.mesh.scaling.setAll(1 + k * 4);
      r.mat.alpha = 1 - k;
      if (r.ttl > 0) return true;
      r.mat.dispose();
      r.mesh.dispose();
      return false;
    });
  }

  reset(): void {
    for (const f of this.pool) {
      f.ttl = 0;
      f.mesh.setEnabled(false);
    }
    for (const r of this.rings) {
      r.mat.dispose();
      r.mesh.dispose();
    }
    this.rings = [];
  }
}
