// Tiempo por zona y noche con efecto en el juego (`data/weather.json`). Sólo
// datos y reglas; nada de DOM ni de render.
//   · Cada zona colocada tira su tiempo con los pesos de su clima y lo cambia
//     cada cierto rato; la intensidad sube y baja poco a poco.
//   · Daño: lluvia debilita el fuego, el solazo (sólo de día) lo refuerza.
//     Es un multiplicador del mundo que se aplica tras la tubería de daño
//     (`src/sim/damage.ts` no se toca).
//   · Nieve (sólo clima frío): se acumula mientras nieva y frena al jugador.
import type { Element } from '../rpg/contracts';
import type { WeatherDef } from '../data/weatherSchema';
import { WEATHER_KINDS, type LevelZoneDef, type WeatherKind } from '../data/zonesSchema';
import type { Rng } from './rng';

/** ¿Es de noche a la hora `t` (0 = medianoche, 0,5 = mediodía)? */
export function isNight(def: WeatherDef, t: number): boolean {
  const { start, end } = def.night;
  return start > end ? t >= start || t < end : t >= start && t < end;
}

export interface ZoneWeather {
  zoneId: string;
  kind: WeatherKind;
  /** 0–1: sube al empezar un tiempo y baja al cambiar. */
  intensity: number;
  /** Tiempo que viene cuando la intensidad llega a 0 (null = ninguno pendiente). */
  pending: WeatherKind | null;
  /** Segundos hasta el próximo cambio. */
  nextChange: number;
  /** Nieve acumulada (0–1). */
  snow: number;
}

export class WeatherSystem {
  private readonly states = new Map<string, ZoneWeather>();
  private readonly weights = new Map<string, Partial<Record<WeatherKind, number>>>();
  night = false;

  constructor(
    readonly def: WeatherDef,
    zones: readonly LevelZoneDef[],
    private readonly rng: Rng,
  ) {
    for (const z of zones) {
      if (z.areas.length === 0) continue;
      const w = z.weather ?? def.climates[z.climate];
      this.weights.set(z.id, w);
      this.states.set(z.id, { zoneId: z.id, kind: this.roll(w), intensity: 1, pending: null, nextChange: this.wait(), snow: 0 });
    }
  }

  private wait(): number {
    return this.rng.range(this.def.changeSeconds.min, this.def.changeSeconds.max);
  }

  private roll(w: Partial<Record<WeatherKind, number>>): WeatherKind {
    let total = 0;
    for (const k of WEATHER_KINDS) total += w[k] ?? 0;
    let x = this.rng.next() * total;
    for (const k of WEATHER_KINDS) {
      x -= w[k] ?? 0;
      if (x < 0) return k;
    }
    return 'clear';
  }

  at(zoneId: string | null | undefined): ZoneWeather | null {
    return zoneId ? (this.states.get(zoneId) ?? null) : null;
  }

  /** Tiempo que cuenta ahora en la zona (el solazo de noche es despejado). */
  kindAt(zoneId: string | null | undefined): WeatherKind {
    const s = this.at(zoneId);
    if (!s) return 'clear';
    return this.def.kinds[s.kind].dayOnly && this.night ? 'clear' : s.kind;
  }

  /** Fuerza un tiempo (pruebas y depuración): entra de golpe a plena intensidad. */
  force(zoneId: string, kind: WeatherKind, intensity = 1): void {
    const s = this.states.get(zoneId);
    if (!s) return;
    s.kind = kind;
    s.intensity = intensity;
    s.pending = null;
    s.nextChange = this.wait();
  }

  tick(dt: number, night: boolean): void {
    this.night = night;
    const fade = this.def.fadeSeconds;
    const step = fade > 0 ? dt / fade : 1;
    for (const s of this.states.values()) {
      s.nextChange -= dt;
      if (s.nextChange <= 0 && s.pending === null) {
        s.pending = this.roll(this.weights.get(s.zoneId)!);
        s.nextChange = this.wait();
        if (s.pending === s.kind) s.pending = null;
      }
      if (s.pending !== null) {
        s.intensity = Math.max(0, s.intensity - step);
        if (s.intensity === 0) {
          s.kind = s.pending;
          s.pending = null;
        }
      } else s.intensity = Math.min(1, s.intensity + step);
      const sn = this.def.snow;
      if (s.kind === 'snow') s.snow = Math.min(1, s.snow + sn.snowPerSecond * s.intensity * dt);
      else s.snow = Math.max(0, s.snow - sn.meltPerSecond * dt);
    }
  }

  /** Multiplicador de daño del elemento en la zona (1 = sin efecto). */
  damageMultiplier(zoneId: string | null | undefined, element: Element): number {
    const s = this.at(zoneId);
    if (!s) return 1;
    const k = this.def.kinds[this.kindAt(zoneId)].damage[element];
    return k === undefined ? 1 : 1 + (k - 1) * s.intensity;
  }

  /** Multiplicador de velocidad del jugador por la nieve acumulada. */
  moveMultiplier(zoneId: string | null | undefined): number {
    const s = this.at(zoneId);
    return s ? 1 - this.def.snow.maxSlow * s.snow : 1;
  }
}
