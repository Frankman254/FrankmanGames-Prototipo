// Modos de lanzar hechizos (combate v2, respuesta del creador): «con
// indicador» por defecto, y «al pulsar» o «pulsar y clic» en Opciones → Juego.
// Sólo uno activo. Lógica pura: `main.ts` le pasa las teclas y los clics, y
// esto dice cuándo lanzar; el render dibuja el área y el alcance mientras
// `aiming` no es null.
//
//   - indicator:  mantener la tecla apunta (se ve el área en el cursor);
//                 soltarla lanza. Esc o clic derecho cancelan.
//   - press:      la tecla lanza ya hacia el cursor (sin indicador).
//   - pressClick: la tecla apunta; un clic izquierdo (o la misma tecla otra
//                 vez) confirma. Esc o clic derecho cancelan.
//
// Los hechizos que no se apuntan (sobre el lanzador) salen al pulsar en
// todos los modos.

export const CAST_MODES = ['indicator', 'press', 'pressClick'] as const;
export type CastMode = (typeof CAST_MODES)[number];

/** Qué hacer tras una tecla o un clic. */
export type CastStep = { kind: 'none' } | { kind: 'aim'; slot: number } | { kind: 'cast'; slot: number } | { kind: 'cancel'; slot: number };

const NONE: CastStep = { kind: 'none' };

export class CastInput {
  /** Hueco que se está apuntando, o null. */
  aiming: number | null = null;

  constructor(public mode: CastMode = 'indicator') {}

  /** Cambiar de modo cancela lo que se estuviera apuntando. */
  setMode(mode: CastMode): void {
    if (mode !== this.mode) this.aiming = null;
    this.mode = mode;
  }

  /** Tecla de un hueco pulsada. `needsAim` = el hechizo se apunta al suelo o a un objetivo. */
  press(slot: number, needsAim: boolean): CastStep {
    if (!needsAim || this.mode === 'press') {
      this.aiming = null;
      return { kind: 'cast', slot };
    }
    if (this.mode === 'pressClick' && this.aiming === slot) {
      this.aiming = null;
      return { kind: 'cast', slot };
    }
    // Pulsar otro hueco mientras se apunta cambia de hechizo.
    this.aiming = slot;
    return { kind: 'aim', slot };
  }

  /** Tecla de un hueco soltada: en «con indicador» lanza lo que se apuntaba con ella. */
  release(slot: number): CastStep {
    if (this.mode !== 'indicator' || this.aiming !== slot) return NONE;
    this.aiming = null;
    return { kind: 'cast', slot };
  }

  /** Clic izquierdo: confirma lo apuntado (en cualquier modo que esté apuntando). */
  confirm(): CastStep {
    if (this.aiming === null) return NONE;
    const slot = this.aiming;
    this.aiming = null;
    return { kind: 'cast', slot };
  }

  /** Esc o clic derecho. */
  cancel(): CastStep {
    if (this.aiming === null) return NONE;
    const slot = this.aiming;
    this.aiming = null;
    return { kind: 'cancel', slot };
  }
}
