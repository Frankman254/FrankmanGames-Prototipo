// Piezas de los personajes procedurales: formas de Babylon (cajas, cápsulas,
// elipsoides, tornos, tubos y cintas) colgadas de una articulación del rig, con
// el color de una ranura de la paleta. Una pieza puede repartir sus vértices
// entre varias articulaciones (`weights`) para doblarse con suavidad: el torso
// entre cadera, columna y pecho, la falda entre la cadera y las piernas, la capa
// entre el pecho y su propia articulación.
import { Matrix, Mesh, MeshBuilder, Vector3, type Scene } from '@babylonjs/core';
import type { Palette } from '../../data/worldSchema';
import type { Rgb } from '../../world/dayNight';

export type Slot = keyof Palette;
/** [radio, altura] de un perfil de torno (gira alrededor de Y). */
export type Profile = ReadonlyArray<readonly [number, number]>;
export type V3 = [number, number, number];

export type Shape =
  | { type: 'box'; size: V3 }
  | { type: 'capsule'; length: number; radius: number; radiusTop?: number; tessellation?: number }
  | { type: 'sphere'; diameter: number; scaleY?: number }
  /** Elipsoide de diámetros [x, y, z]; `slice` < 1 lo corta por abajo (casquetes). */
  | { type: 'ellipsoid'; size: V3; slice?: number; segments?: number; doubleSided?: boolean }
  | { type: 'cone'; height: number; diameter: number; tessellation?: number }
  | { type: 'cylinder'; height: number; diameter: number }
  | { type: 'torus'; diameter: number; thickness: number; tessellation?: number }
  | { type: 'arc'; radius: number; angle: number; thickness: number }
  /** Torno de un perfil alrededor de Y; `tessellation` 4 da una sección de rombo (hojas). */
  | { type: 'lathe'; profile: Profile; tessellation?: number; doubleSided?: boolean }
  | { type: 'tube'; path: V3[]; radius: number; tessellation?: number }
  /** Cinta por filas de puntos (capas, faldones): siempre de dos caras. */
  | { type: 'ribbon'; rows: V3[][] };

/** Reparto de un vértice (en el espacio del modelo, pose de reposo) entre articulaciones. */
export type Weights = (p: Vector3) => ReadonlyArray<readonly [string, number]>;

export interface Part {
  joint: string;
  shape: Shape;
  slot: Slot;
  /** Color fijo (ojos, boca) en lugar del de la ranura. */
  color?: Rgb;
  /** Multiplica el color de la ranura (pantalón más oscuro que la túnica…). */
  shade?: number;
  /** Centro de la pieza en el espacio de la articulación. */
  at?: V3;
  /** Giro de la pieza (Euler, radianes). */
  rot?: V3;
  /** Escala de la pieza (antes del giro). */
  scale?: V3;
  /** La pieza brilla sola (halos, orbes). */
  glow?: boolean;
  weights?: Weights;
}

/**
 * ¿Se pueden soldar los vértices repetidos de la forma? Las redondeadas sí (sin
 * costuras de sombreado y menos vértices); las de aristas vivas y las de dos
 * caras, no.
 */
export function weldable(s: Shape): boolean {
  if ('doubleSided' in s && s.doubleSided) return false;
  return s.type === 'capsule' || s.type === 'sphere' || s.type === 'ellipsoid' || s.type === 'lathe' || s.type === 'torus';
}

export function buildShape(scene: Scene, name: string, s: Shape): Mesh {
  switch (s.type) {
    case 'box':
      return MeshBuilder.CreateBox(name, { width: s.size[0], height: s.size[1], depth: s.size[2] }, scene);
    case 'capsule':
      return MeshBuilder.CreateCapsule(
        name,
        { height: s.length + s.radius * 2, radius: s.radius, radiusTop: s.radiusTop ?? s.radius, radiusBottom: s.radius, tessellation: s.tessellation ?? 8, subdivisions: 1, capSubdivisions: 3 },
        scene,
      );
    case 'sphere': {
      const m = MeshBuilder.CreateSphere(name, { diameter: s.diameter, segments: 8 }, scene);
      if (s.scaleY) m.scaling.y = s.scaleY;
      return m;
    }
    case 'ellipsoid': {
      // Torno de media circunferencia (de abajo arriba) escalado a los tres
      // diámetros: `segments` paralelos y el doble de meridianos.
      const rings = s.segments ?? 6;
      const end = Math.PI * (s.slice ?? 1);
      const profile: Vector3[] = [];
      for (let i = rings; i >= 0; i--) {
        const a = (end * i) / rings;
        profile.push(new Vector3(Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0));
      }
      const m = MeshBuilder.CreateLathe(name, { shape: profile, tessellation: rings * 2, sideOrientation: s.doubleSided ? Mesh.DOUBLESIDE : Mesh.DEFAULTSIDE }, scene);
      m.bakeTransformIntoVertices(Matrix.Scaling(s.size[0], s.size[1], s.size[2]));
      return m;
    }
    case 'cone':
      return MeshBuilder.CreateCylinder(name, { height: s.height, diameterTop: 0, diameterBottom: s.diameter, tessellation: s.tessellation ?? 8 }, scene);
    case 'cylinder':
      return MeshBuilder.CreateCylinder(name, { height: s.height, diameter: s.diameter, tessellation: 8 }, scene);
    case 'torus': {
      // Aro: torno de un hexágono (la sección del tubo); mucho más ligero que CreateTorus.
      const ring: Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ring.push(new Vector3(s.diameter / 2 + Math.cos(a) * (s.thickness / 2), Math.sin(a) * (s.thickness / 2), 0));
      }
      return MeshBuilder.CreateLathe(name, { shape: ring, tessellation: s.tessellation ?? 16 }, scene);
    }
    case 'arc': {
      // Arco del arquero: tubo en el plano XY, abierto hacia −X (la cuerda).
      const pts: Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = -s.angle / 2 + (s.angle * i) / 12;
        pts.push(new Vector3(Math.cos(a) * s.radius - s.radius * 0.85, Math.sin(a) * s.radius, 0));
      }
      return MeshBuilder.CreateTube(name, { path: pts, radius: s.thickness, tessellation: 6 }, scene);
    }
    case 'lathe':
      return MeshBuilder.CreateLathe(
        name,
        { shape: s.profile.map(([r, y]) => new Vector3(r, y, 0)), tessellation: s.tessellation ?? 12, sideOrientation: s.doubleSided ? Mesh.DOUBLESIDE : Mesh.DEFAULTSIDE },
        scene,
      );
    case 'tube':
      return MeshBuilder.CreateTube(name, { path: s.path.map((p) => new Vector3(...p)), radius: s.radius, tessellation: s.tessellation ?? 6 }, scene);
    case 'ribbon':
      return MeshBuilder.CreateRibbon(name, { pathArray: s.rows.map((r) => r.map((p) => new Vector3(...p))), sideOrientation: Mesh.DOUBLESIDE }, scene);
  }
}
