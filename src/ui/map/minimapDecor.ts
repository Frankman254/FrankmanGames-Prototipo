// P11: pulido del minimapa (creador, 2026-11-08: «está horrendo, muy básico»). Capas que se
// dibujan encima del mapa sin cambiar lo que muestra: viñeta, cono de visión del jugador,
// marco doble del color del tema, brújula en insignias y barra de escala.
import { clampToBox } from './mapLogic';

export interface MinimapDecorColors {
  /** Color del tema (marco). */
  band: string;
  gold: string;
}

/** Oscurece los bordes para que el centro (lo cercano) se lea mejor. */
export function drawVignette(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  const r = Math.hypot(px, py) / 2;
  const g = ctx.createRadialGradient(px / 2, py / 2, r * 0.45, px / 2, py / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);
}

/** Cono suave hacia donde mira la cámara y halo bajo la flecha del jugador. `angle`: 0 = arriba. */
export function drawViewCone(ctx: CanvasRenderingContext2D, px: number, py: number, angle: number, s: number): void {
  const cx = px / 2;
  const cy = py / 2;
  const len = Math.min(px, py) * 0.42;
  const half = (34 * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
  g.addColorStop(0, 'rgba(255,248,220,0.32)');
  g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, len, -Math.PI / 2 - half, -Math.PI / 2 + half);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 2.6);
  halo.addColorStop(0, 'rgba(255,255,255,0.35)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Marco doble: el color del tema por fuera y un hilo dorado por dentro. */
export function drawFrame(ctx: CanvasRenderingContext2D, px: number, py: number, dpr: number, c: MinimapDecorColors): void {
  const w = 3 * dpr;
  ctx.save();
  ctx.lineWidth = w;
  ctx.strokeStyle = c.band;
  roundRect(ctx, w / 2, w / 2, px - w, py - w, 6 * dpr);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, dpr);
  ctx.strokeStyle = c.gold;
  roundRect(ctx, w + dpr, w + dpr, px - 2 * (w + dpr), py - 2 * (w + dpr), 4 * dpr);
  ctx.stroke();
  ctx.restore();
}

/** Brújula: cada letra en una insignia redonda pegada al borde, en su dirección real. */
export function drawCompass(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dpr: number,
  cards: ReadonlyArray<readonly [string, { x: number; y: number }]>,
  c: MinimapDecorColors,
): void {
  const r = 7.5 * dpr;
  for (const [letter, at] of cards) {
    const b = clampToBox(at, px, r + 4 * dpr, py);
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,12,10,0.85)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeStyle = letter === 'N' ? '#ff7a6a' : c.gold;
    ctx.stroke();
    ctx.font = `700 ${(letter === 'N' ? 10.5 : 9.5) * dpr}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = letter === 'N' ? '#ff8a7a' : '#efe4cb';
    ctx.fillText(letter, b.x, b.y + 0.5 * dpr);
  }
}

/** Barra de escala abajo a la izquierda: una medida redonda que ocupe ~¼ del ancho. */
export function drawScaleBar(ctx: CanvasRenderingContext2D, px: number, py: number, dpr: number, pxPerMeter: number): void {
  const target = px / 4 / pxPerMeter;
  const meters = [5, 10, 20, 25, 50, 100, 200, 250, 500].find((m) => m >= target) ?? 1000;
  const len = meters * pxPerMeter;
  const x = 9 * dpr;
  const y = py - 10 * dpr;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = 3.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  ctx.strokeStyle = '#efe4cb';
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(x, y - 3 * dpr);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.lineTo(x + len, y - 3 * dpr);
  ctx.stroke();
  ctx.font = `600 ${9 * dpr}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#efe4cb';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 2 * dpr;
  ctx.fillText(`${meters} m`, x + 2 * dpr, y - 4 * dpr);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
