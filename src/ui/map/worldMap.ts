// Mapa grande (tecla M): ventana arrastrable con zoom (rueda) y desplazamiento
// (arrastrar). Lo no explorado queda bajo la niebla. Clic en un sitio libre
// pone una bandera propia (se nombra y se borra en el lateral); clic derecho
// sobre una bandera la quita. Capas que se encienden y apagan, y coordenadas
// bajo el cursor.
import type { UiContext } from '../menus/context';
import { button, clear, h, toggleChoice } from '../menus/dom';
import { Panel } from '../menus/panel';
import type { KeyValueStore } from '../menus/saveStore';
import { FogLayer, drawLabel, drawMarker, drawQuestMark, imageCanvas } from './mapDraw';
import { FLAG_NAME_MAX, clampView, panView, viewToWorld, worldToView, zoomAt, type MapView, type Vec } from './mapLogic';
import type { MapState } from './mapState';

export const MAP_LAYERS = [
  { id: 'zones', label: 'Zonas y niveles' },
  { id: 'npcs', label: 'Personajes' },
  { id: 'merchants', label: 'Mercaderes' },
  { id: 'stones', label: 'Piedras de viaje' },
  { id: 'quests', label: 'Misiones' },
  { id: 'flags', label: 'Banderas' },
] as const;
export type MapLayerId = (typeof MAP_LAYERS)[number]['id'];

const LAYERS_KEY = 'frankmangames.mapLayers';

export class WorldMap extends Panel {
  private readonly canvas: HTMLCanvasElement;
  private readonly cursorEl: HTMLElement;
  private readonly exploredEl: HTMLElement;
  private readonly flagList: HTMLElement;
  private readonly side: HTMLElement;
  private base: HTMLCanvasElement | null = null;
  private readonly fogLayer: FogLayer;
  private view: MapView | null = null;
  private layers: Record<MapLayerId, boolean>;
  private selected: string | null = null;
  private timer = 0;
  private flagsVersion = -1;
  private hover: Vec | null = null;

  constructor(
    ctx: UiContext,
    private readonly state: MapState,
    private readonly store: KeyValueStore,
    onClose: () => void,
  ) {
    super(ctx, 'Mapa', 'panel-worldmap', onClose);
    this.fogLayer = new FogLayer(state.def.colors.fog);
    this.layers = this.loadLayers();
    this.canvas = h('canvas.wm-canvas');
    this.cursorEl = h('div.wm-cursor', { text: ' ' });
    this.exploredEl = h('div.wm-explored');
    this.flagList = h('div.wm-flags');
    const layerBox = h('div.wm-layers');
    for (const l of MAP_LAYERS) {
      const choice = toggleChoice(l.label, this.layers[l.id], (checked) => {
        this.layers[l.id] = checked;
        this.saveLayers();
        this.timer = 0;
      }, 'wm-layer');
      layerBox.appendChild(choice.el);
    }
    this.side = h('div.wm-side', null,
      this.cursorEl,
      this.exploredEl,
      h('h4', { text: 'Capas' }), layerBox,
      h('h4', { text: 'Banderas' }), this.flagList,
      h('p.hint', { text: 'Clic: poner bandera · clic derecho: quitarla · arrastrar: mover · rueda: zoom' }),
      button('Centrar en mí', () => this.center(), 'small'));
    this.body.appendChild(h('div.wm-wrap', null, h('div.wm-view', null, this.canvas), this.side));
    this.bindCanvas();
  }

  private loadLayers(): Record<MapLayerId, boolean> {
    const out = Object.fromEntries(MAP_LAYERS.map((l) => [l.id, true])) as Record<MapLayerId, boolean>;
    try {
      const raw = JSON.parse(this.store.getItem(LAYERS_KEY) ?? 'null') as Record<string, unknown> | null;
      for (const l of MAP_LAYERS) if (typeof raw?.[l.id] === 'boolean') out[l.id] = raw[l.id] as boolean;
    } catch {
      /* por defecto, todas */
    }
    return out;
  }

  private saveLayers(): void {
    try {
      this.store.setItem(LAYERS_KEY, JSON.stringify(this.layers));
    } catch {
      /* sin almacenamiento */
    }
  }

  override open(): void {
    super.open();
    // Cada apertura empieza en el jugador. El desplazamiento manual sigue vivo
    // mientras el mapa permanece abierto, pero no deja una vista perdida para
    // la siguiente consulta.
    this.center();
    this.timer = 0;
  }

  /** Centra la vista en el jugador (o en el mundo). */
  center(): void {
    const w = this.state.world;
    const p = this.state.frame?.player;
    if (!w) return;
    this.view = { cx: p?.x ?? w.width / 2, cy: p?.y ?? w.depth / 2, zoom: this.view?.zoom ?? this.state.def.bigMap.zoom };
    this.timer = 0;
  }

  private size(): { w: number; h: number; dpr: number } {
    const r = this.canvas.getBoundingClientRect();
    // Tamaño CSS interno del lienzo (sin la escala de la interfaz).
    const scale = this.canvas.offsetWidth > 0 ? r.width / this.canvas.offsetWidth : 1;
    return { w: this.canvas.offsetWidth, h: this.canvas.offsetHeight, dpr: (window.devicePixelRatio || 1) * scale };
  }

  /** Punto del lienzo (en píxeles CSS internos) bajo el evento. */
  private local(e: { clientX: number; clientY: number }): Vec {
    const r = this.canvas.getBoundingClientRect();
    const scale = this.canvas.offsetWidth > 0 ? r.width / this.canvas.offsetWidth : 1;
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  private bindCanvas(): void {
    const c = this.canvas;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.view) return;
      const { w, h: hh } = this.size();
      const b = this.state.def.bigMap;
      this.view = zoomAt(this.view, this.local(e), e.deltaY < 0 ? 1.2 : 1 / 1.2, w, hh, b.zoomMin, b.zoomMax);
      this.timer = 0;
    }, { passive: false });
    c.addEventListener('pointermove', (e) => {
      if (!this.view) return;
      const { w, h: hh } = this.size();
      this.hover = viewToWorld(this.view, this.local(e), w, hh);
      this.updateCursor();
    });
    c.addEventListener('pointerleave', () => {
      this.hover = null;
      this.updateCursor();
    });
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const f = this.flagAt(this.local(e));
      if (f) this.removeFlag(f);
    });
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this.view) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      const start = this.local(e);
      let last = start;
      let moved = false;
      const move = (ev: PointerEvent): void => {
        const p = this.local(ev);
        if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
        moved = true;
        const w = this.state.world!;
        this.view = panView(this.view!, { x: p.x - last.x, y: p.y - last.y }, w.width, w.depth);
        last = p;
        this.timer = 0;
      };
      const up = (ev: PointerEvent): void => {
        c.releasePointerCapture(ev.pointerId);
        c.removeEventListener('pointermove', move);
        c.removeEventListener('pointerup', up);
        c.removeEventListener('pointercancel', up);
        if (!moved && ev.type === 'pointerup') this.clickAt(start);
      };
      c.addEventListener('pointermove', move);
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    });
  }

  private flagAt(p: Vec): string | null {
    const flags = this.state.flags;
    if (!flags || !this.view) return null;
    const { w, h: hh } = this.size();
    return flags.near(viewToWorld(this.view, p, w, hh), 10 / this.view.zoom)?.id ?? null;
  }

  /** Clic sin arrastrar: elegir la bandera de debajo o poner una nueva. */
  private clickAt(p: Vec): void {
    const flags = this.state.flags;
    const world = this.state.world;
    if (!flags || !world || !this.view) return;
    const hit = this.flagAt(p);
    if (hit) {
      this.selected = hit;
      this.renderFlags(true);
      return;
    }
    const { w, h: hh } = this.size();
    const at = viewToWorld(this.view, p, w, hh);
    if (at.x < 0 || at.y < 0 || at.x > world.width || at.y > world.depth) return;
    const f = flags.add(at.x, at.y);
    if (!f) {
      this.ctx.toast(`Como mucho ${this.state.def.maxFlags} banderas`, 'warn');
      return;
    }
    this.selected = f.id;
    this.state.saveFlags();
    this.renderFlags(true);
  }

  private removeFlag(id: string): void {
    if (this.state.flags?.remove(id)) {
      if (this.selected === id) this.selected = null;
      this.state.saveFlags();
      this.renderFlags();
    }
  }

  private updateCursor(): void {
    const w = this.state.world;
    if (!w || !this.hover || this.hover.x < 0 || this.hover.y < 0 || this.hover.x > w.width || this.hover.y > w.depth) {
      this.cursorEl.textContent = ' ';
      return;
    }
    const [x, y] = w.coords(this.hover.x, this.hover.y);
    const known = !this.state.fog || this.state.fog.isRevealed(this.hover.x, this.hover.y);
    const zone = known ? w.zones.find((z) => z.areas.some((a) => (a.type === 'circle' ? (this.hover!.x - a.x) ** 2 + (this.hover!.y - a.y) ** 2 <= a.radius ** 2 : this.hover!.x >= a.x0 && this.hover!.x <= a.x1 && this.hover!.y >= a.y0 && this.hover!.y <= a.y1))) : undefined;
    this.cursorEl.textContent = `[${x}, ${y}]${zone ? ` · ${zone.name}` : known ? '' : ' · sin explorar'}`;
  }

  /** Lista lateral de banderas; la elegida se puede renombrar y borrar. */
  private renderFlags(focus = false): void {
    const flags = this.state.flags;
    this.flagsVersion = this.state.version;
    clear(this.flagList);
    if (!flags || flags.list.length === 0) {
      this.flagList.appendChild(h('p.hint', { text: 'Sin banderas.' }));
      return;
    }
    for (const f of flags.list) {
      const row = h(`div.wm-flag${f.id === this.selected ? '.on' : ''}` as 'div');
      if (f.id === this.selected) {
        const inp = h('input.wm-flag-name', { type: 'text', value: f.name, maxlength: FLAG_NAME_MAX });
        inp.addEventListener('change', () => {
          flags.rename(f.id, inp.value);
          this.state.saveFlags();
        });
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') inp.blur();
        });
        row.append(inp);
        if (focus) setTimeout(() => inp.select(), 0);
      } else {
        const name = h('button.wm-flag-pick', { type: 'button', text: f.name });
        name.addEventListener('click', () => {
          this.selected = f.id;
          if (this.view) this.view = { ...this.view, cx: f.x, cy: f.y };
          this.renderFlags();
        });
        row.append(name);
      }
      const del = h('button.wm-flag-del', { type: 'button', text: '×', title: 'Quitar bandera' });
      del.addEventListener('click', () => this.removeFlag(f.id));
      row.append(del);
      this.flagList.appendChild(row);
    }
  }

  render(): void {
    this.renderFlags();
    this.timer = 0;
  }

  /** Cada fotograma con el mapa abierto (se dibuja a unos 20 Hz). */
  update(dt: number): void {
    if (!this.isOpen) return;
    if (this.flagsVersion !== this.state.version && !this.flagList.contains(document.activeElement)) this.renderFlags();
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1 / 20;
    this.draw();
  }

  private draw(): void {
    const st = this.state;
    const w = st.world;
    const f = st.frame;
    if (!w) return;
    this.view ??= { cx: w.width / 2, cy: w.depth / 2, zoom: st.def.bigMap.zoom };
    this.view = clampView(this.view, w.width, w.depth);
    const v = this.view;
    const { w: cw, h: ch, dpr } = this.size();
    if (cw <= 0 || ch <= 0) return;
    const pw = Math.round(cw * dpr);
    const ph = Math.round(ch * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const ctx = this.canvas.getContext('2d')!;
    const C = st.def.colors;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.fog;
    ctx.fillRect(0, 0, pw, ph);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ppm = st.def.pixelsPerMeter;
    this.base ??= imageCanvas(w.image());
    ctx.save();
    ctx.translate(cw / 2 - v.cx * v.zoom, ch / 2 - (w.depth - v.cy) * v.zoom);
    ctx.scale(v.zoom / ppm, v.zoom / ppm);
    ctx.imageSmoothingEnabled = v.zoom / ppm < 2;
    ctx.drawImage(this.base, 0, 0);
    if (st.fog) {
      this.fogLayer.update(st.fog, st.version);
      this.fogLayer.draw(ctx, st.fog, ppm, w.depth);
    }
    ctx.restore();
    this.exploredEl.textContent = st.fog ? `Explorado: ${Math.round(st.fog.explored * 100)} %` : '';

    const P = (p: Vec): Vec => worldToView(v, p, cw, ch);
    const seen = (p: Vec): boolean => !st.fog || st.fog.isRevealed(p.x, p.y);
    const s = 6;
    // Zonas: contorno y nombre con su franja (se ven aunque no estén exploradas: es geografía conocida).
    if (this.layers.zones) {
      for (const z of w.zones) {
        ctx.save();
        ctx.strokeStyle = z.safe ? 'rgba(143,212,126,.75)' : 'rgba(240,207,138,.55)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        let lx = 0;
        let ly = 0;
        for (const a of z.areas) {
          ctx.beginPath();
          if (a.type === 'circle') {
            const c = P(a);
            ctx.arc(c.x, c.y, a.radius * v.zoom, 0, Math.PI * 2);
            lx += a.x;
            ly += a.y;
          } else {
            const p0 = P({ x: a.x0, y: a.y1 });
            ctx.rect(p0.x, p0.y, (a.x1 - a.x0) * v.zoom, (a.y1 - a.y0) * v.zoom);
            lx += (a.x0 + a.x1) / 2;
            ly += (a.y0 + a.y1) / 2;
          }
          ctx.stroke();
        }
        ctx.restore();
        const c = P({ x: lx / z.areas.length, y: ly / z.areas.length });
        drawLabel(ctx, z.name, c.x, c.y - 8, 13, '#f0cf8a');
        drawLabel(ctx, z.band, c.x, c.y + 8, 11, z.safe ? '#8fd47e' : '#ecdfc3');
      }
    }
    if (f && !f.inside) {
      if (this.layers.stones) {
        for (const z of f.stones) {
          if (!z.known && !seen(z)) continue;
          const q = P(z);
          drawMarker(ctx, 'stone', q.x, q.y, s, z.known ? C.stone : C.stoneUnknown);
          if (v.zoom >= 2.5) drawLabel(ctx, z.name, q.x, q.y + 14, 11, '#d8c8ff');
        }
      }
      for (const n of f.npcs) {
        if (!seen(n)) continue;
        if (n.merchant ? !this.layers.merchants : !this.layers.npcs) continue;
        const q = P(n);
        drawMarker(ctx, n.merchant ? 'merchant' : 'npc', q.x, q.y, s * 0.8, n.merchant ? C.merchant : C.npc);
        if (this.layers.quests && n.marker) drawQuestMark(ctx, n.marker, q.x, q.y, s, C.quest);
        if (v.zoom >= 4) drawLabel(ctx, n.name, q.x, q.y + 13, 11, '#ecdfc3');
      }
      if (this.layers.quests && f.quest) {
        const q = P(f.quest);
        drawMarker(ctx, 'quest', q.x, q.y, s * 1.2, C.quest);
        drawLabel(ctx, f.quest.label, q.x, q.y - 16, 11, C.quest);
      }
    }
    if (this.layers.flags) {
      for (const fl of st.flags?.list ?? []) {
        const q = P(fl);
        drawMarker(ctx, 'flag', q.x, q.y, s * (fl.id === this.selected ? 1.3 : 1), C.flag);
        drawLabel(ctx, fl.name, q.x + 8, q.y - 10, 11, '#ffd2cc', 'left');
      }
    }
    if (f && !f.inside) {
      const q = P(f.player);
      drawMarker(ctx, 'player', q.x, q.y, s * 1.2, C.player, f.cameraYaw);
    }
  }
}
