// Malla del terreno a partir del campo de alturas, con el material de mezcla
// (splatmap) de tres capas repetidas en mosaico: hierba, tierra y camino.
import { Color3, Constants, MeshBuilder, RawTexture, Texture, VertexBuffer, VertexData, type Mesh, type Scene } from '@babylonjs/core';
import { TerrainMaterial } from '@babylonjs/materials/terrain/terrainMaterial';
import { computeSplat, groundTile, type GroundLayerDef, type HeightField, type TerrainDef } from '../world/terrain';

const TILE_PX = 256;

function tileTexture(scene: Scene, layer: GroundLayerDef, seed: number, zoneSize: number): Texture {
  const tex = RawTexture.CreateRGBATexture(groundTile(layer, TILE_PX, seed), TILE_PX, TILE_PX, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  tex.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
  tex.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 8;
  tex.uScale = zoneSize / layer.tileMeters;
  tex.vScale = zoneSize / layer.tileMeters;
  return tex;
}

export function buildTerrain(scene: Scene, def: TerrainDef, hf: HeightField): { mesh: Mesh; material: TerrainMaterial } {
  const mesh = MeshBuilder.CreateGround(
    'terrain',
    { width: def.width, height: def.depth, subdivisionsX: hf.cols - 1, subdivisionsY: hf.rows - 1, updatable: true },
    scene,
  );
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  for (let i = 0; i < pos.length; i += 3) pos[i + 1] = hf.sample(pos[i]! + def.width / 2, pos[i + 2]! + def.depth / 2);
  const normals = new Float32Array(pos.length);
  VertexData.ComputeNormals(pos, mesh.getIndices()!, normals);
  mesh.updateVerticesData(VertexBuffer.PositionKind, pos);
  mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  mesh.refreshBoundingInfo();
  mesh.position.set(def.width / 2, 0, def.depth / 2);
  mesh.isPickable = false; // el clic se resuelve contra el campo de alturas, no contra la malla
  mesh.receiveShadows = true;
  mesh.freezeWorldMatrix();

  // UV de CreateGround: u = x / ancho, v = z / fondo → fila 0 del splat = z mínima.
  const res = def.splatResolution;
  const mat = new TerrainMaterial('terrainMat', scene);
  mat.mixTexture = RawTexture.CreateRGBATexture(computeSplat(def, hf), res, res, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  mat.diffuseTexture1 = tileTexture(scene, def.layers.grass, def.seed + 1, def.width);
  mat.diffuseTexture2 = tileTexture(scene, def.layers.dirt, def.seed + 2, def.width);
  mat.diffuseTexture3 = tileTexture(scene, def.layers.path, def.seed + 3, def.width);
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  mat.specularPower = 16;
  mat.maxSimultaneousLights = 6;
  mesh.material = mat;
  return { mesh, material: mat };
}
