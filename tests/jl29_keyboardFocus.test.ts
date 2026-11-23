// JL-29: Foco visible con teclado en menús y Tab en orden lógico.
// Las pruebas verifican el código fuente y el CSS sin depender de JSDOM.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

function readSrc(path: string): string {
    return readFileSync(new URL(path, import.meta.url).pathname, 'utf-8');
}

describe('JL-29: Foco visible con teclado', () => {
    const menusCss = readSrc('../src/ui/styles/menus.css');
    const inventoryTs = readSrc('../src/ui/menus/inventory.ts');
    const titleTs = readSrc('../src/ui/menus/screens/title.ts');
    const modalsTs = readSrc('../src/ui/menus/screens/modals.ts');
    const domTs = readSrc('../src/ui/menus/dom.ts');

    describe('CSS :focus-visible en menus.css', () => {
        it('los botones .btn tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.btn:focus-visible\s*\{[^}]*outline/);
        });

        it('las pestañas .opt-tab tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.opt-tab:focus-visible\s*\{[^}]*outline/);
        });

        it('los inputs tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/input:focus-visible\s*\{[^}]*outline/);
        });

        it('los selects tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/select:focus-visible/);
            // Verificar que el bloque con select incluye outline.
            expect(menusCss).toMatch(/select:focus-visible[\s\S]*?outline/);
        });

        it('los textareas tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/textarea:focus-visible/);
            expect(menusCss).toMatch(/textarea:focus-visible[\s\S]*?outline/);
        });

        it('las casillas .cell tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.cell:focus-visible\s*\{[^}]*outline/);
        });

        it('el botón cerrar .panel-close tiene :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.panel-close:focus-visible\s*\{[^}]*outline/);
        });

        it('los botones .keybind-key tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.keybind-key:focus-visible\s*\{[^}]*outline/);
        });

        it('los filtros .chat-filter tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.chat-filter:focus-visible\s*\{[^}]*outline/);
        });

        it('las ranuras .slot-row tienen :focus-visible con outline', () => {
            expect(menusCss).toMatch(/\.slot-row:focus-visible\s*\{[^}]*outline/);
        });
    });

    describe('Portada: botones en orden visual', () => {
        it('titleScreen usa button() para cada opción del menú', () => {
            // Los botones HTML son focusables por defecto (tabIndex=0).
            // El helper ilustrado debe seguir delegando en button() para cada opción.
            expect(titleTs).toContain('const b = button(label');
            expect(titleTs).toContain("menuButton('Continuar'");
            expect(titleTs).toContain("menuButton('Nueva partida'");
            expect(titleTs).toContain("menuButton('Opciones'");
            expect(titleTs).toContain("menuButton('Salir'");
        });

        it('los botones están dentro de nav.title-menu (orden visual = orden DOM)', () => {
            // nav.title-menu contiene los botones en orden vertical.
            expect(titleTs).toContain('nav.title-menu');
        });
    });

    describe('Opciones: controles focusables', () => {
        it('las pestañas son botones .opt-tab', () => {
            // optionsModal crea button.opt-tab para cada pestaña.
            expect(modalsTs).toMatch(/button\.opt-tab/);
        });

        it('los selects de opciones son elementos HTML select (focusables por defecto)', () => {
            // optionsModal usa h('select', ...) para los selects.
            expect(modalsTs).toMatch(/h\('select'/);
        });

        it('los inputs de rango son elementos HTML input (focusables por defecto)', () => {
            expect(modalsTs).toMatch(/h\('input',\s*\{[^}]*type:\s*'range'/);
        });

        it('los checkboxes son elementos HTML input (focusables por defecto)', () => {
            expect(modalsTs).toMatch(/h\('input',\s*\{[^}]*type:\s*'checkbox'/);
        });
    });

    describe('Inventario: casillas focusables con teclado', () => {
        it('las casillas llenas tienen tabindex="0"', () => {
            expect(inventoryTs).toMatch(/setAttribute\('tabindex',\s*'0'\)/);
        });

        it('las casillas llenas tienen role="button"', () => {
            expect(inventoryTs).toMatch(/setAttribute\('role',\s*'button'\)/);
        });

        it('las casillas llenas tienen aria-label con el nombre del objeto', () => {
            expect(inventoryTs).toMatch(/setAttribute\('aria-label',\s*def\.name\)/);
        });

        it('Enter activa la casilla (equipar/usar)', () => {
            expect(inventoryTs).toMatch(/e\.key\s*===\s*'Enter'/);
        });

        it('Espacio activa la casilla (equipar/usar)', () => {
            expect(inventoryTs).toMatch(/e\.key\s*===\s*' '/);
        });

        it('el keydown previene el comportamiento por defecto', () => {
            expect(inventoryTs).toMatch(/e\.preventDefault\(\)/);
        });
    });

    describe('Ranuras de guardado: botones focusables', () => {
        it('slotsModal usa button() para Guardar/Cargar', () => {
            // button(mode === 'save' ? 'Guardar aquí' : 'Cargar', ...)
            expect(modalsTs).toContain('Guardar aquí');
            expect(modalsTs).toContain('Cargar');
            expect(modalsTs).toMatch(/button\([^)]*(?:Guardar|Cargar)/);
        });

        it('slotsModal usa button() para Renombrar y Borrar', () => {
            // 'Renombrar' está en una línea separada del button(;
            // button('Borrar', ...)
            expect(modalsTs).toMatch(/button\([^)]*'Borrar'/);
            // Renombrar: el button() lo contiene en el mismo bloque.
            expect(modalsTs).toMatch(/button\([^)]*'Renombrar'/);
        });

        it('el botón Volver es un button()', () => {
            expect(modalsTs).toMatch(/button\('Volver'/);
        });
    });

    describe('dom.ts: button() crea botones HTML focusables', () => {
        it('button() usa h("button"...) que crea HTMLButtonElement', () => {
            // button() debe crear un elemento button HTML.
            expect(domTs).toMatch(/h\(`button/);
        });

        it('button() establece type="button" para evitar submit', () => {
            expect(domTs).toMatch(/type:\s*'button'/);
        });
    });
});
