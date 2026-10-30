// Lógica pura del minimapa y del mapa grande: datos de `data/ui/map.json`,
// proyección mundo → pantalla (norte fijo o girando con la cámara), vista con
// zoom y desplazamiento, niebla de guerra, banderas del jugador y hacia dónde
// apunta la flecha de la misión seguida. Sin DOM: se testea en Node.
//
// Ejes: x crece hacia el este y la y del plano (Z del mundo) hacia el norte,
// así que en pantalla la y va al revés.
import { Reader } from '../../data/validate';
import type { QuestDef } from '../../rpg/contracts';

export interface Vec {
  x: number;
  y: number;
}

// ─── Datos ──────────────────────────────────────────────────────────────────

export const MAP_COLOR_KEYS = [
  'water', 'waterEdge', 'house', 'houseEdge', 'tree', 'village', 'fog', 'player', 'npc', 'merchant', 'loot', 'stone', 'stoneUnknown', 'quest', 'flag',
] as const;
export type MapColorKey = (typeof MAP_COLOR_KEYS)[number];

export interface AutoScaleDef {
  refWidth: number;
  refHeight: number;
  boost: number;
  min: number;
  max: number;
  step: number;
  bigScreenPx: number;
  bigScreenBonus: number;
}

export interface MapDef {
  pixelsPerMeter: number;
  fogCellMeters: number;
  revealRadius: number;
  minimap: { size: number; minSize: number; maxSize: number; radius: number; zoomMin: number; zoomMax: number };
  bigMap: { zoom: number; zoomMin: number; zoomMax: number };
  maxFlags: number;
  colors: Record<MapColorKey, string>;
  autoScale: AutoScaleDef;
}

export function parseMapDef(raw: unknown): MapDef {
  const r = new Reader('ui/map.json');
  const o = r.obj(raw);
  const mm = r.child('minimap');
  const mo = mm.obj(o['minimap'], 'minimap');
  const bm = r.child('bigMap');
  const bo = bm.obj(o['bigMap'], 'bigMap');
  const cr = r.child('colors');
  const co = cr.obj(o['colors'], 'colors');
  const colors = {} as Record<MapColorKey, string>;
  for (const k of MAP_COLOR_KEYS) {
    const c = cr.str(co, k);
    if (!/^#[0-9a-f]{6}$/i.test(c)) cr.fail(k, `color no válido "${c}"`);
    colors[k] = c;
  }
  const ar = r.child('autoScale');
  const ao = ar.obj(o['autoScale'], 'autoScale');
  const minimap = {
    size: mm.num(mo, 'size', { min: 80, max: 800 }),
    minSize: mm.num(mo, 'minSize', { min: 60, max: 800 }),
    maxSize: mm.num(mo, 'maxSize', { min: 80, max: 1200 }),
    radius: mm.num(mo, 'radius', { min: 5, max: 500 }),
    zoomMin: mm.num(mo, 'zoomMin', { min: 0.1, max: 10 }),
    zoomMax: mm.num(mo, 'zoomMax', { min: 0.1, max: 10 }),
  };
  if (minimap.minSize > minimap.size || minimap.size > minimap.maxSize) mm.fail('size', 'debe estar entre minSize y maxSize');
  const bigMap = { zoom: bm.num(bo, 'zoom', { min: 0.1, max: 50 }), zoomMin: bm.num(bo, 'zoomMin', { min: 0.1, max: 50 }), zoomMax: bm.num(bo, 'zoomMax', { min: 0.1, max: 50 }) };
  if (bigMap.zoomMin > bigMap.zoom || bigMap.zoom > bigMap.zoomMax) bm.fail('zoom', 'debe estar entre zoomMin y zoomMax');
  return {
    pixelsPerMeter: r.num(o, 'pixelsPerMeter', { min: 0.25, max: 8 }),
    fogCellMeters: r.num(o, 'fogCellMeters', { min: 1, max: 64 }),
    revealRadius: r.num(o, 'revealRadius', { min: 1, max: 500 }),
    minimap,
    bigMap,
    maxFlags: r.num(o, 'maxFlags', { min: 1, max: 500, int: true }),
    colors,
    autoScale: {
      refWidth: ar.num(ao, 'refWidth', { min: 320 }),
      refHeight: ar.num(ao, 'refHeight', { min: 240 }),
      boost: ar.num(ao, 'boost', { min: 0.5, max: 3 }),
      min: ar.num(ao, 'min', { min: 0.25, max: 4 }),
      max: ar.num(ao, 'max', { min: 0.25, max: 4 }),
      step: ar.num(ao, 'step', { min: 0.01, max: 1 }),
      bigScreenPx: ar.num(ao, 'bigScreenPx', { min: 0 }),
      bigScreenBonus: ar.num(ao, 'bigScreenBonus', { min: 0, max: 2 }),
    },
  };
}

// ─── Proyección ─────────────────────────────────────────────────────────────

/**
 * Punto del mundo → píxel del minimapa (lado `size`, centrado en `center`).
 * `yawRad` es el giro de la cámara: con 0 el norte queda arriba; con el de la
 * cámara, arriba queda hacia donde mira (avance = (sin yaw, cos yaw)).
 */
export function projectToMinimap(p: Vec, center: Vec, yawRad: number, pxPerMeter: number, size: number): Vec {
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  // Derecha de la cámara = (cos, −sin); avance = (sin, cos).
  const right = dx * c - dy * s;
  const ahead = dx * s + dy * c;
  return { x: size / 2 + right * pxPerMeter, y: size / 2 - ahead * pxPerMeter };
}

/** Inversa de `projectToMinimap`. */
export function minimapToWorld(px: Vec, center: Vec, yawRad: number, pxPerMeter: number, size: number): Vec {
  const right = (px.x - size / 2) / pxPerMeter;
  const ahead = (size / 2 - px.y) / pxPerMeter;
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return { x: center.x + right * c + ahead * s, y: center.y - right * s + ahead * c };
}

/**
 * Si `p` (en píxeles, respecto al centro del minimapa) cae fuera del círculo de
 * radio `r`, lo lleva al borde. Sirve para la flecha de la misión.
 */
export function clampToRing(p: Vec, size: number, r: number): { x: number; y: number; outside: boolean; angle: number } {
  const dx = p.x - size / 2;
  const dy = p.y - size / 2;
  const d = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  if (d <= r) return { x: p.x, y: p.y, outside: false, angle };
  return { x: size / 2 + (dx / d) * r, y: size / 2 + (dy / d) * r, outside: true, angle };
}

/**
 * Igual para un minimapa cuadrado: lleva `p` al borde del cuadrado de lado
 * `size` menos `margin` si cae fuera, siguiendo la recta desde el centro.
 */
export function clampToBox(p: Vec, size: number, margin: number): { x: number; y: number; outside: boolean; angle: number } {
  const half = size / 2 - margin;
  const dx = p.x - size / 2;
  const dy = p.y - size / 2;
  const angle = Math.atan2(dy, dx);
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  if (m <= half) return { x: p.x, y: p.y, outside: false, angle };
  const k = half / m;
  return { x: size / 2 + dx * k, y: size / 2 + dy * k, outside: true, angle };
}

/** Vista del mapa grande: punto del mundo en el centro y píxeles por metro. */
export interface MapView {
  cx: number;
  cy: number;
  zoom: number;
}

export function worldToView(v: MapView, p: Vec, w: number, h: number): Vec {
  return { x: w / 2 + (p.x - v.cx) * v.zoom, y: h / 2 - (p.y - v.cy) * v.zoom };
}

export function viewToWorld(v: MapView, s: Vec, w: number, h: number): Vec {
  return { x: v.cx + (s.x - w / 2) / v.zoom, y: v.cy - (s.y - h / 2) / v.zoom };
}

/** Acerca o aleja `factor` veces dejando quieto el punto del mundo bajo el cursor `s`. */
export function zoomAt(v: MapView, s: Vec, factor: number, w: number, h: number, min: number, max: number): MapView {
  const zoom = Math.min(max, Math.max(min, v.zoom * factor));
  const before = viewToWorld(v, s, w, h);
  const k = { ...v, zoom };
  const after = viewToWorld(k, s, w, h);
  return { cx: v.cx + before.x - after.x, cy: v.cy + before.y - after.y, zoom };
}

/** Desplaza la vista `d` píxeles (arrastrar) y mantiene el centro dentro del mundo. */
export function panView(v: MapView, d: Vec, worldW: number, worldD: number): MapView {
  return clampView({ ...v, cx: v.cx - d.x / v.zoom, cy: v.cy + d.y / v.zoom }, worldW, worldD);
}

export function clampView(v: MapView, worldW: number, worldD: number): MapView {
  return { zoom: v.zoom, cx: Math.min(worldW, Math.max(0, v.cx)), cy: Math.min(worldD, Math.max(0, v.cy)) };
}

// ─── Niebla de guerra ───────────────────────────────────────────────────────

/** Casillas descubiertas del mundo (un bit por casilla). Se guarda en base64 por personaje. */
export class FogOfWar {
  readonly cols: number;
  readonly rows: number;
  readonly bits: Uint8Array;
  private count = 0;

  constructor(readonly width: number, readonly depth: number, readonly cell: number) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(depth / cell);
    this.bits = new Uint8Array(Math.ceil((this.cols * this.rows) / 8));
  }

  private index(c: number, r: number): number {
    return r * this.cols + c;
  }

  isCellRevealed(c: number, r: number): boolean {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return false;
    const i = this.index(c, r);
    return (this.bits[i >> 3]! & (1 << (i & 7))) !== 0;
  }

  isRevealed(x: number, y: number): boolean {
    return this.isCellRevealed(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  /** Descubre las casillas cuyo centro está a menos de `radius` de (x, y). Devuelve si cambió algo. */
  reveal(x: number, y: number, radius: number): boolean {
    const c0 = Math.max(0, Math.floor((x - radius) / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius) / this.cell));
    const r0 = Math.max(0, Math.floor((y - radius) / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius) / this.cell));
    const r2 = radius * radius;
    let changed = false;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cx = (c + 0.5) * this.cell - x;
        const cy = (r + 0.5) * this.cell - y;
        if (cx * cx + cy * cy > r2) continue;
        const i = this.index(c, r);
        const m = 1 << (i & 7);
        if (this.bits[i >> 3]! & m) continue;
        this.bits[i >> 3]! |= m;
        this.count++;
        changed = true;
      }
    }
    return changed;
  }

  /** Fracción del mundo descubierta (0–1). */
  get explored(): number {
    return this.count / (this.cols * this.rows);
  }

  serialize(): string {
    let s = '';
    for (const b of this.bits) s += String.fromCharCode(b);
    return btoa(s);
  }

  /** Lee lo guardado; si no cuadra con el tamaño del mundo (otro mapa, datos rotos) empieza de cero. */
  static load(saved: unknown, width: number, depth: number, cell: number): FogOfWar {
    const fog = new FogOfWar(width, depth, cell);
    if (typeof saved !== 'string') return fog;
    let raw: string;
    try {
      raw = atob(saved);
    } catch {
      return fog;
    }
    if (raw.length !== fog.bits.length) return fog;
    for (let i = 0; i < raw.length; i++) fog.bits[i] = raw.charCodeAt(i) & 0xff;
    // Bits de relleno tras la última casilla: fuera.
    const total = fog.cols * fog.rows;
    for (let i = total; i < fog.bits.length * 8; i++) fog.bits[i >> 3]! &= ~(1 << (i & 7));
    for (let i = 0; i < total; i++) if (fog.bits[i >> 3]! & (1 << (i & 7))) fog.count++;
    return fog;
  }
}

/** Formato guardado de la niebla (con el tamaño de casilla, por si cambian los datos). */
export interface FogSave {
  cell: number;
  bits: string;
}

export function loadFog(saved: unknown, width: number, depth: number, cell: number): FogOfWar {
  const s = saved as Partial<FogSave> | null;
  if (!s || typeof s !== 'object' || s.cell !== cell) return new FogOfWar(width, depth, cell);
  return FogOfWar.load(s.bits, width, depth, cell);
}

export function saveFog(f: FogOfWar): FogSave {
  return { cell: f.cell, bits: f.serialize() };
}

// ─── Banderas ───────────────────────────────────────────────────────────────

export interface MapFlag {
  id: string;
  name: string;
  x: number;
  y: number;
}

export const FLAG_NAME_MAX = 32;

/** Banderas que pone el jugador en el mapa (se guardan por personaje). */
export class FlagBook {
  readonly list: MapFlag[] = [];
  private next = 1;

  constructor(readonly width: number, readonly depth: number, readonly max: number, saved: unknown = null) {
    if (!Array.isArray(saved)) return;
    for (const f of saved as unknown[]) {
      const o = f as Partial<MapFlag> | null;
      if (!o || typeof o.id !== 'string' || !Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
      if (this.list.length >= max || this.list.some((x) => x.id === o.id)) continue;
      this.list.push({ id: o.id, name: FlagBook.cleanName(o.name, `Bandera ${this.list.length + 1}`), x: this.clampX(o.x!), y: this.clampY(o.y!) });
      const n = /^f(\d+)$/.exec(o.id);
      if (n) this.next = Math.max(this.next, Number(n[1]) + 1);
    }
  }

  static cleanName(name: unknown, fallback: string): string {
    const s = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, FLAG_NAME_MAX) : '';
    return s || fallback;
  }

  private clampX(x: number): number {
    return Math.min(this.width, Math.max(0, x));
  }

  private clampY(y: number): number {
    return Math.min(this.depth, Math.max(0, y));
  }

  get full(): boolean {
    return this.list.length >= this.max;
  }

  /** Pone una bandera; null si ya hay el máximo. */
  add(x: number, y: number, name?: string): MapFlag | null {
    if (this.full) return null;
    const id = `f${this.next++}`;
    const f = { id, name: FlagBook.cleanName(name, `Bandera ${this.list.length + 1}`), x: this.clampX(x), y: this.clampY(y) };
    this.list.push(f);
    return f;
  }

  get(id: string): MapFlag | undefined {
    return this.list.find((f) => f.id === id);
  }

  rename(id: string, name: string): boolean {
    const f = this.get(id);
    if (!f) return false;
    f.name = FlagBook.cleanName(name, f.name);
    return true;
  }

  remove(id: string): boolean {
    const i = this.list.findIndex((f) => f.id === id);
    if (i < 0) return false;
    this.list.splice(i, 1);
    return true;
  }

  /** La bandera más cercana a `p` a menos de `radius` m, o null. */
  near(p: Vec, radius: number): MapFlag | null {
    let best: MapFlag | null = null;
    let bd = radius;
    for (const f of this.list) {
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if (d <= bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  toJSON(): MapFlag[] {
    return this.list.map((f) => ({ ...f }));
  }
}

// ─── Misión seguida ─────────────────────────────────────────────────────────

/** Lo que hace falta de la misión seguida (forma de `QuestView`). */
export interface TrackedQuest {
  id: string;
  name: string;
  state: string;
  turnIn: { id: string; name: string };
  objectives: { done: boolean; text: string }[];
}

export interface QuestTarget extends Vec {
  label: string;
}

/**
 * Hacia dónde apunta la flecha de la misión: si está lista, al PNJ de la
 * entrega; si no, al primer objetivo sin cumplir que tenga lugar (punto a
 * alcanzar, zona de la cacería, PNJ con quien hablar, el agua más cercana
 * para pescar). Recoger objetos no tiene lugar fijo: entonces no hay flecha.
 */
export function questTarget(q: TrackedQuest | null, def: QuestDef | undefined, npcAt: (id: string) => Vec | null, waters: readonly Vec[], from: Vec): QuestTarget | null {
  if (!q) return null;
  if (q.state === 'ready') {
    const p = npcAt(q.turnIn.id);
    return p ? { ...p, label: `Entregar a ${q.turnIn.name}` } : null;
  }
  if (!def) return null;
  for (const [i, o] of def.objectives.entries()) {
    if (q.objectives[i]?.done) continue;
    const label = q.objectives[i]?.text ?? o.text;
    switch (o.type) {
      case 'reach':
        return { x: o.x, y: o.y, label };
      case 'kill':
        if (o.spawn) return { x: o.spawn.x, y: o.spawn.y, label };
        break;
      case 'talk': {
        const p = npcAt(o.npcId);
        if (p) return { ...p, label };
        break;
      }
      case 'fish': {
        let best: Vec | null = null;
        for (const w of waters) if (!best || Math.hypot(w.x - from.x, w.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y)) best = w;
        if (best) return { x: best.x, y: best.y, label };
        break;
      }
      default:
        break;
    }
  }
  return null;
}

/** Rumbo (rad, 0 = norte, horario) de `from` a `to` en el plano. */
export function bearing(from: Vec, to: Vec): number {
  return Math.atan2(to.x - from.x, to.y - from.y);
}
