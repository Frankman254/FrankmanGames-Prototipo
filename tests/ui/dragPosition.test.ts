// Cuentas puras del arrastre de ventanas y del HUD (hud-arreglos): el punto
// agarrado se queda bajo el puntero aunque el elemento vaya centrado con
// `translateX(-50%)` o escalado con `zoom` (escala de la interfaz y media queries).
import { describe, expect, it } from 'vitest';
import { clampDrag, clampWindow, dragCorner, grabOffset, solvePlacement, type WindowPos } from '../../src/ui/menus/windows';

/**
 * Modelo del navegador: dónde queda en pantalla la esquina de un elemento con
 * `left`/`top` CSS dados. `zoom` multiplica las longitudes CSS (incluido el
 * `left`), `shift` es un desfase en píxeles CSS del elemento (p. ej. un
 * `translateX(-50%)` que no se quitó, o un margen) y `parent` el origen del
 * padre posicionado.
 */
function browser(o: { zoom: number; shift?: WindowPos; parent?: WindowPos }): (css: WindowPos) => WindowPos {
  const shift = o.shift ?? { x: 0, y: 0 };
  const parent = o.parent ?? { x: 0, y: 0 };
  return (css) => ({ x: parent.x + (css.x + shift.x) * o.zoom, y: parent.y + (css.y + shift.y) * o.zoom });
}

/** Repite el arrastre como `WindowLayout`: agarra, mueve el puntero, coloca y mide. */
function dragError(render: (css: WindowPos) => WindowPos, start: WindowPos, pointerFrom: WindowPos, pointerTo: WindowPos, guessScale: number, guessParent: WindowPos = { x: 0, y: 0 }): WindowPos {
  const shownStart = render(start);
  const grab = grabOffset(pointerFrom, shownStart);
  const target = dragCorner(pointerTo, grab);
  const css = solvePlacement(render, target, { x: (target.x - guessParent.x) / guessScale, y: (target.y - guessParent.y) / guessScale }, guessScale);
  const shown = render(css);
  // Dónde está ahora el punto agarrado respecto al puntero.
  return { x: shown.x + grab.x - pointerTo.x, y: shown.y + grab.y - pointerTo.y };
}

const near = (p: WindowPos): void => {
  expect(Math.abs(p.x)).toBeLessThan(0.5);
  expect(Math.abs(p.y)).toBeLessThan(0.5);
};

describe('arrastrar con transform y zoom', () => {
  it('el punto agarrado es el puntero menos la esquina medida', () => {
    expect(grabOffset({ x: 530, y: 820 }, { x: 300, y: 800 })).toEqual({ x: 230, y: 20 });
    expect(dragCorner({ x: 600, y: 700 }, { x: 230, y: 20 })).toEqual({ x: 370, y: 680 });
  });

  it('sin transform ni zoom la primera estimación ya es buena', () => {
    let calls = 0;
    const render = (css: WindowPos): WindowPos => { calls++; return css; };
    expect(solvePlacement(render, { x: 120, y: 40 }, { x: 120, y: 40 }, 1)).toEqual({ x: 120, y: 40 });
    expect(calls).toBe(1);
  });

  it('un translateX(-50%) que sigue puesto no separa el elemento del puntero', () => {
    // Barra de abajo de 1000 px centrada: sin corregir quedaría 500 px a la izquierda.
    const render = browser({ zoom: 1, shift: { x: -500, y: 0 } });
    near(dragError(render, { x: 800, y: 780 }, { x: 600, y: 800 }, { x: 540, y: 720 }, 1));
  });

  it('con la escala de la interfaz a 1,5', () => {
    const render = browser({ zoom: 1.5 });
    near(dragError(render, { x: 200, y: 100 }, { x: 400, y: 170 }, { x: 330, y: 260 }, 1.5));
  });

  it('con zoom y transform juntos (media query de pantalla estrecha × escala)', () => {
    const zoom = 1.5 * 0.76;
    const render = browser({ zoom, shift: { x: -400, y: 0 }, parent: { x: 12, y: 8 } });
    near(dragError(render, { x: 500, y: 600 }, { x: 450, y: 700 }, { x: 380, y: 610 }, zoom, { x: 12, y: 8 }));
  });

  it('aunque el zoom estimado sea malo, corrige con lo medido', () => {
    // Se estima 1 pero el zoom real (escala × media query) es 1,32.
    const render = browser({ zoom: 1.32, shift: { x: -250, y: 3 } });
    near(dragError(render, { x: 600, y: 300 }, { x: 650, y: 320 }, { x: 420, y: 500 }, 1));
  });

  it('sin moverse, el elemento no salta al agarrarlo', () => {
    const render = browser({ zoom: 2, shift: { x: -131, y: 0 } });
    near(dragError(render, { x: 400, y: 10 }, { x: 700, y: 25 }, { x: 700, y: 25 }, 2));
  });

  it('un zoom no válido se trata como 1', () => {
    const css = solvePlacement((c) => c, { x: 10, y: 20 }, { x: 0, y: 0 }, Number.NaN);
    expect(css).toEqual({ x: 10, y: 20 });
  });
});

describe('recorte mientras se arrastra', () => {
  it('dentro de la pantalla se comporta como clampWindow', () => {
    const start = { x: 100, y: 100 };
    for (const p of [{ x: 300, y: 200 }, { x: -50, y: 900 }, { x: 5000, y: -5 }]) {
      expect(clampDrag(p, 300, 200, 1280, 800, start)).toEqual(clampWindow(p, 300, 200, 1280, 800));
    }
  });

  it('una ventana que ya asomaba fuera no salta al primer movimiento', () => {
    // Ficha a 150 % en una ventana corta: 776 px de alto empezando en y = 138 (sale por abajo).
    const start = { x: 21, y: 138 };
    expect(clampDrag({ x: 11, y: 148 }, 495, 776, 900, 800, start)).toEqual({ x: 11, y: 148 - 10 });
    // Subirla sí se deja; bajarla más de donde estaba, no.
    expect(clampDrag({ x: 21, y: 60 }, 495, 776, 900, 800, start)).toEqual({ x: 21, y: 60 });
    // Barra de abajo más ancha que la pantalla, empezando en x = -135: se mueve sin saltar a 0
    // y se desliza entre sus dos bordes (de -246 a 0), nunca más allá.
    const bar = { x: -135, y: 606 };
    expect(clampDrag({ x: -145, y: 560 }, 1146, 156, 900, 800, bar)).toEqual({ x: -145, y: 560 });
    expect(clampDrag({ x: -100, y: 560 }, 1146, 156, 900, 800, bar)).toEqual({ x: -100, y: 560 });
    expect(clampDrag({ x: -400, y: 560 }, 1146, 156, 900, 800, bar)).toEqual({ x: -246, y: 560 });
    expect(clampDrag({ x: 50, y: 560 }, 1146, 156, 900, 800, bar)).toEqual({ x: 0, y: 560 });
  });
});
