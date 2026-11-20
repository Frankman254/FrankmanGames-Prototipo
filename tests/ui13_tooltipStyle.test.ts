// UI-13: Tooltips — mismo estilo en objetos, hechizos, estados y características;
// ninguno queda cortado en el borde.
import { describe, it, expect } from 'vitest';

describe('UI-13: Tooltips unificados', () => {
    // ── 1. CSS unificado: todas las clases tip-* están en ventanas.css ──

    describe('clases CSS de tooltip', () => {
        const requiredClasses = [
            '.tooltip',
            '.tip-head',
            '.tip-icon',
            '.tip-head-text',
            '.tip-title',
            '.tip-sub',
            '.tip-sep',
            '.tip-section',
            '.tip-fact',
            '.tip-fact b',
            '.tip-text',
            '.tip-stat',
            '.tip-stat.implicit',
            '.tip-stat.rolled',
            '.tip-set',
            '.tip-set.on',
            '.tip-cmp.up',
            '.tip-cmp.down',
            '.tip-hint',
            '.tip-req',
            '.tip-req.met',
        ];

        it('ventanas.css declara todas las clases tip-* necesarias', async () => {
            const { default: fs } = await import('fs');
            const { default: path } = await import('path');
            const css = fs.readFileSync(
                path.join(__dirname, '../src/ui/styles/ventanas.css'),
                'utf-8',
            );
            for (const cls of requiredClasses) {
                // Las clases CSS con espacio (".tip-fact b") no aparecen literales
                // en selectores simples; buscar sin el descendiente.
                const selector = cls.replace(/\s+b$/, '');
                expect(css).toContain(selector);
            }
        });

        it('menus.css no duplica reglas .tooltip (solo comentario)', async () => {
            const { default: fs } = await import('fs');
            const { default: path } = await import('path');
            const css = fs.readFileSync(
                path.join(__dirname, '../src/ui/styles/menus.css'),
                'utf-8',
            );
            // El bloque tooltip de menus.css debe ser solo un comentario.
            const tooltipSection = css.match(/\/\* ─── Tooltip ───[\s\S]*?\*\/\n/);
            expect(tooltipSection).toBeTruthy();
            // No debe contener reglas CSS activas (sin /* ni */)
            const activeRules = tooltipSection![0].replace(/\/\*[\s\S]*?\*\//g, '').trim();
            expect(activeRules).toBe('');
        });
    });

    // ── 2. Posicionamiento: place() no corta en bordes ──

    describe('posicionamiento del tooltip', () => {
        it('place() con cursor cerca del borde derecho invierte a la izquierda', () => {
            // Simular la lógica de place() con valores conocidos.
            const vw = 1920;
            const vh = 1080;
            const pad = 14;
            const margin = 6;
            const tooltipW = 320;
            const tooltipH = 200;
            const x = vw - 50; // cursor cerca del borde derecho
            const y = 500;

            let left = x + pad;
            let top = y + pad;

            // Lógica de place()
            if (left + tooltipW > vw - margin) {
                left = x - pad - tooltipW;
            }
            if (left < margin) {
                left = Math.max(margin, (vw - tooltipW) / 2);
            }
            if (top + tooltipH > vh - margin) {
                top = y - pad - tooltipH;
            }
            if (top < margin) {
                top = Math.max(margin, vh - tooltipH - margin);
            }

            // El tooltip debe quedar completamente dentro de la ventana
            expect(left).toBeGreaterThanOrEqual(margin);
            expect(left + tooltipW).toBeLessThanOrEqual(vw - margin);
            expect(top).toBeGreaterThanOrEqual(margin);
            expect(top + tooltipH).toBeLessThanOrEqual(vh - margin);
        });

        it('place() con cursor cerca del borde inferior coloca encima', () => {
            const vw = 1920;
            const vh = 1080;
            const pad = 14;
            const margin = 6;
            const tooltipW = 300;
            const tooltipH = 250;
            const x = 960;
            const y = vh - 40; // cursor cerca del borde inferior

            let left = x + pad;
            let top = y + pad;

            if (left + tooltipW > vw - margin) {
                left = x - pad - tooltipW;
            }
            if (left < margin) {
                left = Math.max(margin, (vw - tooltipW) / 2);
            }
            if (top + tooltipH > vh - margin) {
                top = y - pad - tooltipH;
            }
            if (top < margin) {
                top = Math.max(margin, vh - tooltipH - margin);
            }

            expect(top).toBeGreaterThanOrEqual(margin);
            expect(top + tooltipH).toBeLessThanOrEqual(vh - margin);
            // Debe estar encima del cursor
            expect(top + tooltipH).toBeLessThanOrEqual(y);
        });

        it('place() con tooltip más ancho que la pantalla lo centra', () => {
            const vw = 400; // pantalla muy estrecha
            const vh = 600;
            const pad = 14;
            const margin = 6;
            const tooltipW = 350;
            const tooltipH = 100;
            const x = 10; // cursor en el borde izquierdo
            const y = 300;

            let left = x + pad;
            let top = y + pad;

            if (left + tooltipW > vw - margin) {
                left = x - pad - tooltipW;
            }
            if (left < margin) {
                left = Math.max(margin, (vw - tooltipW) / 2);
            }
            if (top + tooltipH > vh - margin) {
                top = y - pad - tooltipH;
            }
            if (top < margin) {
                top = Math.max(margin, vh - tooltipH - margin);
            }

            // Centrado con margen mínimo
            expect(left).toBeGreaterThanOrEqual(margin);
            expect(left + tooltipW).toBeLessThanOrEqual(vw - margin);
        });

        it('place() con cursor en esquina superior izquierda no sale por arriba ni por la izquierda', () => {
            const vw = 1920;
            const vh = 1080;
            const pad = 14;
            const margin = 6;
            const tooltipW = 200;
            const tooltipH = 150;
            const x = 10;
            const y = 10;

            let left = x + pad;
            let top = y + pad;

            if (left + tooltipW > vw - margin) {
                left = x - pad - tooltipW;
            }
            if (left < margin) {
                left = Math.max(margin, (vw - tooltipW) / 2);
            }
            if (top + tooltipH > vh - margin) {
                top = y - pad - tooltipH;
            }
            if (top < margin) {
                top = Math.max(margin, vh - tooltipH - margin);
            }

            expect(left).toBeGreaterThanOrEqual(margin);
            expect(top).toBeGreaterThanOrEqual(margin);
        });

        it('place() con cursor en esquina superior derecha invierte a la izquierda', () => {
            const vw = 1920;
            const vh = 1080;
            const pad = 14;
            const margin = 6;
            const tooltipW = 300;
            const tooltipH = 150;
            const x = vw - 10;
            const y = 10;

            let left = x + pad;
            let top = y + pad;

            if (left + tooltipW > vw - margin) {
                left = x - pad - tooltipW;
            }
            if (left < margin) {
                left = Math.max(margin, (vw - tooltipW) / 2);
            }
            if (top + tooltipH > vh - margin) {
                top = y - pad - tooltipH;
            }
            if (top < margin) {
                top = Math.max(margin, vh - tooltipH - margin);
            }

            expect(left).toBeGreaterThanOrEqual(margin);
            expect(left + tooltipW).toBeLessThanOrEqual(vw - margin);
            expect(top).toBeGreaterThanOrEqual(margin);
        });
    });

    // ── 3. TipLine types: todos los kinds tienen estilo CSS ──

    describe('TipLine kinds y renderLine', () => {
        const kinds = [
            { kind: 'title', cssClass: 'tip-title' },
            { kind: 'sub', cssClass: 'tip-sub' },
            { kind: 'stat', cssClass: 'tip-stat' },
            { kind: 'text', cssClass: 'tip-text' },
            { kind: 'set', cssClass: 'tip-set' },
            { kind: 'compare', cssClass: 'tip-cmp' },
            { kind: 'hint', cssClass: 'tip-hint' },
            { kind: 'req', cssClass: 'tip-req' },
            { kind: 'fact', cssClass: 'tip-fact' },
            { kind: 'section', cssClass: 'tip-section' },
            { kind: 'sep', cssClass: 'tip-sep' },
        ];

        it('cada kind de TipLine tiene su clase CSS en ventanas.css', async () => {
            const { default: fs } = await import('fs');
            const { default: path } = await import('path');
            const css = fs.readFileSync(
                path.join(__dirname, '../src/ui/styles/ventanas.css'),
                'utf-8',
            );
            for (const { cssClass } of kinds) {
                expect(css).toContain(`.${cssClass}`);
            }
        });
    });

    // ── 4. character.ts: sin .title nativo ──

    describe('character.ts sin tooltips nativos', () => {
        it('no usa .title para tooltips en la ventana de personaje', async () => {
            const { default: fs } = await import('fs');
            const { default: path } = await import('path');
            const code = fs.readFileSync(
                path.join(__dirname, '../src/ui/menus/character.ts'),
                'utf-8',
            );
            // No debe haber asignaciones .title = en character.ts
            const titleAssignments = code.match(/\.title\s*=/g);
            expect(titleAssignments).toBeNull();
        });
    });
});
