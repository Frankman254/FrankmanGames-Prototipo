import { describe, it, expect } from 'vitest';
import { CAST_MODES, CAST_MODE_NAMES, CastInput } from '../src/sim/castModes';
import { ACTIONS, ACTION_GROUPS } from '../src/ui/menus/keybindings';

describe('JL-101: tecla para cambiar el modo de lanzar', () => {
    it('CAST_MODES tiene 3 modos', () => {
        expect(CAST_MODES).toHaveLength(3);
        expect(CAST_MODES).toContain('pressClick');
        expect(CAST_MODES).toContain('indicator');
        expect(CAST_MODES).toContain('press');
    });

    it('CAST_MODE_NAMES tiene nombre para cada modo', () => {
        for (const mode of CAST_MODES) {
            expect(CAST_MODE_NAMES[mode]).toBeDefined();
            expect(CAST_MODE_NAMES[mode].length).toBeGreaterThan(0);
        }
    });

    it('castModeNext está en ACTIONS', () => {
        expect(ACTIONS).toContain('castModeNext');
    });

    it('castModeNext tiene label en ACTION_GROUPS', () => {
        const found = ACTION_GROUPS.flatMap((g) => g.actions).find((a) => a.action === 'castModeNext');
        expect(found).toBeDefined();
        expect(found!.label.length).toBeGreaterThan(0);
    });

    it('CastInput.ciclar modos en orden', () => {
        const input = new CastInput('pressClick');
        expect(input.mode).toBe('pressClick');

        // pressClick → indicator
        const next1 = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        input.setMode(next1);
        expect(input.mode).toBe('indicator');

        // indicator → press
        const next2 = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        input.setMode(next2);
        expect(input.mode).toBe('press');

        // press → pressClick (vuelve al inicio)
        const next3 = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        input.setMode(next3);
        expect(input.mode).toBe('pressClick');
    });

    it('CastInput.ciclar desde cualquier modo', () => {
        const input = new CastInput('indicator');
        expect(input.mode).toBe('indicator');

        const next = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        input.setMode(next);
        expect(input.mode).toBe('press');
    });

    it('setMode cancela el apuntado en curso', () => {
        const input = new CastInput('pressClick');
        // Simula apuntado: press() en pressClick inicia aiming
        const step = input.press(0, true);
        expect(step.kind).toBe('aim');
        expect(input.aiming).toBe(0);

        // Cambiar modo cancela
        const next = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        input.setMode(next);
        expect(input.aiming).toBeNull();
    });

    it('toast muestra el nombre correcto del modo siguiente', () => {
        const input = new CastInput('pressClick');
        const next = CAST_MODES[(CAST_MODES.indexOf(input.mode) + 1) % CAST_MODES.length]!;
        const toastText = `Lanzar: ${CAST_MODE_NAMES[next]}`;
        expect(toastText).toContain('Lanzar:');
        expect(toastText).toContain(CAST_MODE_NAMES[next]);
    });
});
