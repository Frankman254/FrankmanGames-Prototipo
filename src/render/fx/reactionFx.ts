// FX-R01 (creador, 2026-11-19: «cada reacción debe tener su efecto gráfico (mostrar el nombre
// de la reacción) y también la animación»). Enganche ya cableado en `arenaView.handleEvents`:
// cada suceso `reaction` de la sim llega a `play` con la posición del objetivo.
// Lo rellena OMP (cola FX-R01): el nombre flotante y el efecto propio de cada una de las
// 15 reacciones de `data/rpg/reactions.json`. Este archivo y lo que cuelgue de él son suyos.
import type { Scene, Vector3 } from '@babylonjs/core';
import type { FloatingText } from './floatingText';

export class ReactionFx {
    constructor(
        protected readonly scene: Scene,
        protected readonly floating: FloatingText,
    ) {}

    /** Una reacción ha saltado sobre un objetivo; `at` es un punto sobre su cabeza (se reutiliza: copiarlo). */
    play(_reactionId: string, _at: Vector3): void {
        // FX-R01: nombre y efecto de la reacción.
    }

    /** Avanza los efectos vivos (zonas, nubes…). */
    update(_dt: number): void {
        // FX-R01
    }

    /** Quita todo al reiniciar la partida. */
    reset(): void {
        // FX-R01
    }
}
