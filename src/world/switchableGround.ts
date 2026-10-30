// Suelo que la vista puede cambiar en caliente: el campo de alturas del mundo
// abierto o un plano a altura fija (pisos de mazmorra). Todas las vistas
// reciben este mismo objeto, así que basta con cambiar `flatHeight`.
import { HeightField } from './terrain';

export class SwitchableHeightField extends HeightField {
  /** Altura fija del interior, o null para usar el terreno. */
  flatHeight: number | null = null;

  constructor(base: HeightField) {
    super(base.width, base.depth, base.step, base.heights);
  }

  override sample(x: number, z: number): number {
    return this.flatHeight ?? super.sample(x, z);
  }
}
