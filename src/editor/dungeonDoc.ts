import type { DungeonFloorMapDef } from '../data/dungeonFloorMap';
import type { NavGrid } from '../sim/navGrid';
import type { DungeonFloor } from '../world/dungeon';
import { brush, paintFromData, paintToData, type BrushMode, type PaintState } from './navBrush';
import type { EditorObject } from './doc';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Documento pequeño del piso activo; no contiene ni consulta datos del exterior. */
export class DungeonEditorDoc {
  readonly data: DungeonFloorMapDef;
  private readonly original: string;
  private paint: PaintState;
  version = 0;

  constructor(readonly floor: DungeonFloor) {
    this.data = clone(floor.map);
    this.original = JSON.stringify(this.data);
    this.paint = paintFromData(this.data.navPaint, Math.ceil(floor.width / this.data.navPaint.cellSize));
  }

  get scopeId(): string {
    return `${this.data.dungeon}:${this.data.floor}`;
  }

  get dirty(): boolean {
    return JSON.stringify(this.data) !== this.original;
  }

  paintAt(x: number, y: number, radius: number, mode: BrushMode): number {
    const cols = Math.ceil(this.floor.width / this.paint.cellSize);
    const rows = Math.ceil(this.floor.depth / this.paint.cellSize);
    const n = brush(this.paint, cols, rows, x, y, radius, mode);
    if (n) {
      this.data.navPaint = paintToData(this.paint, cols);
      this.version++;
    }
    return n;
  }

  serialize(): string {
    return `${JSON.stringify(this.data, null, 2)}\n`;
  }

  objects(): EditorObject[] {
    const out: EditorObject[] = [];
    const box = (key: string, kind: string, label: string, x: number, y: number, w = 0.8, d = 0.8, h = 1.2): void => {
      out.push({ key, category: 'props', kind, label, x, y, rotDeg: 0, shape: { type: 'box', w, d, h } });
    };
    for (const b of this.floor.breakables) box(`d-break:${b.id}`, b.kind, b.kind === 'jar' ? 'jarra de barro' : 'barril', b.pos.x, b.pos.y, 0.65, 0.65, 0.9);
    for (const d of this.floor.doors) box(`d-door:${d.id}`, 'door', `puerta · ${d.activation === 'proximity' ? 'automática' : 'clic'}`, d.x, d.y, d.horizontal ? d.span : 0.35, d.horizontal ? 0.35 : d.span, 2.4);
    for (const c of this.floor.chests) box(`d-chest:${c.id}`, 'chest', 'cofre', c.pos.x, c.pos.y, 1, 0.8, 0.8);
    box('d-up', 'stairs', 'escalera de subida', this.floor.upStairs.x, this.floor.upStairs.y, 1.5, 1.5, 0.25);
    if (this.floor.downStairs) box('d-down', 'stairs', 'escalera de bajada', this.floor.downStairs.x, this.floor.downStairs.y, 1.5, 1.5, 0.25);
    for (const p of this.floor.pools) out.push({ key: `d-pool:${p.id}`, category: 'water', kind: 'pool', label: p.name, x: p.x, y: p.y, rotDeg: 0, shape: { type: 'circle', r: p.radius } });
    this.floor.spawns.forEach((s, i) => out.push({ key: `d-spawn:${i}`, category: 'npcs', kind: 'spawn', label: `aparición · ${s.archetype}`, x: s.pos.x, y: s.pos.y, rotDeg: 0, shape: { type: 'cyl', r: 0.45, h: 1.8 } }));
    return out;
  }

  find(key: string): EditorObject | null {
    return this.objects().find((o) => o.key === key) ?? null;
  }

  /** Vista previa: copia la rejilla jugable ya reconstruida por CryptScene. */
  previewGrid(current: NavGrid): NavGrid {
    const copy = new (current.constructor as new (w: number, d: number, c: number) => NavGrid)(current.width, current.depth, current.cellSize);
    copy.blocked.set(current.blocked);
    copy.applyPaint(this.data.navPaint);
    return copy;
  }
}
