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
import type { DungeonLightDef } from '../data/dungeonSchema';
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

/** Luz del momento con el tiempo encima: menos sol y ambiente con nubes, más niebla y cielo teñido. */
function withWeather(s: LightState, w: Atmosphere['weather']): LightState {
  if (w.dim === 0 && w.fog === 0 && w.tint.every((c) => c === 1)) return s;
  const tint = (c: [number, number, number]): [number, number, number] => [Math.min(1, c[0] * w.tint[0]), Math.min(1, c[1] * w.tint[1]), Math.min(1, c[2] * w.tint[2])];
  return {
    ...s,
    sun: s.sun * (1 - w.dim),
    ambient: s.ambient * (1 - w.dim * 0.5),
    fogDensity: Math.max(0, s.fogDensity + w.fog),
    zenith: tint(s.zenith),
    horizon: tint(s.horizon),
    sunColor: tint(s.sunColor),
  };
}

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
  /** Niebla mínima (la pone la distancia de visión, para que el corte lejano no se vea). */
  minFogDensity = 0;
  /** Tiempo de la zona del jugador (lo pone `WeatherView`): oscurece la luz, suma niebla y tiñe el cielo. */
  weather: { dim: number; fog: number; tint: [number, number, number] } = { dim: 0, fog: 0, tint: [1, 1, 1] };
  state: LightState;
  private readonly tmp = new Vector3();
  /** Interior (piso de mazmorra): luz fija sin ciclo de día y antorchas en lugar de farolas. */
  private interior: { light: DungeonLightDef; torches: readonly LampPost[]; time: number } | null = null;

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

  removeCasters(meshes: readonly AbstractMesh[]): void {
    const gone = new Set(meshes);
    for (let i = this.casters.length - 1; i >= 0; i--) if (gone.has(this.casters[i]!)) this.casters.splice(i, 1);
    const list = this.shadows.getShadowMap()!.renderList!;
    for (let i = list.length - 1; i >= 0; i--) if (gone.has(list[i]!)) list.splice(i, 1);
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

  /**
   * Calidad de sombras de las opciones: «no» apaga el mapa de sombras; «bajas»
   * usa un mapa de la mitad de lado sin filtrado suave; «altas» es lo de
   * `lighting.json` con filtrado PCF.
   */
  setShadowQuality(level: 'no' | 'bajas' | 'altas'): void {
    this.sun.shadowEnabled = level !== 'no';
    const size = level === 'bajas' ? Math.max(512, this.def.shadows.mapSize / 2) : this.def.shadows.mapSize;
    const map = this.shadows.getShadowMap()!;
    if (map.getSize().width !== size) map.resize(size);
    this.shadows.usePercentageCloserFiltering = level === 'altas';
    this.shadows.usePoissonSampling = level === 'bajas';
  }

  /** Entra en un interior (o vuelve al exterior con null). El reloj del día se detiene dentro. */
  setInterior(light: DungeonLightDef | null, torches: readonly LampPost[] = []): void {
    this.interior = light ? { light, torches, time: 0 } : null;
    this.sky.setEnabled(light === null);
    this.lampPick = 0;
    const lamp = light ? light.torch : { ...this.def.lamps, flicker: 0 };
    for (const l of this.lampLights) {
      l.diffuse.set(...lamp.color);
      l.range = lamp.range;
    }
    const pl = light ? light.playerLight : this.def.playerLight;
    this.playerLight.diffuse.set(...pl.color);
    this.playerLight.range = pl.range;
  }

  get isInterior(): boolean {
    return this.interior !== null;
  }

  /** Luz de interior: ambiente fijo, una luz cenital tenue y las antorchas más cercanas con parpadeo. */
  private updateInterior(frameSeconds: number, focus: Vector3): void {
    const it = this.interior!;
    const l = it.light;
    it.time += frameSeconds;
    this.sun.direction.set(0.25, -1, 0.35);
    this.sun.position.set(focus.x - 0.25 * 60, focus.y + 60, focus.z - 0.35 * 60);
    this.sun.intensity = l.sun;
    this.sun.diffuse.set(...l.sunColor);
    this.sun.specular.set(0, 0, 0);
    this.ambient.intensity = l.ambient;
    this.ambient.diffuse.set(...l.skyColor);
    this.ambient.groundColor.set(...l.groundColor);
    this.ambient.specular.set(0, 0, 0);
    this.scene.fogDensity = l.fogDensity;
    this.scene.fogColor.set(...l.fogColor);
    this.scene.clearColor.set(l.fogColor[0], l.fogColor[1], l.fogColor[2], 1);
    this.lanternMat.emissiveColor.set(0, 0, 0);
    if (this.lampPick-- <= 0) {
      this.lampPick = 15;
      const idx = nearestLamps(it.torches, focus.x, focus.z, this.lampLights.length);
      this.lampLights.forEach((light, i) => {
        const t = idx[i] !== undefined ? it.torches[idx[i]!] : undefined;
        light.setEnabled(t !== undefined);
        if (t) light.position.set(t.x, t.y, t.z);
      });
    }
    // Parpadeo: dos senos por antorcha con fase propia (sin azar: no depende del ritmo de fotogramas).
    this.lampLights.forEach((light, i) => {
      const ph = light.position.x * 1.7 + light.position.z * 2.3 + i;
      const n = 0.5 * Math.sin(it.time * 9.1 + ph) + 0.5 * Math.sin(it.time * 13.7 + ph * 1.3);
      light.intensity = l.torch.intensity * (1 - l.torch.flicker * (0.5 + 0.5 * n));
    });
    const pl = this.def.playerLight;
    this.playerLight.setEnabled(true);
    this.playerLight.intensity = l.playerLight.intensity;
    this.playerLight.position.set(focus.x, focus.y + pl.height, focus.z);
  }

  get timeOfDay(): number {
    return this.fixedTime ?? timeOfDay(this.def, this.elapsed);
  }

  /** Avanza el reloj y aplica la luz del momento alrededor de `focus`. */
  update(frameSeconds: number, focus: Vector3): void {
    if (this.casterPick-- <= 0) {
      this.casterPick = 10;
      this.pickCasters(focus);
    }
    if (this.interior) {
      this.updateInterior(frameSeconds, focus);
      return;
    }
    this.elapsed += frameSeconds * this.timeScale;
    const s = (this.state = withWeather(sampleLighting(this.def, this.timeOfDay), this.weather));

    this.sun.direction.set(-s.toLight[0], -s.toLight[1], -s.toLight[2]);
    this.sun.position.set(focus.x + s.toLight[0] * 120, focus.y + s.toLight[1] * 120, focus.z + s.toLight[2] * 120);
    this.sun.intensity = s.sun;
    this.sun.diffuse.set(...s.sunColor);
    this.sun.specular.set(s.sunColor[0] * 0.3, s.sunColor[1] * 0.3, s.sunColor[2] * 0.3);
    this.ambient.intensity = s.ambient;
    this.ambient.diffuse.set(...s.skyColor);
    this.ambient.groundColor.set(...s.groundColor);
    this.ambient.specular.set(0, 0, 0);

    this.scene.fogDensity = Math.max(s.fogDensity, this.minFogDensity);
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
