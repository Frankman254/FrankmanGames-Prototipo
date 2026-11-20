// EQ-14: Hoja de personaje — el desglose de cada característica muestra
// las fuentes (base, puntos, equipo, conjunto, mascota) y el tooltip
// al pasar el ratón las lista con nombre legible.
import { describe, it, expect } from 'vitest';
import { StatSheet, type Mod } from '../src/rpg/stats';
import { sourceLabel } from '../src/ui/menus/format';
import { PRIMARY_STATS } from '../src/rpg/contracts';

describe('EQ-14: Hoja de personaje — desglose de características', () => {
    describe('StatSheet.line() devuelve el breakdown por fuente', () => {
        it('muestra la fuente class', () => {
            const sheet = new StatSheet();
            sheet.set('class', [{ stat: 'maxHealth', op: 'flat', value: 100 }]);
            const line = sheet.line('maxHealth');
            expect(line.breakdown).toHaveLength(1);
            expect(line.breakdown[0]).toEqual({ source: 'class', op: 'flat', value: 100 });
        });

        it('muestra la fuente level', () => {
            const sheet = new StatSheet();
            sheet.set('level', [{ stat: 'maxHealth', op: 'flat', value: 50 }]);
            const line = sheet.line('maxHealth');
            expect(line.breakdown[0]!.source).toBe('level');
        });

        it('muestra la fuente points', () => {
            const sheet = new StatSheet();
            sheet.set('points', [{ stat: 'strength', op: 'flat', value: 5 }]);
            const line = sheet.line('strength');
            expect(line.breakdown[0]!.source).toBe('points');
            expect(line.breakdown[0]!.value).toBe(5);
        });

        it('muestra la fuente item:uid (equipo)', () => {
            const sheet = new StatSheet();
            sheet.set('item:uid-espada', [{ stat: 'power', op: 'flat', value: 10 }]);
            const line = sheet.line('power');
            expect(line.breakdown[0]!.source).toBe('item:uid-espada');
        });

        it('muestra la fuente set:id (conjunto)', () => {
            const sheet = new StatSheet();
            sheet.set('set:tri_ceniza', [{ stat: 'critChance', op: 'flat', value: 0.05 }]);
            const line = sheet.line('critChance');
            expect(line.breakdown[0]!.source).toBe('set:tri_ceniza');
        });

        it('muestra la fuente pet:id (mascota)', () => {
            const sheet = new StatSheet();
            sheet.set('pet:escarabajo', [{ stat: 'discovery', op: 'flat', value: 3 }]);
            const line = sheet.line('discovery');
            expect(line.breakdown[0]!.source).toBe('pet:escarabajo');
        });

        it('agrega múltiples fuentes en el mismo stat', () => {
            const sheet = new StatSheet();
            sheet.set('class', [{ stat: 'maxHealth', op: 'flat', value: 100 }]);
            sheet.set('level', [{ stat: 'maxHealth', op: 'flat', value: 50 }]);
            sheet.set('item:uid-armadura', [{ stat: 'maxHealth', op: 'flat', value: 30 }]);
            const line = sheet.line('maxHealth');
            expect(line.breakdown).toHaveLength(3);
            expect(line.value).toBe(180);
            const sources = line.breakdown.map((b) => b.source);
            expect(sources).toContain('class');
            expect(sources).toContain('level');
            expect(sources).toContain('item:uid-armadura');
        });

        it('las fuentes derivadas aparecen como derived:primaria', () => {
            const sheet = new StatSheet([
                { from: 'vitality', to: 'maxHealth', op: 'flat', per: 10 },
            ]);
            sheet.set('class', [{ stat: 'vitality', op: 'flat', value: 5 }]);
            const line = sheet.line('maxHealth');
            const derived = line.breakdown.find((b) => b.source === 'derived:vitality');
            expect(derived).toBeDefined();
            expect(derived!.value).toBe(50); // 5 * 10
        });

        it('quitar una fuente la elimina del breakdown', () => {
            const sheet = new StatSheet();
            sheet.set('class', [{ stat: 'maxHealth', op: 'flat', value: 100 }]);
            sheet.set('item:uid-armadura', [{ stat: 'maxHealth', op: 'flat', value: 30 }]);
            sheet.remove('item:uid-armadura');
            const line = sheet.line('maxHealth');
            expect(line.breakdown).toHaveLength(1);
            expect(line.breakdown[0]!.source).toBe('class');
            expect(line.value).toBe(100);
        });

        it('removePrefix quita todas las fuentes de un tipo', () => {
            const sheet = new StatSheet();
            sheet.set('item:uid-1', [{ stat: 'power', op: 'flat', value: 10 }]);
            sheet.set('item:uid-2', [{ stat: 'power', op: 'flat', value: 5 }]);
            sheet.set('class', [{ stat: 'power', op: 'flat', value: 20 }]);
            sheet.removePrefix('item:');
            const line = sheet.line('power');
            expect(line.breakdown).toHaveLength(1);
            expect(line.breakdown[0]!.source).toBe('class');
        });
    });

    describe('StatSheet.lines() cubre todas las primarias', () => {
        it('devuelve una línea por cada stat primaria', () => {
            const sheet = new StatSheet();
            const lines = sheet.lines();
            for (const stat of PRIMARY_STATS) {
                const found = lines.find((l) => l.stat === stat);
                expect(found).toBeDefined();
            }
        });
    });

    describe('sourceLabel traduce las fuentes a nombres legibles', () => {
        const emptyContent = {
            items: {} as Record<string, any>,
            sets: {} as Record<string, any>,
            pets: {} as Record<string, any>,
            statuses: {} as Record<string, any>,
            classes: {} as Record<string, any>,
            spells: {} as Record<string, any>,
            lootTables: {} as Record<string, any>,
            progression: {} as any,
            merchants: {} as Record<string, any>,
            reactions: {} as Record<string, any>,
            dungeons: {} as Record<string, any>,
        };
        const findItem = () => null;

        it('class → Clase', () => {
            expect(sourceLabel('class', emptyContent, findItem)).toBe('Clase');
        });

        it('level → Nivel', () => {
            expect(sourceLabel('level', emptyContent, findItem)).toBe('Nivel');
        });

        it('points → Puntos repartidos', () => {
            expect(sourceLabel('points', emptyContent, findItem)).toBe('Puntos repartidos');
        });

        it('set:id → nombre del conjunto o "Conjunto"', () => {
            const content = {
                ...emptyContent,
                sets: { tri_ceniza: { name: 'Tríada de Ceniza' } as any },
            };
            expect(sourceLabel('set:tri_ceniza', content, findItem)).toBe('Tríada de Ceniza');
            expect(sourceLabel('set:inexistente', content, findItem)).toBe('Conjunto');
        });

        it('pet:id → Mascota: nombre', () => {
            const content = {
                ...emptyContent,
                pets: { escarabajo: { name: 'Escarabajo de Ceniza' } as any },
            };
            expect(sourceLabel('pet:escarabajo', content, findItem)).toBe('Mascota: Escarabajo de Ceniza');
        });

        it('item:uid → nombre del objeto cuando existe', () => {
            const content = {
                ...emptyContent,
                items: { espada_llanos: { name: 'Espada de los Llanos' } as any },
            };
            const findItemWithItem = () => ({ itemId: 'espada_llanos', uid: 'uid-1' } as any);
            expect(sourceLabel('item:uid-1', content, findItemWithItem)).toBe('Espada de los Llanos');
        });

        it('item:uid sin objeto → "Objeto"', () => {
            expect(sourceLabel('item:uid-borrado', emptyContent, findItem)).toBe('Objeto');
        });

        it('derived:vitality → "de vitalidad"', () => {
            const result = sourceLabel('derived:vitality', emptyContent, findItem);
            expect(result).toContain('vitalidad');
        });
    });

    describe('EQ-14: huacas y monturas como item:uid en el desglose', () => {
        it('una huaca equipada aparece como item:uid en el breakdown', () => {
            const sheet = new StatSheet();
            sheet.set('item:uid-huaca-1', [{ stat: 'critChance', op: 'flat', value: 0.03 }]);
            const line = sheet.line('critChance');
            expect(line.breakdown[0]!.source).toBe('item:uid-huaca-1');
        });

        it('una montura equipada aparece como item:uid en el breakdown', () => {
            const sheet = new StatSheet();
            sheet.set('item:uid-crestalba', [{ stat: 'moveSpeed', op: 'flat', value: 2 }]);
            const line = sheet.line('moveSpeed');
            expect(line.breakdown[0]!.source).toBe('item:uid-crestalba');
        });
    });
});
