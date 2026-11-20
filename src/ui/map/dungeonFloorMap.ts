// Mapa del piso de la mazmorra (DUN-06): se abre con tecla M dentro de la cripta.
// Muestra la rejilla del piso con niebla de guerra, el jugador, los enemigos,
// las escaleras de subida y bajada, el hilo de retorno y los cofres (abiertos/cerrados).
// Reutiliza la lógica de interiorPixels y FogOfWar del sistema de interiores.
import { tr } from '../../i18n';
import { button, h } from '../menus/dom';
import { Panel } from '../menus/panel';
import type { UiContext } from '../menus/context';
import type { KeyValueStore } from '../menus/saveStore';
import { interiorPixels, type InteriorColors, type InteriorGrid } from './interiorMap';
import { drawLabel, drawMarker } from './mapDraw';
import { FogOfWar, projectToMinimap } from './mapLogic';
import type { DungeonFeature, MapState } from './mapState';

/** Colores del mapa del piso. */
const DUNGEON_COLORS: InteriorColors = { floor: [120, 110, 90], wall: [50, 42, 32] };

/** Colores de los marcadores del piso. */
const MARKER_COLORS = {
    down: '#e8a84c',
    up: '#6cb4ee',
    return: '#a8e84c',
    chest: '#f5d060',
    chestOpened: '#8a8a6a',
};

export class DungeonFloorMap extends Panel {
    private readonly canvas: HTMLCanvasElement;
    private readonly infoEl: HTMLElement;
    private baseCanvas: HTMLCanvasElement | null = null;
    private baseKey = '';
    private timer = 0;
    private dmZoom = 1;
    private dmPanX = 0;
    private dmPanY = 0;

    constructor(
        ctx: UiContext,
        private readonly state: MapState,
        private readonly store: KeyValueStore,
        onClose: () => void,
    ) {
        super(ctx, 'Mapa del piso', 'panel-dungeonmap', onClose);
        this.canvas = h('canvas.dm-canvas');
        this.infoEl = h('div.dm-info');
        const side = h(
            'div.dm-side',
            null,
            h('h4', { text: 'Leyenda' }),
            h('div.dm-legend', null,
                this.legendItem('↓', 'Escalera de bajada', MARKER_COLORS.down),
                this.legendItem('↑', 'Escalera de subida', MARKER_COLORS.up),
                this.legendItem('↩', 'Hilo de retorno', MARKER_COLORS.return),
                this.legendItem('⬛', 'Cofre cerrado', MARKER_COLORS.chest),
                this.legendItem('⬜', 'Cofre abierto', MARKER_COLORS.chestOpened),
            ),
            this.infoEl,
            h('p.hint', { text: 'Rueda: zoom · arrastrar: mover' }),
            button('Centrar en mí', () => this.center(), 'small'),
        );
        this.body.appendChild(h('div.dm-wrap', null, h('div.dm-view', null, this.canvas), side));
        this.bindCanvas();
    }

    private legendItem(symbol: string, label: string, color: string): HTMLElement {
        const icon = h('span.dm-legend-icon', { text: symbol });
        icon.style.color = color;
        return h('div.dm-legend-item', null, icon, h('span', { text: label }));
    }

    override open(): void {
        super.open();
        this.ctx.windows.center(this.el);
        this.center();
        this.timer = 0;
    }

    private center(): void {
        this.timer = 0;
    }

    private size(): { w: number; h: number; dpr: number } {
        const r = this.canvas.getBoundingClientRect();
        const scale = this.canvas.offsetWidth > 0 ? r.width / this.canvas.offsetWidth : 1;
        return { w: this.canvas.offsetWidth, h: this.canvas.offsetHeight, dpr: (window.devicePixelRatio || 1) * scale };
    }

    private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
        const r = this.canvas.getBoundingClientRect();
        const scale = this.canvas.offsetWidth > 0 ? r.width / this.canvas.offsetWidth : 1;
        return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    }

    private bindCanvas(): void {
        const c = this.canvas;

        c.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                this.dmZoom = Math.min(4, Math.max(0.3, this.dmZoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
                this.timer = 0;
            },
            { passive: false },
        );
        c.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            c.setPointerCapture(e.pointerId);
            const start = this.local(e);
            const startPanX = this.dmPanX;
            const startPanY = this.dmPanY;
            const move = (ev: PointerEvent) => {
                const p = this.local(ev);
                this.dmPanX = startPanX + (p.x - start.x);
                this.dmPanY = startPanY + (p.y - start.y);
                this.timer = 0;
            };
            const up = (ev: PointerEvent) => {
                c.releasePointerCapture(ev.pointerId);
                c.removeEventListener('pointermove', move);
                c.removeEventListener('pointerup', up);
                c.removeEventListener('pointercancel', up);
            };
            c.addEventListener('pointermove', move);
            c.addEventListener('pointerup', up);
            c.addEventListener('pointercancel', up);
        });
    }

    render(): void {
        this.timer = 0;
    }

    update(dt: number): void {
        if (!this.isOpen) return;
        this.timer -= dt;
        if (this.timer > 0) return;
        this.timer = 1 / 20;
        this.draw();
    }

    private draw(): void {
        const f = this.state.frame;
        if (!f || !f.inside || !f.interiorGrid) return;
        const g = f.interiorGrid;
        const C = this.state.def.colors;

        const { w: cw, h: ch, dpr } = this.size();
        if (cw <= 0 || ch <= 0) return;
        const pw = Math.round(cw * dpr);
        const ph = Math.round(ch * dpr);
        if (this.canvas.width !== pw || this.canvas.height !== ph) {
            this.canvas.width = pw;
            this.canvas.height = ph;
        }
        const ctx = this.canvas.getContext('2d')!;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = C.fog;
        ctx.fillRect(0, 0, pw, ph);

        // Niebla de guerra del interior.
        const fog = this.state.interiors.fogFor(f.inside, g);
        const key = `${f.inside}|${g.cols}x${g.rows}|${this.state.version}`;
        if (this.baseKey !== key) {
            this.baseKey = key;
            const c = (this.baseCanvas ??= document.createElement('canvas'));
            c.width = g.cols;
            c.height = g.rows;
            const img = new ImageData(interiorPixels(g, fog, DUNGEON_COLORS), g.cols, g.rows);
            c.getContext('2d')!.putImageData(img, 0, 0);
        }

        // Escala: ajustar el grid al canvas, centrado en el jugador.
        const zoom = this.dmZoom;
        const panX = this.dmPanX;
        const panY = this.dmPanY;
        const k = Math.min(cw / (g.cols * g.cellSize), ch / (g.rows * g.cellSize)) * zoom;

        ctx.save();
        ctx.translate(cw / 2 + panX, ch / 2 + panY);
        ctx.scale(k * g.cellSize, k * g.cellSize);
        ctx.translate(-f.player.x / g.cellSize + g.originX / g.cellSize, -f.player.y / g.cellSize + g.originY / g.cellSize);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.baseCanvas!, 0, 0);
        ctx.restore();

        // Marcadores.
        const s = 6 * dpr;
        const toScreen = (p: { x: number; y: number }) => {
            const sx = (p.x - f.player.x) * k + cw / 2 + panX;
            const sy = -(p.y - f.player.y) * k + ch / 2 + panY;
            return { x: sx, y: sy };
        };

        // Enemigos.
        for (const e of f.enemies) {
            const q = toScreen(e);
            if (q.x > -20 && q.x < cw + 20 && q.y > -20 && q.y < ch + 20) {
                drawMarker(ctx, 'enemy', q.x, q.y, s * 0.8, e.color);
            }
        }

        // Botín.
        for (const l of f.loot) {
            const q = toScreen(l);
            if (q.x > -20 && q.x < cw + 20 && q.y > -20 && q.y < ch + 20) {
                drawMarker(ctx, 'loot', q.x, q.y, s * 0.7, C.loot);
            }
        }

        // Puntos de interés del dungeon.
        const features = f.dungeonFeatures ?? [];
        for (const feat of features) {
            const q = toScreen(feat);
            if (q.x < -30 || q.x > cw + 30 || q.y < -30 || q.y > ch + 30) continue;
            let color: string;
            let marker: string;
            let label: string;
            switch (feat.kind) {
                case 'down':
                    color = MARKER_COLORS.down;
                    marker = 'quest';
                    label = tr('Escalera de bajada');
                    break;
                case 'up':
                    color = MARKER_COLORS.up;
                    marker = 'quest';
                    label = tr('Escalera de subida');
                    break;
                case 'return':
                    color = MARKER_COLORS.return;
                    marker = 'quest';
                    label = tr('Hilo de retorno');
                    break;
                case 'chest':
                    color = feat.opened ? MARKER_COLORS.chestOpened : MARKER_COLORS.chest;
                    marker = 'loot';
                    label = feat.opened ? tr('Cofre abierto') : tr('Cofre');
                    break;
                default:
                    continue;
            }
            drawMarker(ctx, marker as import('./mapDraw').MarkerKind, q.x, q.y, s, color);
            drawLabel(ctx, label, q.x, q.y - 12, 10 * dpr, color);
        }

        // Jugador en el centro.
        drawMarker(ctx, 'player', cw / 2, ch / 2, s * 1.2, C.player, f.cameraYaw);

        // Info del piso.
        const floorNum = f.dungeonFloor != null ? f.dungeonFloor + 1 : '?';
        this.infoEl.textContent = `${f.inside} — Piso ${floorNum}`;
        if (this.state.interiors) {
            const fogPct = Math.round(fog.explored * 100);
            this.infoEl.textContent += ` · Explorado: ${fogPct} %`;
        }
    }
}
