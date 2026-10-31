// Minimapa del HUD: cuadrado, arrastrable por su cabecera (WindowLayout) y
// redimensionable por la esquina. Norte fijo o girando con la cámara, zoom con
// la rueda o los botones, brújula con los puntos cardinales y flecha hacia el
// objetivo de la misión seguida. La imagen base se genera una vez; encima se
// pintan los marcadores unas 30 veces por segundo.
import type { KeyValueStore } from '../menus/saveStore';
import { h } from '../menus/dom';
import { FogLayer, drawLabel, drawMarker, drawQuestMark, imageCanvas } from './mapDraw';
import { clampToBox, projectToMinimap } from './mapLogic';
import type { MapState } from './mapState';

const PREFS_KEY = 'frankmangames.minimap';

interface MinimapPrefs {
  rotate: boolean;
  zoom: number;
}

export class Minimap {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly title: HTMLElement;
  private readonly northBtn: HTMLButtonElement;
  private base: HTMLCanvasElement | null = null;
  private readonly fogLayer: FogLayer;
  private prefs: MinimapPrefs;
  private size: number;
  private timer = 0;
  /** Al soltar la esquina tras cambiar el tamaño (para guardarlo en el perfil). */
  onResize: ((size: number) => void) | null = null;

  constructor(
    private readonly state: MapState,
    private readonly store: KeyValueStore,
    onOpenMap: () => void,
    mapKey: string,
  ) {
    const d = state.def.minimap;
    this.size = d.size;
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
    const grip = h('div.mm-resize', { title: 'Cambiar el tamaño' });
    this.el = h('div.minimap.hud-bar-zone', { 'data-hud-label': 'Minimapa' }, head, this.canvas, grip);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.dragHandle = head;
    this.bindResize(grip);
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

  get currentSize(): number {
    return this.size;
  }

  /** Lado en píxeles CSS (null = el de los datos). */
  setSize(size: number | null): void {
    const d = this.state.def.minimap;
    this.size = Math.round(Math.min(d.maxSize, Math.max(d.minSize, size ?? d.size)));
    this.el.style.setProperty('--mm-size', `${this.size}px`);
    this.timer = 0;
  }

  /** Esquina inferior izquierda: arrastrar cambia el lado (el minimapa sigue cuadrado). */
  private bindResize(grip: HTMLElement): void {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      grip.setPointerCapture(e.pointerId);
      const r = this.el.getBoundingClientRect();
      const scale = this.el.offsetWidth > 0 ? r.width / this.el.offsetWidth : 1;
      const start = this.size;
      const sx = e.clientX;
      const sy = e.clientY;
      const right = r.right;
      const move = (ev: PointerEvent): void => {
        // Hacia la izquierda y hacia abajo crece; el borde derecho se queda quieto.
        const grow = Math.max(sx - ev.clientX, ev.clientY - sy) / scale;
        this.setSize(start + grow);
        if (this.el.style.left) {
          const parent = (this.el.offsetParent as HTMLElement | null)?.getBoundingClientRect().left ?? 0;
          this.el.style.setProperty('left', `${(right - this.el.getBoundingClientRect().width - parent) / scale}px`, 'important');
        }
      };
      const up = (ev: PointerEvent): void => {
        grip.releasePointerCapture(ev.pointerId);
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        this.onResize?.(this.size);
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

  private draw(): void {
    const st = this.state;
    const f = st.frame;
    const w = st.world;
    const def = st.def;
    const C = def.colors;
    const css = this.size;
    const dpr = window.devicePixelRatio || 1;
    // El lienzo sigue el tamaño real en pantalla (escala de la interfaz incluida).
    const shown = this.canvas.getBoundingClientRect().width || css;
    const px = Math.max(1, Math.round(shown * dpr));
    if (this.canvas.width !== px || this.canvas.height !== px) {
      this.canvas.width = px;
      this.canvas.height = px;
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.fog;
    ctx.fillRect(0, 0, px, px);
    if (!f || !w) return;
    if (f.inside) {
      this.title.textContent = f.inside;
      drawLabel(ctx, 'Sin mapa bajo tierra', px / 2, px / 2, 13 * dpr, '#b4a382');
      return;
    }
    const [cx, cy] = w.coords(f.player.x, f.player.y);
    this.title.textContent = `[${cx}, ${cy}]`;
    const yaw = this.prefs.rotate ? f.cameraYaw : 0;
    const ppm = def.pixelsPerMeter;
    // Píxeles del lienzo por metro del mundo.
    const k = (px / 2 / def.minimap.radius) * this.prefs.zoom;
    this.base ??= imageCanvas(w.image());
    ctx.save();
    ctx.translate(px / 2, px / 2);
    ctx.rotate(-yaw);
    ctx.scale(k / ppm, k / ppm);
    ctx.translate(-f.player.x * ppm, -(w.depth - f.player.y) * ppm);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.base, 0, 0);
    if (st.fog) {
      this.fogLayer.update(st.fog, st.version);
      this.fogLayer.draw(ctx, st.fog, ppm, w.depth);
    }
    ctx.restore();

    const P = (p: { x: number; y: number }): { x: number; y: number } => projectToMinimap(p, f.player, yaw, k, px);
    const inBox = (q: { x: number; y: number }): boolean => q.x >= -8 && q.y >= -8 && q.x <= px + 8 && q.y <= px + 8;
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
    drawMarker(ctx, 'player', px / 2, px / 2, s * 1.2, C.player, this.prefs.rotate ? 0 : f.cameraYaw);

    // Brújula: letras en el borde, en la dirección de cada punto cardinal.
    const far = 1e5;
    const cards: [string, number, number][] = [['N', 0, far], ['E', far, 0], ['S', 0, -far], ['O', -far, 0]];
    for (const [letter, dx, dy] of cards) {
      const b = clampToBox(P({ x: f.player.x + dx, y: f.player.y + dy }), px, 9 * dpr);
      drawLabel(ctx, letter, b.x, b.y, (letter === 'N' ? 13 : 11) * dpr, letter === 'N' ? '#ff7a6a' : '#ecdfc3');
    }
    // Misión seguida: estrella si cabe; si no, flecha en el borde hacia ella.
    if (f.quest) {
      const b = clampToBox(P(f.quest), px, 22 * dpr);
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
