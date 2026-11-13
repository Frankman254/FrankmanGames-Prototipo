// Dibujo común del minimapa y del mapa grande sobre <canvas>: imagen base,
// capa de niebla y los iconos de cada marcador (formas propias, sin texturas).
import type { FogOfWar } from './mapLogic';
import { artIconUrl } from '../menus/artIcons';
import type { MapBackdrop, MapImage } from './mapImage';

export function imageCanvas(img: MapImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  // Copia para garantizar un ArrayBuffer normal (TS también contempla
  // SharedArrayBuffer en el tipo de la entrada).
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

/** Fondo del mundo, en un contexto ya transformado a píxeles de la imagen base. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, b: MapBackdrop, ppm: number, depth: number): void {
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(b.canvas, b.x0 * ppm, (depth - b.z1) * ppm, (b.x1 - b.x0) * ppm, (b.z1 - b.z0) * ppm);
}

/** Niebla en un lienzo de una casilla por píxel (fila 0 = norte); se escala con suavizado. */
export class FogLayer {
  readonly canvas = document.createElement('canvas');
  private version = -1;

  constructor(private readonly color: string) {}

  update(fog: FogOfWar, version: number): void {
    if (version === this.version) return;
    this.version = version;
    const c = this.canvas;
    if (c.width !== fog.cols || c.height !== fog.rows) {
      c.width = fog.cols;
      c.height = fog.rows;
    }
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(fog.cols, fog.rows);
    const n = parseInt(this.color.slice(1), 16);
    for (let r = 0; r < fog.rows; r++) {
      const py = fog.rows - 1 - r;
      for (let col = 0; col < fog.cols; col++) {
        const o = (py * fog.cols + col) * 4;
        img.data[o] = (n >> 16) & 255;
        img.data[o + 1] = (n >> 8) & 255;
        img.data[o + 2] = n & 255;
        img.data[o + 3] = fog.isCellRevealed(col, r) ? 0 : 245;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /**
   * Dibuja la niebla en un contexto ya transformado a píxeles de la imagen base
   * (`ppm` píxeles por metro, fila 0 = norte del mundo de fondo `depth`).
   */
  draw(ctx: CanvasRenderingContext2D, fog: FogOfWar, ppm: number, depth: number): void {
    ctx.imageSmoothingEnabled = true;
    const w = fog.cols * fog.cell * ppm;
    const h = fog.rows * fog.cell * ppm;
    ctx.drawImage(this.canvas, 0, (depth - fog.rows * fog.cell) * ppm, w, h);
  }
}

export type MarkerKind = 'player' | 'enemy' | 'npc' | 'merchant' | 'loot' | 'stone' | 'flag' | 'quest' | 'bank' | 'house' | 'castle' | 'dungeon' | 'dock' | 'workshop' | 'boat';

/** Un marcador centrado en (x, y); `s` es el tamaño base en píxeles. `angle` gira la flecha del jugador. */
/** Zona de una misión: círculo relleno y borde a trazos, en el color de las misiones (F08). */
export function drawQuestArea(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, scale = 1): void {
  if (!(r > 0)) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

/** Marcadores con arte de Codex (assets/icons/map/<tipo>.png); los demás se dibujan por código. */
const MARKER_ART: Partial<Record<MarkerKind, string>> = {
  stone: 'piedra_pintada', merchant: 'mercader', quest: 'mision',
  bank: 'banco', house: 'casa', castle: 'castillo', dungeon: 'mazmorra',
  dock: 'muelle', workshop: 'taller', boat: 'lancha'
};
const markerImages = new Map<string, HTMLImageElement>();
function markerImage(kind: MarkerKind): HTMLImageElement | null {
  const name = MARKER_ART[kind];
  const url = name ? artIconUrl('map', name) : null;
  if (!url || typeof Image === 'undefined') return null;
  let img = markerImages.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    markerImages.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function drawMarker(ctx: CanvasRenderingContext2D, kind: MarkerKind, x: number, y: number, s: number, color: string, angle = 0): void {
  const art = markerImage(kind);
  if (art) {
    ctx.drawImage(art, x - s * 1.7, y - s * 1.7, s * 3.4, s * 3.4);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1, s * 0.22);
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (kind) {
    case 'player':
      ctx.rotate(angle);
      ctx.moveTo(0, -s * 1.3);
      ctx.lineTo(s * 0.9, s * 0.9);
      ctx.lineTo(0, s * 0.45);
      ctx.lineTo(-s * 0.9, s * 0.9);
      ctx.closePath();
      break;
    case 'enemy':
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      break;
    case 'npc':
      ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
      break;
    case 'merchant':
      ctx.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
      break;
    case 'loot':
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s * 0.6);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      break;
    case 'stone':
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.65, s * 0.8);
      ctx.lineTo(-s * 0.65, s * 0.8);
      ctx.closePath();
      break;
    case 'flag':
      ctx.moveTo(-s * 0.5, s * 1);
      ctx.lineTo(-s * 0.5, -s * 1.1);
      ctx.lineTo(s * 0.9, -s * 0.6);
      ctx.lineTo(-s * 0.5, -s * 0.1);
      ctx.closePath();
      break;
    case 'quest':
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 1.1 : s * 0.48;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    case 'bank':
      ctx.rect(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2);
      break;
    case 'house':
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.9, -s * 0.2);
      ctx.lineTo(s * 0.9, s * 0.9);
      ctx.lineTo(-s * 0.9, s * 0.9);
      ctx.lineTo(-s * 0.9, -s * 0.2);
      ctx.closePath();
      break;
    case 'castle':
      ctx.moveTo(-s * 0.9, s * 0.9);
      ctx.lineTo(-s * 0.9, -s * 0.3);
      ctx.lineTo(-s * 0.6, -s * 0.3);
      ctx.lineTo(-s * 0.6, -s * 0.8);
      ctx.lineTo(-s * 0.3, -s * 0.8);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.lineTo(0, -s * 0.3);
      ctx.lineTo(0, -s * 0.8);
      ctx.lineTo(0.3 * s, -s * 0.8);
      ctx.lineTo(0.3 * s, -s * 0.3);
      ctx.lineTo(s * 0.6, -s * 0.3);
      ctx.lineTo(s * 0.6, -s * 0.8);
      ctx.lineTo(s * 0.9, -s * 0.8);
      ctx.lineTo(s * 0.9, -s * 0.3);
      ctx.lineTo(s * 0.9, s * 0.9);
      ctx.closePath();
      break;
    case 'dungeon':
      ctx.moveTo(-s * 0.7, s * 0.9);
      ctx.lineTo(-s * 0.7, -s * 0.5);
      ctx.lineTo(-s * 0.3, -s * 0.9);
      ctx.lineTo(s * 0.3, -s * 0.9);
      ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.lineTo(s * 0.7, s * 0.9);
      ctx.closePath();
      break;
    case 'dock':
      ctx.rect(-s * 1.1, -s * 0.3, s * 2.2, s * 0.6);
      ctx.moveTo(-s * 0.5, -s * 0.3);
      ctx.lineTo(-s * 0.5, -s * 1.1);
      ctx.lineTo(s * 0.1, -s * 0.7);
      ctx.lineTo(-s * 0.5, -s * 0.3);
      ctx.closePath();
      break;
    case 'workshop':
      ctx.rect(-s * 0.7, -s * 0.5, s * 1.4, s * 1.2);
      ctx.moveTo(-s * 0.3, -s * 0.5);
      ctx.lineTo(-s * 0.3, -s * 1.1);
      ctx.lineTo(s * 0.3, -s * 1.1);
      ctx.lineTo(s * 0.3, -s * 0.5);
      ctx.closePath();
      break;
    case 'boat':
      ctx.moveTo(-s * 0.9, 0);
      ctx.quadraticCurveTo(0, -s * 0.6, s * 0.9, 0);
      ctx.quadraticCurveTo(0, s * 0.6, -s * 0.9, 0);
      ctx.closePath();
      break;
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** «!» o «?» sobre un PNJ con misión. */
export function drawQuestMark(ctx: CanvasRenderingContext2D, mark: 'available' | 'ready', x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.font = `bold ${Math.round(s * 2)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.9)';
  ctx.fillStyle = color;
  const t = mark === 'available' ? '!' : '?';
  ctx.strokeText(t, x, y - s * 0.7);
  ctx.fillText(t, x, y - s * 0.7);
  ctx.restore();
}

/** Texto con contorno oscuro (nombres en el mapa grande y letras de la brújula). */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, color: string, align: CanvasTextAlign = 'center'): void {
  ctx.save();
  ctx.font = `600 ${Math.round(px)}px system-ui, 'Segoe UI', sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, px * 0.25);
  ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Ancho aproximado de una etiqueta (para detección de colisión). */
export function measureLabel(ctx: CanvasRenderingContext2D, text: string, px: number): number {
  ctx.save();
  ctx.font = `600 ${Math.round(px)}px system-ui, 'Segoe UI', sans-serif`;
  const m = ctx.measureText(text);
  ctx.restore();
  return m.width;
}

/** Desplaza las etiquetas para que no se solapen (margen mínimo `gap`). */
export function avoidLabelCollisions(labels: { x: number; y: number; w: number; h: number }[], gap = 2): void {
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i]!;
      const b = labels[j]!;
      const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
      const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
      const overlapX = a.w / 2 + b.w / 2 - Math.abs(dx) - gap;
      const overlapY = a.h / 2 + b.h / 2 - Math.abs(dy) - gap;
      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const shift = overlapX / 2 + 0.5;
          const sign = dx >= 0 ? 1 : -1;
          a.x += sign * shift;
          b.x -= sign * shift;
        } else {
          const shift = overlapY / 2 + 0.5;
          const sign = dy >= 0 ? 1 : -1;
          a.y += sign * shift;
          b.y -= sign * shift;
        }
      }
    }
  }
}
