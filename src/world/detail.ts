// Distancias de detalle: qué se dibuja según lo lejos que quede del jugador. Puro.

export interface DetailRange {
  on: number;
  off: number;
}

export interface DetailDef {
  enemies: DetailRange & { createsPerFrame: number };
  models: Record<string, DetailRange>;
}

/** Sigue visible hasta `off`; aparece al entrar en `on`. El margen evita el parpadeo en el borde. */
export function inDetailRange(visible: boolean, distance: number, r: DetailRange): boolean {
  return distance <= (visible ? r.off : r.on);
}

export function modelRange(def: DetailDef, model: string): DetailRange {
  return def.models[model] ?? def.models['default']!;
}
