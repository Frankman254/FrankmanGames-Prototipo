// Del mundo y la sesión a lo que piden los mapas. `main.ts` sólo llama a
// `buildMapWorld` una vez y a `buildMapFrame` cada fotograma.
import type { ZonesDef } from '../../data/zonesSchema';
import type { GameSession } from '../../rpg/session';
import { bandLabel, levelColor } from '../../sim/zones';
import type { World } from '../../sim/world';
import type { Overworld } from '../../world/overworld';
import { HeightField } from '../../world/terrain';
import { MAP_DEF } from './mapData';
import { questTarget } from './mapLogic';
import { buildMapImage, type MapImage } from './mapImage';
import type { MapFrame, MapStone, MapWorld } from './mapState';

export function buildMapWorld(ow: Overworld, zones: ZonesDef, coords: (x: number, y: number) => [number, number]): MapWorld {
  // Copia del relieve: el suelo compartido pasa a ser plano dentro de las mazmorras.
  const g = ow.heights;
  const heights = new HeightField(g.width, g.depth, g.step, g.heights);
  let image: MapImage | null = null;
  const trees: { x: number; y: number; r: number }[] = [];
  for (const kind of ['pine', 'oak']) for (const t of ow.scatter.byKind.get(kind) ?? []) trees.push({ x: t.x, y: t.z, r: 1.6 * t.scale });
  return {
    width: ow.def.width,
    depth: ow.def.depth,
    image: () =>
      (image ??= buildMapImage({
        terrain: ow.def,
        heights,
        props: ow.vegetation.props,
        trees,
        villages: zones.zones.filter((z) => z.safe).flatMap((z) => z.areas),
        pixelsPerMeter: MAP_DEF.pixelsPerMeter,
        colors: MAP_DEF.colors,
      })),
    zones: zones.zones.map((z) => ({ id: z.id, name: z.name, band: bandLabel(z), safe: z.safe, areas: z.areas })),
    coords,
    waters: ow.def.ponds.map((p) => ({ x: p.x, y: p.y })),
  };
}

export interface MapFrameInput {
  world: World;
  session: GameSession;
  cameraYawDeg: number;
  inside: string | null;
  zones: ZonesDef;
  waters: readonly { x: number; y: number }[];
  /** Nombres de PNJ y mercaderes. */
  names: Readonly<Record<string, { name: string } | undefined>>;
  stones: readonly MapStone[];
}

export function buildMapFrame(i: MapFrameInput): MapFrame {
  const w = i.world;
  const lvl = w.character.level;
  const npcPos = (id: string): { x: number; y: number } | null => {
    const n = w.npcs.find((x) => x.npcId === id);
    return n ? { x: n.pos.x, y: n.pos.y } : null;
  };
  const q = i.session.trackedQuest?.() ?? null;
  return {
    player: { x: w.player.pos.x, y: w.player.pos.y },
    cameraYaw: (i.cameraYawDeg * Math.PI) / 180,
    inside: i.inside,
    enemies: w.enemies.list.filter((e) => e.state !== 'dead').map((e) => ({ x: e.pos.x, y: e.pos.y, color: levelColor(e.level - lvl, i.zones.levelColors) })),
    npcs: w.npcs.map((n) => ({
      id: n.npcId,
      name: i.names[n.npcId]?.name ?? n.npcId,
      merchant: n.merchantId !== null,
      x: n.pos.x,
      y: n.pos.y,
      marker: i.session.npcMarker?.(n.npcId) ?? null,
    })),
    loot: w.loot.map((l) => ({ x: l.pos.x, y: l.pos.y })),
    stones: i.stones.map((s) => ({ ...s })),
    quest: questTarget(q, q ? w.content.quests?.[q.id] : undefined, npcPos, i.waters, w.player.pos),
  };
}
