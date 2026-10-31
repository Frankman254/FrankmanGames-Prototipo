// Estado de la simulación. Sólo datos y reglas; nada de DOM ni de render.
// Slice 03: el jugador es el `Character` de la clase elegida (vida, recurso y
// estadísticas salen de su hoja), los hechizos de la barra sustituyen a las
// habilidades fijas, los enemigos sueltan botín y la mascota activa acompaña.
// Zonas (`data/zones.json`): con `zones` el mundo se puebla por franjas de
// nivel en lugar del encuentro fijo, repone las bajas y avisa al cambiar de zona.
// Mundo y clima (`data/weather.json`): hora del día con efecto (nocturnos, pesca)
// y tiempo por zona (multiplicador de daño por elemento y nieve que frena).
import type { GameData } from '../data';
import type { AbilityDef, EnemyAttackDef } from '../data/schema';
import { Actor } from '../rpg/actor';
import { Character } from '../rpg/character';
import type { FishingSpotDef, RpgContent } from '../rpg/content';
import type { EffectDef, GroundLootView, HotbarSlotState, ItemInstance, PetDef, StatusDef } from '../rpg/contracts';
import { createEffect, DamageEffect, type Effect, type EffectContext, type ZoneSpec } from '../rpg/effects';
import { EnemyActor } from '../rpg/enemy';
import { Pet, type PetWorld } from '../rpg/pets';
import { rollLoot } from '../rpg/progression';
import { Encounter } from '../rpg/spoils';
import type { SessionWorld } from '../rpg/session';
import { compileSpell, type CompiledSpell } from '../rpg/spells';
import { ChaserSystem } from './chasers';
import { castBlock, type CastBlock, type CombatState } from './combat';
import { separate } from './crowd';
import { previewHit, resolveHit, type AttackerProfile, type DamagePreview, type DamageRules, type HitSpec } from './damage';
import { EnemySystem, type Enemy, type EnemyContext } from './enemies';
import type { GameEvent } from './events';
import { slide, stepAlongPath, type Mover } from './movement';
import { buildZoneGrid, type NavGrid } from './navGrid';
import { Pathfinder } from './pathfinder';
import { Rng } from './rng';
import { shapeHitsCircle, type PlacedShape } from './shapes';
import { SpatialHash } from './spatialHash';
import { clamp, copy, dist, distSq, type Vec2 } from './vec2';
import type { LevelZoneDef } from '../data/zonesSchema';
import { levelDiffMultiplier, levelStatBlock, rewardScale, rollLevel, ZoneMap, ZonePopulation } from './zones';
import { isNight, WeatherSystem } from './weather';
import type { Element } from '../rpg/contracts';

export interface Body extends Mover {
  id: number;
  /** Posición al inicio del último tick, para interpolar en el render. */
  prevPos: Vec2;
  radius: number;
}

export interface Player extends Body, CombatState {
  /** Destino final pedido por el jugador (para el marcador del render). */
  moveTarget: Vec2 | null;
  /** Vida y recurso son los del `Character` (accesores). */
  health: number;
  maxHealth: number;
  alive: boolean;
  /** Segundos que quedan sin recibir golpes. */
  invulnerable: number;
  /** Combate v2: cargas del ataque básico y segundos hasta la siguiente. */
  basicCharges: number;
  basicRecharge: number;
  /** Lanzamiento con `castTime` en curso. */
  casting: { ability: string; targetId: number | null; dir: number; aim: Vec2; remaining: number } | null;
  /** Enemigo al que va a dar un ataque básico (se acerca si hace falta). */
  attackTarget: number | null;
  /** Último enemigo atacado: objetivo por defecto de los hechizos de un objetivo. */
  lastTarget: number | null;
  /** Botín del suelo al que va a por él (clic). */
  pickupTarget: number | null;
}

/** PNJ del pueblo: está quieto y se le habla con clic. Slice 05: mercaderes; Slice 06: cualquier PNJ con diálogo. */
export interface Npc {
  /** Id del PNJ (en un mercader, el del mercader). */
  npcId: string;
  /** Mercader con tienda, o null. */
  merchantId: string | null;
  pos: Vec2;
}

/** Pesca en curso (Slice 05). */
export interface FishingState {
  spotId: string;
  /** Dónde flota el corcho. */
  bobber: Vec2;
  state: 'waiting' | 'bite';
  biteAt: number;
  /** Amago: el corcho tiembla sin que pique (sacar ahí asusta al pez). */
  nibbleAt: number | null;
  /** Fin de la ventana para sacar el pez (sólo con `state === 'bite'`). */
  windowEnd: number;
}

/** Distancia (m) a la que el jugador habla con un PNJ. */
const TALK_REACH = 2.6;

/** A qué apunta una habilidad: punto del suelo bajo el cursor y enemigo bajo el cursor. */
export interface Aim {
  point: Vec2;
  targetId: number | null;
}

/** Objeto o monedas en el suelo. */
export interface GroundLoot {
  id: number;
  pos: Vec2;
  item: ItemInstance | null;
  gold: number;
  age: number;
}

/** Zona persistente de un hechizo (Campo estático). */
export interface Zone extends ZoneSpec {
  id: number;
  pos: Vec2;
  remaining: number;
  timer: number;
  caster: Actor;
  tag: string;
}

interface PendingHit {
  remaining: number;
  run: () => void;
}

/** Combate v2: proyectil teledirigido. Persigue a su objetivo y siempre llega (salvo que muera). */
export interface Missile {
  id: number;
  pos: Vec2;
  target: Actor;
  speed: number;
  onHit: () => void;
}

/** Retroceso pendiente: dónde y con cuánta vida estaba el actor al recibir el estado. */
interface RewindMark {
  statusId: string;
  pos: Vec2;
  health: number;
}

/** ¿Hay que apuntar este hechizo (indicador en el suelo) o sale sobre el lanzador? */
export function needsAim(s: CompiledSpell): boolean {
  return s.area.type !== 'self';
}

const ATTACK_REPATH_SECONDS = 0.25;
/** Velocidad del proyectil del ataque básico con armas de alcance > 3 m (PROPUESTA). */
const BASIC_PROJECTILE_SPEED = 20;
const RANGED_WEAPON_REACH = 3;
const BASIC_ID = 'basic';
const MOVE_STEP = 0.25;

export interface WorldOptions {
  /** Poner los enemigos de `data/encounter.json` (por defecto sí). */
  encounter?: boolean;
  /** Semilla del RNG (por defecto la de `data/loadtest.json`). */
  seed?: number;
  /** Personaje de la sesión; si falta, uno nuevo de la clase por defecto. */
  character?: Character;
  /**
   * Poblar el mundo por zonas de `data/zones.json` en lugar del encuentro fijo
   * (por defecto no: los tests y la arena usan el encuentro). Sin victoria: el
   * mundo abierto repone las bajas y sólo se acaba al caer.
   */
  zones?: boolean;
  /**
   * Interior (piso de mazmorra): sin PNJ, sin estanques ni pesca, sin enemigos
   * de misiones y sin victoria al limpiar (se sube o se baja por la escalera).
   * Los cadáveres se retiran como en el mundo abierto.
   */
  interior?: boolean;
  /** Hora del día al crear el mundo (para poblar ya con los nocturnos si es de noche). */
  timeOfDay?: number;
}

/** `playing` hasta limpiar la arena (`victory`) o caer (`defeat`). */
export type Outcome = 'playing' | 'victory' | 'defeat';

type ActiveStatusLike = Actor['statuses']['list'][number];

export class World implements SessionWorld {
  time = 0;
  tickCount = 0;
  outcome: Outcome = 'playing';
  /** Segundos simulados hasta el final de la partida. */
  endTime: number | null = null;
  readonly grid: NavGrid;
  readonly pathfinder: Pathfinder;
  readonly rng: Rng;
  readonly player: Player;
  readonly chasers: ChaserSystem;
  readonly enemies: EnemySystem;
  readonly content: RpgContent;
  readonly character: Character;
  /** Actor RPG de cada enemigo de la simulación, por id. */
  readonly enemyActors = new Map<number, EnemyActor>();
  readonly loot: GroundLoot[] = [];
  /** Combate en curso para el botín de fin de combate (`data/rpg/spoils.json`). */
  readonly encounter: Encounter;
  /** Sucesos ya contados por `encounter` (índice en `events`). */
  private encounterCursor = 0;
  /** Mascota activa (con amuleto) y aliados invocados. */
  readonly pets: Pet[] = [];
  readonly zones: Zone[] = [];
  /** Zonas con franja de niveles (siempre: también sirven para preguntar en qué zona cae un punto). */
  readonly zoneMap: ZoneMap;
  /** Población por zonas, o null si el mundo usa el encuentro fijo. */
  readonly population: ZonePopulation | null = null;
  /** Zona en la que está el jugador (la última anunciada). */
  currentZone: LevelZoneDef | null = null;
  /** Piso de mazmorra (ver `WorldOptions.interior`). */
  readonly interior: boolean;
  /** Hora del día en [0, 1) (0 = medianoche); la pone quien lleva el reloj (el render, cada fotograma). */
  timeOfDay = 0.5;
  /** Tiempo por zona (null en interiores o sin `data/weather.json`). */
  readonly weather: WeatherSystem | null;
  private zoneCandidate: LevelZoneDef | null = null;
  private zoneDwell = 0;
  private readonly pending: PendingHit[] = [];
  /** Proyectiles teledirigidos en vuelo (hechizos de un objetivo y flechas rastreadoras). */
  readonly missiles: Missile[] = [];
  private readonly rewinds = new Map<Actor, RewindMark>();
  /** Instante hasta el que la mascota del amuleto no vuelve (murió por fuego amigo). */
  private petRespawnAt = 0;
  private readonly hash: SpatialHash;
  private readonly enemyHash: SpatialHash;
  private readonly enemyCtx: EnemyContext;
  private readonly damageRules: DamageRules;
  private readonly spellCache = new Map<string, CompiledSpell>();
  private readonly effectCache = new Map<EffectDef, Effect>();
  private readonly petWorld: PetWorld;
  private events: GameEvent[] = [];
  private nextId = 1;
  private attackRepath = 0;

  constructor(readonly data: GameData, opts: WorldOptions = {}) {
    const z = data.zone;
    this.content = data.rpg;
    this.interior = opts.interior ?? false;
    this.timeOfDay = opts.timeOfDay ?? 0.5;
    this.rng = new Rng(opts.seed ?? data.loadTest.seed);
    this.encounter = new Encounter(this.content.spoils, this.rng);
    // El agua de los estanques no se pisa (se pesca desde la orilla); dentro de una mazmorra no hay estanques.
    this.grid = buildZoneGrid(z, this.interior ? [] : Object.values(this.content.fishing.spots));
    this.pathfinder = new Pathfinder(this.grid);
    this.hash = new SpatialHash(z.width, z.depth, 2);
    this.enemyHash = new SpatialHash(z.width, z.depth, 2);
    this.chasers = new ChaserSystem(data.loadTest, this.grid, this.pathfinder);
    this.enemies = new EnemySystem(data.enemies, { baseLevel: (id) => this.content.enemies[id]?.level ?? 1, scaling: data.zones.scaling });
    this.zoneMap = new ZoneMap(data.zones);
    this.damageRules = { elementStat: this.content.rules.elementStat, resistCap: this.content.progression.resistCap };
    const ch = opts.character ?? Character.create(this.content, this.content.rules.defaultClass, 'Aventurero', new Rng((opts.seed ?? data.loadTest.seed) ^ 0x5eed));
    this.character = ch;
    // Arena nueva: vida y recurso llenos, sin estados de la anterior.
    ch.statuses.clear();
    ch.restore();
    const start = this.grid.walkable(z.playerStart) ? copy(z.playerStart) : this.grid.center(this.grid.nearestWalkable(z.playerStart));
    this.player = {
      id: this.nextId++,
      pos: start,
      prevPos: copy(start),
      radius: z.playerRadius,
      speed: ch.stats.get('moveSpeed'),
      facing: 0,
      path: [],
      moveTarget: null,
      get health() {
        return ch.health;
      },
      set health(v: number) {
        ch.health = v;
      },
      get maxHealth() {
        return ch.maxHealth;
      },
      alive: true,
      invulnerable: 0,
      get resource() {
        return ch.resource;
      },
      set resource(v: number) {
        ch.resource = v;
      },
      get maxResource() {
        return ch.maxResource;
      },
      cooldowns: {},
      gcd: 0,
      gcdTotal: 0,
      basicCharges: data.player.basicAttack.charges,
      basicRecharge: 0,
      casting: null,
      attackTarget: null,
      lastTarget: null,
      pickupTarget: null,
    };
    ch.id = this.player.id;
    ch.body = this.player;
    // Mercaderes y PNJ dentro de la zona, en la celda libre más cercana a su sitio.
    const place = (npcId: string, merchantId: string | null, at: Vec2): void => {
      if (this.interior) return;
      if (at.x < 0 || at.y < 0 || at.x > z.width || at.y > z.depth) return;
      const cell = this.grid.walkable(at) ? -2 : this.grid.nearestWalkable(at);
      if (cell === -1) return;
      this.npcs.push({ npcId, merchantId, pos: cell === -2 ? copy(at) : this.grid.center(cell) });
    };
    for (const m of Object.values(this.content.merchants)) place(m.id, m.id, m.position);
    for (const n of Object.values(this.content.npcs)) if (n.merchantId === null) place(n.id, null, n.position);
    this.enemyCtx = {
      grid: this.grid,
      pathfinder: this.pathfinder,
      rng: this.rng,
      player: this.player,
      hitPlayer: (src, at) => this.hitPlayer(src, at),
      launchHoming: (src, at) => this.launchHoming(src, at),
      newId: () => this.nextId++,
      emit: (e) => this.events.push(e),
    };
    this.petWorld = this.makePetWorld();
    this.weather = data.weather && !this.interior ? new WeatherSystem(data.weather, data.zones.zones, new Rng((opts.seed ?? data.loadTest.seed) ^ 0x7e47)) : null;
    if (opts.zones && opts.encounter !== false) {
      this.population = new ZonePopulation(
        this.zoneMap,
        {
          rng: this.rng,
          walkable: (p) => this.grid.walkable(p),
          playerPos: () => this.player.pos,
          spawn: (archetype, pos, level, zoneId) => this.spawnEnemy(archetype, pos, level, zoneId).id,
          isAlive: (id) => {
            const e = this.enemies.get(id);
            return e !== undefined && e.state !== 'dead';
          },
          isEngaged: (id) => {
            const e = this.enemies.get(id);
            return e !== undefined && e.state !== 'dead' && e.state !== 'idle';
          },
          wake: (id) => {
            const e = this.enemies.get(id);
            if (e && e.state === 'idle' && !e.returning && this.player.alive) {
              e.state = 'acquire';
              e.stateTime = 0;
            }
          },
          despawn: (id) => {
            this.enemies.remove(id);
            this.enemyActors.delete(id);
          },
          isNight: () => this.night,
        },
        z.width,
        z.depth,
      );
      this.population.populate();
    } else if (opts.encounter !== false) {
      for (const s of data.encounter.spawns) {
        const p = this.grid.walkable(s) ? { x: s.x, y: s.y } : this.grid.center(this.grid.nearestWalkable(s));
        this.spawnEnemy(s.archetype, p);
      }
    }
    this.syncPets();
  }

  /** Recoge los sucesos acumulados desde la última llamada. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    this.encounterCursor = 0;
    return out;
  }

  /** Pone un enemigo a mano (tests y depuración). `level` null = su nivel base. */
  spawnEnemy(archetype: string, pos: Vec2, level: number | null = null, zoneId: string | null = null): Enemy {
    const e = this.enemies.spawn(this.nextId++, archetype, pos, null, level, zoneId);
    this.enemyActor(e);
    return e;
  }

  /** Actor RPG de un enemigo (se crea al primer uso: también los esbirros invocados). */
  enemyActor(e: Enemy): EnemyActor {
    let a = this.enemyActors.get(e.id);
    if (!a) {
      const base = this.enemies.baseLevel(e.def.id);
      const sc = this.data.zones.scaling;
      const scale = e.level === base ? null : { stats: levelStatBlock(e.level, base, sc), ...rewardScale(e.level, base, sc) };
      a = new EnemyActor(this.content, e, (amount) => this.enemies.damage(e, amount, (ev) => this.events.push(ev)), scale);
      this.enemyActors.set(e.id, a);
    }
    return a;
  }

  /** Nivel de un actor para la diferencia de nivel (las mascotas usan el de su dueño), o null. */
  private levelOf(a: Actor): number | null {
    if (a === this.character) return this.character.level;
    if (a instanceof EnemyActor) return a.level;
    if (a instanceof Pet) return this.character.level;
    return null;
  }

  /** Daño × diferencia de nivel (con topes de `data/zones.json`). */
  private levelScaled(amount: number, source: Actor, target: Actor): number {
    const ls = this.levelOf(source);
    const lt = this.levelOf(target);
    if (ls === null || lt === null || ls === lt) return amount;
    return Math.max(1, Math.floor(amount * levelDiffMultiplier(ls, lt, this.data.zones.levelDifference)));
  }

  /** ¿Es de noche? (según `data/weather.json`; sin él, nunca). */
  get night(): boolean {
    return this.data.weather ? isNight(this.data.weather, this.timeOfDay) : false;
  }

  /** Zona del jugador para el tiempo (la simulación vive alrededor de él). */
  weatherZone(): string | null {
    return this.weather ? (this.zoneMap.zoneAt(this.player.pos)?.id ?? null) : null;
  }

  /** Daño × tiempo de la zona (lluvia debilita el fuego, el solazo lo refuerza). Va tras la tubería de daño. */
  private weatherScaled(amount: number, element: Element): number {
    if (!this.weather) return amount;
    const k = this.weather.damageMultiplier(this.weatherZone(), element);
    return k === 1 ? amount : Math.max(1, Math.floor(amount * k));
  }

  /** Slice 06: enemigos que pide una misión, repartidos en un círculo alrededor de `at`. */
  spawnQuestEnemies(archetype: string, count: number, at: Vec2, radius: number): void {
    if (!this.data.enemies.archetypes[archetype] || this.interior) return;
    const z = this.data.zone;
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = radius * Math.sqrt(this.rng.next());
      const p = { x: clamp(at.x + Math.cos(a) * r, 0, z.width), y: clamp(at.y + Math.sin(a) * r, 0, z.depth) };
      const cell = this.grid.walkable(p) ? -2 : this.grid.nearestWalkable(p);
      if (cell === -1) continue;
      const spot = cell === -2 ? p : this.grid.center(cell);
      // En el mundo por zonas, los de la misión salen con el nivel de la zona en la que caen.
      const zone = this.population ? this.zoneMap.zoneAt(spot) : null;
      const level = zone && !zone.safe ? rollLevel(this.rng, zone, 0) : null;
      this.spawnEnemy(archetype, spot, level);
    }
  }

  /** Punto caminable aleatorio a más de `minDist` del jugador. */
  randomSpawnPoint(minDist: number): Vec2 {
    const z = this.data.zone;
    for (let tries = 0; tries < 200; tries++) {
      const p = { x: this.rng.range(0, z.width), y: this.rng.range(0, z.depth) };
      if (this.grid.walkable(p) && dist(p, this.player.pos) >= minDist) return p;
    }
    return this.grid.center(this.grid.nearestWalkable({ x: z.width / 2, y: z.depth / 2 }));
  }

  /** Prueba de carga: sustituye los perseguidores por `n` nuevos. */
  spawnChasers(n: number): void {
    this.chasers.clear();
    for (let i = 0; i < n; i++) {
      this.chasers.spawn(this.nextId++, this.randomSpawnPoint(this.data.loadTest.minSpawnDistance), i / Math.max(1, n));
    }
  }

  // ─── Órdenes del jugador ─────────────────────────────────────────────────

  /**
   * Orden del jugador: caminar hacia un punto del suelo. Si no es caminable,
   * va al punto alcanzable más cercano. Gira hacia el destino en el mismo tick.
   */
  commandMove(target: Vec2): void {
    const p = this.player;
    if (!p.alive) return;
    this.talkTarget = null;
    this.stopFishing();
    p.attackTarget = null;
    p.pickupTarget = null;
    // Combate v2: un hechizo con `castWhileMoving` se sigue cargando mientras se anda.
    if (p.casting && !this.spell(p.casting.ability).def?.castWhileMoving) p.casting = null;
    this.walkTo(target);
  }

  private walkTo(target: Vec2): void {
    const p = this.player;
    const z = this.data.zone;
    const t = { x: clamp(target.x, 0, z.width), y: clamp(target.y, 0, z.depth) };
    if (distSq(p.pos, t) < 1e-4) return;
    p.path = this.pathfinder.findPath(p.pos, t);
    const first = p.path[0];
    if (first) p.facing = Math.atan2(first.y - p.pos.y, first.x - p.pos.x);
    p.moveTarget = p.path.length > 0 ? copy(p.path[p.path.length - 1]!) : null;
  }

  /** Clic sobre un enemigo: ataque básico con el arma, acercándose primero si hace falta. */
  commandAttack(enemyId: number): void {
    const p = this.player;
    const e = this.enemies.get(enemyId);
    if (!p.alive || !e || e.state === 'dead') return;
    if (p.casting) return;
    p.attackTarget = enemyId;
    p.lastTarget = enemyId;
    p.pickupTarget = null;
    this.talkTarget = null;
    this.stopFishing();
    this.attackRepath = 0;
  }

  /** Mercaderes y PNJ presentes en esta zona. */
  readonly npcs: Npc[] = [];
  /** PNJ al que va a hablar (clic). */
  talkTarget: string | null = null;

  /**
   * Clic sobre un PNJ: acercarse y, al llegar, hablarle (suceso de la sesión):
   * `talkNpc` si tiene diálogo; si es un mercader sin diálogo, `openMerchant`.
   */
  commandTalk(npcId: string): void {
    const p = this.player;
    const n = this.npcs.find((x) => x.npcId === npcId);
    if (!p.alive || !n) return;
    p.attackTarget = null;
    p.pickupTarget = null;
    p.casting = null;
    this.talkTarget = npcId;
    this.stopFishing();
    if (dist(p.pos, n.pos) > TALK_REACH) this.walkTo(n.pos);
  }

  /** Clic sobre un botín: ir a por él y recogerlo. */
  commandPickup(lootId: number): void {
    const p = this.player;
    const l = this.loot.find((x) => x.id === lootId);
    if (!p.alive || !l) return;
    p.attackTarget = null;
    p.casting = null;
    p.pickupTarget = lootId;
    this.talkTarget = null;
    this.stopFishing();
    if (dist(p.pos, l.pos) > this.content.rules.pickupReach) this.walkTo(l.pos);
  }

  /** Hechizo compilado con el rango que conoce el personaje (o el básico del arma). */
  spell(id: string): CompiledSpell {
    if (id === BASIC_ID) return this.basicAttack();
    const def = this.content.spells[id];
    if (!def) throw new Error(`hechizo desconocido: ${id}`);
    const rank = Math.max(1, this.character.spellbook.rank(id));
    const key = `${id}:${rank}`;
    let s = this.spellCache.get(key);
    if (!s) {
      s = compileSpell(this.content, def, rank);
      this.spellCache.set(key, s);
    }
    return s;
  }

  /**
   * Ataque básico del arma equipada (o sin arma): un objetivo, sin GCD; gasta
   * una carga (combate v2). Con dos armas alterna de mano en cada golpe
   * (`Character.basicSwing`); el de la izquierda hace menos daño.
   */
  basicAttack(): CompiledSpell {
    const swing = this.character.basicSwing();
    const w = swing.def;
    const key = `${BASIC_ID}:${swing.hand}:${swing.damage}:${swing.speed}:${w?.id ?? '-'}`;
    let s = this.spellCache.get(key);
    if (!s) {
      const wd = w?.weapon ?? this.content.rules.unarmed;
      const k = swing.damage;
      const effect: EffectDef = { type: 'damage', min: wd.min * k, max: wd.max * k, element: wd.element, scaling: this.content.rules.basicScaling * k };
      s = {
        id: BASIC_ID,
        name: w ? `Ataque (${w.name})` : 'Ataque básico',
        def: null,
        rank: 1,
        cost: this.data.player.basicAttack.resourceCost,
        cooldown: 1 / (wd.speed * swing.speed),
        globalCooldown: 0,
        castTime: 0,
        range: wd.range,
        area: { type: 'single' },
        projectileSpeed: wd.range > RANGED_WEAPON_REACH ? BASIC_PROJECTILE_SPEED : null,
        critChance: 0,
        critBonus: 0,
        power: 1,
        effects: [new DamageEffect(effect as Extract<EffectDef, { type: 'damage' }>)],
      };
      this.spellCache.set(key, s);
    }
    return s;
  }

  /**
   * Resumen con la forma del Slice 01 para el HUD y el render (que dibujan
   * áreas centradas en el jugador). `self` se presenta como `single`.
   */
  ability(id: string): AbilityDef {
    const s = this.spell(id);
    const dmg = s.effects.find((e): e is DamageEffect => e instanceof DamageEffect);
    const a = s.area;
    return {
      id: s.id,
      label: s.name,
      resourceCost: s.cost,
      cooldown: this.cooldownOf(s),
      globalCooldown: s.globalCooldown,
      castTime: s.castTime,
      range: s.range,
      area: a.type === 'self' || a.type === 'single' ? { type: 'single' } : a.type === 'circle' ? { type: 'circle', radius: a.radius } : a,
      damageMin: dmg ? dmg.def.min * s.power : 0,
      damageMax: dmg ? dmg.def.max * s.power : 0,
      critChance: s.critChance,
      critBonus: s.critBonus,
    };
  }

  /** Etiqueta legible de una fuente de daño (hechizo, estado, mascota…). */
  labelOf(source: string): string {
    if (source === BASIC_ID) return this.basicAttack().name;
    if (this.content.spells[source]) return this.content.spells[source]!.name;
    const [kind, id] = source.split(':');
    if (kind === 'status') return this.content.statuses[id!]?.name ?? source;
    if (kind === 'pet') return this.content.pets[id!]?.name ?? source;
    if (kind === 'item') return this.content.items[id!]?.name ?? source;
    return source;
  }

  /** Enfriamiento con la reducción del personaje (tope 50 %; el básico no se reduce). */
  cooldownOf(s: CompiledSpell): number {
    if (s.id === BASIC_ID) return s.cooldown;
    return s.cooldown * (1 - clamp(this.character.stats.get('cooldownReduction'), 0, 0.5));
  }

  private enemyById(id: number | null): Enemy | undefined {
    const e = id === null ? undefined : this.enemies.get(id);
    return e && e.state !== 'dead' ? e : undefined;
  }

  /** ¿Está el objetivo al alcance? Las áreas propias siempre lo están; el círculo apuntado mira la distancia al punto. */
  inRange(s: CompiledSpell, targetId: number | null, aim?: Vec2): boolean {
    const p = this.player;
    if (s.area.type === 'circle' && s.area.atTarget) return aim !== undefined && dist(p.pos, aim) <= s.range && this.grid.lineOfSight(p.pos, aim);
    if (s.area.type !== 'single') return true;
    const e = this.enemyById(targetId);
    if (!e) return false;
    return dist(p.pos, e.pos) - p.radius - e.radius <= s.range && this.grid.lineOfSight(p.pos, e.pos);
  }

  /** Motivo por el que no se puede lanzar ahora mismo, o null. */
  checkCast(s: CompiledSpell, targetId: number | null, aim?: Vec2): CastBlock | null {
    const p = this.player;
    if (!p.alive) return 'dead';
    if (p.casting) return 'busy';
    const control = this.character.control;
    if (control === 'stun' || control === 'silence') return 'control';
    if (s.area.type === 'single' && !this.enemyById(targetId)) return 'target';
    if (s.id === BASIC_ID && p.basicCharges < 1) return 'charges';
    return castBlock({
      resource: p.resource,
      cost: s.cost,
      cooldown: p.cooldowns[s.id] ?? 0,
      gcd: p.gcd,
      inRange: this.inRange(s, targetId, aim),
    });
  }

  /**
   * Comprobación al empezar a apuntar (modos con indicador): lo que no va a
   * cambiar por mover el cursor. El objetivo, el alcance y el GCD se miran al soltar.
   */
  precheckCast(s: CompiledSpell): CastBlock | null {
    const p = this.player;
    if (!p.alive) return 'dead';
    if (p.casting) return 'busy';
    const control = this.character.control;
    if (control === 'stun' || control === 'silence') return 'control';
    if (p.resource < s.cost) return 'resource';
    if ((p.cooldowns[s.id] ?? 0) > 0) return 'cooldown';
    return null;
  }

  /** Lanza el hechizo del hueco `index` (0..5) de la barra. */
  commandCastSlot(index: number, aim: Aim): CastBlock | null {
    const id = this.character.spellbook.hotbar[index] ?? null;
    if (id === null && !this.player.alive) {
      this.events.push({ type: 'castBlocked', ability: `slot${index + 1}`, reason: 'dead' });
      return 'dead';
    }
    if (id === null) {
      this.events.push({ type: 'castBlocked', ability: `slot${index + 1}`, reason: 'empty' });
      return 'empty';
    }
    return this.commandCast(id, aim);
  }

  /**
   * Lanza un hechizo conocido. Los de un objetivo usan el enemigo bajo el
   * cursor o, si no hay, el último atacado; las áreas se orientan hacia el cursor.
   */
  commandCast(spellId: string, aim: Aim): CastBlock | null {
    if (this.player.alive && spellId !== BASIC_ID && this.character.spellbook.rank(spellId) <= 0) {
      this.events.push({ type: 'castBlocked', ability: spellId, reason: 'unknown' });
      return 'unknown';
    }
    if (this.player.alive && spellId !== BASIC_ID && this.character.spellbook.equipBlock(spellId) !== null) {
      this.events.push({ type: 'castBlocked', ability: spellId, reason: 'level' });
      return 'level';
    }
    const s = this.spell(spellId);
    const p = this.player;
    this.stopFishing();
    let targetId = aim.targetId;
    if (s.area.type === 'single' && targetId === null) targetId = p.lastTarget;
    const block = this.checkCast(s, targetId, aim.point);
    if (block) {
      this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
      return block;
    }
    const e = this.enemyById(targetId);
    const to = s.area.type === 'single' && e ? e.pos : aim.point;
    const dir = distSq(to, p.pos) > 1e-9 ? Math.atan2(to.y - p.pos.y, to.x - p.pos.x) : p.facing;
    if (s.area.type === 'single') p.lastTarget = targetId;
    p.attackTarget = null;
    p.pickupTarget = null;
    this.startCast(s, targetId, dir, copy(aim.point));
    return null;
  }

  private startCast(s: CompiledSpell, targetId: number | null, dir: number, aim: Vec2): void {
    const p = this.player;
    p.facing = dir;
    // Combate v2: con `castWhileMoving` el jugador no se para para lanzar.
    if (!s.def?.castWhileMoving) {
      p.path = [];
      p.moveTarget = null;
    }
    if (s.castTime > 0) {
      p.casting = { ability: s.id, targetId, dir, aim, remaining: s.castTime };
      return;
    }
    this.execute(s, targetId, dir, aim);
  }

  /** Paga el coste, arranca enfriamientos y aplica los efectos. Sin tirada de acierto. */
  private execute(s: CompiledSpell, targetId: number | null, dir: number, aim: Vec2): void {
    const p = this.player;
    const ch = this.character;
    p.resource -= s.cost;
    if (s.id === BASIC_ID) {
      p.basicCharges -= 1;
      if (p.basicRecharge <= 0) p.basicRecharge = this.data.player.basicAttack.rechargeSeconds;
      ch.swung();
    }
    const cd = this.cooldownOf(s);
    if (cd > 0) p.cooldowns[s.id] = cd;
    if (s.globalCooldown > 0) {
      p.gcd = Math.max(p.gcd, s.globalCooldown);
      p.gcdTotal = p.gcd;
    }
    this.events.push({ type: 'cast', ability: s.id });
    const ctx = this.context(ch, s.id, aim, dir, s.critChance, s.critBonus);
    const targets = this.targetsOf(s, targetId, aim, dir);
    const self = s.effects.filter((e) => e.targeting === 'self');
    const hit = s.effects.filter((e) => e.targeting === 'hit');
    const applyTo = (t: Actor): void => {
      for (const e of hit) if (t.alive) e.apply(ctx, t, s.power);
    };
    const applyHits = (): void => {
      for (const t of targets) if (t.alive) applyTo(t);
    };
    const first = targets[0];
    if (s.area.type === 'single' && first && hit.length > 0) {
      // Combate v2: un hechizo de un objetivo es teledirigido (no se esquiva) y se puede reenviar.
      this.deliverSingle(ch, first, s.projectileSpeed, s.id !== BASIC_ID, applyTo, s.id);
    } else if (s.projectileSpeed && first && hit.length > 0) {
      // Proyectil de área: el golpe llega cuando recorre la distancia; lo propio se aplica ya.
      const delay = Math.max(0, dist(p.pos, first.pos) - p.radius) / s.projectileSpeed;
      if (delay > 1e-6) this.pending.push({ remaining: delay, run: applyHits });
      else applyHits();
    } else {
      applyHits();
    }
    for (const e of self) e.apply(ctx, ch, s.power);
  }

  /**
   * Actores vivos que alcanza un hechizo. Un área alcanza a todos los enemigos
   * dentro y, con `friendlyFire`, también a las mascotas y aliados (nunca al lanzador).
   */
  private targetsOf(s: CompiledSpell, targetId: number | null, aim: Vec2, dir: number): Actor[] {
    const a = s.area;
    const p = this.player;
    if (a.type === 'self') return [];
    if (a.type === 'single') {
      const e = this.enemyById(targetId);
      return e ? [this.enemyActor(e)] : [];
    }
    const shape: PlacedShape =
      a.type === 'circle' ? { def: { type: 'circle', radius: a.radius }, origin: a.atTarget ? copy(aim) : copy(p.pos), dir } : { def: a, origin: copy(p.pos), dir };
    const out: Actor[] = [];
    for (const e of this.enemies.list) if (e.state !== 'dead' && shapeHitsCircle(shape, e.pos, e.radius)) out.push(this.enemyActor(e));
    if (s.def?.friendlyFire) out.push(...this.alliesIn(shape));
    return out;
  }

  /** Mascotas y aliados vivos dentro de una forma (fuego amigo). */
  private alliesIn(shape: PlacedShape): Actor[] {
    return this.pets.filter((pet) => pet.alive && shapeHitsCircle(shape, pet.pos, pet.radius));
  }

  // ─── Efectos ─────────────────────────────────────────────────────────────

  private profile(a: Actor): AttackerProfile {
    return a;
  }

  /** Contexto de efectos para un lanzador (hechizos, estados, mascotas, consumibles). */
  context(caster: Actor, tag: string, aim: Vec2, dir: number, critChance = 0, critBonus = 0): EffectContext {
    const w = this;
    const origin = copy(caster.pos);
    return {
      rng: this.rng,
      content: this.content,
      caster,
      tag,
      origin,
      aim,
      dir,
      critChance,
      critBonus,
      damage: (t, h) => w.dealDamage(caster, t, h, tag),
      heal: (t, amount) => {
        const healed = t.heal(amount);
        if (healed > 0) w.events.push({ type: 'heal', targetId: t.id, amount: healed, source: tag });
      },
      restoreResource: (t, amount) => {
        if (t instanceof Character) t.resource = Math.min(t.maxResource, t.resource + amount);
      },
      applyStatus: (t, def, duration, shield) => w.applyStatus(caster, t, def, duration, shield),
      knockback: (t, from, distance) => w.knockback(t, from, distance),
      dash: (distance) => w.dash(caster, dir, distance),
      teleport: (maxDistance) => w.teleport(caster, aim, dir, maxDistance),
      blink: (maxDistance) => w.blink(caster, aim, maxDistance),
      swap: (t) => w.swap(caster, t),
      pull: (t, distance) => w.pull(caster, t, distance),
      recoil: (distance) => w.recoil(caster, aim, distance),
      summon: (pet, count, duration) => w.summon(pet, count, duration),
      zone: (spec) => w.addZone(caster, tag, aim, { ...spec, friendlyFire: w.content.spells[tag]?.friendlyFire ?? false }),
    };
  }

  /** `SessionWorld`: consumibles usados desde el inventario durante la partida. */
  effectContext(tag: string): EffectContext {
    return this.context(this.character, tag, copy(this.player.pos), this.player.facing);
  }

  private dealDamage(source: Actor, target: Actor, hit: HitSpec, tag: string): void {
    this.strike(source, target, hit, tag);
  }

  /** Estado activo de `a` con esa mecánica (inmunidad, reenvío, contra), o undefined. */
  private statusWith(a: Actor, key: 'immune' | 'reflect' | 'counter'): ActiveStatusLike | undefined {
    return a.statuses.list.find((x) => x.def[key]);
  }

  isImmune(a: Actor): boolean {
    return this.statusWith(a, 'immune') !== undefined;
  }

  /**
   * Un golpe que conecta: invulnerabilidad e inmunidad lo anulan; si no, tirada,
   * diferencia de nivel, daño y, si el objetivo tiene contra y el golpe es
   * cuerpo a cuerpo, la devolución. `reflexive` = la propia contra (sin
   * estadísticas del atacante ni diferencia de nivel, y no se contraataca).
   * Devuelve el daño hecho (0 si se anuló).
   */
  private strike(source: Actor, target: Actor, hit: HitSpec, tag: string | null, reflexive = false): number {
    if (!target.alive) return 0;
    const toPlayer = target === this.character;
    if (toPlayer && this.player.invulnerable > 0) {
      this.events.push({ type: 'avoided', sourceId: source.id });
      return 0;
    }
    if (this.isImmune(target)) {
      this.events.push({ type: 'immune', targetId: target.id, sourceId: source.id });
      if (toPlayer) this.events.push({ type: 'avoided', sourceId: source.id });
      return 0;
    }
    const roll = resolveHit(this.rng, hit, reflexive ? null : this.profile(source), target.stats, this.damageRules);
    const scaled = reflexive ? roll.amount : this.levelScaled(roll.amount, source, target);
    const amount = this.weatherScaled(scaled, hit.element);
    this.events.push({ type: 'damage', sourceId: source.id, targetId: target.id, amount, crit: roll.crit, toPlayer, ability: tag });
    target.takeDamage(amount);
    if (!reflexive) this.counterHit(source, target, amount, hit.element);
    return amount;
  }

  /** Contra: `percent` % del golpe vuelve a quien lo dio si estaba cuerpo a cuerpo. */
  private counterHit(source: Actor, target: Actor, amount: number, element: HitSpec['element']): void {
    if (source === target || !source.alive || !target.alive || amount <= 0) return;
    const st = this.statusWith(target, 'counter');
    if (!st?.def.counter) return;
    const edge = dist(source.pos, target.pos) - this.radiusOf(source) - this.radiusOf(target);
    if (edge > this.data.player.meleeReach) return;
    const back = Math.max(1, Math.floor((amount * st.def.counter.percent) / 100));
    this.events.push({ type: 'counter', targetId: target.id, sourceId: source.id });
    this.strike(target, source, { min: back, max: back, element, scaling: 0, critChance: 0, critBonus: 0 }, `status:${st.def.id}`, true);
  }

  private applyStatus(source: Actor, target: Actor, def: StatusDef, duration: number, shield?: number): void {
    if (!target.alive) return;
    // La inmunidad también para los perjuicios ajenos (no los propios).
    if (def.kind === 'debuff' && source !== target && this.isImmune(target)) {
      this.events.push({ type: 'immune', targetId: target.id, sourceId: source.id });
      return;
    }
    target.statuses.apply(def, { duration, source, shield: shield ?? 0 });
    if (def.rewind) {
      const b = this.bodyOf(target);
      if (b) this.rewinds.set(target, { statusId: def.id, pos: copy(b.pos), health: target.health });
    }
    this.events.push({ type: 'status', targetId: target.id, statusId: def.id });
  }

  /** Radio del cuerpo de un actor (para distancias entre bordes). */
  private radiusOf(a: Actor): number {
    if (a === this.character) return this.player.radius;
    if (a instanceof EnemyActor) return this.enemies.get(a.id)?.radius ?? 0.5;
    if (a instanceof Pet) return a.radius;
    return 0.5;
  }

  // ─── Proyectiles teledirigidos y reenvío (combate v2) ─────────────────────

  /**
   * Hechizo de un objetivo: vuela hacia él (teledirigido) o llega en el acto
   * sin proyectil. Si el objetivo tiene reenvío y el golpe se puede reenviar,
   * vuelve al lanzador (una sola vez: un reenvío no se reenvía).
   */
  private deliverSingle(caster: Actor, target: Actor, speed: number | null, reflectable: boolean, apply: (t: Actor) => void, ability: string | null): void {
    const land = (t: Actor, bounced: boolean): void => {
      if (!t.alive) return;
      if (reflectable && !bounced && t !== caster && caster.alive && this.statusWith(t, 'reflect')) {
        this.events.push({ type: 'reflect', fromId: t.id, toId: caster.id, ability: ability ?? '' });
        this.fly(t, caster, speed, () => land(caster, true), ability);
        return;
      }
      apply(t);
    };
    this.fly(caster, target, speed, () => land(target, false), ability);
  }

  /** Lanza un proyectil que persigue a `to`; sin velocidad, el golpe llega ya. */
  private fly(from: Actor, to: Actor, speed: number | null, onHit: () => void, ability: string | null): void {
    if (!speed) {
      onHit();
      return;
    }
    // Los del jugador ya los dibuja el render al lanzar; el resto se avisa.
    if (from !== this.character) this.events.push({ type: 'homing', sourceId: from.id, targetId: to.id, ability, speed });
    this.missiles.push({ id: this.nextId++, pos: copy(from.pos), target: to, speed, onHit });
  }

  private tickMissiles(dt: number): void {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i]!;
      if (!m.target.alive) {
        this.missiles.splice(i, 1);
        continue;
      }
      const to = m.target.pos;
      const d = dist(m.pos, to);
      const step = m.speed * dt;
      if (d - this.radiusOf(m.target) <= step) {
        this.missiles.splice(i, 1);
        m.onHit();
      } else {
        m.pos = { x: m.pos.x + ((to.x - m.pos.x) / d) * step, y: m.pos.y + ((to.y - m.pos.y) / d) * step };
      }
    }
  }

  /** Retroceso: al acabarse el estado, el actor vuelve a la posición y la vida que tenía. */
  private tickRewinds(): void {
    for (const [a, mark] of [...this.rewinds]) {
      if (!a.alive) {
        this.rewinds.delete(a);
        continue;
      }
      if (a.statuses.has(mark.statusId)) continue;
      this.rewinds.delete(a);
      const b = this.bodyOf(a);
      if (!b) continue;
      const from = copy(b.pos);
      this.place(a, b, mark.pos);
      a.health = Math.min(a.maxHealth, Math.max(a.health, mark.health));
      this.events.push({ type: 'rewind', targetId: a.id, from, to: copy(mark.pos) });
    }
  }

  private bodyOf(a: Actor): { pos: Vec2; path: Vec2[] } | null {
    if (a === this.character) return this.player;
    if (a instanceof EnemyActor) return this.enemies.get(a.id) ?? null;
    if (a instanceof Pet) return a;
    return null;
  }

  /** Mueve en línea recta por pasos cortos, deslizando por paredes. */
  private push(body: { pos: Vec2 }, dir: number, distance: number): void {
    const n = Math.max(1, Math.ceil(distance / MOVE_STEP));
    const sx = (Math.cos(dir) * distance) / n;
    const sy = (Math.sin(dir) * distance) / n;
    for (let i = 0; i < n; i++) body.pos = slide(this.grid, body.pos, { x: body.pos.x + sx, y: body.pos.y + sy });
  }

  private knockback(t: Actor, from: Vec2, distance: number): void {
    const b = this.bodyOf(t);
    if (!b || !t.alive || this.isImmune(t)) return;
    const dx = b.pos.x - from.x;
    const dy = b.pos.y - from.y;
    const dir = dx * dx + dy * dy > 1e-9 ? Math.atan2(dy, dx) : this.player.facing;
    this.push(b, dir, distance);
    b.path.length = 0;
  }

  private dash(caster: Actor, dir: number, distance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    this.push(b, dir, distance);
    b.path.length = 0;
    if (b === this.player) this.player.moveTarget = null;
  }

  /** Pone un cuerpo en `to` sin interpolar (teletransportes, intercambios, retroceso). */
  private place(a: Actor, b: { pos: Vec2; path: Vec2[] }, to: Vec2): void {
    const from = copy(b.pos);
    b.pos = copy(to);
    b.path.length = 0;
    if (b === this.player) {
      this.player.prevPos = copy(to);
      this.player.moveTarget = null;
    } else if ('prevPos' in b) {
      (b as { prevPos: Vec2 }).prevPos = copy(to);
    }
    this.events.push({ type: 'teleport', from, to: copy(to), entityId: a.id });
  }

  /** Blink: al punto apuntado (como mucho `maxDistance`), sin línea de visión; si no se pisa, a la celda libre más cercana. */
  private blink(caster: Actor, aim: Vec2, maxDistance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    const z = this.data.zone;
    const from = b.pos;
    const d = dist(from, aim);
    const k = d > maxDistance ? maxDistance / d : 1;
    let to = { x: clamp(from.x + (aim.x - from.x) * k, 0, z.width), y: clamp(from.y + (aim.y - from.y) * k, 0, z.depth) };
    if (!this.grid.walkable(to)) {
      const cell = this.grid.nearestWalkable(to);
      if (cell === -1) return;
      to = this.grid.center(cell);
    }
    this.place(caster, b, to);
  }

  /** Intercambio de posiciones con el objetivo (no con uno inmune). */
  private swap(caster: Actor, target: Actor): void {
    if (caster === target || !target.alive || this.isImmune(target)) return;
    const a = this.bodyOf(caster);
    const b = this.bodyOf(target);
    if (!a || !b) return;
    const pa = copy(a.pos);
    this.place(caster, a, b.pos);
    this.place(target, b, pa);
  }

  /** Atrae al objetivo hacia el lanzador hasta `distance` m, parándose al tocarlo. */
  private pull(caster: Actor, target: Actor, distance: number): void {
    if (caster === target || !target.alive || this.isImmune(target)) return;
    const c = this.bodyOf(caster);
    const b = this.bodyOf(target);
    if (!c || !b) return;
    const gap = dist(b.pos, c.pos) - this.radiusOf(caster) - this.radiusOf(target) - 0.05;
    const move = Math.min(distance, Math.max(0, gap));
    if (move <= 0) return;
    this.push(b, Math.atan2(c.pos.y - b.pos.y, c.pos.x - b.pos.x), move);
    b.path.length = 0;
  }

  /** El lanzador salta hacia atrás, lejos del punto apuntado (o de espaldas, si apunta a sus pies). */
  private recoil(caster: Actor, aim: Vec2, distance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    const dx = b.pos.x - aim.x;
    const dy = b.pos.y - aim.y;
    const dir = dx * dx + dy * dy > 1e-6 ? Math.atan2(dy, dx) : (b === this.player ? this.player.facing : 0) + Math.PI;
    this.push(b, dir, distance);
    b.path.length = 0;
    if (b === this.player) this.player.moveTarget = null;
  }

  /** Teletransporte hacia el punto apuntado (como mucho `maxDistance`), al último punto caminable con línea de visión. */
  private teleport(caster: Actor, aim: Vec2, dir: number, maxDistance: number): void {
    const b = this.bodyOf(caster);
    if (!b) return;
    const from = copy(b.pos);
    const want = Math.min(maxDistance, dist(from, aim));
    let to = from;
    for (let d = want; d > 0; d -= MOVE_STEP) {
      const p = { x: from.x + Math.cos(dir) * d, y: from.y + Math.sin(dir) * d };
      if (this.grid.walkable(p) && this.grid.lineOfSight(from, p)) {
        to = p;
        break;
      }
    }
    this.place(caster, b, to);
  }

  private summon(def: PetDef, count: number, duration: number): void {
    for (let i = 0; i < count; i++) this.spawnPet(def, null, duration);
  }

  private addZone(caster: Actor, tag: string, at: Vec2, spec: ZoneSpec): void {
    this.zones.push({ ...spec, id: this.nextId++, pos: copy(at), remaining: spec.duration, timer: 0, caster, tag });
  }

  // ─── Golpes enemigos ─────────────────────────────────────────────────────

  private hitPlayer(src: Enemy, at: EnemyAttackDef): void {
    if (!this.player.alive) return;
    this.enemyStrike(src, at, this.character);
  }

  /** Golpe de un ataque enemigo contra `target` (el jugador, o el propio enemigo si se lo reenvían). */
  private enemyStrike(src: Enemy, at: EnemyAttackDef, target: Actor): void {
    const actor = this.enemyActor(src);
    const hit: HitSpec = { min: at.damageMin, max: at.damageMax, element: at.element ?? actor.info.element, scaling: 0, critChance: at.critChance, critBonus: at.critBonus };
    const dealt = this.strike(actor, target, hit, enemyTag(src, at));
    if (dealt > 0 && at.status && target.alive) {
      const def = this.content.statuses[at.status.id];
      if (def) this.applyStatus(actor, target, def, at.status.duration ?? def.duration);
    }
  }

  /** Flecha rastreadora y demás ataques enemigos teledirigidos (se pueden reenviar). */
  private launchHoming(src: Enemy, at: EnemyAttackDef): void {
    const actor = this.enemyActor(src);
    this.deliverSingle(actor, this.character, this.data.player.homingSpeed, true, (t) => this.enemyStrike(src, at, t), enemyTag(src, at));
  }

  // ─── Vista previa (combate v2) ───────────────────────────────────────────

  /**
   * Daño esperado de un hechizo contra un enemigo: suma de sus efectos de daño
   * directos tras resistencias y diferencia de nivel. null si no hace daño
   * directo o el enemigo no existe.
   */
  previewDamage(spellId: string, targetId: number | null): (DamagePreview & { immune: boolean }) | null {
    const e = this.enemyById(targetId);
    if (!e) return null;
    const s = this.spell(spellId);
    const target = this.enemyActor(e);
    const dmg = s.effects.filter((x): x is DamageEffect => x instanceof DamageEffect);
    if (dmg.length === 0) return null;
    const out = { min: 0, max: 0, critMin: 0, critMax: 0, critChance: 0, immune: this.isImmune(target) };
    for (const d of dmg) {
      const hit: HitSpec = { min: d.def.min * s.power, max: d.def.max * s.power, element: d.def.element, scaling: d.def.scaling ?? 0, critChance: s.critChance, critBonus: s.critBonus };
      const p = previewHit(hit, this.profile(this.character), target.stats, this.damageRules);
      const lv = (v: number): number => this.levelScaled(v, this.character, target);
      out.min += lv(p.min);
      out.max += lv(p.max);
      out.critMin += lv(p.critMin);
      out.critMax += lv(p.critMax);
      out.critChance = Math.max(out.critChance, p.critChance);
    }
    return out;
  }

  // ─── Botín ───────────────────────────────────────────────────────────────

  /** Deja un objeto (o monedas) en el suelo cerca de `at`. */
  dropLoot(at: Vec2, item: ItemInstance | null, gold = 0): GroundLoot {
    const s = this.content.rules.lootScatter;
    let pos = { x: at.x + this.rng.range(-s, s), y: at.y + this.rng.range(-s, s) };
    if (!this.grid.walkable(pos) || !this.grid.lineOfSight(at, pos)) pos = this.grid.walkable(at) ? copy(at) : this.grid.center(this.grid.nearestWalkable(at));
    const l: GroundLoot = { id: this.nextId++, pos, item, gold, age: 0 };
    this.loot.push(l);
    this.events.push({ type: 'lootDrop', lootId: l.id });
    return l;
  }

  /** `SessionWorld`: lo que se tira del inventario cae junto al jugador. */
  dropToGround(inst: ItemInstance): void {
    this.dropLoot(this.player.pos, inst);
  }

  /** Apuntado actual (cursor); lo pone `main.ts` para que la barra lance desde la interfaz. */
  aimProvider: (() => Aim) | null = null;

  /**
   * Modos de lanzamiento (combate v2): lo pone `main.ts`. Recibe el hueco y el
   * hechizo al pulsar su tecla; true = la interfaz se queda apuntando (lanzará
   * ella al soltar o confirmar con `commandCastSlot`), false = lanzar ya.
   */
  slotGate: ((index: number, spell: CompiledSpell) => boolean) | null = null;

  /** `SessionWorld`: tecla 1–6 pedida por la interfaz, con el apuntado del cursor. */
  castSlot(index: number): CastBlock | null {
    const id = this.character.spellbook.hotbar[index] ?? null;
    if (this.slotGate && id !== null && this.player.alive && this.character.spellbook.rank(id) > 0) {
      const s = this.spell(id);
      const block = this.precheckCast(s);
      if (block) {
        this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
        return block;
      }
      if (this.slotGate(index, s)) return null;
    }
    const aim = this.aimProvider?.() ?? { point: copy(this.player.pos), targetId: null };
    return this.commandCastSlot(index, aim);
  }

  /** `SessionWorld`: barrido del HUD por hueco (el mayor entre el enfriamiento propio y el GCD). */
  hotbarState(): HotbarSlotState[] {
    const p = this.player;
    return this.character.spellbook.hotbar.map((spellId) => {
      if (spellId === null) return { spellId, cooldownRemaining: 0, cooldownTotal: 0, affordable: true };
      const s = this.spell(spellId);
      let remaining = p.cooldowns[s.id] ?? 0;
      let total = s.cooldown;
      if (p.gcd > remaining && p.gcdTotal > 0) {
        remaining = p.gcd;
        total = p.gcdTotal;
      }
      return { spellId, cooldownRemaining: remaining, cooldownTotal: Math.max(total, remaining), affordable: p.resource >= s.cost };
    });
  }

  /** `SessionWorld`. */
  petHealth(): { health: number; maxHealth: number } | null {
    const pet = this.pets.find((p) => p.itemUid !== null);
    return pet ? { health: pet.health, maxHealth: pet.maxHealth } : null;
  }

  private canCollect(l: GroundLoot): boolean {
    return l.item === null || this.character.inventory.canAdd(l.item);
  }

  /** Recoge un botín para el personaje. Devuelve si desapareció del suelo. */
  collect(lootId: number, byPet = false): boolean {
    const i = this.loot.findIndex((x) => x.id === lootId);
    if (i < 0) return false;
    const l = this.loot[i]!;
    if (l.item) {
      if (this.character.pickUp(l.item) > 0) return false;
    } else {
      this.character.addGold(l.gold);
    }
    this.loot.splice(i, 1);
    this.events.push({ type: 'lootPickup', lootId, byPet });
    return true;
  }

  /** Vista del botín del suelo (render, interfaz). */
  lootView(): GroundLootView[] {
    return this.loot.map((l) => ({
      id: l.id,
      x: l.pos.x,
      y: l.pos.y,
      item: l.item,
      gold: l.gold,
      rarity: l.item ? this.content.items[l.item.itemId]!.rarity : 'common',
    }));
  }

  private tickLoot(dt: number): void {
    const p = this.player;
    const life = this.content.rules.lootLifetime;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i]!;
      l.age += dt;
      if (l.age >= life) this.loot.splice(i, 1);
    }
    if (!p.alive) return;
    const r = this.character.stats.get('pickupRadius');
    for (const l of [...this.loot]) {
      if (dist(p.pos, l.pos) <= r && this.canCollect(l)) this.collect(l.id);
    }
    if (p.pickupTarget !== null) {
      const l = this.loot.find((x) => x.id === p.pickupTarget);
      if (!l) p.pickupTarget = null;
      else if (dist(p.pos, l.pos) <= Math.max(r, this.content.rules.pickupReach)) {
        p.pickupTarget = null;
        p.path = [];
        p.moveTarget = null;
        this.collect(l.id);
      }
    }
    if (this.talkTarget !== null) {
      const n = this.npcs.find((x) => x.npcId === this.talkTarget);
      if (!n) this.talkTarget = null;
      else if (dist(p.pos, n.pos) <= TALK_REACH) {
        this.talkTarget = null;
        p.path = [];
        p.moveTarget = null;
        p.facing = Math.atan2(n.pos.y - p.pos.y, n.pos.x - p.pos.x);
        if (this.content.npcs[n.npcId]) this.character.emit({ type: 'talkNpc', npcId: n.npcId });
        else if (n.merchantId !== null) this.character.emit({ type: 'openMerchant', merchantId: n.merchantId });
      }
    }
  }

  /** XP y botín de cada enemigo muerto, una sola vez. */
  private rewardDeaths(): void {
    for (const e of this.enemies.list) {
      if (e.state !== 'dead') continue;
      const a = this.enemyActor(e);
      if (a.rewarded) continue;
      a.rewarded = true;
      a.statuses.clear();
      if (!this.player.alive) continue;
      this.character.emit({ type: 'enemyKilled', archetype: e.def.id });
      if (a.xp > 0) {
        const before = this.character.level;
        this.character.gainXp(a.xp);
        this.events.push({ type: 'xp', amount: a.xp });
        for (let l = before + 1; l <= this.character.level; l++) this.events.push({ type: 'levelUp', level: l });
      }
      const base = a.info.lootTable ? this.content.lootTables[a.info.lootTable] : undefined;
      if (!base) continue;
      // Nivel alto: más monedas y alguna tirada de objeto más.
      const table =
        a.goldScale === 1 && a.extraLootRolls === 0
          ? base
          : { ...base, rolls: base.rolls + a.extraLootRolls, gold: { ...base.gold, min: Math.round(base.gold.min * a.goldScale), max: Math.round(base.gold.max * a.goldScale) } };
      const drop = rollLoot(this.rng, this.content, table);
      if (this.content.spoils.lootMode === 'window') {
        this.encounter.addKill(a.xp, drop.gold, drop.items.map((it) => this.character.items.create(it.itemId, it.quantity)));
        continue;
      }
      if (drop.gold > 0) this.dropLoot(e.pos, null, drop.gold);
      for (const it of drop.items) this.dropLoot(e.pos, this.character.items.create(it.itemId, it.quantity));
    }
  }

  /** Participante al que cuenta lo que hace un cuerpo: el jugador y sus mascotas, para el jugador. */
  private participantOf(id: number): string | null {
    if (id === this.player.id || this.pets.some((p) => p.id === id)) return `player:${this.player.id}`;
    return null;
  }

  /**
   * Fin de combate (modo ventana): cuenta el daño y la curación de los sucesos
   * de este tick, y al acabar el combate avisa a la sesión con lo que le toca.
   */
  private tickEncounter(dt: number): void {
    if (this.content.spoils.lootMode !== 'window') return;
    const enc = this.encounter;
    const me = `player:${this.player.id}`;
    for (let i = this.encounterCursor; i < this.events.length; i++) {
      const ev = this.events[i]!;
      if (ev.type === 'damage' && !ev.toPlayer && this.enemies.get(ev.targetId)) {
        const who = this.participantOf(ev.sourceId);
        if (who) enc.damage(who, ev.amount);
      } else if (ev.type === 'heal' && this.participantOf(ev.targetId)) {
        // El suceso no dice quién cura; hoy sólo cura el grupo del jugador.
        enc.healing(me, ev.amount);
      }
    }
    this.encounterCursor = this.events.length;
    let aggro = 0;
    for (const e of this.enemies.list) if (e.state !== 'idle' && e.state !== 'dead' && !e.returning) aggro++;
    const result = enc.tick(dt, aggro, this.player.alive ? [me] : []);
    if (!result) return;
    const mine = result.allotments.find((a) => a.participant === me);
    if (!mine || (mine.gold === 0 && mine.items.length === 0 && mine.xp === 0)) return;
    this.character.emit({
      type: 'spoils',
      spoils: {
        id: 0,
        gold: mine.gold,
        xp: mine.xp,
        kills: result.kills,
        seconds: result.seconds,
        share: mine.share,
        items: mine.items,
        participants: result.allotments.map((a) => ({ id: a.participant, name: a.participant === me ? this.character.name : a.participant, share: a.share })),
      },
    });
  }

  // ─── Mascotas ────────────────────────────────────────────────────────────

  private spawnPet(def: PetDef, itemUid: string | null, ttl: number | null): Pet {
    const o = this.player.pos;
    let pos = { x: o.x - Math.cos(this.player.facing) * 1.2, y: o.y - Math.sin(this.player.facing) * 1.2 };
    if (!this.grid.walkable(pos)) pos = copy(o);
    const pet = new Pet(this.content, def, pos, itemUid, ttl);
    pet.id = this.nextId++;
    this.pets.push(pet);
    this.events.push({ type: 'petSpawn', petId: def.id, entityId: pet.id });
    return pet;
  }

  /** La mascota activa del mundo sigue al amuleto activo del personaje. */
  private syncPets(): void {
    const ch = this.character;
    const want = ch.activePetId();
    const uid = ch.activePetItemUid;
    const cur = this.pets.find((p) => p.itemUid !== null);
    if (cur && (!want || cur.itemUid !== uid || cur.def.id !== want || !this.player.alive)) this.pets.splice(this.pets.indexOf(cur), 1);
    if (want && uid && this.player.alive && this.time >= this.petRespawnAt && !this.pets.some((p) => p.itemUid === uid)) this.spawnPet(this.content.pets[want]!, uid, null);
  }

  private makePetWorld(): PetWorld {
    const w = this;
    return {
      rng: this.rng,
      owner: this.character,
      nearestEnemy(from, radius) {
        let best: EnemyActor | null = null;
        let bd = radius;
        for (const e of w.enemies.list) {
          if (e.state === 'dead') continue;
          const d = dist(from, e.pos);
          if (d <= bd) {
            bd = d;
            best = w.enemyActor(e);
          }
        }
        return best;
      },
      nearestLoot(from, radius) {
        let best: GroundLoot | null = null;
        let bd = radius;
        for (const l of w.loot) {
          const d = dist(from, l.pos);
          if (d <= bd && w.canCollect(l)) {
            bd = d;
            best = l;
          }
        }
        return best;
      },
      collectLoot(id) {
        w.collect(id, true);
      },
      petAttack(pet, target) {
        const a = pet.def.attack!;
        w.dealDamage(pet, target, { min: a.min, max: a.max, element: a.element, scaling: 0, critChance: 0, critBonus: 0 }, `pet:${pet.def.id}`);
      },
      petEffect(pet, effect, target) {
        effect.apply(w.context(pet, `pet:${pet.def.id}`, copy(pet.pos), pet.facing), target, 1);
      },
      moveTowards(pet, to, dt) {
        if (w.grid.lineOfSight(pet.pos, to)) pet.path = [copy(to)];
        else if (pet.path.length === 0) pet.path = w.pathfinder.findPath(pet.pos, to);
        stepAlongPath(pet, dt);
      },
    };
  }

  private tickPets(dt: number): void {
    this.syncPets();
    for (const pet of [...this.pets]) {
      if (pet.expired || !this.player.alive || !pet.alive) {
        // La del amuleto que cae (fuego amigo) tarda en volver.
        if (!pet.alive && pet.itemUid !== null) this.petRespawnAt = this.time + this.data.player.petRespawnSeconds;
        this.pets.splice(this.pets.indexOf(pet), 1);
        continue;
      }
      pet.tick(this.petWorld, dt);
    }
  }

  // ─── Tiempo ──────────────────────────────────────────────────────────────

  /** Efecto (instanciado una vez) que repite un estado. */
  private tickEffect(def: EffectDef): Effect {
    let e = this.effectCache.get(def);
    if (!e) {
      e = createEffect(def, this.content);
      this.effectCache.set(def, e);
    }
    return e;
  }

  private tickStatuses(a: Actor, dt: number): void {
    if (a.statuses.list.length === 0) return;
    a.statuses.tick(dt, (s) => {
      if (!a.alive || !s.def.tick) return;
      const src = s.source instanceof Actor ? s.source : a;
      this.tickEffect(s.def.tick.effect).apply(this.context(src, `status:${s.def.id}`, copy(a.pos), 0), a, 1);
    });
  }

  private tickZones(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]!;
      const step = Math.min(dt, z.remaining);
      z.remaining -= dt;
      z.timer += step;
      while (z.timer >= z.every - 1e-9) {
        z.timer -= z.every;
        const ctx = this.context(z.caster, z.tag, z.pos, 0);
        const shape: PlacedShape = { def: { type: 'circle', radius: z.radius }, origin: z.pos, dir: 0 };
        const inside: Actor[] = [];
        for (const e of this.enemies.list) if (e.state !== 'dead' && shapeHitsCircle(shape, e.pos, e.radius)) inside.push(this.enemyActor(e));
        if (z.friendlyFire) inside.push(...this.alliesIn(shape));
        for (const t of inside) for (const eff of z.effects) if (eff.targeting === 'hit' && t.alive) eff.apply(ctx, t, z.power);
      }
      if (z.remaining <= 1e-9) this.zones.splice(i, 1);
    }
  }

  private tickPending(dt: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const h = this.pending[i]!;
      h.remaining -= dt;
      if (h.remaining > 0) continue;
      this.pending.splice(i, 1);
      h.run();
    }
  }

  /** Estados, control y velocidad de los enemigos (antes de su máquina de estados). */
  private tickEnemyActors(dt: number): void {
    for (const e of this.enemies.list) {
      const a = this.enemyActor(e);
      if (e.state === 'dead') continue;
      this.tickStatuses(a, dt);
      const c = a.control;
      e.frozen = c === 'stun';
      e.speed = c === 'stun' || c === 'root' ? 0 : a.stats.get('moveSpeed');
    }
  }

  private tickPlayer(dt: number): void {
    const p = this.player;
    const ch = this.character;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.gcd = Math.max(0, p.gcd - dt);
    this.rechargeBasic(dt);
    for (const id in p.cooldowns) p.cooldowns[id] = Math.max(0, p.cooldowns[id]! - dt);
    if (!p.alive) return;
    ch.tickTimers(dt);
    this.tickStatuses(ch, dt);
    const control = ch.control;
    p.speed = control === 'root' || control === 'stun' ? 0 : ch.stats.get('moveSpeed') * (this.weather?.moveMultiplier(this.weatherZone()) ?? 1);
    if (control === 'stun') {
      p.casting = null;
      return;
    }

    if (p.casting) {
      const c = p.casting;
      const s = this.spell(c.ability);
      c.remaining -= dt;
      if (c.remaining <= 0) {
        p.casting = null;
        const block = this.checkCast(s, c.targetId, c.aim);
        if (block) this.events.push({ type: 'castBlocked', ability: s.id, reason: block });
        else this.execute(s, c.targetId, c.dir, c.aim);
      }
      // Combate v2: cargar andando si el hechizo lo permite.
      if (s.def?.castWhileMoving) stepAlongPath(p, dt);
      return;
    }
    if (p.attackTarget !== null) this.approachAndAttack(dt);
    stepAlongPath(p, dt);
  }

  /** Las cargas del ataque básico vuelven de una en una. */
  private rechargeBasic(dt: number): void {
    const p = this.player;
    const b = this.data.player.basicAttack;
    if (p.basicCharges >= b.charges) {
      p.basicRecharge = 0;
      return;
    }
    p.basicRecharge -= dt;
    while (p.basicRecharge <= 1e-9 && p.basicCharges < b.charges) {
      p.basicCharges++;
      p.basicRecharge += b.rechargeSeconds;
    }
    if (p.basicCharges >= b.charges) p.basicRecharge = 0;
  }

  /** Ataque básico pendiente: acercarse hasta tener alcance y golpear una vez. */
  private approachAndAttack(dt: number): void {
    const p = this.player;
    const e = this.enemyById(p.attackTarget);
    if (!e) {
      p.attackTarget = null;
      return;
    }
    const basic = this.basicAttack();
    if (this.inRange(basic, e.id)) {
      p.path = [];
      p.moveTarget = null;
      p.facing = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x);
      if (this.checkCast(basic, e.id) === null) {
        p.attackTarget = null;
        this.startCast(basic, e.id, p.facing, copy(e.pos));
      }
      return;
    }
    this.attackRepath -= dt;
    if (this.attackRepath <= 0 || p.path.length === 0) {
      this.walkTo(e.pos);
      this.attackRepath = ATTACK_REPATH_SECONDS;
    }
  }

  /** Muerte del jugador → derrota; ningún enemigo vivo → victoria. Una sola vez. */
  private checkOutcome(): void {
    const p = this.player;
    if (p.alive && p.health <= 0) {
      p.alive = false;
      p.path = [];
      p.moveTarget = null;
      p.casting = null;
      p.attackTarget = null;
      p.pickupTarget = null;
      this.stopFishing();
      this.events.push({ type: 'playerDeath' });
    }
    if (this.outcome !== 'playing') return;
    let next: Outcome = 'playing';
    if (!p.alive) next = 'defeat';
    else if (!this.population && !this.interior && this.enemies.list.length > 0 && this.enemies.aliveCount() === 0) next = 'victory';
    if (next === 'playing') return;
    this.outcome = next;
    this.endTime = this.time;
    this.events.push({ type: 'outcome', outcome: next });
  }

  // ─── Zonas ───────────────────────────────────────────────────────────────

  /** Mundo abierto: quita los cadáveres ya recompensados cuando dejan de verse. */
  private removeCorpses(): void {
    for (let i = this.enemies.list.length - 1; i >= 0; i--) {
      const e = this.enemies.list[i]!;
      if (e.state !== 'dead' || e.stateTime < e.def.corpseSeconds + 0.5) continue;
      if (!this.enemyActors.get(e.id)?.rewarded) continue;
      this.enemies.list.splice(i, 1);
      this.enemyActors.delete(e.id);
    }
  }

  /**
   * Anuncia la zona del jugador al entrar (suceso del mundo y aviso de la
   * sesión). Una zona nueva cuenta tras `zoneDwellSeconds` dentro, para que
   * andar por el borde no la anuncie una y otra vez.
   */
  private trackZone(dt: number): void {
    const z = this.zoneMap.zoneAt(this.player.pos);
    if (z === this.currentZone) {
      this.zoneCandidate = null;
      return;
    }
    if (z !== this.zoneCandidate) {
      this.zoneCandidate = z;
      this.zoneDwell = 0;
    }
    this.zoneDwell += dt;
    if (this.currentZone !== null && this.zoneDwell < this.data.zones.zoneDwellSeconds) return;
    this.currentZone = z;
    this.zoneCandidate = null;
    this.events.push({ type: 'zoneEnter', zoneId: z?.id ?? null });
    if (z) this.character.emit({ type: 'zoneEnter', zoneId: z.id, name: z.name, levelMin: z.levelMin, levelMax: z.levelMax, safe: z.safe });
  }

  // ─── Pesca (Slice 05) ──────────────────────────────────────────────────────

  /** Pesca en curso, o null. */
  fishing: FishingState | null = null;
  /** Lanzamiento pendiente: el jugador camina hacia la orilla. */
  private fishPending: { spotId: string; point: Vec2 } | null = null;

  /** Estanque que contiene ese punto (agua), o null. */
  fishingSpotAt(point: Vec2): FishingSpotDef | null {
    if (this.interior) return null;
    for (const s of Object.values(this.content.fishing.spots)) {
      if (Math.hypot(point.x - s.x, point.y - s.y) <= s.radius) return s;
    }
    return null;
  }

  /** Distancia del jugador a la orilla de un estanque (0 o menos = dentro). */
  private shoreDistance(s: FishingSpotDef): number {
    return Math.hypot(this.player.pos.x - s.x, this.player.pos.y - s.y) - s.radius;
  }

  /**
   * Clic en el agua o tecla F. Sin pesca en curso: lanza el sedal (acercándose
   * a la orilla si hace falta); con el sedal en el agua: lo saca (bien si ha
   * picado, mal si no). `point` null = el estanque más cercano a tiro.
   * Devuelve true si la orden era de pesca.
   */
  commandFish(point: Vec2 | null): boolean {
    const p = this.player;
    if (!p.alive) return false;
    if (this.fishing) {
      this.reel();
      return true;
    }
    if (this.interior) return false;
    const range = this.content.fishing.rules.castRange;
    let spot = point ? this.fishingSpotAt(point) : null;
    if (!point) {
      for (const s of Object.values(this.content.fishing.spots)) if (this.shoreDistance(s) <= range) spot = s;
    }
    if (!spot) return false;
    const target = point ?? { x: spot.x, y: spot.y };
    p.attackTarget = null;
    p.pickupTarget = null;
    p.casting = null;
    this.talkTarget = null;
    if (this.shoreDistance(spot) <= range) {
      this.startFishing(spot, target);
    } else {
      // Camina hasta la orilla del lado del jugador.
      const dx = p.pos.x - spot.x;
      const dy = p.pos.y - spot.y;
      const d = Math.hypot(dx, dy) || 1;
      this.walkTo({ x: spot.x + (dx / d) * (spot.radius + 1), y: spot.y + (dy / d) * (spot.radius + 1) });
      this.fishPending = { spotId: spot.id, point: target };
    }
    return true;
  }

  private startFishing(spot: FishingSpotDef, target: Vec2): void {
    const p = this.player;
    const r = this.content.fishing.rules;
    // El corcho cae dentro del agua, aunque el clic fuera junto a la orilla.
    let bx = target.x - spot.x;
    let by = target.y - spot.y;
    const bd = Math.hypot(bx, by);
    const maxR = spot.radius * 0.8;
    if (bd > maxR) {
      bx = (bx / bd) * maxR;
      by = (by / bd) * maxR;
    }
    const bobber = { x: spot.x + bx, y: spot.y + by };
    p.path = [];
    p.moveTarget = null;
    p.facing = Math.atan2(bobber.y - p.pos.y, bobber.x - p.pos.x);
    const wait = this.rng.range(r.biteSeconds.min, r.biteSeconds.max);
    const nibble = wait > 1.6 && this.rng.chance(r.nibbleChance) ? this.time + this.rng.range(0.8, wait - 0.8) : null;
    this.fishPending = null;
    this.fishing = { spotId: spot.id, bobber, state: 'waiting', biteAt: this.time + wait, nibbleAt: nibble, windowEnd: 0 };
    this.events.push({ type: 'fishCast', spotId: spot.id, x: bobber.x, y: bobber.y });
  }

  /** Sacar el sedal: premio si ha picado; si no, el pez se asusta. */
  private reel(): void {
    const f = this.fishing;
    if (!f) return;
    this.fishing = null;
    if (f.state !== 'bite') {
      this.events.push({ type: 'fishEscape', reason: 'early' });
      this.character.emit({ type: 'message', text: 'Tiraste demasiado pronto: el pez se asustó' });
      return;
    }
    const spot = this.content.fishing.spots[f.spotId];
    const table = spot ? this.content.lootTables[this.night && spot.nightLootTable ? spot.nightLootTable : spot.lootTable] : undefined;
    if (!table) return;
    const drop = rollLoot(this.rng, this.content, table);
    if (drop.gold > 0) this.character.addGold(drop.gold);
    let itemId: string | null = null;
    for (const it of drop.items) {
      itemId ??= it.itemId;
      const inst = this.character.items.create(it.itemId, it.quantity);
      const left = this.character.pickUp(inst);
      if (left > 0) this.dropLoot(this.player.pos, inst);
    }
    this.events.push({ type: 'fishCatch', itemId, gold: drop.gold });
    this.character.emit({ type: 'fished', itemId });
  }

  /** Recoge el sedal sin premio (moverse, atacar, lanzar, evadir, morir). */
  private stopFishing(): void {
    this.fishPending = null;
    if (!this.fishing) return;
    this.fishing = null;
    this.events.push({ type: 'fishStop' });
  }

  private tickFishing(): void {
    if (this.fishPending) {
      const spot = this.content.fishing.spots[this.fishPending.spotId];
      if (!spot || !this.player.alive) this.fishPending = null;
      else if (this.shoreDistance(spot) <= this.content.fishing.rules.castRange) this.startFishing(spot, this.fishPending.point);
      else if (this.player.path.length === 0) this.fishPending = null; // no llega a la orilla
    }
    const f = this.fishing;
    if (!f) return;
    if (f.state === 'waiting') {
      if (f.nibbleAt !== null && this.time >= f.nibbleAt) {
        f.nibbleAt = null;
        this.events.push({ type: 'fishNibble' });
      }
      if (this.time >= f.biteAt) {
        f.state = 'bite';
        f.windowEnd = this.time + this.content.fishing.rules.reactSeconds;
        this.events.push({ type: 'fishBite' });
        this.character.emit({ type: 'message', text: '¡Pica! Haz clic' });
      }
    } else if (this.time > f.windowEnd) {
      this.fishing = null;
      this.events.push({ type: 'fishEscape', reason: 'late' });
      this.character.emit({ type: 'message', text: 'Se escapó…' });
    }
  }

  tick(dt: number): void {
    const p = this.player;
    p.prevPos = copy(p.pos);
    this.tickPlayer(dt);
    if (p.path.length === 0) p.moveTarget = null;
    this.tickPending(dt);
    this.tickMissiles(dt);
    this.tickZones(dt);
    this.weather?.tick(dt, this.night);

    if (this.enemies.list.length > 0) {
      this.tickEnemyActors(dt);
      this.enemies.tick(dt, this.enemyCtx);
      const alive = this.enemies.list.filter((e) => e.state !== 'dead');
      separate(this.grid, this.enemyHash, alive, this.enemies.maxRadius(), p);
    }
    this.tickPets(dt);
    this.tickRewinds();
    this.rewardDeaths();
    if (this.interior) this.removeCorpses();
    if (this.population) {
      this.removeCorpses();
      this.population.tick(dt);
      this.trackZone(dt);
    }
    this.tickLoot(dt);
    this.tickFishing();
    this.checkOutcome();
    this.tickEncounter(dt);
    if (this.chasers.list.length > 0) {
      this.chasers.tick(dt, p);
      separate(this.grid, this.hash, this.chasers.list, this.data.loadTest.radius, p);
    }
    this.time += dt;
    this.tickCount++;
  }
}

/**
 * Etiqueta del golpe enemigo para sonido y efectos: `enemy:<arquetipo>:<hueco>`
 * (hueco = índice del hechizo o `basic`). El básico sin elemento propio queda
 * en null, como antes de que hubiera hechizos.
 */
function enemyTag(e: Enemy, at: EnemyAttackDef): string | null {
  const k = e.def.spells.indexOf(at);
  if (k >= 0) return `enemy:${e.def.id}:${k}`;
  return at.element ? `enemy:${e.def.id}:basic` : null;
}
