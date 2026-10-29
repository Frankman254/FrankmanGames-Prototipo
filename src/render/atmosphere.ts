// Luz y atmósfera: sol/luna direccional con sombras de alcance acotado alrededor
// del jugador, luz ambiente, niebla, cúpula de cielo con degradado, sol y
// estrellas, farolas (sólo las `maxActive` más cercanas encienden luz real) y
// una luz que acompaña al jugador de noche.
import {
  Color3,
  DirectionalLight,
  Effect,
  HemisphericLight,
  type Material,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  ShaderMaterial,
  ShadowGenerator,
  Vector3,
  type AbstractMesh,
  type StandardMaterial,
} from '@babylonjs/core';
import { nearestLamps, sampleLighting, timeOfDay, type LightingDef, type LightState } from '../world/dayNight';
import type { LampPost } from './vegetationView';

Effect.ShadersStore['skyDomeVertexShader'] = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

Effect.ShadersStore['skyDomeFragmentShader'] = `
precision highp float;
varying vec3 vDir;
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 toSun;
uniform vec3 sunColor;
uniform float stars;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  vec3 col = mix(horizon, zenith, pow(up, 0.55));
  // Bajo el horizonte, el color de la niebla (las colinas lo tapan casi todo).
  col = d.y < 0.0 ? horizon : col;
  float s = max(dot(d, normalize(toSun)), 0.0);
  col += sunColor * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.25) * step(-0.05, toSun.y);
  // Estrellas: celdas de una rejilla en la dirección, sólo cerca del cénit.
  vec3 cell = floor(d * 220.0);
  float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.35, d.y);
  col += vec3(star * stars);
  gl_FragColor = vec4(col, 1.0);
}`;

export class Atmosphere {
  readonly sun: DirectionalLight;
  readonly ambient: HemisphericLight;
  readonly shadows: ShadowGenerator;
  private readonly sky: Mesh;
  private readonly skyMat: ShaderMaterial;
  private readonly lampLights: PointLight[] = [];
  private readonly playerLight: PointLight;
  private lampPick = 0;
  /** Segundos de juego transcurridos (para la hora del día). */
  elapsed = 0;
  /** Multiplicador de la velocidad del reloj (depuración). */
  timeScale = 1;
  /** Hora fija (0–1) o null para seguir el reloj. */
  fixedTime: number | null = null;
  state: LightState;
  private readonly tmp = new Vector3();

  constructor(
    private readonly scene: Scene,
    private readonly def: LightingDef,
    private readonly lamps: readonly LampPost[],
    private readonly lanternMat: StandardMaterial,
  ) {
    this.ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.sun = new DirectionalLight('sun', new Vector3(0, -1, 0), scene);
    // Sombras sólo alrededor del jugador: el frustum ortográfico es fijo y sigue al foco.
    this.sun.autoUpdateExtends = false;
    this.sun.autoCalcShadowZBounds = false;
    this.sun.shadowFrustumSize = def.shadows.rangeMeters;
    this.sun.shadowMinZ = 1;
    this.sun.shadowMaxZ = 260;
    this.shadows = new ShadowGenerator(def.shadows.mapSize, this.sun);
    this.shadows.usePercentageCloserFiltering = true;
    this.shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    this.shadows.bias = 0.0015;
    this.shadows.normalBias = 0.02;
    this.shadows.setDarkness(def.shadows.darkness);

    for (let i = 0; i < def.lamps.maxActive; i++) {
      const l = new PointLight(`lampLight${i}`, Vector3.Zero(), scene);
      l.diffuse = new Color3(...def.lamps.color);
      l.specular = Color3.Black();
      l.range = def.lamps.range;
      this.lampLights.push(l);
    }
    this.playerLight = new PointLight('playerLight', Vector3.Zero(), scene);
    this.playerLight.diffuse = new Color3(...def.playerLight.color);
    this.playerLight.specular = Color3.Black();
    this.playerLight.range = def.playerLight.range;

    this.sky = MeshBuilder.CreateSphere('sky', { diameter: 900, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
    this.sky.infiniteDistance = true;
    this.sky.isPickable = false;
    this.sky.applyFog = false;
    this.skyMat = new ShaderMaterial('skyMat', scene, 'skyDome', {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'zenith', 'horizon', 'toSun', 'sunColor', 'stars'],
    });
    this.skyMat.backFaceCulling = false;
    this.skyMat.disableDepthWrite = true;
    this.sky.material = this.skyMat;
    this.sky.renderingGroupId = 0;

    scene.fogMode = Scene.FOGMODE_EXP2;
    // Cualquier material (también los de enemigos que nacen después) admite
    // sol + ambiente + farolas + luz del jugador.
    const maxLights = 2 + def.lamps.maxActive + 1;
    const widen = (mat: Material): void => {
      const m = mat as Material & { maxSimultaneousLights?: number };
      if (typeof m.maxSimultaneousLights === 'number' && m.maxSimultaneousLights < maxLights) m.maxSimultaneousLights = maxLights;
    };
    scene.materials.forEach(widen);
    scene.onNewMaterialAddedObservable.add(widen);

    this.state = sampleLighting(def, def.startTime);
  }

  /** Todos los que pueden proyectar sombra; al mapa sólo van los cercanos al foco. */
  private readonly casters: AbstractMesh[] = [];
  private casterPick = 0;

  addCasters(meshes: readonly AbstractMesh[]): void {
    this.casters.push(...meshes);
    this.casterPick = 0;
  }

  /**
   * El mapa de sombras no descarta por su frustum: se le pasan sólo las mallas
   * (trozos de 32 m) cuya caja toca el cuadrado de sombras alrededor del foco.
   */
  private pickCasters(focus: Vector3): void {
    const half = this.def.shadows.rangeMeters / 2 + 8;
    const list = this.shadows.getShadowMap()!.renderList!;
    list.length = 0;
    for (const m of this.casters) {
      const b = m.getBoundingInfo().boundingBox;
      if (b.maximumWorld.x < focus.x - half || b.minimumWorld.x > focus.x + half) continue;
      if (b.maximumWorld.z < focus.z - half || b.minimumWorld.z > focus.z + half) continue;
      list.push(m);
    }
  }

  get timeOfDay(): number {
    return this.fixedTime ?? timeOfDay(this.def, this.elapsed);
  }

  /** Avanza el reloj y aplica la luz del momento alrededor de `focus`. */
  update(frameSeconds: number, focus: Vector3): void {
    this.elapsed += frameSeconds * this.timeScale;
    if (this.casterPick-- <= 0) {
      this.casterPick = 10;
      this.pickCasters(focus);
    }
    const s = (this.state = sampleLighting(this.def, this.timeOfDay));

    this.sun.direction.set(-s.toLight[0], -s.toLight[1], -s.toLight[2]);
    this.sun.position.set(focus.x + s.toLight[0] * 120, focus.y + s.toLight[1] * 120, focus.z + s.toLight[2] * 120);
    this.sun.intensity = s.sun;
    this.sun.diffuse.set(...s.sunColor);
    this.sun.specular.set(s.sunColor[0] * 0.3, s.sunColor[1] * 0.3, s.sunColor[2] * 0.3);
    this.ambient.intensity = s.ambient;
    this.ambient.diffuse.set(...s.skyColor);
    this.ambient.groundColor.set(...s.groundColor);
    this.ambient.specular.set(0, 0, 0);

    this.scene.fogDensity = s.fogDensity;
    this.scene.fogColor.set(...s.horizon);
    this.scene.clearColor.set(s.horizon[0], s.horizon[1], s.horizon[2], 1);
    this.skyMat.setColor3('zenith', new Color3(...s.zenith));
    this.skyMat.setColor3('horizon', new Color3(...s.horizon));
    this.skyMat.setVector3('toSun', this.tmp.set(...s.toSun));
    this.skyMat.setColor3('sunColor', new Color3(...s.sunColor));
    this.skyMat.setFloat('stars', s.stars);

    // Farolas: el farol brilla siempre que estén encendidas; la luz real sólo
    // en las más cercanas (se reelige cada 15 fotogramas).
    const on = s.lampsOn;
    this.lanternMat.emissiveColor.set(this.def.lamps.color[0] * on, this.def.lamps.color[1] * on, this.def.lamps.color[2] * on);
    if (this.lampPick-- <= 0) {
      this.lampPick = 15;
      const idx = on > 0.01 ? nearestLamps(this.lamps, focus.x, focus.z, this.lampLights.length) : [];
      this.lampLights.forEach((l, i) => {
        const lamp = idx[i] !== undefined ? this.lamps[idx[i]!] : undefined;
        l.setEnabled(lamp !== undefined);
        if (lamp) l.position.set(lamp.x, lamp.y - 0.3, lamp.z);
      });
    }
    for (const l of this.lampLights) l.intensity = this.def.lamps.intensity * on;

    const pl = this.def.playerLight;
    this.playerLight.setEnabled(s.playerLight > 0.01);
    this.playerLight.intensity = pl.intensity * s.playerLight;
    this.playerLight.position.set(focus.x, focus.y + pl.height, focus.z);
  }
}
