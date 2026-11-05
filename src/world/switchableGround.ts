// Suelo que la vista puede cambiar en caliente: el campo de alturas del mundo
// abierto o un plano a altura fija (pisos de mazmorra). Todas las vistas
// reciben este mismo objeto, así que basta con cambiar `flatHeight`.
import { HeightField } from './terrain';

export class SwitchableHeightField extends HeightField {
  /** Altura fija del interior, o null para usar el terreno. */
  flatHeight: number | null = null;
  /** Relieve del interior (gradas), sumado a `flatHeight`. */
  relief: ((x: number, z: number) => number) | null = null;

  constructor(base: HeightField) {
    super(base.width, base.depth, base.step, base.heights, base.originX, base.originZ);
  }

  override sample(x: number, z: number): number {
    if (this.flatHeight === null) return super.sample(x, z);
    return this.flatHeight + (this.relief?.(x, z) ?? 0);
  }
}
