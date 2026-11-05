// Distancias de detalle: qué se dibuja según lo lejos que quede del jugador. Puro.

export interface DetailRange {
  on: number;
  off: number;
}

/** Detalle de un tipo de planta: entero hasta `full`, se va aclarando y a `off` ya no se dibuja. */
export interface VegetationRing {
  full: number;
  off: number;
}

export interface TerrainDetailDef {
  chunkMeters: number;
  /** Margen para no alternar de detalle en el borde. */
  margin: number;
  /** De más a menos detalle: metros entre vértices, y hasta qué distancia se usa. */
  levels: ReadonlyArray<{ step: number; until: number }>;
}

export interface DetailDef {
  enemies: DetailRange & { createsPerFrame: number };
  models: Record<string, DetailRange>;
  terrain: TerrainDetailDef;
  /** Hasta dónde se carga el mundo alrededor del jugador. */
  stream: { load: number; drop: number; inFlight: number };
  /** Por forma: tree, bush, rock, flower, grass. */
  vegetation: Record<string, VegetationRing>;
}

/** Fracción de ejemplares que se dibujan a esa distancia, con el rango de visión aplicado. */
export function ringFraction(r: VegetationRing, distance: number, rangeScale = 1): number {
  const full = r.full * rangeScale;
  const off = r.off * rangeScale;
  if (distance <= full) return 1;
  if (distance >= off) return 0;
  return (off - distance) / (off - full);
}

/** Nivel de detalle de un trozo de terreno; solo baja de detalle pasado el margen. */
export function terrainLevel(def: TerrainDetailDef, distance: number, current: number): number {
  const levels = def.levels;
  let wanted = levels.length - 1;
  for (let i = 0; i < levels.length; i++) {
    if (distance <= levels[i]!.until) {
      wanted = i;
      break;
    }
  }
  if (current >= 0 && wanted > current && distance <= levels[current]!.until + def.margin) return current;
  return wanted;
}

/** Sigue visible hasta `off`; aparece al entrar en `on`. El margen evita el parpadeo en el borde. */
export function inDetailRange(visible: boolean, distance: number, r: DetailRange): boolean {
  return distance <= (visible ? r.off : r.on);
}

export function modelRange(def: DetailDef, model: string): DetailRange {
  return def.models[model] ?? def.models['default']!;
}
