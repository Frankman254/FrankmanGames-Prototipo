// Aplicación en caliente de lo que guarda el modo edición (2026-11-11): el
// editor escribe los JSON y, en vez de esperar la recarga de Vite (que costaba
// la partida en curso), pasa por aquí para que el mundo en pantalla se
// actualice al momento: posición, inventario y escena se quedan donde estaban.
//
// Por qué así: los datos del mundo llegan COMPILADOS e importados; los módulos
// `data/*` no cambian nunca en caliente. Lo que se sustituye son las COPIAS
// VIVAS — la forma del mundo (`Overworld`), la simulación (`World`, `GameData`)
// y las vistas —, que admiten reconstrucción parcial. El terreno regenera las
// páginas que tocan lo cambiado (a los hilos; sólo la del jugador, aquí mismo)
// y después `refreshFixed` devuelve al paso los datos fijos — obstáculos de
// parcela, agua de pesca y pintado —, que la generación no conoce.
import { rpgRawFiles } from '../data';
import { parseNavPaint, parseTerrain, parseVegetation } from '../data/worldSchema';
import { parseZones } from '../data/zonesSchema';
import { parseRpgContent } from '../rpg/content';
import type { RpgRawFiles } from '../rpg/content';
import { housePlacement, naturePlacement } from '../render/landmarkView';
import type { GatherView } from '../render/gatherView';
import type { LandmarkView } from '../render/landmarkView';
import type { NpcView } from '../render/npcView';
import type { ResurrectorView } from '../render/resurrectorView';
import type { VegetationView } from '../render/vegetationView';
import type { WaterView } from '../render/waterView';
import { refreshWorldObstacles, type Overworld } from '../world/overworld';
import { diffApplied } from './hotDiff';
import type { GameData } from '../data';
import type { RectObstacle } from '../sim/navGrid';
import type { World } from '../sim/world';
import type { FileId } from './doc';

export interface ApplyHost {
  data: GameData;
  overworld: Overworld;
  world: World;
  views: {
    water: WaterView;
    npcs: NpcView;
    gather: GatherView;
    landmarks: LandmarkView;
    resurrector: ResurrectorView;
    vegetation: VegetationView;
  };
  /** Piedras y lanchas nuevas (`stones.json`): `main.ts` rehace su estado y su vista. */
  applyStones(raw: unknown): void;
  /** Minimapa y mapa grande con los datos nuevos. */
  refreshMap(): void;
  /** Cajas sólidas extra (monumentos, banco) sobre las mallas rehechas. */
  refreshPropSolids(): void;
  /** Obstáculos fijos que no salen de los JSON (la fachada del banco). */
  extraObstacles(): readonly RectObstacle[];
  /** Las puertas de las casas siguen a sus props. */
  refreshHouses(): void;
}

const json = (text: string | undefined): Record<string, unknown> => (text ? (JSON.parse(text) as Record<string, unknown>) : {});
const EVERYWHERE = { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 };

/**
 * Aplica en caliente los archivos escritos (`files`). `before` es el texto que
 * estaba en disco antes de guardar (para saber qué geometría se fue) y `after`
 * el nuevo. Devuelve el resumen para la línea de estado del panel.
 */
export function applyHotEdits(host: ApplyHost, files: readonly FileId[], before: Partial<Record<FileId, string>>, after: Partial<Record<FileId, string>>): string {
  const { data, overworld: ow, world } = host;
  const z = data.zone;
  const touched = new Set(files);
  const done: string[] = [];

  // — Terreno. Se copia EN SITIO sobre `ow.def`: las alturas del editor y el
  // WaterView leen ese mismo objeto; los hilos reciben su copia al invalidar.
  if (touched.has('terrain')) {
    Object.assign(ow.def, parseTerrain(json(after['terrain'])));
    // `data.zone` copió al arrancar `paths` y `playerStart`: se vuelven a enlazar.
    z.paths = ow.def.paths;
    z.playerStart = ow.def.playerStart;
    done.push('terreno');
  }

  // — Vegetación. `ow.vegetation` se rellena EN SITIO (lo comparten el contexto
  // de las páginas y la vista). La dispersión de la parcela (mapa y obstáculos)
  // se rehace con las alturas de las páginas que hay ahora mismo.
  if (touched.has('vegetation')) {
    Object.assign(ow.vegetation, parseVegetation(json(after['vegetation'])));
    done.push('props');
  }

  // — Pintado de paso.
  if (touched.has('navpaint')) {
    try {
      ow.navPaint = parseNavPaint(json(after['navpaint']));
      z.navPaint = ow.navPaint;
      done.push('pintado');
    } catch {
      // Documento inválido: `validate` ya lo dijo al guardar; se queda el viejo.
    }
  }

  // — Zonas: niveles y clima. La identidad de `data.zones` (y de su arreglo) se
  // conserva: los menús y la población lo guardaron por referencia.
  if (touched.has('zones')) {
    const fresh = parseZones(json(after['zones']), data.enemies.archetypes);
    const oldIds = new Set(data.zones.zones.map((s) => s.id));
    const newIds = new Set(fresh.zones.map((s) => s.id));
    const { zones, ...rest } = fresh;
    Object.assign(data.zones, rest);
    data.zones.zones.length = 0;
    data.zones.zones.push(...zones);
    for (const id of oldIds) if (!newIds.has(id)) world.despawnZoneMonsters(id);
    world.applyZones(data.zones);
    done.push('zonas');
  }

  // — Contenido RPG: PNJ, mercaderes, talleres, altares y pesca. Se reconstruye
  // desde los archivos crudos con la misma validación del arranque. `after`
  // lleva el ESTADO COMPLETO aplicado (no sólo lo sucio): si no, esta
  // reconstrucción leería el JSON compilado y perdería cambios de guardados
  // anteriores que no se repitieron ahora.
  if (['npcs', 'merchants', 'professions', 'death', 'fishing'].some((f) => touched.has(f as FileId))) {
    const raw = { ...rpgRawFiles() } as RpgRawFiles;
    const read = (file: FileId, key: 'npcs' | 'merchants' | 'professions' | 'spectral' | 'fishing'): void => {
      if (after[file] !== undefined) raw[key] = json(after[file]) as never;
    };
    read('npcs', 'npcs');
    read('merchants', 'merchants');
    read('professions', 'professions');
    read('death', 'spectral');
    read('fishing', 'fishing');
    Object.assign(data.rpg, parseRpgContent(raw, Object.keys(data.enemies.archetypes)));
    world.applyRpgContent();
    host.views.npcs.setDefs({ ...data.rpg.merchants, ...data.rpg.npcs });
    host.views.gather.setDefs(data.rpg.professions);
    host.views.gather.resetNodes();
    host.views.resurrector.reset();
    if (touched.has('fishing')) {
      host.views.water.clearShoalMarks();
      done.push('pesca');
    }
    done.push('contenido');
  }

  // — Regeneración: sólo donde cambió la geometría (estanques, props, piedras,
  // agua de pesca, pintado). La página del jugador se rellena aquí mismo para
  // no dejarla sin suelo; el resto la piden los hilos en los fotogramas
  // siguientes, tapados por el velo que puso el editor.
  const { rect } = diffApplied(before, after);
  if (touched.has('vegetation')) {
    refreshWorldObstacles(ow, host.extraObstacles());
    host.refreshHouses();
  }
  if (rect) {
    ow.stream.invalidateRect(rect.x0, rect.z0, rect.x1, rect.z1);
    const p = world.player.pos;
    ow.stream.ensure(p.x, p.y, p.x + 0.001, p.y + 0.001);
    // Datos fijos sobre las páginas nuevas (la generación no los conoce):
    // obstáculos de parcela, agua de pesca y pintado.
    ow.grid.refreshFixed(ow.obstacles, ow.navPaint, Object.values(world.fishingSpots), EVERYWHERE);
    host.views.water.rebuildPonds();
    done.push('mundo rehecho');
  } else if (touched.has('fishing')) {
    ow.grid.refreshFixed(ow.obstacles, ow.navPaint, Object.values(world.fishingSpots), EVERYWHERE);
  }

  // — Piedras y lanchas: su estado vive en `main.ts` (viaje, regreso, llegadas).
  // Después de la rejilla: sus posiciones se resuelven sobre la nueva.
  if (touched.has('stones')) {
    host.applyStones(json(after['stones']));
    done.push('piedras');
  }

  // — Vistas ligadas a las mallas de vegetación.
  if (touched.has('vegetation')) {
    const props = ow.vegetation.props;
    const landmarks = props.filter((p) => p.kind === 'landmark' && p.model);
    void host.views.landmarks.setDefs([
      ...landmarks.map((p) => {
        const afloat = ow.def.structures.afloat[p.model!];
        return { model: p.model!, x: p.x, y: p.y, rotDeg: p.rotDeg, ...(afloat ? { afloat: afloat.draft } : {}) };
      }),
      ...props.filter((p) => p.kind === 'house').map(housePlacement),
      ...props.filter((p) => p.kind === 'lamp').map((p) => ({ model: 'farola', x: p.x, y: p.y, rotDeg: p.rotDeg })),
      ...props.filter((p): p is typeof p & { kind: 'log' | 'boulder' } => p.kind === 'log' || p.kind === 'boulder').map(naturePlacement),
    ]);
    host.views.vegetation.refreshProps();
    host.refreshPropSolids();
  }

  host.refreshMap();
  return done.length ? `aplicado: ${done.join(', ')}` : 'nada que aplicar';
}
