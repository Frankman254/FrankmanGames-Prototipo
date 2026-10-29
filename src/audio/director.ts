// AudioDirector: traduce sucesos y estado del juego a sonido. Se monta con una
// línea en main.ts (`mountAudio`) y no cambia ninguna vista: lee los sucesos
// envolviendo `view.handleEvents`, el estado del mundo en cada fotograma, los
// sucesos de la sesión (oro en la tienda) y el DOM de la interfaz (clics y
// paneles). El audio arranca con el primer clic o tecla (política de autoplay).
import type { ArenaView } from '../render/arenaView';
import { elementOf } from '../render/fx/spellFx';
import type { Element as GameElement, SessionEvent } from '../rpg/contracts';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { pathEdgeDistance } from '../world/terrain';
import type { Overworld } from '../world/overworld';
import { cuesForEvent, cuesForSession, spatialize, weaponKindOf, type Cue, type CueContext, type LootInfo } from './cues';
import { loadAudioData, type AudioData } from './data';
import { AudioEngine } from './engine';
import { AmbiencePlayer, MusicPlayer } from './players';
import { ambienceMix, moodTargets } from './score';

interface SessionLike {
  on(listener: (e: SessionEvent) => void): () => void;
}

interface MenusLike {
  readonly options: { volume: number };
  onOptions(fn: (o: { volume: number }) => void): void;
}

export interface AudioMount {
  world: () => World;
  view: ArenaView;
  overworld: Overworld;
  menus: MenusLike | null;
  session: () => SessionLike | null;
}

const ENGAGED = new Set(['pursue', 'telegraph', 'attack', 'recover']);

export class AudioDirector {
  readonly data: AudioData = loadAudioData();
  engine: AudioEngine | null = null;
  music: MusicPlayer | null = null;
  ambience: AmbiencePlayer | null = null;
  private volume = 1;
  private footsteps = 0;
  private lootCache = new Map<number, LootInfo>();
  private sessionRef: SessionLike | null = null;
  private unsubscribe: (() => void) | null = null;
  private shopOpen = false;
  private threatHold = 0;
  private last = performance.now();
  /** Sonidos disparados por id (depuración y medición). */
  readonly played = new Map<string, number>();

  constructor(private readonly m: AudioMount) {
    this.volume = m.menus?.options.volume ?? 1;
    m.menus?.onOptions((o) => {
      this.volume = o.volume;
      this.engine?.setVolume(o.volume);
    });
    // Sucesos: se leen al pasar por la vista, sin cambiarla.
    const view = m.view;
    const orig = view.handleEvents.bind(view);
    view.handleEvents = (world: World, events: readonly GameEvent[]): void => {
      orig(world, events);
      this.onEvents(world, events);
    };
    view.scene.onBeforeRenderObservable.add(() => this.frame());
    this.watchUi();
    const unlock = (): void => {
      this.start();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  /** Crea el contexto de audio (tras un gesto del usuario) o lo reanuda. */
  start(): void {
    if (this.engine) {
      void (this.engine.ctx as AudioContext).resume?.();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx({ latencyHint: 'interactive' });
    this.engine = new AudioEngine(ctx, this.data.mix, 1);
    this.engine.setVolume(this.volume);
    this.music = new MusicPlayer(this.engine, this.data.music);
    this.ambience = new AmbiencePlayer(this.engine, this.data.ambience);
    void ctx.resume();
  }

  private cueContext(world: World): CueContext {
    return {
      playerId: world.player.id,
      positionOf: (id) => {
        const p = world.player;
        const pos = id === p.id ? p.pos : (world.enemies.get(id)?.pos ?? world.pets.find((x) => x.id === id)?.pos);
        return pos ? { x: pos.x, z: pos.y } : null;
      },
      elementOf: (tag) => elementOf(world, tag) as GameElement,
      weaponKind: () => {
        const w = world.character.weapon();
        return weaponKindOf(w?.id ?? null, w?.weapon?.range ?? null, this.data.sfx.weaponKinds);
      },
      lootInfo: (id) => {
        const l = world.lootView().find((x) => x.id === id);
        return l ? { x: l.x, z: l.y, rarity: l.rarity, gold: l.gold, item: l.item !== null } : (this.lootCache.get(id) ?? null);
      },
      bobber: () => {
        const b = world.fishing?.bobber;
        return b ? { x: b.x, z: b.y } : null;
      },
    };
  }

  onEvents(world: World, events: readonly GameEvent[]): void {
    if (!this.engine || events.length === 0) return;
    const ctx = this.cueContext(world);
    for (const e of events) for (const c of cuesForEvent(e, ctx)) this.play(c, world);
  }

  private onSession(e: SessionEvent): void {
    if (e.type === 'openMerchant') this.shopOpen = true;
    for (const c of cuesForSession(e, this.shopOpen)) this.play(c, this.m.world());
  }

  /** Reproduce un sonido con paneo y atenuación respecto al jugador. */
  play(c: Cue, world: World): void {
    const e = this.engine;
    const def = this.data.sfx.sounds[c.sound];
    if (!e || !def) return;
    let pan = 0;
    let gain = c.gain ?? 1;
    if (c.x !== undefined && c.z !== undefined) {
      const p = world.player.pos;
      const s = spatialize({ x: p.x, z: p.y, yawDeg: this.m.view.rig.yawDeg }, c.x, c.z, this.data.mix.spatial);
      pan = s.pan;
      gain *= Math.max(s.gain, c.minGain ?? 0);
    }
    if (e.play(def, { pan, gain, pitch: c.pitch ?? 1, delay: c.delay ?? 0 })) this.played.set(c.sound, (this.played.get(c.sound) ?? 0) + 1);
  }

  private frame(): void {
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const world = this.m.world();

    // La sesión cambia al empezar o cargar partida: volver a suscribirse.
    const s = this.m.session();
    if (s !== this.sessionRef) {
      this.unsubscribe?.();
      this.sessionRef = s;
      this.unsubscribe = s ? s.on((e) => this.onSession(e)) : null;
    }

    // Botín conocido (para saber qué era cuando se recoge y ya no está).
    this.lootCache = new Map(world.lootView().map((l) => [l.id, { x: l.x, z: l.y, rarity: l.rarity, gold: l.gold, item: l.item !== null }]));

    // Pasos del jugador: los eventos `footstep` de su animación; grava en camino, hierba fuera.
    const steps = this.m.view.player.footsteps;
    if (this.engine && steps > this.footsteps && world.player.alive) {
      const p = world.player.pos;
      const onPath = pathEdgeDistance(this.m.overworld.def.paths, p.x, p.y) < 0.4;
      this.play({ sound: onPath ? 'footstep_path' : 'footstep_grass' }, world);
    }
    this.footsteps = steps;
    if (!this.engine) return;

    // Música: tensión si hay enemigos en combate cerca (se mantiene unos segundos), calma al pescar.
    const p = world.player.pos;
    const md = this.data.music;
    let engaged = 0;
    for (const e of world.enemies.list) if (ENGAGED.has(e.state) && Math.hypot(e.pos.x - p.x, e.pos.y - p.y) <= md.threatRange) engaged++;
    this.threatHold = engaged > 0 ? md.threatHoldSeconds : Math.max(0, this.threatHold - dt);
    const threat = engaged > 0 ? Math.min(1, engaged / 2) : this.threatHold > 0 ? 0.6 : 0;
    const sunY = this.m.view.atmosphere.state.toSun[1];
    const mix = ambienceMix(this.data.ambience, sunY, this.waterDistance(world));
    this.music?.update(moodTargets(threat, world.fishing !== null), 1 - mix.day, dt);
    this.ambience?.update(mix, dt);
  }

  /** Distancia a la orilla del estanque más cercano. */
  private waterDistance(world: World): number {
    let best = Infinity;
    const p = world.player.pos;
    for (const s of Object.values(world.content.fishing.spots)) best = Math.min(best, Math.hypot(p.x - s.x, p.y - s.y) - s.radius);
    return best;
  }

  /** Clics en botones y apertura/cierre de paneles de la interfaz (sólo se observa el DOM). */
  private watchUi(): void {
    document.addEventListener(
      'click',
      (e) => {
        if ((e.target as Element | null)?.closest?.('button')) this.play({ sound: 'ui_click' }, this.m.world());
      },
      true,
    );
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (r.attributeName !== 'hidden' || !el.classList?.contains('panel')) continue;
        const open = !el.hidden;
        this.play({ sound: open ? 'ui_open' : 'ui_close' }, this.m.world());
        if (el.classList.contains('panel-shop')) this.shopOpen = open;
      }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['hidden'], subtree: true });
  }
}

/** Monta el audio del juego. Una línea en main.ts. */
export function mountAudio(m: AudioMount): AudioDirector {
  const d = new AudioDirector(m);
  // Acceso de depuración desde la consola (sólo en desarrollo).
  if (import.meta.env.DEV) Object.assign(window, { __audio: d });
  return d;
}
