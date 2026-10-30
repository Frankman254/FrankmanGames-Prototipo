// Piedras Pintadas en el mundo: losa de piedra con un anillo y un cristal que flota y
// gira. Brillan más cuando el jugador ya los conoce. Clic = elegir destino.
import { Color3, MeshBuilder, StandardMaterial, TransformNode, type Mesh, type Scene } from '@babylonjs/core';
import type { StoneDef } from '../world/stones';

interface StoneEls {
  root: TransformNode;
  crystal: Mesh;
  ring: Mesh;
  phase: number;
}

export class StoneView {
  private readonly els = new Map<string, StoneEls>();
  private readonly stone: StandardMaterial;
  private readonly lit: StandardMaterial;
  private readonly dim: StandardMaterial;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly ground: { sample(x: number, z: number): number },
  ) {
    this.stone = new StandardMaterial('stoneStone', scene);
    this.stone.diffuseColor = new Color3(0.55, 0.53, 0.5);
    this.stone.specularColor = new Color3(0.05, 0.05, 0.05);
    this.lit = new StandardMaterial('stoneLit', scene);
    this.lit.diffuseColor = new Color3(0.3, 0.8, 0.9);
    this.lit.emissiveColor = new Color3(0.25, 0.75, 0.85);
    this.dim = new StandardMaterial('stoneDim', scene);
    this.dim.diffuseColor = new Color3(0.35, 0.4, 0.45);
    this.dim.emissiveColor = new Color3(0.08, 0.12, 0.15);
  }

  static stoneIdOf(mesh: { metadata?: unknown } | null | undefined): string | null {
    const md = mesh?.metadata as { stoneId?: string } | undefined;
    return typeof md?.stoneId === 'string' ? md.stoneId : null;
  }

  /** Coloca las piedras (posiciones ya ajustadas al suelo caminable). */
  build(stones: readonly StoneDef[], at: (z: StoneDef) => { x: number; y: number }): void {
    for (const e of this.els.values()) e.root.dispose();
    this.els.clear();
    for (const z of stones) {
      const p = at(z);
      const root = new TransformNode(`stone_${z.id}`, this.scene);
      root.position.set(p.x, this.ground.sample(p.x, p.y), p.y);
      const md = { stoneId: z.id };
      const base = MeshBuilder.CreateCylinder(`stoneBase_${z.id}`, { diameterTop: 2.6, diameterBottom: 3, height: 0.35, tessellation: 8 }, this.scene);
      base.position.y = 0.17;
      base.material = this.stone;
      const ring = MeshBuilder.CreateTorus(`stoneRing_${z.id}`, { diameter: 2.1, thickness: 0.12, tessellation: 32 }, this.scene);
      ring.position.y = 0.4;
      const crystal = MeshBuilder.CreatePolyhedron(`stoneCrystal_${z.id}`, { type: 1, size: 0.38 }, this.scene);
      crystal.scaling.y = 1.8;
      crystal.position.y = 1.6;
      for (const m of [base, ring, crystal]) {
        m.parent = root;
        m.metadata = md;
        m.isPickable = true;
      }
      this.els.set(z.id, { root, crystal, ring, phase: this.els.size * 1.3 });
    }
  }

  /** Dentro de una mazmorra las piedras del exterior no se ven. */
  setVisible(on: boolean): void {
    for (const e of this.els.values()) if (e.root.isEnabled() !== on) e.root.setEnabled(on);
  }

  pick(screenX: number, screenY: number): string | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && StoneView.stoneIdOf(m) !== null);
    return hit?.hit ? StoneView.stoneIdOf(hit.pickedMesh) : null;
  }

  sync(dt: number, known: (id: string) => boolean): void {
    this.time += dt;
    for (const [id, e] of this.els) {
      const on = known(id);
      const mat = on ? this.lit : this.dim;
      e.crystal.material = mat;
      e.ring.material = mat;
      e.crystal.rotation.y = this.time * (on ? 0.9 : 0.3) + e.phase;
      e.crystal.position.y = 1.6 + Math.sin(this.time * 1.6 + e.phase) * (on ? 0.12 : 0.04);
    }
  }
}
