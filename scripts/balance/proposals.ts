// «Ajustes propuestos»: cambios de números concretos que se aplican a una COPIA
// de los JSON en memoria (`rawData()`), nunca a `data/`. Cada ajuste dice qué
// cambia, de cuánto a cuánto y por qué; el informe vuelve a simular con ellos.
import type { Json, RawData } from './data';

export interface Change {
  file: string;
  path: string;
  from: unknown;
  to: unknown;
}

export interface Proposal {
  id: string;
  title: string;
  why: string;
  apply(raw: RawData): Change[];
}

/** Cambia `obj[path]` (ruta con puntos y [i]) y apunta el cambio (si de verdad cambia). */
function set(file: string, root: Json, path: string, to: unknown, out: Change[]): void {
  const keys = path.split('.').flatMap((k) => k.split(/\[(\d+)\]/).filter((x) => x !== ''));
  let o: Json = root;
  for (const k of keys.slice(0, -1)) {
    o = o[k];
    if (o === undefined) throw new Error(`ruta inexistente en ${file}: ${path}`);
  }
  const last = keys[keys.length - 1]!;
  if (!(last in o)) throw new Error(`ruta inexistente en ${file}: ${path}`);
  if (JSON.stringify(o[last]) === JSON.stringify(to)) return;
  out.push({ file, path, from: structuredClone(o[last]), to });
  o[last] = to;
}

/** Índice del modificador `stat` en una lista de modificadores. */
function modIndex(list: Json[], stat: string): number {
  const i = list.findIndex((m) => m.stat === stat);
  if (i < 0) throw new Error(`sin modificador ${stat}`);
  return i;
}

export const PROPOSALS: Proposal[] = [
  {
    id: 'armadura',
    title: 'Menos armadura plana',
    why:
      'Con la armadura de rendimiento decreciente (master, armorHalf = 20) ya no hay golpes en 1, pero la Vanguardia sigue acumulando ~12 de armadura (×0,62 al daño físico). ' +
      'Se recorta la armadura de las fuentes que se acumulan. (La subida de daño de los enemigos, antes «amenaza», ya se aplicó en data/.)',
    apply(raw) {
      const c: Change[] = [];
      set('rpg/classes.json', raw.rpg.classes, 'classes.ember_vanguard.baseStats.armor', 1, c);
      const st = raw.rpg.statuses.statuses;
      set('rpg/statuses.json', raw.rpg.statuses, `statuses.iron_shout.modifiers[${modIndex(st.iron_shout.modifiers, 'armor')}].value`, 2, c);
      set('rpg/statuses.json', raw.rpg.statuses, `statuses.stone_skin.modifiers[${modIndex(st.stone_skin.modifiers, 'armor')}].value`, 3, c);
      const it = raw.rpg.items.items;
      set('rpg/items.json', raw.rpg.items, `items.oak_buckler.implicit[${modIndex(it.oak_buckler.implicit, 'armor')}].value`, 2, c);
      set('rpg/pets.json', raw.rpg.pets, `pets.moss_turtle.ownerBonus[${modIndex(raw.rpg.pets.pets.moss_turtle.ownerBonus, 'armor')}].value`, 2, c);
      return c;
    },
  },
  {
    id: 'recurso',
    title: 'Recurso más justo',
    why:
      'Casi nunca hay un hechizo listo que no se pueda pagar: manda el enfriamiento, no el recurso. Los combates duran menos de 20 s y empiezan con el recurso lleno, ' +
      'así que el máximo pesa más que la regeneración: el Maná (140) alcanza para casi todo un combate. Se baja el máximo de Maná y la regeneración de las dos clases ' +
      'para que elegir qué lanzar (DEC-2026-004: recurso + enfriamientos) importe.',
    apply(raw) {
      const c: Change[] = [];
      set('rpg/classes.json', raw.rpg.classes, 'classes.ember_vanguard.resource.regenPerSecond', 6, c);
      set('rpg/classes.json', raw.rpg.classes, 'classes.storm_weaver.resource.max', 90, c);
      set('rpg/classes.json', raw.rpg.classes, 'classes.storm_weaver.resource.regenPerSecond', 4, c);
      return c;
    },
  },
  {
    id: 'hechizos',
    title: 'Baluarte y Paso del relámpago, más útiles',
    why:
      'Quitar el Baluarte de la barra apenas se nota (con tanta armadura el escudo absorbe unos pocos puntos por combate) y el Paso del relámpago casi no se usa. ' +
      'Más escudo con menos enfriamiento, y el paso más barato y frecuente para que compita con andar.',
    apply(raw) {
      const c: Change[] = [];
      const sp = raw.rpg.spells.spells;
      set('rpg/spells.json', raw.rpg.spells, `spells.bulwark.effects[${sp.bulwark.effects.findIndex((e: Json) => e.type === 'shield')}].amount`, 55, c);
      set('rpg/spells.json', raw.rpg.spells, 'spells.bulwark.cooldown', 14, c);
      set('rpg/spells.json', raw.rpg.spells, 'spells.lightning_step.resourceCost', 10, c);
      set('rpg/spells.json', raw.rpg.spells, 'spells.lightning_step.cooldown', 5, c);
      return c;
    },
  },
  {
    id: 'xp',
    title: 'Curva de XP más lenta al principio',
    why:
      'Con base 50 el nivel 2 llega en mitad del primer combate (y subir de nivel cura del todo), el 5 a los ~3 min y el 10 a los ~18 min repitiendo la arena. ' +
      'Con base 120 el primer nivel cuesta una arena entera y la curva conserva la forma (exponente 1,5). Cuántas horas debe costar el nivel 20 depende del contenido que falta.',
    apply(raw) {
      const c: Change[] = [];
      set('rpg/progression.json', raw.rpg.progression, 'xp.base', 120, c);
      return c;
    },
  },
  {
    id: 'economia',
    title: 'Menos oro por combate y precios de tienda más altos',
    why:
      'Repitiendo la arena se ganan ~140 monedas por minuto (monedas + ventas) y lo más caro de la tienda cuesta 210: todo se compra en 1–2 minutos y el oro no tiene uso. ' +
      'Se reducen a la mitad las monedas que sueltan los enemigos, la venta pasa del 30 % al 20 % del valor y el margen de los mercaderes se multiplica por 4.',
    apply(raw) {
      const c: Change[] = [];
      for (const [id, t] of Object.entries(raw.rpg.loot.tables as Record<string, Json>)) {
        if (id.startsWith('_') || id.startsWith('fishing')) continue;
        set('rpg/loot.json', raw.rpg.loot, `tables.${id}.gold.min`, Math.floor(t.gold.min / 2), c);
        set('rpg/loot.json', raw.rpg.loot, `tables.${id}.gold.max`, Math.max(1, Math.ceil(t.gold.max / 2)), c);
      }
      for (const id of Object.keys(raw.rpg.merchants.merchants)) {
        const m = raw.rpg.merchants.merchants[id];
        set('rpg/merchants.json', raw.rpg.merchants, `merchants.${id}.buyMultiplier`, Math.round(m.buyMultiplier * 4 * 10) / 10, c);
      }
      set('rpg/progression.json', raw.rpg.progression, 'rules.sellRatio', 0.2, c);
      return c;
    },
  },
];

/** Copia de los datos con los ajustes elegidos aplicados, y la lista de cambios. */
export function applyProposals(raw: RawData, ids: readonly string[]): Change[] {
  const out: Change[] = [];
  for (const id of ids) {
    const p = PROPOSALS.find((x) => x.id === id);
    if (!p) throw new Error(`ajuste desconocido: ${id}`);
    out.push(...p.apply(raw));
  }
  return out;
}
