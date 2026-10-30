import { describe, expect, it } from 'vitest';
import { cuesForEvent, cuesForSession, spatialize, weaponKindOf, type CueContext } from '../src/audio/cues';
import { loadAudioData } from '../src/audio/data';
import { AudioEngine } from '../src/audio/engine';
import { ambienceMix, composeBar, layerMix, MoodMixer, moodTargets, variation } from '../src/audio/score';
import { Rng } from '../src/sim/rng';

const data = loadAudioData();

// AudioContext falso: registra nodos, conexiones y arranques.
class FakeParam {
  value = 0;
  setValueAtTime(v: number): this { this.value = v; return this; }
  linearRampToValueAtTime(v: number): this { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number): this { this.value = v; return this; }
  setTargetAtTime(v: number): this { this.value = v; return this; }
}
class FakeNode {
  out: FakeNode[] = [];
  started = 0;
  onended: (() => void) | null = null;
  gain = new FakeParam(); frequency = new FakeParam(); Q = new FakeParam(); pan = new FakeParam(); detune = new FakeParam();
  playbackRate = new FakeParam(); delayTime = new FakeParam(); threshold = new FakeParam(); knee = new FakeParam();
  ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam();
  type = ''; buffer: unknown = null; loop = false;
  constructor(readonly kind: string, private readonly ctx: FakeCtx) { ctx.nodes.push(this); }
  connect(n: FakeNode): FakeNode { this.out.push(n); return n; }
  disconnect(): void { this.out = []; }
  start(): void { this.started++; this.ctx.started++; }
  stop(): void { this.ctx.stopped.push(this); }
}
class FakeCtx {
  nodes: FakeNode[] = [];
  started = 0;
  stopped: FakeNode[] = [];
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
  createBuffer(_c: number, len: number): { getChannelData(): Float32Array } { const d = new Float32Array(len); return { getChannelData: () => d }; }
}

const ctxOf = (over: Partial<CueContext> = {}): CueContext => ({
  playerId: 1,
  positionOf: (id) => (id === 1 ? { x: 0, z: 0 } : { x: 5, z: 0 }),
  elementOf: (t) => (t === 'spark' ? 'storm' : 'physical'),
  weaponKind: () => 'wand',
  lootInfo: () => ({ x: 2, z: 0, rarity: 'epic', gold: 0, item: true }),
  bobber: () => ({ x: 3, z: 3 }),
  ...over,
});

describe('audio: mapeo de sucesos', () => {
  it('cada suceso relevante tiene sonido y todos los sonidos mapeados existen', () => {
    const c = ctxOf();
    const evs = [
      { type: 'cast', ability: 'basic' }, { type: 'cast', ability: 'spark' },
      { type: 'damage', sourceId: 1, targetId: 2, amount: 9, crit: true, toPlayer: false, ability: 'spark' },
      { type: 'damage', sourceId: 2, targetId: 1, amount: 9, crit: false, toPlayer: true, ability: null },
      { type: 'telegraph', enemyId: 2 }, { type: 'avoided', sourceId: 2 }, { type: 'reflect', fromId: 2, toId: 1, ability: 'spark' }, { type: 'counter', targetId: 1, sourceId: 2 }, { type: 'rewind', targetId: 1, from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }, { type: 'enemyDeath', enemyId: 2, archetype: 'melee' },
      { type: 'playerDeath' }, { type: 'lootDrop', lootId: 4 }, { type: 'lootPickup', lootId: 4, byPet: false }, { type: 'levelUp', level: 2 },
      { type: 'fishCast', spotId: 's', x: 3, y: 3 }, { type: 'fishNibble' }, { type: 'fishBite' },
      { type: 'fishCatch', itemId: 'x', gold: 3 }, { type: 'fishEscape', reason: 'late' },
    ] as const;
    for (const e of evs) {
      const cues = cuesForEvent(e as never, c);
      expect(cues.length, e.type).toBeGreaterThan(0);
      for (const q of cues) expect(data.sfx.sounds[q.sound], `${e.type} → ${q.sound}`).toBeDefined();
    }
    expect(cuesForEvent({ type: 'cast', ability: 'basic' }, c)[0]!.sound).toBe('swing_wand');
    expect(cuesForEvent({ type: 'cast', ability: 'spark' }, c)[0]!.sound).toBe('cast_storm');
    // Aviso y picada no se pierden por distancia; el plop cae donde el corcho, después.
    expect(cuesForEvent({ type: 'telegraph', enemyId: 2 }, c)[0]!.minGain).toBeGreaterThan(0.5);
    expect(cuesForEvent({ type: 'fishBite' }, c)[0]!.minGain).toBeGreaterThan(0.8);
    const plop = cuesForEvent({ type: 'fishCast', spotId: 's', x: 3, y: 3 }, c).find((q) => q.sound === 'fish_plop')!;
    expect(plop.delay).toBeGreaterThan(0);
    for (const k of ['blade', 'heavy', 'blunt', 'staff', 'wand', 'orb', 'unarmed']) expect(data.sfx.sounds[`swing_${k}`], k).toBeDefined();
    for (const el of ['physical', 'fire', 'frost', 'storm', 'earth']) {
      expect(data.sfx.sounds[`cast_${el}`]).toBeDefined();
      expect(data.sfx.sounds[`impact_${el}`]).toBeDefined();
    }
  });

  it('tienda: el oro que baja con la tienda abierta es compra; el que sube, venta', () => {
    expect(cuesForSession({ type: 'gold', amount: -10 }, true)[0]!.sound).toBe('shop_buy');
    expect(cuesForSession({ type: 'gold', amount: 10 }, true)[0]!.sound).toBe('shop_sell');
    expect(cuesForSession({ type: 'gold', amount: 10 }, false)).toHaveLength(0);
  });

  it('paneo y atenuación según la cámara', () => {
    const s = data.mix.spatial;
    // yaw 0: la derecha de la pantalla es +X.
    expect(spatialize({ x: 0, z: 0, yawDeg: 0 }, 10, 0, s).pan).toBeGreaterThan(0.5);
    expect(spatialize({ x: 0, z: 0, yawDeg: 180 }, 10, 0, s).pan).toBeLessThan(-0.5);
    expect(spatialize({ x: 0, z: 0, yawDeg: 0 }, 0, 10, s).pan).toBeCloseTo(0);
    expect(spatialize({ x: 0, z: 0, yawDeg: 0 }, s.maxDistance + 1, 0, s).gain).toBe(0);
    expect(spatialize({ x: 0, z: 0, yawDeg: 0 }, 1, 0, s).gain).toBe(1);
    expect(weaponKindOf('copper_wand', 7, data.sfx.weaponKinds)).toBe('wand');
    expect(weaponKindOf('unknown_bow', 9, {})).toBe('wand');
    expect(weaponKindOf(null, null, {})).toBe('unarmed');
  });
});

describe('audio: música y ambiente', () => {
  it('la mezcla de estados se funde y suma 1; pescar calma, el combate tensa', () => {
    expect(moodTargets(1, true).tension).toBe(1);
    expect(moodTargets(0, true).fishing).toBe(1);
    const m = new MoodMixer(2);
    m.update(moodTargets(1, false), 1);
    expect(m.weights.tension).toBeCloseTo(0.5);
    m.update(moodTargets(1, false), 5);
    expect(m.weights.tension).toBeCloseTo(1);
    const tense = layerMix(data.music, m.weights, 0);
    const calm = layerMix(data.music, { calm: 1, tension: 0, fishing: 0 }, 0);
    expect(tense.gains.drum).toBeGreaterThan(calm.gains.drum);
    expect(tense.bpm).toBeGreaterThan(calm.bpm);
  });

  it('el compositor es determinista por semilla y compás, y usa la escala', () => {
    const a = composeBar(data.music, 7, 5);
    expect(composeBar(data.music, 7, 5)).toEqual(a);
    expect(composeBar(data.music, 8, 5)).not.toEqual(a);
    for (const n of a.filter((x) => x.layer !== 'drum')) expect(data.music.scale).toContain((((n.midi - data.music.rootMidi) % 12) + 12) % 12);
  });

  it('ambiente: pájaros de día, grillos y más viento de noche, agua cerca del estanque', () => {
    const day = ambienceMix(data.ambience, 0.8, 100);
    const night = ambienceMix(data.ambience, -0.6, 100);
    expect(day.birds).toBeGreaterThan(night.birds);
    expect(night.crickets).toBeGreaterThan(day.crickets);
    expect(night.wind).toBeGreaterThan(day.wind);
    expect(day.water).toBe(0);
    expect(ambienceMix(data.ambience, 0.8, 1).water).toBeGreaterThan(0.2);
  });

  it('la variación es reproducible con semilla y acotada', () => {
    const a = variation(new Rng(5), { pitch: 0.1, gain: 0.2 });
    expect(variation(new Rng(5), { pitch: 0.1, gain: 0.2 })).toEqual(a);
    expect(Math.abs(a.pitch - 1)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(a.gain - 1)).toBeLessThanOrEqual(0.2);
  });
});

describe('audio: motor con AudioContext falso', () => {
  it('buses al master, master al limitador, limitador a la salida; volumen de opciones', () => {
    const ctx = new FakeCtx();
    const e = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix);
    expect((e.buses.sfx as unknown as FakeNode).out).toContain(e.buses.master);
    expect((e.buses.master as unknown as FakeNode).out).toContain(e.limiter);
    expect((e.limiter as unknown as FakeNode).out).toContain(ctx.destination);
    e.setVolume(0.5);
    expect(e.buses.master.gain.value).toBeCloseTo(data.mix.buses.master * 0.5);
  });

  it('cada sonido crea una fuente por capa y respeta el tope de voces', () => {
    const ctx = new FakeCtx();
    const e = new AudioEngine(ctx as unknown as BaseAudioContext, { ...data.mix, maxVoices: 2 });
    const def = data.sfx.sounds['level_up']!;
    expect(e.play(def)).toBe(true);
    expect(ctx.started).toBe(def.layers.length);
    expect(e.play(def)).toBe(true);
    expect(e.play(def)).toBe(false);
    expect(e.dropped).toBe(1);
  });
});
