import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function readSrc(path: string): string {
    return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf-8');
}

describe('JL-444: desplazamiento y texto completo en el libro de hechizos', () => {
    const themesCss = readSrc('../src/ui/styles/themes.css');
    const ventanasCss = readSrc('../src/ui/styles/ventanas.css');

    it('mantiene el panel del libro acotado y desplazable', () => {
        expect(themesCss).toMatch(/\.menus-root \.layer > :not\(\.screen\):not\(\.modal-backdrop\)\.panel\s*\{[^}]*overflow:\s*auto/s);
        const spellbookLimit = themesCss.match(/\.menus-root \.layer-game > :not\(\.screen\):not\(\.modal-backdrop\)\.panel\.panel-spellbook\s*\{([^}]*)\}/s)?.[1] ?? '';
        expect(spellbookLimit).toMatch(/max-height:\s*max\(180px,\s*min\(620px,/);
        const panelBody = ventanasCss.match(/\.panel-body\s*\{([^}]*)\}/s)?.[1] ?? '';
        expect(panelBody).toMatch(/overflow:\s*auto/);
    });

    it('permite que los nombres de hechizos ocupen más de una línea sin truncarlos', () => {
        const nameRule = ventanasCss.match(/\.spell-name\s*\{([^}]*)\}/s)?.[1] ?? '';
        expect(nameRule).toMatch(/overflow-wrap:\s*anywhere/);
        expect(nameRule).toMatch(/white-space:\s*normal/);
        expect(nameRule).not.toMatch(/text-overflow:\s*ellipsis/);
        expect(nameRule).not.toMatch(/overflow:\s*hidden/);
    });
});
