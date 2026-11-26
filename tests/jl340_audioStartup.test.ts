import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector } from '../src/audio/director';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('JL-340: arranque sin dispositivo de audio', () => {
    it('un contexto bloqueado no interrumpe el primer gesto ni deja el desbloqueo activo', () => {
        const listeners = new Map<string, EventListener>();
        let attempts = 0;
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const fakeWindow = {
            AudioContext: class {
                constructor() {
                    attempts++;
                    throw new Error('dispositivo de audio ausente');
                }
            },
            webkitAudioContext: undefined,
            addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
            removeEventListener: vi.fn((type: string, listener: EventListener) => {
                if (listeners.get(type) === listener) listeners.delete(type);
            }),
        };
        vi.stubGlobal('window', fakeWindow);

        const director = new AudioDirector({
            world: () => ({} as never),
            view: {
                handleEvents: vi.fn(),
                scene: { onBeforeRenderObservable: { add: vi.fn() } },
            } as never,
            overworld: {} as never,
            menus: null,
            session: () => null,
        });
        const unlock = listeners.get('pointerdown');

        expect(unlock).toBeDefined();
        expect(() => unlock?.(new Event('pointerdown'))).not.toThrow();
        expect(director.engine).toBeNull();
        expect(listeners.has('pointerdown')).toBe(false);
        expect(listeners.has('keydown')).toBe(false);
        director.start();
        expect(attempts).toBe(1);
        expect(warning).toHaveBeenCalledOnce();
        expect(error).not.toHaveBeenCalled();
    });
});