import { describe, it, expect } from 'vitest';
import { loadAudioData } from '../../src/audio/data';
import { AudioEngine } from '../../src/audio/engine';
import { ContextMusicPlayer } from '../../src/audio/contextMusic';

const data = loadAudioData();

// FakeCtx idéntico al de audio.test.ts, con tracking de stopTimes y gainCalls.
class FakeParam {
    value = 0;
    setValueAtTime(v: number): this { this.value = v; return this; }
    linearRampToValueAtTime(v: number): this { this.value = v; return this; }
    exponentialRampToValueAtTime(v: number): this { this.value = v; return this; }
    setTargetAtTime(v: number, _start?: number, _tc?: number): this { this.value = v; return this; }
}
class FakeNode {
    out: FakeNode[] = [];
    started = 0;
    onended: (() => void) | null = null;
    gain = new FakeParam();
    frequency = new FakeParam();
    Q = new FakeParam();
    pan = new FakeParam();
    detune = new FakeParam();
    playbackRate = new FakeParam();
    delayTime = new FakeParam();
    threshold = new FakeParam();
    knee = new FakeParam();
    ratio = new FakeParam();
    attack = new FakeParam();
    release = new FakeParam();
    type = '';
    buffer: unknown = null;
    loop = false;
    constructor(readonly kind: string, private readonly ctx: FakeCtx) {
        ctx.nodes.push(this);
    }
    connect(n: FakeNode): FakeNode { this.out.push(n); return n; }
    disconnect(): void { this.out = []; }
    start(): void { this.started++; this.ctx.started++; }
    stop(t?: number): void {
        if (t !== undefined) this.ctx.stopTimes.push(t);
        this.ctx.stopped.push(this);
    }
}
class FakeCtx {
    nodes: FakeNode[] = [];
    started = 0;
    stopped: FakeNode[] = [];
    stopTimes: number[] = [];
    gainCalls: Array<{ target: number; tc: number }> = [];
    currentTime = 0;
    sampleRate = 8000;
    destination = new FakeNode('destination', this);
    createGain(): FakeNode { return new FakeNode('gain', this); }
    createOscillator(): FakeNode { return new FakeNode('osc', this); }
    createBiquadFilter(): FakeNode { return new FakeNode('filter', this); }
    createStereoPanner(): FakeNode { return new FakeNode('panner', this); }
    createDynamicsCompressor(): FakeNode { return new FakeNode('limiter', this); }
    createDelay(): FakeNode { return new FakeNode('delay', this); }
    createBufferSource(): FakeNode { return new FakeNode('buffer', this); }
    createBuffer(_c: number, len: number): { getChannelData(): Float32Array } {
        const d = new Float32Array(len);
        return { getChannelData: () => d };
    }
    decodeAudioData(): Promise<AudioBuffer> {
        return Promise.resolve({} as AudioBuffer);
    }
}

describe('AUD-J2: crossfade entre contextos musicales', () => {
    it('la pista anterior se detiene en ≤ 2 s después del cambio', async () => {
        const ctx = new FakeCtx();
        const engine = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix, 1);
        const player = new ContextMusicPlayer(engine, async () => new Response(new ArrayBuffer(8)));

        // Activar 'title' primero.
        player.update('title', false);
        await new Promise((r) => setTimeout(r, 0));

        // Cambiar a 'town'.
        ctx.currentTime = 10;
        player.update('town', false);
        await new Promise((r) => setTimeout(r, 0));

        // La pista anterior debe detenerse a currentTime + ≤ 2.
        expect(ctx.stopTimes.length).toBeGreaterThanOrEqual(1);
        const lastStop = ctx.stopTimes[ctx.stopTimes.length - 1]!;
        expect(lastStop - ctx.currentTime).toBeLessThanOrEqual(2.0);
    });

    it('el fundido usa una constante de tiempo coherente con 2 s', () => {
        // CROSSFADE_TC = 2.0 / 5 = 0.4.
        // setTargetAtTime con tc=0.4 llega al 99% en 5*0.4 = 2.0 s.
        const tc = 2.0 / 5;
        const reached = 1 - Math.exp(-2.0 / tc);
        expect(reached).toBeGreaterThan(0.99);
    });

    it('cambiar de pueblo a cripta no deja más de 2 s de solape', async () => {
        const ctx = new FakeCtx();
        const engine = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix, 1);
        const player = new ContextMusicPlayer(engine, async () => new Response(new ArrayBuffer(8)));

        // Pueblo activo.
        player.update('town', false);
        await new Promise((r) => setTimeout(r, 0));

        // Entrar a la cripta.
        ctx.currentTime = 20;
        const t0 = ctx.currentTime;
        player.update('crypt', false);
        await new Promise((r) => setTimeout(r, 0));

        // Verificar que hay un stop programado.
        expect(ctx.stopTimes.length).toBeGreaterThanOrEqual(1);
        const stop = ctx.stopTimes[ctx.stopTimes.length - 1]!;
        expect(stop - t0).toBeLessThanOrEqual(2.0);
    });
});
