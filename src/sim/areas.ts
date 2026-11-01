import type { Vec2 } from './vec2';

export interface AreaTarget { id: number; pos: Vec2; radius: number }

/** Diferencia ordenada de entradas/salidas para zonas persistentes. */
export function updateOccupants(previous: ReadonlySet<number>, targets: readonly AreaTarget[], contains: (target: AreaTarget) => boolean): {
  inside: Set<number>; entered: number[]; left: number[];
} {
  const inside = new Set(targets.filter(contains).map((target) => target.id));
  return {
    inside,
    entered: [...inside].filter((id) => !previous.has(id)).sort((a, b) => a - b),
    left: [...previous].filter((id) => !inside.has(id)).sort((a, b) => a - b),
  };
}

