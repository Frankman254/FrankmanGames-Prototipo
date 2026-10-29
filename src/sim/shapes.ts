// Áreas de efecto sobre el plano XZ y su prueba contra un círculo (un actor).
// Las mismas formas sirven para los avisos enemigos y las habilidades.
import type { ShapeDef } from '../data/schema';
import type { Vec2 } from './vec2';

/** Forma colocada: `origin` es el vértice del cono / inicio de la línea / centro del círculo. */
export interface PlacedShape {
  def: ShapeDef;
  origin: Vec2;
  /** Dirección en radianes (atan2 sobre el plano XZ). */
  dir: number;
}

/** ¿Toca la forma a un círculo de centro `p` y radio `r`? */
export function shapeHitsCircle(s: PlacedShape, p: Vec2, r: number): boolean {
  const dx = p.x - s.origin.x;
  const dy = p.y - s.origin.y;
  const def = s.def;
  if (def.type === 'circle') {
    const reach = def.radius + r;
    return dx * dx + dy * dy <= reach * reach;
  }
  const cos = Math.cos(s.dir);
  const sin = Math.sin(s.dir);
  const along = dx * cos + dy * sin;
  const across = -dx * sin + dy * cos;
  if (def.type === 'line') {
    return along >= -r && along <= def.length + r && Math.abs(across) <= def.width / 2 + r;
  }
  // Cono: dentro del radio y del ángulo, ensanchado por el radio del actor.
  const d = Math.hypot(dx, dy);
  if (d - r > def.length) return false;
  if (d <= r) return true;
  const half = (def.angleDeg * Math.PI) / 360;
  if (half >= Math.PI) return true;
  const off = Math.abs(Math.atan2(across, along));
  return off <= half + Math.asin(Math.min(1, r / d));
}
