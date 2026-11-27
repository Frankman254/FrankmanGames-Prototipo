import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function readSrc(path: string): string {
    return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf-8');
}

describe('JL-407: accesibilidad por teclado de barra y menús principales', () => {
    const hud = readSrc('../src/ui/menus/hud.ts');
    const menus = readSrc('../src/ui/menus/index.ts');
    const main = readSrc('../src/main.ts');
    const menusCss = readSrc('../src/ui/styles/menus.css');
    const ventanasCss = readSrc('../src/ui/styles/ventanas.css');

    it('las ranuras de hechizos y objetos admiten foco, activación y nombre accesible', () => {
        expect(hud).toMatch(/setAttribute\('role',\s*'button'\)/);
        expect(hud).toMatch(/tabIndex\s*=\s*0/);
        expect(hud).toMatch(/setAttribute\('aria-label'/);
        expect(hud).toMatch(/e\.key\s*!==\s*'Enter'/);
        expect(hud).toMatch(/e\.key\s*!==\s*' '/);
    });

    it('el menú de modo de lanzamiento abre y se maneja con el teclado', () => {
        expect(hud).toContain("e.key !== 'ContextMenu'");
        expect(hud).toContain("e.key === 'F10'");
        expect(hud).toContain("e.key === 'ArrowDown'");
        expect(hud).toContain("e.key === 'ArrowUp'");
        expect(hud).toContain("e.key === 'Escape'");
        expect(hud).toContain('items[target]?.focus()');
        expect(hud).toContain("'aria-label': tr('Modo de lanzamiento')");
    });

    it('al abrir un menú modal mueve el foco dentro y al cerrar lo devuelve', () => {
        expect(menus).toContain('returnFocus');
        expect(menus).toContain('focusTarget?.focus()');
        expect(menus).toContain('restoreFocus.focus()');
    });

    it('Escape llega a los menús enfocados aunque haya un apuntado activo', () => {
        expect(main).toContain('e.target.closest(\'.layer-modal, [role="menu"]\')');
        expect(main).toContain('e.stopImmediatePropagation()');
    });

    it('los atajos globales no cancelan Enter ni Espacio sobre botones nativos', () => {
        expect(menus).toContain('t instanceof HTMLButtonElement');
        expect(menus).toContain("e.code === 'Enter' || e.code === 'Space'");
        expect(menus).toContain("e.code === 'Tab' && (screen !== 'game' || !(t instanceof HTMLCanvasElement))");
    });

    it('el menú del sistema vuelve a montarse tras iniciar o cargar una partida', () => {
        expect(menus).toContain('clear(gameLayer);');
        expect(menus).toContain('gameLayer.appendChild(sysMenu);');
    });

    it('los controles de fila y plegado anuncian su estado actual', () => {
        expect(hud).toContain("'aria-pressed'");
        expect(hud).toContain("'aria-expanded'");
        expect(hud).toContain("'aria-label'");
        expect(hud).toContain("tr(r < this.visibleRows ? 'Visible' : 'Oculta').toLowerCase()");
    });

    it('la barra y el menú del sistema muestran foco visible', () => {
        expect(menusCss).toMatch(/\.hot-slot:focus-visible\s*\{[^}]*outline/);
        expect(menusCss).toMatch(/\.hud-menu-btn:focus-visible\s*\{[^}]*outline/);
        expect(menusCss).toMatch(/\.hud-row-toggle:focus-visible\s*\{[^}]*outline/);
        expect(menusCss).toMatch(/\.hud-itembar-fold:focus-visible\s*\{[^}]*outline/);
        expect(ventanasCss).toMatch(/\.sys-btn:focus-visible\s*\{[^}]*outline/);
    });
});
