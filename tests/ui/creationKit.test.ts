// UI-CR: la ficha de clase de la creación sale de los datos reales (hechizos propios, elementos y estilo).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { classSpells, kitSummary } from '../../src/ui/menus/screens/creation';

const data = loadGameData();

describe('creación: resumen de la clase', () => {
    it('cada clase lista sus hechizos propios por nivel, con los de inicio entre ellos', () => {
        for (const c of Object.values(data.rpg.classes)) {
            const all = classSpells(data.rpg, c.id);
            expect(all.length).toBeGreaterThan(0);
            expect(all.every((s) => s.classId === c.id)).toBe(true);
            const lv = all.map((s) => s.unlockLevel ?? 1);
            expect([...lv].sort((a, b) => a - b)).toEqual(lv);
            for (const id of c.startingSpells) expect(all.map((s) => s.id)).toContain(id);
        }
    });

    it('el recuento de elementos suma el total y no inventa estilos vacíos', () => {
        for (const c of Object.values(data.rpg.classes)) {
            const all = classSpells(data.rpg, c.id);
            const k = kitSummary(all);
            expect(k.total).toBe(all.length);
            expect(k.elements.reduce((n, e) => n + e.count, 0)).toBe(all.length);
            expect(k.maxLevel).toBe(Math.max(...all.map((s) => s.unlockLevel ?? 1)));
            for (const s of k.styles) {
                expect(s.count).toBeGreaterThan(0);
                expect(s.count).toBeLessThanOrEqual(all.length);
            }
        }
    });
});
