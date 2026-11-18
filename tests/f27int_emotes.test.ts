// F27-INT: Los emotes del chat disparan su clip.
// Pruebas de la máquina de estados: playEmote → clip, movimiento corta,
// daño corta, timer de dance/sleep, reset limpia.
import { NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import type { AnimState } from '../src/world/rigs';
import type { CharacterModel, PlayOptions } from '../src/render/characters/characterModel';
import { PlayerAvatar } from '../src/render/characters/playerAvatar';
import type { Player } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';

/* ── Mock con playNamed / stopGesture / gesturing ─────────────────── */

class EmoteMockModel implements CharacterModel {
    readonly root: TransformNode;
    readonly height = 1.8;
    readonly meshes: readonly any[] = [];
    private _state: AnimState | null = null;
    private _gestureActive = false;
    private _gestureDone?: () => void;
    readonly playedNamed: string[] = [];
    private _stopCount = 0;

    constructor() {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        this.root = new TransformNode('emote-mock', scene);
    }

    get state(): AnimState | null {
        return this._state;
    }

    get finished(): boolean {
        return false;
    }

    get gesturing(): boolean {
        return this._gestureActive;
    }

    play(state: AnimState, _opts?: PlayOptions): void {
        this._state = state;
    }

    playNamed(clip: string, onDone?: () => void): boolean {
        this.playedNamed.push(clip);
        this._gestureActive = true;
        this._gestureDone = onDone;
        return true;
    }

    /** Simula que el clip terminó (para los tests de una sola vez). */
    finishGesture(): void {
        this._gestureActive = false;
        this._gestureDone?.();
    }

    stopGesture(): void {
        this._stopCount++;
        this._gestureActive = false;
        this._gestureDone = undefined;
    }

    get stopGestureCallCount(): number {
        return this._stopCount;
    }

    getLastNamed(): string | undefined {
        return this.playedNamed[this.playedNamed.length - 1];
    }

    update(_dt: number, _speed: number): Array<{ type: string; clip: string }> {
        return [];
    }

    socket(_joint: string, out: Vector3): Vector3 {
        return out.set(0, 1, 0);
    }

    lowestFoot(out: Vector3): Vector3 {
        return out.set(0, 0, 0);
    }

    impactTime(_state: AnimState): number {
        return 0.5;
    }

    clipSeconds(_state: AnimState): number {
        return 1;
    }

    setEmissive(_r: number, _g: number, _b: number): void {}
    setShade(_k: number): void {}
    dispose(): void {}
}

const basePlayer = (): Player =>
    ({
        alive: true,
        spectral: false,
        casting: false,
        invulnerable: 0,
        path: [],
        pos: { x: 10, y: 0 },
        prevPos: { x: 10, y: 0 },
        facing: 0,
        speed: 0,
    }) as unknown as Player;

const ground = { sample: (_x: number, _z: number) => 0 } as any;

/* ── Pruebas ──────────────────────────────────────────────────────── */

describe('F27-INT: emotes del chat', () => {
    it('playEmote("wave") → playNamed("Emote_wave")', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('wave');
        expect(m.getLastNamed()).toBe('Emote_wave');
        expect(m.gesturing).toBe(true);
    });

    it('playEmote("dance") → playNamed("Emote_dance") + timer 4 s', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('dance');
        expect(m.getLastNamed()).toBe('Emote_dance');
        // dance es looping: el timer debe estar activo.
        expect(avatar.isEmoting).toBe(true);
    });

    it('emote no válido → sin llamada si playNamed devuelve false', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        // Forzamos playNamed a fallar.
        m.playNamed = () => false;
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('wave');
        expect(avatar.isEmoting).toBe(false);
    });

    it('isEmoting true tras playEmote', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        expect(avatar.isEmoting).toBe(false);
        avatar.playEmote('laugh');
        expect(avatar.isEmoting).toBe(true);
    });

    it('moverse corta el emote', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('wave');
        expect(avatar.isEmoting).toBe(true);
        // sync con movimiento → cancelEmote
        const moving = {
            ...basePlayer(),
            speed: 6,
            path: [{ x: 10, y: 0 }, { x: 20, y: 0 }],
            prevPos: { x: 9, y: 0 },
            pos: { x: 10, y: 0 },
        } as unknown as Player;
        avatar.sync(moving, 10, 0, 0, 1 / 60, true);
        expect(avatar.isEmoting).toBe(false);
        expect(m.stopGestureCallCount).toBeGreaterThanOrEqual(1);
    });

    it('daño al jugador corta el emote', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.entityId = 1;
        avatar.playEmote('sleep');
        expect(avatar.isEmoting).toBe(true);
        const dmg: GameEvent = { type: 'damage', sourceId: 2, targetId: 1, amount: 10, crit: false, toPlayer: true, ability: null };
        avatar.onGameEvent(dmg);
        expect(avatar.isEmoting).toBe(false);
    });

    it('cast corta el emote', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('love');
        expect(avatar.isEmoting).toBe(true);
        avatar.onGameEvent({ type: 'cast', ability: 'spark' });
        expect(avatar.isEmoting).toBe(false);
    });

    it('timer de dance expira tras 4 s', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('dance');
        expect(avatar.isEmoting).toBe(true);
        // Avanzar 3 s: sigue activo.
        const p = basePlayer();
        avatar.sync(p, 10, 0, 0, 3, true);
        expect(avatar.isEmoting).toBe(true);
        // Avanzar 1.1 s más: expira.
        avatar.sync(p, 10, 0, 0, 1.1, true);
        expect(avatar.isEmoting).toBe(false);
    });

    it('emote de una vez: clip termina → idle', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('wave');
        expect(m.gesturing).toBe(true);
        // Simular que el clip terminó.
        m.finishGesture();
        // sync: gesturing false + emoteActive → limpiar y volver a idle.
        avatar.sync(basePlayer(), 10, 0, 0, 1 / 60, true);
        expect(avatar.isEmoting).toBe(false);
    });

    it('reset() limpia el emote', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('doubt');
        expect(avatar.isEmoting).toBe(true);
        avatar.reset();
        expect(avatar.isEmoting).toBe(false);
    });

    it('emote nuevo cancela el anterior', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        avatar.playEmote('wave');
        expect(m.playedNamed.length).toBe(1);
        avatar.playEmote('laugh');
        expect(m.playedNamed.length).toBe(2);
        expect(m.getLastNamed()).toBe('Emote_laugh');
        // Solo un emote activo.
        expect(avatar.isEmoting).toBe(true);
    });

    it('sleep es looping, cry no lo es', () => {
        const scene = new Scene(new NullEngine());
        const m = new EmoteMockModel();
        const avatar = new PlayerAvatar(scene, m, ground);
        // sleep: timer > 0
        avatar.playEmote('sleep');
        expect(avatar.isEmoting).toBe(true);
        // Avanzar 2 s: sigue activo (timer 4 s).
        avatar.sync(basePlayer(), 10, 0, 0, 2, true);
        expect(avatar.isEmoting).toBe(true);

        // cry: no es looping; al terminar el clip, sync lo limpia.
        avatar.reset();
        m.finishGesture(); // limpiar sleep previo
        avatar.playEmote('cry');
        expect(m.getLastNamed()).toBe('Emote_cry');
        m.finishGesture();
        avatar.sync(basePlayer(), 10, 0, 0, 1 / 60, true);
        expect(avatar.isEmoting).toBe(false);
    });
});
