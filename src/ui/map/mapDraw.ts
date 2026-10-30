// Dibujo común del minimapa y del mapa grande sobre <canvas>: imagen base,
// capa de niebla y los iconos de cada marcador (formas propias, sin texturas).
import type { FogOfWar } from './mapLogic';
import type { MapImage } from './mapImage';

export function imageCanvas(img: MapImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  return c;
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

export type MarkerKind = 'player' | 'enemy' | 'npc' | 'merchant' | 'loot' | 'stone' | 'flag' | 'quest';

/** Un marcador centrado en (x, y); `s` es el tamaño base en píxeles. `angle` gira la flecha del jugador. */
export function drawMarker(ctx: CanvasRenderingContext2D, kind: MarkerKind, x: number, y: number, s: number, color: string, angle = 0): void {
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
