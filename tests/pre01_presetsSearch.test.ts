import { describe, it, expect } from 'vitest';
import { presetMatches } from '../src/ui/menus/screens/modals';

const entry = {
    id: 'qa:ember_vanguard_200',
    name: 'Vanguardia del Manglar',
    description: 'Build equilibrada y equipo obtenible.',
    group: 'coverage',
    role: 'balance reproducible',
    classId: 'ember_vanguard',
    level: 200,
    place: 'Llanos de Azuero',
};

const className = (id: string) => {
    const names: Record<string, string> = {
        ember_vanguard: 'Vanguardia',
        mangrove_hunter: 'Cazador',
        storm_weaver: 'Tejedora',
    };
    return names[id] ?? id;
};

describe('PRE-01: buscador en partidas de prueba', () => {
    it('sin texto coincide con todo', () => {
        expect(presetMatches(entry, '', className)).toBe(true);
    });

    it('busca por nombre', () => {
        expect(presetMatches(entry, 'Vanguardia', className)).toBe(true);
        expect(presetMatches(entry, 'vanguardia', className)).toBe(true);
        expect(presetMatches(entry, 'manglar', className)).toBe(true);
    });

    it('busca por clase (id y nombre)', () => {
        expect(presetMatches(entry, 'ember_vanguard', className)).toBe(true);
        expect(presetMatches(entry, 'Vanguardia', className)).toBe(true);
        expect(presetMatches(entry, 'vanguardia', className)).toBe(true);
    });

    it('busca por lugar', () => {
        expect(presetMatches(entry, 'Azuero', className)).toBe(true);
        expect(presetMatches(entry, 'llanos', className)).toBe(true);
    });

    it('busca por nivel', () => {
        expect(presetMatches(entry, '200', className)).toBe(true);
        expect(presetMatches(entry, '20', className)).toBe(true); // "20" está en "200"
    });

    it('busca por descripción', () => {
        expect(presetMatches(entry, 'equilibrada', className)).toBe(true);
        expect(presetMatches(entry, 'obtenible', className)).toBe(true);
    });

    it('busca por ID', () => {
        expect(presetMatches(entry, 'qa:ember', className)).toBe(true);
    });

    it('no coincide con texto ausente', () => {
        expect(presetMatches(entry, 'xyz123', className)).toBe(false);
        expect(presetMatches(entry, 'Cazador', className)).toBe(false);
    });

    it('filtro por clase excluye las demás', () => {
        const entries = [
            { ...entry, classId: 'ember_vanguard' as string },
            { ...entry, classId: 'mangrove_hunter' as string },
            { ...entry, classId: 'storm_weaver' as string },
        ];
        const filtered = entries.filter((p) => p.classId === 'ember_vanguard');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.classId).toBe('ember_vanguard');
    });

    it('combinación de filtro por clase y texto', () => {
        const entries = [
            { ...entry, classId: 'ember_vanguard' as string, level: 200, place: 'Llanos de Azuero' },
            { ...entry, classId: 'ember_vanguard' as string, level: 100, place: 'Cerro Punta' },
            { ...entry, classId: 'mangrove_hunter' as string, level: 200, place: 'Llanos de Azuero' },
        ];
        // Solo Vanguardia + "Azuero"
        const filtered = entries.filter((p) => {
            if (p.classId !== 'ember_vanguard') return false;
            return presetMatches(p, 'Azuero', className);
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.place).toBe('Llanos de Azuero');
    });
});
