// P12: los modales llevan botón × en la cabecera y el pie con "Volver"
// no se pierde al desplazar el contenido.
// Las pruebas verifican el código fuente y el CSS sin depender de JSDOM.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

function readSrc(path: string): string {
  return readFileSync(new URL(path, import.meta.url).pathname, 'utf-8');
}

describe('P12 — modales con botón cerrar y pie fijo', () => {
  describe('modal() acepta onClose como tercer parámetro', () => {
    it('la firma de modal() incluye onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      // modal() debe declarar onClose como parámetro
      expect(src).toMatch(/export function modal\([^)]*onClose/);
    });

    it('modal() crea botón panel-close cuando onClose existe', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      // Debe crear button.panel-close con texto × y title Cerrar
      expect(src).toContain("button.panel-close");
      expect(src).toContain("text: '×'");
      expect(src).toContain("title: 'Cerrar'");
      // El botón se añade a la cabecera
      expect(src).toContain('head.appendChild(close)');
    });

    it('modal() condicionaliza el botón con if (onClose)', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/if\s*\(\s*onClose\s*\)/);
    });
  });

  describe('todos los llamadores pasan onClose', () => {
    it('pauseModal pasa a.resume como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\('Menú',\s*'pause-modal',\s*a\.resume/);
    });

    it('optionsModal pasa a.back como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\('Opciones',\s*'options-modal',\s*a\.back/);
    });

    it('slotsModal pasa a.back como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\([^)]*'slots-modal',\s*a\.back/);
    });

    it('presetsModal pasa a.back como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\([^)]*'slots-modal\.presets-modal',\s*a\.back/);
    });

    it('confirmModal pasa onNo como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\([^)]*'confirm-modal',\s*onNo/);
    });

    it('keybindsModal pasa back como onClose', () => {
      const src = readSrc('../../src/ui/menus/screens/modals.ts');
      expect(src).toMatch(/modal\([^)]*'keybinds-modal',\s*back/);
    });

    it('death-modal en index.ts pasa undefined (no cerrable con ×)', () => {
      const src = readSrc('../../src/ui/menus/index.ts');
      expect(src).toMatch(/modal\([^)]*'death-modal',\s*undefined/);
    });

    it('stone-modal en index.ts pasa popModal como onClose', () => {
      const src = readSrc('../../src/ui/menus/index.ts');
      expect(src).toMatch(/modal\([^)]*'stone-modal',\s*popModal/);
    });
  });

  describe('CSS — pie fijo en modales', () => {
    it('options.css contiene regla sticky para .row-end y .opt-foot', () => {
      const css = readSrc('../../src/ui/styles/options.css');
      expect(css).toContain('position: sticky');
      expect(css).toContain('.row-end');
      expect(css).toContain('.opt-foot');
      expect(css).toContain('bottom: 0');
    });

    it('la regla sticky aplica a hijos directos de .modal > .panel-body', () => {
      const css = readSrc('../../src/ui/styles/options.css');
      expect(css).toMatch(/\.modal\s*>\s*\.panel-body\s*>\s*\.row-end/);
      expect(css).toMatch(/\.modal\s*>\s*\.panel-body\s*>\s*\.opt-foot/);
    });
  });
});
