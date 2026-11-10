// Cambio de escena entre el mundo abierto y los pisos de la cripta. Al cruzar
// una puerta se construye un `World` nuevo (rejilla, enemigos) con el mismo
// personaje (inventario, nivel, vida y recurso) y se cambia lo que se dibuja:
// el terreno, la vegetación, el agua y los PNJ se ocultan; el piso se genera
// por semilla y el suelo pasa a ser un plano. `main.ts` sólo instala el mundo.
import type { TransformNode } from '@babylonjs/core';
import { goldOutline } from '../render/interactOutline';
import type { GameData } from '../data';
import type { DungeonDef } from '../data/dungeonSchema';
import type { ArenaView } from '../render/arenaView';
import { buildCryptEntrance, DungeonFloorView, pickEntrance, type DungeonFeature } from '../render/dungeonView';
import type { NpcView } from '../render/npcView';
import type { WaterView } from '../render/waterView';
import { rollLoot } from '../rpg/progression';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';
import { applyDoors, breakableLootTable, chestLootTable, doorApproach, entranceExit, floorGameData, floorTitle, generateFloor, inRoom, useDungeonKey, type DungeonFloor } from '../world/dungeon';
import type { SwitchableHeightField } from '../world/switchableGround';

export interface CryptHost {
  data: GameData;
  def: DungeonDef;
  view: ArenaView;
  ground: SwitchableHeightField;
  water: WaterView;
  npcs: NpcView;
  /** Mundo en curso (lo lleva `main`). */
  world(): World;
  /** Sustituye el mundo en curso (sesión, vistas y reloj). */
  install(world: World): void;
  /** Semilla para el próximo mundo. */
  nextSeed(): number;
  /** Tapa el cambio de piso con la pantalla de carga (sin ella, se hace en el acto). */
  loading?(text: { kicker: string; title: string; sub?: string }, work: () => void): void;
}

interface Pending {
  feature: DungeonFeature;
  /** Lo que se usa al llegar (la distancia se mide hasta aquí). */
  pos: Vec2;
}

export class CryptScene {
  /** Piso actual (0 = el primero) o null en el mundo abierto. */
  floor: number | null = null;
  private floorData: DungeonFloor | null = null;
  private floorView: DungeonFloorView | null = null;
  private readonly entrance: TransformNode;
  private pending: Pending | null = null;
  /** Cofres ya abiertos en esta partida («piso:sala»). */
  private readonly opened = new Set<string>();
  /** Puertas abiertas y jarras o barriles rotos en esta partida. */
  private readonly openedDoors = new Set<string>();
  private readonly broken = new Set<string>();
  /** Emboscadas que ya han salido en esta visita al piso. */
  private readonly sprung = new Set<string>();
  /** Rejilla del piso sin puertas: al abrir una se rehace desde aquí. */
  private baseBlocked: Uint8Array | null = null;
  /** Mallas del mundo abierto que estaban activas al entrar (se reactivan al salir). */
  private hiddenOutdoor: TransformNode[] = [];
  private outdoorZoom = 0;

  constructor(private readonly host: CryptHost) {
    this.entrance = buildCryptEntrance(host.view.scene, host.def, host.ground);
    for (const m of this.entrance.getChildMeshes()) goldOutline(m, 0.04);
  }

  get inside(): boolean {
    return this.floor !== null;
  }

  /** El piso actual contiene un guardián, aunque todavía esté fuera de cámara. */
  get guardianFloor(): boolean {
    return this.floorData?.spawns.some((spawn) => spawn.guardian) ?? false;
  }

  /** Nombre y franja del piso actual, para la información de arriba (null fuera). */
  get place(): { name: string; levelMin: number; levelMax: number } | null {
    if (this.floor === null || !this.floorData) return null;
    return { name: floorTitle(this.host.def, this.floor), levelMin: this.floorData.def.levelMin, levelMax: this.floorData.def.levelMax };
  }

  /**
   * Clic: si cae en la boca de la cripta, una escalera o un cofre, el jugador
   * va hacia allí y se usa al llegar. Devuelve true si se ha consumido el clic.
   */
  click(screenX: number, screenY: number): boolean {
    if (this.host.world().character.spectral.active) return false;
    this.pending = null;
    let feature: DungeonFeature | null = null;
    let pos: Vec2 | null = null;
    let walk: Vec2 | null = null;
    if (this.floorView && this.floorData) {
      feature = this.floorView.pick(screenX, screenY);
      const f = this.floorData;
      const w = this.host.world();
      if (feature?.kind === 'pool') return w.commandFish({ x: feature.x, y: feature.y });
      if (feature?.kind === 'door') {
        const id = feature.id;
        const d = f.doors.find((x) => x.id === id);
        if (!d || this.openedDoors.has(id)) return false; // abierta: se camina a través
        pos = { x: d.x, y: d.y };
        walk = doorApproach(d, f.tileSize, w.player.pos);
      } else if (feature?.kind === 'breakable') {
        const id = feature.id;
        if (this.broken.has(id)) return false;
        pos = f.breakables.find((b) => b.id === id)?.pos ?? null;
      }
      if (feature?.kind === 'up') pos = f.upStairs;
      else if (feature?.kind === 'down') pos = f.downStairs;
      else if (feature?.kind === 'chest') {
        const id = feature.id;
        pos = f.chests.find((c) => c.id === id)?.pos ?? null;
        if (this.opened.has(id)) return true; // abierto: no hace nada, pero el clic no atraviesa
      }
    } else if (pickEntrance(this.host.view.scene, this.entrance, screenX, screenY)) {
      feature = { kind: 'entrance' };
      pos = { x: this.host.def.entrance.x, y: this.host.def.entrance.y };
    }
    if (!feature || !pos) return false;
    this.pending = { feature, pos };
    this.host.world().commandMove(walk ?? pos);
    return true;
  }

  /** Cada fotograma: usa la puerta o el cofre pendiente al llegar y anima las llamas. */
  update(dt: number): void {
    this.floorView?.update(dt);
    this.checkAmbushes();
    const p = this.pending;
    if (!p) return;
    const w = this.host.world();
    if (!w.player.alive || w.character.spectral.active) {
      this.pending = null;
      return;
    }
    const reach = p.feature.kind === 'entrance' ? this.host.def.entrance.reach : this.host.def.interactReach;
    if (Math.hypot(w.player.pos.x - p.pos.x, w.player.pos.y - p.pos.y) > reach) {
      // Si se ha parado lejos (otra orden, un golpe), se olvida.
      if (w.player.path.length === 0) this.pending = null;
      return;
    }
    this.pending = null;
    w.player.path = [];
    switch (p.feature.kind) {
      case 'entrance': {
        // La reja pide llave (data/dungeon.json, key); sin ella, aviso claro y no se entra.
        const ch = w.character;
        const key = this.host.def.key;
        const res = useDungeonKey(this.host.def, ch.inventory, key ? (w.content.items[key.itemId]?.name ?? key.itemId) : '');
        if (res.message) ch.emit({ type: 'message', text: res.message });
        if (res.ok) this.veil('Entrando en', 0, () => this.enter(0, 'above'));
        break;
      }
      case 'down': {
        const to = this.floor! + 1;
        this.veil('Bajando a', to, () => this.enter(to, 'above'));
        break;
      }
      case 'up':
        if (this.floor === 0) this.veil('Volviendo a', null, () => this.leave());
        else {
          const to = this.floor! - 1;
          this.veil('Subiendo a', to, () => this.enter(to, 'below'));
        }
        break;
      case 'chest':
        this.openChest(p.feature.id, p.pos);
        break;
      case 'door':
        this.openDoor(p.feature.id);
        break;
      case 'breakable':
        this.smash(p.feature.id, p.pos);
        break;
    }
  }

  /**
   * Baja (o sube) al piso `index`; `from` dice por qué escalera se llega. Con
   * `at` (al cargar un guardado) aparece en ese punto del piso, o en la
   * casilla caminable más cercana. Devuelve false si el piso no existe.
   */
  enter(index: number, from: 'above' | 'below', at?: Vec2): boolean {
    if (this.host.world().character.spectral.active) return false;
    const def = this.host.def;
    if (index < 0 || index >= def.floors.length) return false;
    const f = generateFloor(def, index);
    const arrival = from === 'above' ? f.arrivalFromAbove : f.arrivalFromBelow;
    const inside = at && at.x >= 0 && at.y >= 0 && at.x <= f.width && at.y <= f.depth;
    const start = inside ? at : arrival;
    const w = this.carryOver((ch) => new World(floorGameData(this.host.data, f, start), { seed: this.host.nextSeed(), encounter: false, interior: true, character: ch, pools: f.pools }));
    for (const s of f.spawns) w.spawnEnemy(s.archetype, s.pos, s.level);
    this.sprung.clear();
    this.baseBlocked = w.grid.blocked.slice();
    this.stampDoors(w, f);
    this.showFloor(f);
    this.host.install(w);
    this.host.view.rig.jumpTo(def.camera.distance);
    w.character.emit({ type: 'zoneEnter', zoneId: `crypt-${index + 1}`, name: floorTitle(def, index), levelMin: f.def.levelMin, levelMax: f.def.levelMax, safe: false });
    return true;
  }

  /** Cambio de piso tapado por la pantalla de carga; `index` null = salida a la superficie. */
  private veil(kicker: string, index: number | null, work: () => void): void {
    const def = this.host.def;
    const f = index === null ? null : def.floors[index];
    if (!this.host.loading || (index !== null && !f)) {
      work();
      return;
    }
    const text = index === null
      ? { kicker, title: 'La superficie' }
      : { kicker, title: floorTitle(def, index), sub: f ? `Nivel ${f.levelMin}–${f.levelMax}` : undefined };
    this.host.loading(text, work);
  }

  /** Vuelve al mundo abierto delante de la boca de la cripta. */
  leave(): void {
    if (!this.inside) return;
    const data = this.host.data;
    const start = entranceExit(this.host.def);
    const w = this.carryOver((ch) => new World({ ...data, zone: { ...data.zone, playerStart: start } }, { seed: this.host.nextSeed(), zones: true, character: ch, timeOfDay: this.host.world().timeOfDay }));
    this.showOutdoor();
    this.host.install(w);
    this.host.view.rig.jumpTo(this.outdoorZoom);
  }

  /**
   * Mundo nuevo creado por `main` (reinicio o partida nueva): vuelve a dibujar
   * el mundo abierto sin construir otro `World`.
   */
  reset(): void {
    this.pending = null;
    if (this.inside) {
      this.showOutdoor();
      this.host.view.rig.jumpTo(this.outdoorZoom);
    }
  }

  /** Crea el mundo siguiente conservando la vida y el recurso (el constructor los llena). */
  private carryOver(make: (ch: World['character']) => World): World {
    const ch = this.host.world().character;
    const health = ch.health;
    const resource = ch.resource;
    const w = make(ch);
    ch.health = Math.min(health, ch.maxHealth);
    ch.resource = Math.min(resource, ch.maxResource);
    return w;
  }

  private openChest(id: string, at: Vec2): void {
    if (this.host.world().character.spectral.active) return;
    if (this.opened.has(id) || this.floor === null) return;
    const w = this.host.world();
    const base = w.content.lootTables[this.floorData!.def.chestTable];
    if (!base) return;
    this.opened.add(id);
    this.floorView?.setOpened(id);
    const drop = rollLoot(w.rng, w.content, chestLootTable(base, this.floor, this.host.def.chest));
    if (drop.gold > 0) w.dropLoot(at, null, drop.gold);
    for (const it of drop.items) w.dropLoot(at, w.character.items.create(it.itemId, it.quantity));
  }

  /** Rejilla del piso con las puertas cerradas tapando su hueco. */
  private stampDoors(w: World, f: DungeonFloor): void {
    if (!this.baseBlocked) return;
    applyDoors(w.grid, this.baseBlocked, f, this.openedDoors, this.host.data.zone.navRadius);
  }

  private openDoor(id: string): void {
    const f = this.floorData;
    if (!f || this.openedDoors.has(id)) return;
    this.openedDoors.add(id);
    this.floorView?.setDoorOpen(id, true);
    this.stampDoors(this.host.world(), f);
  }

  /** Rompe una jarra o un barril: unas monedas, a veces un objeto y, de vez en cuando, un bicho. */
  private smash(id: string, at: Vec2): void {
    const f = this.floorData;
    const w = this.host.world();
    if (!f || this.floor === null || this.broken.has(id) || w.character.spectral.active) return;
    this.broken.add(id);
    const kind = f.breakables.find((b) => b.id === id)?.kind ?? 'jar';
    this.floorView?.setBroken(id);
    const base = w.content.lootTables[f.def.chestTable];
    if (base) {
      const drop = rollLoot(w.rng, w.content, breakableLootTable(base, this.floor, this.host.def));
      if (drop.gold > 0) w.dropLoot(at, null, drop.gold);
      for (const it of drop.items) w.dropLoot(at, w.character.items.create(it.itemId, it.quantity));
    }
    if (w.rng.chance(this.host.def.breakable.monsterChance)) {
      const list = f.def.spawns;
      const total = list.reduce((a, s) => a + s.weight, 0);
      let x = w.rng.next() * total;
      const s = list.find((e) => (x -= e.weight) < 0) ?? list[list.length - 1]!;
      w.spawnEnemy(s.archetype, at, w.rng.int(f.def.levelMin, f.def.levelMax) + s.levelBonus);
      w.character.emit({ type: 'message', text: kind === 'jar' ? '¡Algo sale reptando de la jarra rota!' : '¡Algo salta del barril reventado!' });
    }
  }

  /** Al pisar una sala con emboscada, salen sus bichos (una vez por visita). */
  private checkAmbushes(): void {
    const f = this.floorData;
    if (!f || f.ambushes.length === 0) return;
    const w = this.host.world();
    if (!w.player.alive) return;
    for (const a of f.ambushes) {
      if (this.sprung.has(a.id) || !inRoom(f.rooms[a.room]!, f.tileSize, w.player.pos)) continue;
      this.sprung.add(a.id);
      for (const s of a.spawns) w.spawnEnemy(s.archetype, s.pos, s.level);
      w.character.emit({ type: 'message', text: '¡Emboscada! Algo se arrastra fuera de las sombras.' });
    }
  }

  private showFloor(f: DungeonFloor): void {
    const v = this.host.view;
    if (!this.inside) {
      this.outdoorZoom = v.rig.zoom;
      const outdoor: TransformNode[] = [v.ground, ...this.entrance.getChildMeshes()];
      this.hiddenOutdoor = outdoor.filter((m) => m.isEnabled(false));
      for (const m of this.hiddenOutdoor) m.setEnabled(false);
      v.vegetation.setVisible(false);
      v.ambient.setVisible(false);
      this.host.water.setVisible(false);
      this.host.npcs.setVisible(false);
    }
    this.floorView?.dispose();
    this.floor = f.index;
    this.floorData = f;
    this.floorView = new DungeonFloorView(v.scene, this.host.def, f, this.opened, this.openedDoors, this.broken);
    this.host.ground.flatHeight = 0;
    v.atmosphere.setInterior(this.host.def.light, this.floorView.lamps);
    v.rig.blockers = this.floorView.blockers;
    v.rig.blockerMode = 'inside';
    v.rig.distanceCap = this.host.def.camera.maxDistance;
  }

  private showOutdoor(): void {
    const v = this.host.view;
    this.floorView?.dispose();
    this.floorView = null;
    this.floorData = null;
    this.baseBlocked = null;
    this.floor = null;
    for (const m of this.hiddenOutdoor) m.setEnabled(true);
    this.hiddenOutdoor = [];
    v.vegetation.setVisible(true);
    v.ambient.setVisible(true);
    this.host.water.setVisible(true);
    this.host.npcs.setVisible(true);
    this.host.ground.flatHeight = null;
    v.atmosphere.setInterior(null);
    v.rig.blockers = v.vegetation.solids;
    v.rig.blockerMode = 'ray';
    v.rig.distanceCap = null;
  }
}
