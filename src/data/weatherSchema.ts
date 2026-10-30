// Tiempo por zona y noche (`data/weather.json`). Todo número es PROPUESTA y
// vive en los datos; aquí sólo se valida y se tipa.
import { ELEMENTS, type Element } from '../rpg/contracts';
import { Reader } from './validate';
import { CLIMATES, WEATHER_KINDS, type Climate, type WeatherKind } from './zonesSchema';

export type Rgb = [number, number, number];

export interface WeatherKindDef {
  name: string;
  /** Multiplicador de daño por elemento a plena intensidad (1 = sin cambio). */
  damage: Partial<Record<Element, number>>;
  /** De noche cuenta como despejado. */
  dayOnly: boolean;
}

export interface WeatherVisualDef {
  /** Partículas por segundo a plena intensidad. */
  particles: number;
  /** Cuánto oscurece la luz (negativo = aclara). */
  dim: number;
  /** Densidad de niebla que suma (o resta). */
  fog: number;
  tint: Rgb;
}

export interface WeatherDef {
  /** De noche si t ≥ start o t < end (t = hora del día en [0, 1)). */
  night: { start: number; end: number };
  changeSeconds: { min: number; max: number };
  fadeSeconds: number;
  climates: Record<Climate, Partial<Record<WeatherKind, number>>>;
  kinds: Record<WeatherKind, WeatherKindDef>;
  snow: { snowPerSecond: number; meltPerSecond: number; maxSlow: number };
  visual: Record<WeatherKind, WeatherVisualDef>;
}

function weights(r: Reader, raw: unknown, climate: Climate): Partial<Record<WeatherKind, number>> {
  const o = r.obj(raw);
  const out: Partial<Record<WeatherKind, number>> = {};
  for (const k of Object.keys(o)) {
    if (k.startsWith('_')) continue;
    if (!(WEATHER_KINDS as readonly string[]).includes(k)) r.fail(k, `tiempo desconocido (usa ${WEATHER_KINDS.join(', ')})`);
    out[k as WeatherKind] = r.num(o, k, { min: 0, max: 100 });
  }
  if ((out.snow ?? 0) > 0 && climate !== 'cold') r.fail('snow', 'sólo nieva en clima "cold"');
  if (!Object.values(out).some((v) => v > 0)) r.fail('', 'hace falta al menos un tiempo con peso');
  return out;
}

export function parseWeather(raw: unknown): WeatherDef {
  const r = new Reader('weather.json');
  const o = r.obj(raw);
  const nc = r.child('night');
  const n = nc.obj(o['night']);
  const cc = r.child('changeSeconds');
  const ch = cc.obj(o['changeSeconds']);
  const cmin = cc.num(ch, 'min', { min: 1 });
  const climC = r.child('climates');
  const climO = climC.obj(o['climates']);
  const climates = {} as WeatherDef['climates'];
  for (const c of CLIMATES) climates[c] = weights(climC.child(c), climO[c], c);
  const kc = r.child('kinds');
  const ko = kc.obj(o['kinds']);
  const vc = r.child('visual');
  const vo = vc.obj(o['visual']);
  const kinds = {} as WeatherDef['kinds'];
  const visual = {} as WeatherDef['visual'];
  for (const k of WEATHER_KINDS) {
    const c = kc.child(k);
    const d = c.obj(ko[k]);
    const damage: Partial<Record<Element, number>> = {};
    if (d['damage'] !== undefined) {
      const dc = c.child('damage');
      const dm = dc.obj(d['damage']);
      for (const el of Object.keys(dm)) {
        if (!(ELEMENTS as readonly string[]).includes(el)) dc.fail(el, `elemento desconocido (usa ${ELEMENTS.join(', ')})`);
        damage[el as Element] = dc.num(dm, el, { min: 0, max: 5 });
      }
    }
    kinds[k] = { name: c.str(d, 'name'), damage, dayOnly: d['dayOnly'] === true };
    const v = vc.child(k);
    const vv = v.obj(vo[k]);
    const tint = v.arr(vv, 'tint');
    if (tint.length !== 3 || tint.some((x) => typeof x !== 'number' || x < 0 || x > 2)) v.fail('tint', 'se esperaba [r, g, b] con valores 0–2');
    visual[k] = {
      particles: v.num(vv, 'particles', { min: 0, max: 20000 }),
      dim: v.num(vv, 'dim', { min: -1, max: 1 }),
      fog: v.num(vv, 'fog', { min: -0.05, max: 0.1 }),
      tint: tint as Rgb,
    };
  }
  const sc = r.child('snow');
  const so = sc.obj(o['snow']);
  return {
    night: { start: nc.num(n, 'start', { min: 0, max: 1 }), end: nc.num(n, 'end', { min: 0, max: 1 }) },
    changeSeconds: { min: cmin, max: cc.num(ch, 'max', { min: cmin }) },
    fadeSeconds: r.num(o, 'fadeSeconds', { min: 0, max: 120 }),
    climates,
    kinds,
    snow: {
      snowPerSecond: sc.num(so, 'snowPerSecond', { min: 0, max: 1 }),
      meltPerSecond: sc.num(so, 'meltPerSecond', { min: 0, max: 1 }),
      maxSlow: sc.num(so, 'maxSlow', { min: 0, max: 0.9 }),
    },
    visual,
  };
}
