export type ModalMode = 'overlay' | 'blocking';

export interface ModalPolicyState {
  simulationPaused: boolean;
  keyboardCaptured: boolean;
  pointerCaptured: boolean;
}

/**
 * Política mínima entre pantalla, simulación e interfaz. Sólo el modal visible
 * (el último) decide: los anteriores permanecen ocultos hasta volver a ellos.
 */
export function modalPolicy(screen: 'title' | 'creation' | 'game', stack: readonly ModalMode[]): ModalPolicyState {
  if (screen !== 'game') return { simulationPaused: true, keyboardCaptured: true, pointerCaptured: true };
  const top = stack[stack.length - 1];
  if (!top) return { simulationPaused: false, keyboardCaptured: false, pointerCaptured: false };
  if (top === 'blocking') return { simulationPaused: true, keyboardCaptured: true, pointerCaptured: true };
  return { simulationPaused: false, keyboardCaptured: true, pointerCaptured: false };
}
