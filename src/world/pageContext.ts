// Lo que necesita un hilo para generar páginas: datos planos que se pueden pasar por mensaje.
import type { AtlasDef } from './atlas';
import type { VegetationDef } from './scatter';
import { buildWorldShape, type WorldBounds, type WorldShape } from './shape';
import type { TerrainDef } from './terrain';

export interface WorldContext {
  terrain: TerrainDef;
  vegetation: VegetationDef;
  atlas: AtlasDef;
  bounds: WorldBounds;
  cellSize: number;
}

const shapes = new WeakMap<WorldContext, WorldShape>();

/** La forma del mundo se calcula una vez por contexto: su rejilla de costa cuesta. */
export function atlasToShape(ctx: WorldContext): WorldShape {
  let s = shapes.get(ctx);
  if (!s) shapes.set(ctx, (s = buildWorldShape(ctx.atlas, ctx.bounds, ctx.terrain)));
  return s;
}
