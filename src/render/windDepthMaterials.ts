// Materiales de profundidad con viento para el estilo «pintura».
//
// El contorno de `paintStyle` lee el mapa de profundidad, que el motor dibuja
// con su shader de profundidad por defecto: las plantas de color se balancean
// (WindPlugin) pero su contorno se queda quieto, y el borde baila. Este módulo
// sustituye el material de profundidad solo en las mallas con viento, usando
// el mismo GLSL del balanceo (`WIND_SWAY_GLSL`), así silueta y color comparten
// el movimiento. La fórmula no se duplica: se inyecta la del plugin en la
// fuente de profundidad del motor, fallando rápido si el motor la cambia.
import {
  Effect,
  ShaderMaterial,
  type AbstractMesh,
  type DepthRenderer,
  type Mesh,
  type Scene,
  type SubMesh,
} from '@babylonjs/core';
import { WIND_SWAY_GLSL, WindPlugin, windMaterialAmplitude } from './windPlugin';
import { OCCLUSION_CUT_GLSL, OCCLUSION_FRAGMENT_UNIFORMS, OCCLUSION_UNIFORM_NAMES, OcclusionPlugin, readOcclusionCircles } from './occlusion';

const DECL_ANCHOR = 'uniform mat4 viewProjection;uniform vec2 depthValues;';
const SWAY_ANCHOR = 'vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);';

/**
 * Fuente de vértice de profundidad con el balanceo del plugin de viento
 * inyectado tras componer `worldPos` (misma posición que usa el pase de
 * color). Lanza si Babylon cambia su shader base: hay que revalidar aquí.
 */
export function windDepthVertexSource(base: string = Effect.ShadersStore.depthVertexShader!): string {
  if (!base.includes(DECL_ANCHOR) || !base.includes(SWAY_ANCHOR)) {
    throw new Error('El shader de profundidad de Babylon ha cambiado: revisar windDepthMaterials');
  }
  return base
    .replace(DECL_ANCHOR, `${DECL_ANCHOR}\nuniform vec4 windParams;`)
    .replace(SWAY_ANCHOR, `${SWAY_ANCHOR}\n${WIND_SWAY_GLSL}`);
}

const DEPTH_FRAG_DEF_ANCHOR = '#define CUSTOM_FRAGMENT_DEFINITIONS';
const DEPTH_FRAG_MAIN_ANCHOR = 'void main(void)\n{';
// Checks de oclusión para el pase de profundidad: usa gl_FragCoord.z (NDC) igual
// que la función occlusionCut del plugin de color. Si el personaje está más cerca
// de la cámara que el fragmento actual (depth >= c.w en NDC), no descarta nada.
const DEPTH_OCC_CHECKS = OCCLUSION_UNIFORM_NAMES.map((name) => `occ = max(occ, occlusionCut(${name}));`).join('\n  ');

/**
 * Fuente de fragmento de profundidad con descarte de oclusión inyectado.
 * Garantiza que los árboles cortados en el pase de color también desaparecen
 * del depth map, evitando siluetas fantasma en PaintStyle.
 */
export function windDepthFragmentSource(base: string = Effect.ShadersStore.depthPixelShader!): string {
  if (!base.includes(DEPTH_FRAG_DEF_ANCHOR) || !base.includes(DEPTH_FRAG_MAIN_ANCHOR)) {
    throw new Error('El shader de fragmento de profundidad de Babylon ha cambiado: revisar windDepthMaterials');
  }
  const occDecl = `${OCCLUSION_FRAGMENT_UNIFORMS}\n${OCCLUSION_CUT_GLSL}`;
  const occDiscard = `\n  {\n  float occ = 0.0;\n  ${DEPTH_OCC_CHECKS}\n  if (occ > 0.0) discard;\n  }`;
  return base
    .replace(DEPTH_FRAG_DEF_ANCHOR, `${DEPTH_FRAG_DEF_ANCHOR}\n${occDecl}`)
    .replace(DEPTH_FRAG_MAIN_ANCHOR, `${DEPTH_FRAG_MAIN_ANCHOR}${occDiscard}`);
}

export interface WindDepthSync {
  /** Recorre las mallas y engancha las que tienen viento y aún no estén. Barato; el observador lo llama al alta. */
  sync(): void;
  dispose(): void;
}

/**
 * `DepthRenderer` obtiene primero el DrawWrapper del pase de la submalla. Un
 * ShaderMaterial con efecto global no lo rellena por sí solo; uno con efecto
 * por submalla sí lo rellena, pero sustituye `materialDefines` del material
 * principal por un string. Esta variante enlaza el efecto global únicamente
 * al DrawWrapper del pase de profundidad, sin tocar el estado del material de
 * color.
 *
 * Además, `bindForSubMesh` fija `windParams` y los círculos de oclusión en cada
 * submalla renderizada en el pase de profundidad (el motor no llama a `onBind`
 * en los materiales de render pass asignados a DepthRenderer).
 */
class WindDepthMaterial extends ShaderMaterial {
  constructor(
    name: string,
    scene: Scene,
    shaders: { vertex?: string; vertexElement?: string; fragment?: string; fragmentElement?: string; vertexSource?: string; fragmentSource?: string },
    options: Partial<{
      attributes: string[];
      uniforms: string[];
      uniformBuffers: string[];
      samplers: string[];
      defines: string[];
      maxSimultaneousLights: number;
    }>,
    private readonly amplitude: number,
  ) {
    super(name, scene, shaders, options, false);
  }

  override isReadyForSubMesh(mesh: Mesh, subMesh: SubMesh, useInstances = false): boolean {
    if (!this.isReady(mesh, useInstances)) return false;
    const effect = this.getEffect();
    subMesh._getDrawWrapper(undefined, true)?.setEffect(effect, effect?.defines ?? null);
    return effect?.isReady() ?? false;
  }

  override bindForSubMesh(world: any, mesh: Mesh, subMesh: SubMesh): void {
    super.bindForSubMesh(world, mesh, subMesh);
    const effect = this.getEffect();
    if (!effect) return;
    if (this.amplitude > 0) {
      effect.setFloat4('windParams', WindPlugin.time * WindPlugin.speed, this.amplitude * WindPlugin.strength, 0, 0);
    }
    const occ = readOcclusionCircles();
    for (let i = 0; i < OCCLUSION_UNIFORM_NAMES.length; i++) {
      const c = occ[i]!;
      effect.setFloat4(OCCLUSION_UNIFORM_NAMES[i]!, c.x, c.y, c.z, c.w);
    }
  }
}

/**
 * Devuelve un material de profundidad con viento para cada amplitud. Cacheados
 * por amplitud (hay tres o cuatro valores en todo el juego); los uniforms
 * se fijan por submalla en `bindForSubMesh`.
 */
function materialFor(scene: Scene, depth: DepthRenderer, cache: Map<number, ShaderMaterial>, amplitude: number): ShaderMaterial {
  let mat = cache.get(amplitude);
  if (mat) return mat;
  mat = new WindDepthMaterial(`windDepth${amplitude}`, scene, {
    vertexSource: windDepthVertexSource(),
    // El fragment shader lleva el descarte de oclusión inyectado: los árboles
    // recortados en el pase de color desaparecen también del depth map.
    fragmentSource: windDepthFragmentSource(),
  }, {
    // El motor añade world0..3 y el define INSTANCES/THIN_INSTANCES por sí
    // mismo para las trozos instanciados; 'position' es el único fijo.
    attributes: ['position'],
    uniforms: ['world', 'viewProjection', 'depthValues', 'windParams', ...OCCLUSION_UNIFORM_NAMES],
    defines: depth.isPacked ? ['PACKED'] : [],
    samplers: [],
  }, amplitude);
  cache.set(amplitude, mat);
  return mat;
}

/**
 * Engancha el viento al mapa de profundidad de `depth`. Solo necesario
 * mientras el estilo de pintura esté activo; `PaintStyle` lo posee.
 * También asigna un material de profundidad con descarte de oclusión a las
 * mallas estáticas (sin viento) que llevan OcclusionPlugin, evitando
 * siluetas fantasma de rocas y casas en el pase de contorno.
 */
export function bindWindDepthMaterials(depth: DepthRenderer, scene: Scene): WindDepthSync {
  const cache = new Map<number, ShaderMaterial>();
  const bound = new WeakSet<AbstractMesh>();
  let queued = false;
  let disposed = false;

  // Material de profundidad estático (sin viento) con descarte de oclusión.
  // Lazy: se crea solo si hay mallas con OcclusionPlugin sin viento.
  let staticOccMat: WindDepthMaterial | null = null;
  const getStaticOccMat = (): WindDepthMaterial => {
    if (staticOccMat) return staticOccMat;
    staticOccMat = new WindDepthMaterial('depthOcclusion', scene, {
      vertexSource: Effect.ShadersStore.depthVertexShader,
      fragmentSource: windDepthFragmentSource(),
    }, {
      attributes: ['position'],
      uniforms: ['world', 'viewProjection', 'depthValues', ...OCCLUSION_UNIFORM_NAMES],
      defines: depth.isPacked ? ['PACKED'] : [],
      samplers: [],
    }, 0);
    return staticOccMat;
  };

  const tryMesh = (mesh: AbstractMesh): void => {
    if (bound.has(mesh) || !mesh.material) return;
    const amplitude = windMaterialAmplitude(mesh.material);
    if (amplitude !== undefined) {
      // Malla con viento: material de profundidad con balanceo + oclusión.
      depth.setMaterialForRendering(mesh, materialFor(scene, depth, cache, amplitude));
      bound.add(mesh);
    } else if (OcclusionPlugin.hasPlugin(mesh.material)) {
      // Malla estática con oclusión (roca, casa…): material de profundidad con oclusión sola.
      depth.setMaterialForRendering(mesh, getStaticOccMat());
      bound.add(mesh);
    }
  };

  const sync = (): void => {
    queued = false;
    if (disposed) return;
    for (const mesh of scene.meshes) tryMesh(mesh);
  };

  const observer = scene.onNewMeshAddedObservable.add(() => {
    // Las mallas del streaming reciben su material justo después de crearse;
    // mirarlas en el microtask (coalescido) las pilla sin tocar el bucle de render.
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  });
  sync();

  return {
    sync,
    dispose() {
      disposed = true;
      scene.onNewMeshAddedObservable.remove(observer);
      for (const mesh of scene.meshes) {
        if (bound.has(mesh)) depth.setMaterialForRendering(mesh, undefined);
      }
      for (const mat of cache.values()) mat.dispose();
      cache.clear();
      staticOccMat?.dispose();
    },
  };
}
