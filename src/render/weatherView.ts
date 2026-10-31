// Tiempo visible: lluvia (gotas alargadas que caen rápido) y nieve (copos que
// bajan despacio y se mecen) alrededor del jugador, y el tinte de la luz del
// tiempo de su zona. Las texturas se dibujan por código (sin assets).
import { Color4, DynamicTexture, ParticleSystem, Vector3, type Scene } from '@babylonjs/core';
import type { WeatherDef } from '../data/weatherSchema';
import type { WeatherKind } from '../data/zonesSchema';
import type { Atmosphere } from './atmosphere';

function dotTexture(scene: Scene, name: string, streak: boolean): DynamicTexture {
  const t = new DynamicTexture(name, { width: 32, height: 32 }, scene, false);
  const ctx = t.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 32, 32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  if (streak) ctx.fillRect(13, 0, 6, 32);
  else {
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  t.hasAlpha = true;
  t.update();
  return t;
}

export class WeatherView {
  private readonly rain: ParticleSystem;
  private readonly snow: ParticleSystem;
  private readonly emitter = new Vector3();

  constructor(
    scene: Scene,
    private readonly def: WeatherDef,
  ) {
    this.rain = new ParticleSystem('rain', 4000, scene);
    this.rain.particleTexture = dotTexture(scene, 'rainDrop', true);
    this.rain.minEmitBox = new Vector3(-22, 0, -22);
    this.rain.maxEmitBox = new Vector3(22, 0, 22);
    this.rain.direction1 = new Vector3(-0.6, -1, -0.2);
    this.rain.direction2 = new Vector3(-0.4, -1, 0.2);
    this.rain.minEmitPower = 22;
    this.rain.maxEmitPower = 28;
    this.rain.minLifeTime = 0.6;
    this.rain.maxLifeTime = 0.8;
    this.rain.minSize = 0.05;
    this.rain.maxSize = 0.08;
    this.rain.minScaleY = 8;
    this.rain.maxScaleY = 12;
    this.rain.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
    this.rain.color1 = new Color4(0.75, 0.8, 0.9, 0.55);
    this.rain.color2 = new Color4(0.65, 0.72, 0.85, 0.4);
    this.rain.colorDead = new Color4(0.6, 0.7, 0.8, 0);
    this.rain.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.rain.emitter = this.emitter;

    this.snow = new ParticleSystem('snow', 3000, scene);
    this.snow.particleTexture = dotTexture(scene, 'snowFlake', false);
    this.snow.minEmitBox = new Vector3(-20, 0, -20);
    this.snow.maxEmitBox = new Vector3(20, 0, 20);
    this.snow.direction1 = new Vector3(-0.3, -1, -0.3);
    this.snow.direction2 = new Vector3(0.3, -1, 0.3);
    this.snow.minEmitPower = 1.5;
    this.snow.maxEmitPower = 2.5;
    this.snow.minLifeTime = 6;
    this.snow.maxLifeTime = 8;
    this.snow.minSize = 0.08;
    this.snow.maxSize = 0.18;
    this.snow.minAngularSpeed = -1;
    this.snow.maxAngularSpeed = 1;
    this.snow.color1 = new Color4(1, 1, 1, 0.9);
    this.snow.color2 = new Color4(0.9, 0.94, 1, 0.75);
    this.snow.colorDead = new Color4(1, 1, 1, 0);
    this.snow.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    this.snow.emitter = this.emitter;
  }

  /**
   * Cada fotograma: partículas encima de `focus` según el tiempo de la zona
   * del jugador y su intensidad (null = interior: nada) y tinte de la luz.
   */
  update(focus: Vector3, kind: WeatherKind | null, intensity: number, atmosphere: Atmosphere): void {
    this.emitter.set(focus.x, focus.y + 16, focus.z);
    const k = kind ?? 'clear';
    const v = this.def.visual[k];
    const i = kind ? intensity : 0;
    const set = (ps: ParticleSystem, on: boolean): void => {
      ps.emitRate = on ? v.particles * i : 0;
      if (on && i > 0.01 && !ps.isStarted()) ps.start();
      if ((!on || i <= 0.01) && ps.isStarted()) ps.stop();
    };
    set(this.rain, k === 'rain');
    set(this.snow, k === 'snow');
    const mix = (a: number): number => 1 + (a - 1) * i;
    atmosphere.weather = { dim: v.dim * i, fog: v.fog * i, tint: [mix(v.tint[0]), mix(v.tint[1]), mix(v.tint[2])] };
  }
}
