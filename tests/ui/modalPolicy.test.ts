import { describe, expect, it } from 'vitest';
import { modalPolicy } from '../../src/ui/menus/modalPolicy';

describe('política de modales y simulación', () => {
  it('título y creación detienen y capturan aunque el modal sea overlay', () => {
    expect(modalPolicy('title', [])).toEqual({ simulationPaused: true, keyboardCaptured: true, pointerCaptured: true });
    expect(modalPolicy('creation', ['overlay'])).toEqual({ simulationPaused: true, keyboardCaptured: true, pointerCaptured: true });
  });

  it('la partida sin ventanas no pausa ni captura', () => {
    expect(modalPolicy('game', [])).toEqual({ simulationPaused: false, keyboardCaptured: false, pointerCaptured: false });
  });

  it('pausa, opciones y atajos capturan teclado pero mantienen mundo y puntero exterior', () => {
    expect(modalPolicy('game', ['overlay'])).toEqual({ simulationPaused: false, keyboardCaptured: true, pointerCaptured: false });
    expect(modalPolicy('game', ['overlay', 'overlay'])).toEqual({ simulationPaused: false, keyboardCaptured: true, pointerCaptured: false });
  });

  it('confirmación, guardado, carga o muerte visibles detienen y capturan', () => {
    expect(modalPolicy('game', ['overlay', 'blocking'])).toEqual({ simulationPaused: true, keyboardCaptured: true, pointerCaptured: true });
  });

  it('al cerrar el bloqueo vuelve a la política del overlay inferior', () => {
    const stack = ['overlay', 'blocking'] as const;
    expect(modalPolicy('game', stack.slice(0, -1))).toEqual({ simulationPaused: false, keyboardCaptured: true, pointerCaptured: false });
  });
});
