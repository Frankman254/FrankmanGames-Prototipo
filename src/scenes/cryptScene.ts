// Cambio de escena entre el mundo abierto y los pisos de la cripta. Al cruzar
// una puerta se construye un `World` nuevo (rejilla, enemigos) con el mismo
// personaje (inventario, nivel, vida y recurso) y se cambia lo que se dibuja:
// el terreno, la vegetación, el agua y los PNJ se ocultan; el piso se genera
// por semilla y el suelo pasa a ser un plano. `main.ts` sólo instala el mundo.
import type { AbstractMesh, TransformNode } from '@babylonjs/core';
import type { GameData } from '../data';
import type { DungeonDef } from '../data/dungeonSchema';
import type { ArenaView } from '../render/arenaView';
import { buildCryptEntrance, DungeonFloorView, pickEntrance, type DungeonFeature } from '../render/dungeonView';
import type { NpcView } from '../render/npcView';
import type { WaterView } from '../render/waterView';
import { rollLoot } from '../rpg/progression';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';
import { chestLootTable, entranceExit, floorGameData, floorTitle, generateFloor, type DungeonFloor } from '../world/dungeon';
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
}

interface Pending {
  feature: DungeonFeature;
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
  /** Mallas del mundo abierto que estaban activas al entrar (se reactivan al salir). */
  private hiddenOutdoor: AbstractMesh[] = [];
  private outdoorZoom = 0;

  constructor(private readonly host: CryptHost) {
    this.entrance = buildCryptEntrance(host.view.scene, host.def, host.ground);
  }

  get inside(): boolean {
    return this.floor !== null;
  }

  /**
   * Clic: si cae en la boca de la cripta, una escalera o un cofre, el jugador
   * va hacia allí y se usa al llegar. Devuelve true si se ha consumido el clic.
   */
  click(screenX: number, screenY: number): boolean {
    this.pending = null;
    let feature: DungeonFeature | null = null;
    let pos: Vec2 | null = null;
    if (this.floorView && this.floorData) {
      feature = this.floorView.pick(screenX, screenY);
      const f = this.floorData;
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
    this.host.world().commandMove(pos);
    return true;
  }

  /** Cada fotograma: usa la puerta o el cofre pendiente al llegar y anima las llamas. */
  update(dt: number): void {
    this.floorView?.update(dt);
    const p = this.pending;
    if (!p) return;
    const w = this.host.world();
    if (!w.player.alive) {
      this.pending = null;
      return;
    }
    const reach = p.feature.kind === 'entrance' ? this.host.def.entrance.reach : this.host.def.interactReach;
    if (Math.hypot(w.player.pos.x - p.pos.x, w.player.pos.y - p.pos.y) > reach) {
      // Si se ha parado lejos (otra orden, un golpe), se olvida.
      if (w.player.path.length === 0 && !w.player.evading) this.pending = null;
      return;
    }
    this.pending = null;
    w.player.path = [];
    switch (p.feature.kind) {
      case 'entrance':
        this.enter(0, 'above');
        break;
      case 'down':
        this.enter(this.floor! + 1, 'above');
        break;
      case 'up':
        if (this.floor === 0) this.leave();
        else this.enter(this.floor! - 1, 'below');
        break;
      case 'chest':
        this.openChest(p.feature.id, p.pos);
        break;
    }
  }

  /** Baja (o sube) al piso `index`; `from` dice por qué escalera se llega. */
  enter(index: number, from: 'above' | 'below'): void {
    const def = this.host.def;
    if (index < 0 || index >= def.floors.length) return;
    const f = generateFloor(def, index);
    const start = from === 'above' ? f.arrivalFromAbove : f.arrivalFromBelow;
    const w = this.carryOver((ch) => new World(floorGameData(this.host.data, f, start), { seed: this.host.nextSeed(), encounter: false, interior: true, character: ch }));
    for (const s of f.spawns) w.spawnEnemy(s.archetype, s.pos, s.level);
    this.showFloor(f);
    this.host.install(w);
    this.host.view.rig.jumpTo(def.camera.distance);
    w.character.emit({ type: 'zoneEnter', zoneId: `crypt-${index + 1}`, name: floorTitle(def, index), levelMin: f.def.levelMin, levelMax: f.def.levelMax, safe: false });
  }

  /** Vuelve al mundo abierto delante de la boca de la cripta. */
  leave(): void {
    if (!this.inside) return;
    const data = this.host.data;
    const start = entranceExit(this.host.def);
    const w = this.carryOver((ch) => new World({ ...data, zone: { ...data.zone, playerStart: start } }, { seed: this.host.nextSeed(), zones: true, character: ch }));
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

  private showFloor(f: DungeonFloor): void {
    const v = this.host.view;
    if (!this.inside) {
      this.outdoorZoom = v.rig.zoom;
      const outdoor: AbstractMesh[] = [v.ground, ...v.vegetation.meshes, ...this.entrance.getChildMeshes()];
      this.hiddenOutdoor = outdoor.filter((m) => m.isEnabled(false));
      for (const m of this.hiddenOutdoor) m.setEnabled(false);
      this.host.water.setVisible(false);
      this.host.npcs.setVisible(false);
    }
    this.floorView?.dispose();
    this.floor = f.index;
    this.floorData = f;
    this.floorView = new DungeonFloorView(v.scene, this.host.def, f, this.opened);
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
    this.floor = null;
    for (const m of this.hiddenOutdoor) m.setEnabled(true);
    this.hiddenOutdoor = [];
    this.host.water.setVisible(true);
    this.host.npcs.setVisible(true);
    this.host.ground.flatHeight = null;
    v.atmosphere.setInterior(null);
    v.rig.blockers = v.vegetation.solids;
    v.rig.blockerMode = 'ray';
    v.rig.distanceCap = null;
  }
}
