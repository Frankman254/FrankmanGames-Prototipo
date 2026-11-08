// Minimapa del HUD: arrastrable por su cabecera (WindowLayout) y
// redimensionable con libertad (borde izquierdo, borde de abajo o la esquina,
// con cualquier proporción). Al cambiar el tamaño se ve más o menos terreno a
// la misma escala: la imagen se recorta, nunca se estira. Norte fijo o girando con la cámara, zoom con
// la rueda o los botones, brújula con los puntos cardinales y flecha hacia el
// objetivo de la misión seguida. La imagen base se genera una vez; encima se
// pintan los marcadores unas 30 veces por segundo.
import { language, tr } from '../../i18n';
import type { KeyValueStore } from '../menus/saveStore';
import { interiorPixels, type InteriorColors, type InteriorGrid } from './interiorMap';
import { h } from '../menus/dom';
import { FogLayer, drawBackdrop, drawLabel, drawMarker, drawQuestMark, imageCanvas, drawQuestArea } from './mapDraw';
import { clampMinimapSize, clampToBox, minimapPixelsPerMeter, projectToMinimap, resizeMinimap, type MinimapSize } from './mapLogic';
import { drawCompass, drawFrame, drawScaleBar, drawVignette, drawViewCone, type MinimapDecorColors } from './minimapDecor';
import type { MapFrame, MapState } from './mapState';

const PREFS_KEY = 'frankmangames.minimap';

interface MinimapPrefs {
  rotate: boolean;
  zoom: number;
}

/** Suelo y pared de los interiores (F26). */
const INSIDE_COLORS: InteriorColors = { floor: [150, 128, 92], wall: [62, 50, 38] };

export class Minimap {
  private insideCanvas: HTMLCanvasElement | null = null;
  private insideKey = '';
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly title: HTMLElement;
  private readonly northBtn: HTMLButtonElement;
  private base: HTMLCanvasElement | null = null;
  private readonly fogLayer: FogLayer;
  private prefs: MinimapPrefs;
  private size: MinimapSize;
  private timer = 0;
  /** Al soltar un asa tras cambiar el tamaño (para guardarlo en el perfil). */
  onResize: ((size: MinimapSize) => void) | null = null;

  constructor(
    private readonly state: MapState,
    private readonly store: KeyValueStore,
    onOpenMap: () => void,
    mapKey: string,
  ) {
    const d = state.def.minimap;
    this.size = { w: d.size, h: d.size };
    this.prefs = this.loadPrefs();
    this.fogLayer = new FogLayer(state.def.colors.fog);
    this.title = h('span.mm-title');
    this.northBtn = h('button.mm-btn', { type: 'button' });
    this.northBtn.addEventListener('click', () => {
      this.prefs.rotate = !this.prefs.rotate;
      this.savePrefs();
      this.syncButtons();
    });
    const zoomBtn = (text: string, k: number, tip: string): HTMLButtonElement => {
      const b = h('button.mm-btn', { type: 'button', text, title: tip });
      b.addEventListener('click', () => this.zoomBy(k));
      return b;
    };
    const mapBtn = h('button.mm-btn', { type: 'button', text: '▦', title: `Mapa (${mapKey})` });
    mapBtn.addEventListener('click', onOpenMap);
    const head = h('div.mm-head', null, this.title, h('span.mm-tools', null, this.northBtn, zoomBtn('−', 1 / 1.25, 'Alejar'), zoomBtn('+', 1.25, 'Acercar'), mapBtn));
    this.canvas = h('canvas.mm-canvas');
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }, { passive: false });
    this.canvas.addEventListener('dblclick', onOpenMap);
    const grips = [
      h('div.mm-resize.mm-resize-w', { title: 'Cambiar el ancho' }),
      h('div.mm-resize.mm-resize-h', { title: 'Cambiar el alto' }),
      h('div.mm-resize.mm-resize-wh', { title: 'Cambiar el tamaño' }),
    ];
    this.el = h('div.minimap.hud-bar-zone', { 'data-hud-label': 'Minimapa' }, head, this.canvas, ...grips);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.dragHandle = head;
    this.bindResize(grips[0]!, { w: true, h: false });
    this.bindResize(grips[1]!, { w: false, h: true });
    this.bindResize(grips[2]!, { w: true, h: true });
    this.syncButtons();
    this.setSize(this.size);
  }

  /** Cabecera por la que se arrastra (la registra el montaje en WindowLayout). */
  readonly dragHandle: HTMLElement;

  private loadPrefs(): MinimapPrefs {
    const d = this.state.def.minimap;
    try {
      const raw = JSON.parse(this.store.getItem(PREFS_KEY) ?? 'null') as Partial<MinimapPrefs> | null;
      const zoom = typeof raw?.zoom === 'number' && Number.isFinite(raw.zoom) ? Math.min(d.zoomMax, Math.max(d.zoomMin, raw.zoom)) : 1;
      return { rotate: raw?.rotate === true, zoom };
    } catch {
      return { rotate: false, zoom: 1 };
    }
  }

  private savePrefs(): void {
    try {
      this.store.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* sin almacenamiento */
    }
  }

  private syncButtons(): void {
    this.northBtn.textContent = this.prefs.rotate ? '⟳' : 'N';
    this.northBtn.title = this.prefs.rotate ? 'Gira con la cámara (clic: norte fijo)' : 'Norte fijo arriba (clic: girar con la cámara)';
    this.timer = 0;
  }

  zoomBy(k: number): void {
    const d = this.state.def.minimap;
    this.prefs.zoom = Math.min(d.zoomMax, Math.max(d.zoomMin, this.prefs.zoom * k));
    this.savePrefs();
    this.timer = 0;
  }

  get currentSize(): MinimapSize {
    return { ...this.size };
  }

  /** Ancho y alto en píxeles CSS (null = el cuadrado de los datos). */
  setSize(size: MinimapSize | null): void {
    const d = this.state.def.minimap;
    this.size = clampMinimapSize(size ?? { w: d.size, h: d.size }, d);
    this.el.style.setProperty('--mm-w', `${this.size.w}px`);
    this.el.style.setProperty('--mm-h', `${this.size.h}px`);
    this.timer = 0;
  }

  /**
   * Asa de tamaño (abajo a la derecha, como en todas las ventanas): `edges` dice qué lados mueve.
   * Hacia la derecha crece el ancho y hacia abajo el alto; la esquina de arriba a la izquierda
   * se queda quieta y el minimapa no sale de la pantalla.
   */
  private bindResize(grip: HTMLElement, edges: { w: boolean; h: boolean }): void {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      grip.setPointerCapture(e.pointerId);
      const r = this.el.getBoundingClientRect();
      const scale = this.el.offsetWidth > 0 ? r.width / this.el.offsetWidth : 1;
      const start = { ...this.size };
      const sx = e.clientX;
      const sy = e.clientY;
      const leftEdge = r.left;
      // Anclado a la derecha por la hoja de estilos: se fija donde está para crecer hacia la derecha.
      if (!this.el.classList.contains('win-placed')) {
        const parent = (this.el.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0 };
        this.el.style.setProperty('left', `${(r.left - parent.left) / scale}px`, 'important');
        this.el.style.setProperty('top', `${(r.top - parent.top) / scale}px`, 'important');
        this.el.style.setProperty('right', 'auto', 'important');
        this.el.classList.add('win-placed');
      }
      this.el.classList.add('mm-resizing');
      const move = (ev: PointerEvent): void => {
        // Sin salirse de la pantalla por la derecha ni por abajo.
        const maxDx = window.innerWidth - 4 - r.right;
        const maxDy = window.innerHeight - 4 - r.bottom;
        this.setSize(resizeMinimap(start, Math.min(ev.clientX - sx, maxDx), Math.min(ev.clientY - sy, maxDy), scale, edges, this.state.def.minimap));
        // Se corrige con lo medido: el zoom de la interfaz no descoloca el borde izquierdo.
        const left = parseFloat(this.el.style.left) || 0;
        const now = this.el.getBoundingClientRect();
        this.el.style.setProperty('left', `${left + (leftEdge - now.left) / scale}px`, 'important');
        this.draw();
      };
      const up = (ev: PointerEvent): void => {
        grip.releasePointerCapture(ev.pointerId);
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        this.el.classList.remove('mm-resizing');
        this.onResize?.(this.currentSize);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
  }

  /** Cada fotograma (se dibuja a unos 30 Hz). */
  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0 || this.el.hidden) return;
    this.timer = 1 / 30;
    this.draw();
  }

  /** F26: lo descubierto del interior, con el jugador en el centro y lo que haya cerca. */
  private drawInside(ctx: CanvasRenderingContext2D, f: MapFrame, g: InteriorGrid, px: number, py: number, scale: number): void {
    const st = this.state;
    const fog = st.interiors.fogFor(f.inside!, g);
    const key = `${f.inside}|${st.version}`;
    if (this.insideKey !== key) {
      this.insideKey = key;
      const c = (this.insideCanvas ??= document.createElement('canvas'));
      c.width = g.cols;
      c.height = g.rows;
      const img = new ImageData(interiorPixels(g, fog, INSIDE_COLORS), g.cols, g.rows);
      c.getContext('2d')!.putImageData(img, 0, 0);
    }
    const yaw = this.prefs.rotate ? f.cameraYaw : 0;
    const k = minimapPixelsPerMeter(st.def.minimap, this.prefs.zoom, scale) * 3;
    ctx.save();
    ctx.translate(px / 2, py / 2);
    ctx.rotate(-yaw);
    ctx.scale(k, -k);
    ctx.translate(-f.player.x, -f.player.y);
    ctx.imageSmoothingEnabled = false;
    // La fila 0 de la imagen es la de menor y: con la escala invertida queda abajo.
    ctx.drawImage(this.insideCanvas!, g.originX, g.originY, g.cols * g.cellSize, g.rows * g.cellSize);
    ctx.restore();
    const C = st.def.colors;
    const s = 5 * scale;
    const P = (p: { x: number; y: number }): { x: number; y: number } => projectToMinimap(p, f.player, yaw, k, px, py);
    const seen = (p: { x: number; y: number }): boolean => fog.isRevealed(p.x - g.originX, p.y - g.originY);
    for (const l of f.loot) if (seen(l)) drawMarker(ctx, 'loot', P(l).x, P(l).y, s * 0.9, C.loot);
    for (const e of f.enemies) if (seen(e)) drawMarker(ctx, 'enemy', P(e).x, P(e).y, s, e.color);
    drawMarker(ctx, 'player', px / 2, py / 2, s * 1.2, C.player, this.prefs.rotate ? 0 : f.cameraYaw);
  }

  /** Colores del tema para el marco (el borde del minimapa ya lleva el del tema, resuelto). */
  private decorColors(): MinimapDecorColors {
    const cs = getComputedStyle(this.el);
    return { band: cs.borderTopColor || '#b02a1c', gold: cs.getPropertyValue('--gold').trim() || '#f5b83d' };
  }

  private draw(): void {
    const st = this.state;
    const f = st.frame;
    const w = st.world;
    const def = st.def;
    const C = def.colors;
    const dpr = window.devicePixelRatio || 1;
    // El lienzo sigue el tamaño real en pantalla (escala de la interfaz incluida).
    const shown = this.canvas.getBoundingClientRect();
    const uiScale = shown.width > 0 ? shown.width / this.size.w : 1;
    const px = Math.max(1, Math.round(this.size.w * uiScale * dpr));
    const py = Math.max(1, Math.round(this.size.h * uiScale * dpr));
    if (this.canvas.width !== px || this.canvas.height !== py) {
      this.canvas.width = px;
      this.canvas.height = py;
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.fog;
    ctx.fillRect(0, 0, px, py);
    if (!f || !w) return;
    if (f.inside) {
      this.title.textContent = tr(f.inside);
      if (!f.interiorGrid) {
        drawLabel(ctx, 'Sin mapa aquí dentro', px / 2, py / 2, 13 * dpr, '#b4a382');
        return;
      }
      this.drawInside(ctx, f, f.interiorGrid, px, py, uiScale * dpr);
      return;
    }
    const [cx, cy] = w.coords(f.player.x, f.player.y);
    this.title.textContent = `[${cx}, ${cy}]`;
    const yaw = this.prefs.rotate ? f.cameraYaw : 0;
    const ppm = def.pixelsPerMeter;
    // Píxeles del lienzo por metro del mundo: no cambian con el tamaño del minimapa.
    const k = minimapPixelsPerMeter(def.minimap, this.prefs.zoom, uiScale * dpr);
    this.base ??= imageCanvas(w.image());
    ctx.save();
    ctx.translate(px / 2, py / 2);
    ctx.rotate(-yaw);
    ctx.scale(k / ppm, k / ppm);
    ctx.translate(-f.player.x * ppm, -(w.depth - f.player.y) * ppm);
    ctx.imageSmoothingEnabled = true;
    if (w.backdrop) drawBackdrop(ctx, w.backdrop(), ppm, w.depth);
    ctx.drawImage(this.base, 0, 0);
    if (st.fog) {
      this.fogLayer.update(st.fog, st.version);
      this.fogLayer.draw(ctx, st.fog, ppm, w.depth);
    }
    ctx.restore();

    const P = (p: { x: number; y: number }): { x: number; y: number } => projectToMinimap(p, f.player, yaw, k, px, py);
    // P11: viñeta y cono de visión (debajo de los marcadores).
    drawVignette(ctx, px, py);
    drawViewCone(ctx, px, py, this.prefs.rotate ? 0 : f.cameraYaw, 5 * dpr);
    const inBox = (q: { x: number; y: number }): boolean => q.x >= -8 && q.y >= -8 && q.x <= px + 8 && q.y <= py + 8;
    const s = 5 * dpr;
    const seen = (p: { x: number; y: number }): boolean => !st.fog || st.fog.isRevealed(p.x, p.y);
    for (const z of f.stones) {
      const q = P(z);
      if (inBox(q) && (z.known || seen(z))) drawMarker(ctx, 'stone', q.x, q.y, s, z.known ? C.stone : C.stoneUnknown);
    }
    for (const l of f.loot) {
      const q = P(l);
      if (inBox(q)) drawMarker(ctx, 'loot', q.x, q.y, s * 0.9, C.loot);
    }
    for (const e of f.enemies) {
      const q = P(e);
      if (inBox(q)) drawMarker(ctx, 'enemy', q.x, q.y, s, e.color);
    }
    for (const n of f.npcs) {
      const q = P(n);
      if (!inBox(q) || !seen(n)) continue;
      drawMarker(ctx, n.merchant ? 'merchant' : 'npc', q.x, q.y, s * 0.85, n.merchant ? C.merchant : C.npc);
      if (n.marker) drawQuestMark(ctx, n.marker, q.x, q.y, s, C.quest);
    }
    for (const fl of st.flags?.list ?? []) {
      const q = P(fl);
      if (inBox(q)) drawMarker(ctx, 'flag', q.x, q.y, s, C.flag);
    }
    // Jugador: en el centro; con norte fijo la flecha mira hacia donde mira la cámara.
    drawMarker(ctx, 'player', px / 2, py / 2, s * 1.2, C.player, this.prefs.rotate ? 0 : f.cameraYaw);

    // P11: escala, marco del tema y brújula en insignias, en la dirección de cada punto cardinal.
    const decor = this.decorColors();
    drawScaleBar(ctx, px, py, dpr, k);
    drawFrame(ctx, px, py, dpr, decor);
    const far = 1e5;
    const cards: [string, number, number][] = [['N', 0, far], ['E', far, 0], ['S', 0, -far], [language() === 'en' ? 'W' : 'O', -far, 0]];
    drawCompass(ctx, px, py, dpr, cards.map(([letter, dx, dy]) => [letter, P({ x: f.player.x + dx, y: f.player.y + dy })] as const), decor);
    // Misión seguida: su zona (cacería o sitio) y una estrella si cabe; si no, flecha en el borde.
    if (f.quest?.radius) {
      const c = P(f.quest);
      drawQuestArea(ctx, c.x, c.y, f.quest.radius * k, C.quest, dpr);
    }
    if (f.quest) {
      const b = clampToBox(P(f.quest), px, 22 * dpr, py);
      if (!b.outside) drawMarker(ctx, 'quest', b.x, b.y, s * 1.1, C.quest);
      else {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.beginPath();
        ctx.moveTo(9 * dpr, 0);
        ctx.lineTo(-6 * dpr, -7 * dpr);
        ctx.lineTo(-2 * dpr, 0);
        ctx.lineTo(-6 * dpr, 7 * dpr);
        ctx.closePath();
        ctx.fillStyle = C.quest;
        ctx.strokeStyle = 'rgba(0,0,0,.9)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      this.canvas.title = f.quest.label;
    } else this.canvas.title = '';
  }
}
