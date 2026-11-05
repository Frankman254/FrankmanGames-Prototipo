// Gradas: un suelo elevado al que se sube andando. La simulación es plana, así que
// un desnivel no bloquea por sí mismo: basta con no marcarlo como obstáculo y que
// la vista suba al personaje por esta altura. Puro: sin DOM ni render.

export interface Platform {
  /** Centro de la parte alta. */
  x: number;
  z: number;
  /** Ancho (X) y fondo (Z) de la parte alta. */
  w: number;
  d: number;
  /** Altura de la parte alta sobre el suelo. */
  height: number;
  /** Metros que ocupan las gradas alrededor. */
  run: number;
  steps: number;
}

/** Cuánto sale un punto de la parte alta; 0 si está encima. */
function outside(p: Platform, x: number, z: number): number {
  return Math.max(0, Math.abs(x - p.x) - p.w / 2, Math.abs(z - p.z) - p.d / 2);
}

/** Altura a la que camina el personaje: rampa continua, sin saltos al pisar cada escalón. */
export function surfaceHeight(platforms: readonly Platform[], x: number, z: number): number {
  let top = 0;
  for (const p of platforms) top = Math.max(top, p.height * Math.max(0, 1 - outside(p, x, z) / p.run));
  return top;
}

export interface StepBox {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Altura de la cara superior. */
  top: number;
}

/** Cajas que dibujan las gradas, de la más baja y ancha a la parte alta. */
export function stepBoxes(p: Platform): StepBox[] {
  const out: StepBox[] = [];
  for (let i = 0; i < p.steps; i++) {
    const grow = ((p.run * (p.steps - 1 - i)) / p.steps) * 2;
    out.push({ x: p.x, z: p.z, w: p.w + grow, d: p.d + grow, top: (p.height * (i + 1)) / p.steps });
  }
  return out;
}
