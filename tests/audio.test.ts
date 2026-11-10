import { describe, expect, it } from 'vitest';
import { cuesForEvent, cuesForSession, spatialize, weaponKindOf, type CueContext } from '../src/audio/cues';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { loadAudioData, parseMusic, parseSfx } from '../src/audio/data';
import { auditMusic } from '../src/audio/musicCheck';
import { bundledSamples, dataUrlBytes, loadSamples } from '../src/audio/samples';
import { AudioEngine } from '../src/audio/engine';
import { ContextMusicPlayer, DungeonPlaylist, musicContext } from '../src/audio/contextMusic';
import { ambienceMix, composeBar, layerMix, MoodMixer, moodTargets, musicFor, ProfileFader, profileIdForZone, variation } from '../src/audio/score';
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
  decodeAudioData(): Promise<AudioBuffer> { return Promise.resolve({} as AudioBuffer); }
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

  it('una curación sin cantidad efectiva no dispara sonido', () => {
    expect(cuesForEvent({ type: 'heal', targetId: 1, amount: 0, source: 'status:regeneration' }, ctxOf())).toHaveLength(0);
    expect(cuesForEvent({ type: 'heal', targetId: 1, amount: 1, source: 'status:regeneration' }, ctxOf())[0]?.sound).toBe('heal');
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

describe('combate v2: sonido propio del crítico', () => {
  it('el crítico que haces suena «crit»; el que te hacen, «crit_taken»; un golpe normal, ninguno', () => {
    const c = ctxOf();
    const hit = (crit: boolean, toPlayer: boolean) =>
      cuesForEvent({ type: 'damage', sourceId: toPlayer ? 2 : 1, targetId: toPlayer ? 1 : 2, amount: 9, crit, toPlayer, ability: 'spark' }, c).map((q) => q.sound);
    expect(hit(true, false)).toContain('crit');
    expect(hit(true, true)).toContain('crit_taken');
    expect(hit(false, false).some((s) => s.startsWith('crit'))).toBe(false);
    for (const s of ['crit', 'crit_taken']) expect(data.sfx.sounds[s]).toBeDefined();
  });
});

describe('audio: muestras WAV generadas por código', () => {
  const DIR = 'src/audio/sfx/generated_original';
  const wavs = readdirSync(DIR).filter((f) => f.endsWith('.wav')).sort();

  /** Cabecera RIFF/WAVE, formato y bloque LIST/INFO de un WAV. */
  function inspect(bytes: Buffer): { format: number; channels: number; rate: number; info: Record<string, string> } {
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    const info: Record<string, string> = {};
    let format = 0, channels = 0, rate = 0;
    for (let p = 12; p + 8 <= bytes.length; ) {
      const id = bytes.toString('ascii', p, p + 4);
      const len = bytes.readUInt32LE(p + 4);
      if (id === 'fmt ') [format, channels, rate] = [bytes.readUInt16LE(p + 8), bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 12)];
      if (id === 'LIST' && bytes.toString('ascii', p + 8, p + 12) === 'INFO') {
        for (let q = p + 12; q < p + 8 + len; ) {
          const k = bytes.toString('ascii', q, q + 4);
          const n = bytes.readUInt32LE(q + 4);
          info[k] = bytes.toString('latin1', q + 8, q + 8 + n).replace(/\0+$/, '');
          q += 8 + n + (n % 2);
        }
      }
      p += 8 + len + (len % 2);
    }
    return { format, channels, rate, info };
  }

  it('son 21 WAV PCM a 44,1 kHz con su origen escrito dentro (el script que los sintetiza)', () => {
    expect(wavs).toHaveLength(21);
    for (const f of wavs) {
      const w = inspect(readFileSync(`${DIR}/${f}`));
      expect(w.format, f).toBe(1);
      expect(w.channels, f).toBe(1);
      expect(w.rate, f).toBe(44100);
      expect(w.info['ISFT'], f).toBe('FrankmanGames scripts/generateSfx.mjs');
      expect(w.info['INAM'], f).toBe(f.replace(/\.wav$/, ''));
    }
    expect(readFileSync('scripts/generateSfx.mjs', 'utf8')).toContain('RECIPES');
  });

  it('cubren barridos de armas, golpes, críticos, lanzamientos por elemento y curación; todo archivo citado existe y va en el build', () => {
    const s = data.sfx.samples;
    for (const id of [
      'swing_blade', 'swing_heavy', 'swing_blunt', 'swing_staff', 'swing_wand', 'swing_orb',
      'impact_physical', 'impact_frost', 'crit', 'crit_taken', 'evade', 'heal',
      'cast_physical', 'cast_fire', 'cast_frost', 'cast_storm', 'cast_earth',
    ]) expect(s[id], id).toBeDefined();
    expect(s.evade?.file).not.toBe('block_metal_01.wav');
    expect(s.cast_physical?.file).not.toMatch(/^hit_/);
    const bundled = bundledSamples();
    for (const [id, def] of Object.entries(s)) {
      expect(wavs, id).toContain(def.file);
      expect(data.sfx.sounds[id], `${id}: receta de respaldo`).toBeDefined();
      expect(bundled[def.file], def.file).toBeTruthy();
    }
  });

  it('una muestra sin receta de respaldo o con nombre raro no pasa la validación', () => {
    const raw = JSON.parse(readFileSync('data/audio/sfx.json', 'utf8')) as { samples: Record<string, unknown> };
    expect(() => parseSfx({ ...raw, samples: { nada: { file: 'a.wav' } } })).toThrow(/samples\.nada/);
    expect(() => parseSfx({ ...raw, samples: { heal: { file: '../music/x.mp3' } } })).toThrow(/samples\.heal\.file/);
  });

  it('loadSamples decodifica cada archivo una vez y omite lo que falla (suena la receta)', async () => {
    let calls = 0;
    const ctx = {
      decodeAudioData: (b: ArrayBuffer): Promise<AudioBuffer> => {
        calls++;
        const head = new TextDecoder().decode(new Uint8Array(b, 0, 4));
        return head === 'RIFF' ? Promise.resolve({ duration: 1 } as AudioBuffer) : Promise.reject(new Error('mal'));
      },
    };
    const sfx = { ...data.sfx, samples: { crit: { file: 'a.wav', gain: 1 }, crit_taken: { file: 'a.wav', gain: 1 }, heal: { file: 'b.wav', gain: 1 }, evade: { file: 'falta.wav', gain: 1 } } };
    const riff = `data:audio/wav;base64,${Buffer.from('RIFF....').toString('base64')}`;
    const junk = `data:audio/wav;base64,${Buffer.from('nope').toString('base64')}`;
    const m = await loadSamples(ctx, sfx, { 'a.wav': riff, 'b.wav': junk });
    expect([...m.keys()].sort()).toEqual(['crit', 'crit_taken']);
    expect(calls).toBe(2);
    expect(new TextDecoder().decode(dataUrlBytes(riff))).toBe('RIFF....');
  });

  it('el motor reproduce una muestra por el bus, con paneo, y libera la voz al acabar', () => {
    const ctx = new FakeCtx();
    const e = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix, 1);
    const buffer = {} as AudioBuffer;
    expect(e.playBuffer(buffer, { pitch: 0, gain: 0 }, { pan: 0.5, gain: 0.5 }, 'sfx')).toBe(true);
    const src = ctx.nodes.filter((n) => n.kind === 'buffer').pop()!;
    expect(src.buffer).toBe(buffer);
    expect(src.started).toBe(1);
    expect(e.activeVoices).toBe(1);
    src.onended?.();
    expect(e.activeVoices).toBe(0);
  });

  it('la música del juego original no está en el repositorio', () => {
    expect(readFileSync('.gitignore', 'utf8').split('\n')).toContain('src/audio/music/');
    // Y nada del código la carga.
    for (const f of ['src/audio/samples.ts', 'src/audio/director.ts', 'src/audio/players.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/audio\/music|\.mp3/);
    expect(existsSync('src/audio/sfx/generated_original')).toBe(true);
  });
});

describe('audio: música por zona', () => {
  const music = loadAudioData().music;

  it('portada, cripta y guardián tienen contexto propio sin tapar las regiones', () => {
    expect(musicContext('title', null, false)).toBe('title');
    expect(musicContext('creation', null, false)).toBe('title');
    expect(musicContext('game', null, false)).toBeNull();
    expect(musicContext('game', 0, false)).toBe('crypt');
    expect(musicContext('game', 4, true)).toBe('guardian');
    for (const id of ['titulo/titulo_mix.wav', 'cripta/cripta_mix.wav', 'guardian/guardian_mix.wav']) {
      expect(existsSync(`assets/audio/music/${id}`), id).toBe(true);
    }
  });

  it('la pista empaquetada funde la generativa y cede ante la música local', async () => {
    const ctx = new FakeCtx();
    const engine = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix, 1);
    const player = new ContextMusicPlayer(engine, async () => new Response(new ArrayBuffer(8)));
    player.update('title', false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ctx.started).toBe(1);
    expect(engine.musicIn.gain.value).toBe(0);
    const trackGain = ctx.nodes.filter((node) => node.kind === 'gain').at(-1)!;
    expect(trackGain.gain.value).toBe(1);
    player.update('title', true);
    expect(trackGain.gain.value).toBe(0);
    expect(engine.musicIn.gain.value).toBe(0);
    player.update(null, false);
    expect(engine.musicIn.gain.value).toBe(1);
  });

  it('la mazmorra baraja tres pistas sin repetir hasta completar cada ciclo', () => {
    const playlist = new DungeonPlaylist(() => 0);
    const played = Array.from({ length: 9 }, () => playlist.next());
    for (let i = 0; i < played.length; i += 3) expect(new Set(played.slice(i, i + 3)).size).toBe(3);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });

  it('al terminar una canción de cripta empieza otra de las que faltan', async () => {
    const ctx = new FakeCtx();
    const urls: string[] = [];
    const engine = new AudioEngine(ctx as unknown as BaseAudioContext, data.mix, 1);
    const player = new ContextMusicPlayer(engine, async (url) => {
      urls.push(String(url));
      return new Response(new ArrayBuffer(8));
    }, () => 0);
    player.update('crypt', false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const first = ctx.nodes.filter((node) => node.kind === 'buffer').at(-1)!;
    expect(first.loop).toBe(false);
    first.onended?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ctx.started).toBe(2);
    expect(urls).toHaveLength(2);
    expect(urls[1]).not.toBe(urls[0]);
  });

  it('el perfil se elige por zona, y fuera de ellas suena el valor por defecto', () => {
    expect(profileIdForZone(music, 'iguanera')).toBe('iguanera');
    expect(profileIdForZone(music, 'iguanera_muelle')).toBe('iguanera');
    expect(profileIdForZone(music, 'azuero')).toBe('los_santos');
    expect(profileIdForZone(music, 'pedasol')).toBe('los_santos');
    expect(profileIdForZone(music, 'chitri')).toBe('herrera');
    expect(profileIdForZone(music, 'sarigua')).toBe('herrera');
    expect(profileIdForZone(music, 'cripta')).toBeNull();
    expect(profileIdForZone(music, null)).toBeNull();
    const igu = musicFor(music, 'iguanera');
    expect(igu.rootMidi).toBe(music.profiles['iguanera']!.rootMidi);
    expect(igu.moods.calm.layers).toEqual(music.moods.calm.layers);
    expect(musicFor(music, null)).toBe(music);
  });

  it('los grados del grafo de acordes existen en la escala de cada perfil', () => {
    for (const def of [music, ...Object.keys(music.profiles).map((id) => musicFor(music, id))]) {
      for (const [k, next] of Object.entries(def.chordGraph)) {
        expect(Number(k)).toBeLessThan(def.scale.length);
        for (const d of next) expect(def.chordGraph[d], `${k} → ${d}`).toBeDefined();
      }
    }
  });

  it('cada nota cae en la escala de su perfil, con topes de notas, voces y duración', () => {
    for (const id of [null, ...Object.keys(music.profiles)]) expect(auditMusic(musicFor(music, id), 96), String(id)).toEqual([]);
    // Y el criterio detecta lo malo: topes más bajos que lo que escribe el compositor fallan.
    expect(auditMusic(music, 4, { maxNotesPerBar: 5, maxSimultaneous: 2, maxBarsPerNote: 0.25 }).length).toBeGreaterThan(0);
  });

  it('el fundido baja, cambia y sube: nunca hay dos perfiles activos ni nivel por encima de 1', () => {
    const f = new ProfileFader(3);
    f.update(null, 0.1);
    expect(f.active).toBeNull();
    let changes = 0;
    const seen = new Set<string | null>();
    for (let t = 0; t < 10; t += 0.1) {
      if (f.update('iguanera', 0.1)) changes++;
      seen.add(f.active);
      expect(f.level).toBeGreaterThanOrEqual(0);
      expect(f.level).toBeLessThanOrEqual(1);
      // Mientras el perfil viejo sigue activo, el nivel solo baja.
      if (f.active === null) expect(f.level).toBeLessThan(1);
    }
    expect(changes).toBe(1);
    expect(f.active).toBe('iguanera');
    expect(f.level).toBe(1);
  });

  it('dos zonas con el mismo perfil no lo funden de nuevo', () => {
    const f = new ProfileFader(1);
    for (let i = 0; i < 30; i++) f.update(profileIdForZone(music, 'iguanera'), 0.1);
    for (let i = 0; i < 30; i++) expect(f.update(profileIdForZone(music, 'iguanera_muelle'), 0.1)).toBe(false);
    expect(f.level).toBe(1);
  });

  it('una zona en dos perfiles o un grado fuera de la escala no pasan la validación', () => {
    const raw = JSON.parse(readFileSync('data/audio/music.json', 'utf8'));
    raw.profiles.otro = { ...raw.profiles.iguanera };
    expect(() => parseMusic(raw)).toThrow(/ya es del perfil/);
    const raw2 = JSON.parse(readFileSync('data/audio/music.json', 'utf8'));
    raw2.profiles.iguanera.chordGraph = { '0': [7], '7': [0] };
    expect(() => parseMusic(raw2)).toThrow(/fuera de la escala/);
  });
});

describe('audio: sonidos de viaje y misiones', () => {
  it('lancha, Piedra Pintada y misiones tienen sonido propio', () => {
    const sfx = loadAudioData().sfx;
    for (const id of ['boat_depart', 'stone_activate', 'stone_travel', 'quest_accept', 'quest_complete']) expect(sfx.sounds[id], id).toBeDefined();
    expect(cuesForSession({ type: 'questAccepted', questId: 'q' } as never, false)).toEqual([{ sound: 'quest_accept' }]);
    expect(cuesForSession({ type: 'questCompleted', questId: 'q' } as never, false)).toEqual([{ sound: 'quest_complete' }]);
  });
});
