// AudioDirector: traduce sucesos y estado del juego a sonido. Se monta con una
// línea en main.ts (`mountAudio`) y no cambia ninguna vista: lee los sucesos
// envolviendo `view.handleEvents`, el estado del mundo en cada fotograma, los
// sucesos de la sesión (oro en la tienda) y los eventos de sonido que declara la
// interfaz (`onUiSound`: clics y paneles, traducidos en la capa que posee el DOM).
import type { ArenaView } from '../render/arenaView';
import { elementOf } from '../render/fx/spellFx';
import type { Element as GameElement, SessionEvent } from '../rpg/contracts';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { pathEdgeDistance } from '../sim/paths';
import type { Overworld } from '../world/overworld';
import {
    cuesForEvent,
    cuesForSession,
    spatialize,
    weaponKindOf,
    type Cue,
    type CueContext,
    type LootInfo,
} from './cues';
import { loadAudioData, type AudioData } from './data';
import { AudioEngine } from './engine';
import { loadSamples } from './samples';
import { AmbiencePlayer, MusicPlayer } from './players';
import { ambienceMix, moodTargets } from './score';
import { StingerPlayer, dangerCrossed } from './stingers';
import { ContextMusicPlayer, isOpenWorldContext, musicContext, type MusicContext } from './contextMusic';
import type { UiSoundEvent } from '../ui/menus/uiSound';
import type { MenuScreen } from '../ui/menus';

interface SessionLike {
    on(listener: (e: SessionEvent) => void): () => void;
}

interface MenusLike {
    readonly options: VolumeOptions;
    readonly screen?: MenuScreen;
    onOptions(fn: (o: VolumeOptions) => void): void;
    onUiSound(fn: (e: UiSoundEvent) => void): () => void;
}

/** Volúmenes de las opciones (0–1). */
export interface VolumeOptions {
    volume: number;
    musicVolume: number;
    sfxVolume: number;
    ambienceVolume: number;
    uiVolume: number;
}

export interface AudioMount {
    world: () => World;
    view: ArenaView;
    overworld: Overworld;
    menus: MenusLike | null;
    session: () => SessionLike | null;
    /** Sitio actual para la música local de pruebas (ver `localMusic.ts`; sólo en desarrollo): piso de la mazmorra o null, y zona. */
    place?: () => { floor: number | null; zone: string | null; guardian?: boolean };
}

const ENGAGED = new Set(['pursue', 'telegraph', 'attack', 'recover']);

/** La música local sólo sustituye la música del mundo abierto (región o pelea en el camino), nunca portada, pueblo ni cripta. */
export function localMusicOverrides(context: MusicContext | null, active: boolean): boolean {
    return isOpenWorldContext(context) && active;
}

export class AudioDirector {
    readonly data: AudioData = loadAudioData();
    engine: AudioEngine | null = null;
    music: MusicPlayer | null = null;
    ambience: AmbiencePlayer | null = null;
    contextMusic: ContextMusicPlayer | null = null;
    stingers: StingerPlayer | null = null;
    private healthFrac = 1;
    private vol: VolumeOptions = { volume: 1, musicVolume: 1, sfxVolume: 1, ambienceVolume: 1, uiVolume: 1 };
    private footsteps = 0;
    private lootCache = new Map<number, LootInfo>();
    private sessionRef: SessionLike | null = null;
    private unsubscribe: (() => void) | null = null;
    private shopOpen = false;
    private threatHold = 0;
    private last = performance.now();
    // HZ-06: throttle para curas suaves — no más de una vez cada 1.5 s.
    private lastHealSoft = 0;
    private audioUnavailable = false;
    /** Muestras WAV decodificadas por id de sonido (vacío hasta que terminan de cargar). */
    private samples = new Map<string, AudioBuffer>();
    /** Sonidos disparados por id (depuración y medición). */
    readonly played = new Map<string, number>();
    /** Ids ya avisados como inexistentes (para no repetir el warning). */
    private warnedMissing = new Set<string>();
    /** Canciones locales de prueba del mundo abierto (sólo `npm run dev`; null si no hay). */
    localMusic: {
        readonly active: boolean;
        updatePlace(floor: number | null, zone: string | null): void;
        update(keys: readonly string[]): void;
    } | null = null;

    constructor(private readonly m: AudioMount) {
        if (m.menus) this.vol = { ...m.menus.options };
        m.menus?.onOptions((o) => {
            this.vol = { volume: o.volume, musicVolume: o.musicVolume, sfxVolume: o.sfxVolume, ambienceVolume: o.ambienceVolume, uiVolume: o.uiVolume };
            this.applyVolumes();
        });
        // Sucesos: se leen al pasar por la vista, sin cambiarla.
        const view = m.view;
        const orig = view.handleEvents.bind(view);
        view.handleEvents = (world: World, events: readonly GameEvent[]): void => {
            orig(world, events);
            this.onEvents(world, events);
        };
        view.scene.onBeforeRenderObservable.add(() => this.frame());
        // La interfaz declara sus sonidos (clics y paneles); el audio se suscribe y no espía el DOM.
        m.menus?.onUiSound((e) => {
            if (e.type === 'click') this.play({ sound: 'ui_click' }, this.m.world());
            else {
                if (e.shop) this.shopOpen = e.open;
                this.play({ sound: e.open ? 'ui_open' : 'ui_close' }, this.m.world());
            }
        });
        const unlock = (): void => {
            this.start();
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
        };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);
    }

    /** General sobre el master; cada bus con su propio control. */
    private applyVolumes(): void {
        const e = this.engine;
        if (!e) return;
        e.setVolume(this.vol.volume);
        e.setBusVolume('music', this.vol.musicVolume);
        e.setBusVolume('sfx', this.vol.sfxVolume);
        e.setBusVolume('ambience', this.vol.ambienceVolume);
        e.setBusVolume('ui', this.vol.uiVolume);
    }

    /** Crea el contexto de audio (tras un gesto del usuario) o lo reanuda. */
    start(): void {
        if (this.audioUnavailable) return;
        if (this.engine) {
            this.resume(this.engine.ctx as AudioContext);
            return;
        }
        const Ctx =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) {
            this.audioUnavailable = true;
            return;
        }
        let ctx: AudioContext | null = null;
        try {
            ctx = new Ctx({ latencyHint: 'interactive' });
            this.engine = new AudioEngine(ctx, this.data.mix, 1);
            this.applyVolumes();
            this.music = new MusicPlayer(this.engine, this.data.music);
            this.ambience = new AmbiencePlayer(this.engine, this.data.ambience);
            this.contextMusic = new ContextMusicPlayer(this.engine);
            const music = this.contextMusic;
            this.stingers = new StingerPlayer(this.engine, (seconds) => music.duck(seconds));
            this.stingers.preload();
            // Mientras se decodifican (o si fallan) suenan las recetas sintetizadas.
            void loadSamples(ctx, this.data.sfx).then((m) => {
                if (!this.audioUnavailable) this.samples = m;
            });
            // Música local de pruebas: el módulo sólo existe en desarrollo (el build lo descarta entero).
            if (import.meta.env.DEV) {
                const engine = this.engine;
                void import('./localMusic').then(async ({ LocalMusicPlayer }) => {
                    if (this.audioUnavailable) return;
                    const p = new LocalMusicPlayer(engine);
                    await p.load();
                    if (!this.audioUnavailable) this.localMusic = p;
                });
            }
            this.resume(ctx);
        } catch (error) {
            this.disableAudio(ctx, error);
        }
    }

    private resume(ctx: AudioContext): void {
        try {
            void ctx.resume().catch((error: unknown) => this.disableAudio(ctx, error));
        } catch (error) {
            this.disableAudio(ctx, error);
        }
    }

    private disableAudio(ctx: AudioContext | null, error: unknown): void {
        if (this.audioUnavailable) return;
        this.audioUnavailable = true;
        this.engine = null;
        this.music = null;
        this.ambience = null;
        this.contextMusic = null;
        this.stingers = null;
        this.localMusic = null;
        this.samples.clear();
        try {
            if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
        } catch {
            // El cierre también puede fallar cuando el dispositivo de audio no existe.
        }
        console.warn('[audio] dispositivo no disponible; el juego continuará sin sonido', error);
    }

    private cueContext(world: World): CueContext {
        return {
            playerId: world.player.id,
            positionOf: (id) => {
                const p = world.player;
                const pos =
                    id === p.id ? p.pos : (world.enemies.get(id)?.pos ?? world.pets.find((x) => x.id === id)?.pos);
                return pos ? { x: pos.x, z: pos.y } : null;
            },
            elementOf: (tag) => elementOf(world, tag) as GameElement,
            weaponKind: () => {
                const w = world.character.weapon();
                return weaponKindOf(w?.id ?? null, w?.weapon?.range ?? null, this.data.sfx.weaponKinds);
            },
            lootInfo: (id) => {
                const l = world.lootView().find((x) => x.id === id);
                return l
                    ? { x: l.x, z: l.y, rarity: l.rarity, gold: l.gold, item: l.item !== null }
                    : (this.lootCache.get(id) ?? null);
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
        for (const e of events) {
            for (const c of cuesForEvent(e, ctx)) this.play(c, world);
            // Avisos musicales: derrota al morir; victoria al vencer a un guardián o limpiar el lugar.
            if (e.type === 'playerDeath') this.stingers?.play('defeat');
            else if (e.type === 'outcome' && e.outcome === 'victory') this.stingers?.play('victory');
            else if (e.type === 'enemyDeath' && world.enemies.get(e.enemyId)?.guardian) this.stingers?.play('victory');
        }
    }

    private onSession(e: SessionEvent): void {
        if (e.type === 'openMerchant') this.shopOpen = true;
        for (const c of cuesForSession(e, this.shopOpen)) this.play(c, this.m.world());
    }

    /** Reproduce un sonido con paneo y atenuación respecto al jugador. */
    /** Un sonido suelto desde fuera de la simulación (lancha, Piedra Pintada). */
    cue(sound: string): void {
        this.play({ sound }, this.m.world());
    }

    play(c: Cue, world: World): void {
        const e = this.engine;
        // HZ-06: throttle de 1.5 s para curas suaves repetitivas.
        if (c.sound === 'heal_soft') {
            const now = performance.now() / 1000;
            if (now - this.lastHealSoft < 1.5) return;
            this.lastHealSoft = now;
        }
        const def = this.data.sfx.sounds[c.sound];
        if (!def && !this.warnedMissing.has(c.sound)) {
            this.warnedMissing.add(c.sound);
            console.warn(`[audio] sonido inexistente: "${c.sound}" (no hay receta en sfx.json)`);
        }
        if (!e || !def) return;
        let pan = 0;
        let gain = c.gain ?? 1;
        if (c.x !== undefined && c.z !== undefined) {
            const p = world.player.pos;
            const s = spatialize(
                { x: p.x, z: p.y, yawDeg: this.m.view.rig.viewYawDeg },
                c.x,
                c.z,
                this.data.mix.spatial,
            );
            pan = s.pan;
            gain *= Math.max(s.gain, c.minGain ?? 0);
        }
        const opts = { pan, gain, pitch: c.pitch ?? 1, delay: c.delay ?? 0 };
        const sample = this.samples.get(c.sound);
        const ok = sample
            ? e.playBuffer(
                  sample,
                  def.vary,
                  { ...opts, gain: gain * (this.data.sfx.samples[c.sound]?.gain ?? 1) },
                  def.bus,
              )
            : e.play(def, opts);
        if (ok) this.played.set(c.sound, (this.played.get(c.sound) ?? 0) + 1);
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
        this.lootCache = new Map(
            world
                .lootView()
                .map((l) => [l.id, { x: l.x, z: l.y, rarity: l.rarity, gold: l.gold, item: l.item !== null }]),
        );

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
        for (const e of world.enemies.list)
            if (ENGAGED.has(e.state) && Math.hypot(e.pos.x - p.x, e.pos.y - p.y) <= md.threatRange) engaged++;
        this.threatHold = engaged > 0 ? md.threatHoldSeconds : Math.max(0, this.threatHold - dt);
        const threat = engaged > 0 ? Math.min(1, engaged / 2) : this.threatHold > 0 ? 0.6 : 0;
        const health = world.player.maxHealth > 0 ? world.player.health / world.player.maxHealth : 1;
        if (dangerCrossed(this.healthFrac, health, threat > 0, world.player.alive)) this.stingers?.play('danger');
        this.healthFrac = health;
        const sunY = this.m.view.atmosphere.state.toSun[1];
        const mix = ambienceMix(this.data.ambience, sunY, this.waterDistance(world));
        this.music?.setZone(world.interior ? null : (world.currentZone?.id ?? null));
        this.music?.update(moodTargets(threat, world.fishing !== null), 1 - mix.day, dt);
        const here = this.m.place?.() ?? { floor: null, zone: world.currentZone?.id ?? null, guardian: false };
        const screen = this.m.menus?.screen ?? 'game';
        const town = here.floor === null && (world.currentZone?.safe ?? false);
        const zone = here.floor === null ? here.zone : null;
        const context: MusicContext | null = musicContext(screen, here.floor, here.guardian ?? false, town, threat > 0, zone);
        if (this.localMusic) {
            // Portada, pueblos, cripta y guardián tienen piezas empaquetadas propias. Una vieja
            // asignación local `dungeon` no debe tapar la música de cripta ni dejarla
            // mudas; la música local queda para las zonas del mundo abierto.
            if (screen === 'game' && isOpenWorldContext(context)) this.localMusic.updatePlace(null, here.zone);
            else this.localMusic.update(['__contexto_empaquetado__']);
        }
        this.contextMusic?.update(context, localMusicOverrides(context, this.localMusic?.active ?? false));
        this.ambience?.update(mix, dt);
    }

    /** Distancia a la orilla del estanque más cercano. */
    private waterDistance(world: World): number {
        let best = Infinity;
        const p = world.player.pos;
        for (const s of Object.values(world.fishingSpots))
            best = Math.min(best, Math.hypot(p.x - s.x, p.y - s.y) - s.radius);
        return best;
    }
}

/** Monta el audio del juego. Una línea en main.ts. */
export function mountAudio(m: AudioMount): AudioDirector {
    const d = new AudioDirector(m);
    // Acceso de depuración desde la consola (sólo en desarrollo).
    if (import.meta.env.DEV) Object.assign(window, { __audio: d });
    return d;
}
