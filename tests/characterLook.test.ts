import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseAssets } from '../src/data/worldSchema';
import { heroParts } from '../src/render/characters/heroModel';
import { ProceduralCharacter } from '../src/render/characters/proceduralCharacter';
import { evaluateClip, newPose, pointInModel } from '../src/world/anim';
import {
  BODY_TYPES,
  DEFAULT_LOOK,
  HAIR_STYLES,
  HEADGEAR,
  OFFHAND_LOOKS,
  OUTFITS,
  WEAPON_LOOKS,
  isCasterWeapon,
  lookFor,
  lookKey,
  withGear,
  gearLookFor,
  type CharacterLook,
} from '../src/world/look';
import { ANIM_STATES, heroRig, proceduralAnim, restFootY } from '../src/world/rigs';

const wd = loadWorldData();
const palette = { skin: [1, 1, 1], cloth: [1, 1, 1], trim: [1, 1, 1], hair: [1, 1, 1], gear: [1, 1, 1] };
const human = (extra: Record<string, unknown>): unknown => ({ assets: { p: { kind: 'procedural', model: 'humanoid', palettes: { default: palette }, ...extra } } });

describe('aspecto del humanoide (datos)', () => {
  it('cada campo hereda del default del bloque y, sin él, del de serie', () => {
    const a = parseAssets(human({ looks: { default: { hairStyle: 'bun', cape: true }, mage: { outfit: 'robe' } } }))['p']!;
    if (a.kind !== 'procedural') throw new Error('procedural');
    expect(a.looks['default']).toEqual({ ...DEFAULT_LOOK, hairStyle: 'bun', cape: true });
    expect(a.looks['mage']).toEqual({ ...DEFAULT_LOOK, hairStyle: 'bun', cape: true, outfit: 'robe' });
    // Sin `looks`, el de serie.
    const b = parseAssets(human({}))['p']!;
    expect(b.kind === 'procedural' && lookFor(b.looks, 'loquesea')).toEqual(DEFAULT_LOOK);
  });

  it('rechaza valores y campos desconocidos con la ruta exacta', () => {
    expect(() => parseAssets(human({ looks: { default: { hairStyle: 'mohawk' } } }))).toThrow(/assets\.p\.looks\.default\.hairStyle/);
    expect(() => parseAssets(human({ looks: { x: { outfit: 'bikini' } } }))).toThrow(/assets\.p\.looks\.x\.outfit/);
    expect(() => parseAssets(human({ looks: { x: { cape: 'sí' } } }))).toThrow(/assets\.p\.looks\.x\.cape/);
    expect(() => parseAssets(human({ looks: { x: { colour: 'red' } } }))).toThrow(/assets\.p\.looks\.x\.colour/);
    expect(() => parseAssets(human({ gear: { short_sword: 'lightsaber' } }))).toThrow(/assets\.p\.gear\.short_sword/);
  });

  it('las clases y los PNJ del juego tienen paleta y aspecto, y cada arma o escudo, su dibujo', () => {
    const game = loadGameData();
    const player = wd.assets['player']!;
    const npc = wd.assets['npc']!;
    if (player.kind !== 'procedural' || npc.kind !== 'procedural') throw new Error('procedural');
    for (const id of Object.keys(game.rpg.classes)) {
      expect(player.palettes[id], `paleta ${id}`).toBeDefined();
      expect(player.looks[id], `aspecto ${id}`).toBeDefined();
    }
    // Las dos clases se distinguen por la silueta, no sólo por el color.
    expect(player.looks['ember_vanguard']!.outfit).not.toBe(player.looks['storm_weaver']!.outfit);
    for (const def of [...Object.values(game.rpg.merchants), ...Object.values(game.rpg.npcs)]) expect(npc.looks[def.look], `PNJ ${def.look}`).toBeDefined();
    // Su entrada en `gear` o, si no tiene, el dibujo de su tipo (`equipo-objetos`).
    for (const it of Object.values(game.rpg.items)) {
      const g = gearLookFor(player.gear, it.id, it.kind);
      if (it.slot === 'weapon') expect(WEAPON_LOOKS, it.id).toContain(g);
      if (it.slot === 'offhand') expect(['shield', 'buckler'], it.id).toContain(g);
    }
  });

  it('el equipo decide lo que lleva en las manos', () => {
    const gear = { oak_staff: 'staff', oak_buckler: 'shield' } as const;
    const base: CharacterLook = { ...DEFAULT_LOOK, weapon: 'sword', offhand: 'none' };
    expect(withGear(base, gear, 'oak_staff', 'oak_buckler')).toMatchObject({ weapon: 'staff', offhand: 'shield' });
    expect(withGear(base, gear, null, null)).toMatchObject({ weapon: 'none', offhand: 'none' });
    // Un arma sin dibujo propio pinta una espada; un escudo puesto como arma, nada.
    expect(withGear(base, gear, 'mystery_blade', null).weapon).toBe('sword');
    expect(withGear(base, gear, 'oak_buckler', null).weapon).toBe('none');
    expect(isCasterWeapon('staff') && isCasterWeapon('orb') && !isCasterWeapon('axe')).toBe(true);
    expect(lookKey(withGear(base, gear, 'oak_staff', null))).not.toBe(lookKey(base));
  });

  it('equipo-objetos: sin entrada en gear se dibuja por tipo, y la mano izquierda lleva armas', () => {
    const kinds: Record<string, string> = { knife: 'dagger', bow1: 'bow', small: 'buckler', blade: 'sword', mystery: 'gem' };
    const kindOf = (id: string) => kinds[id];
    const base: CharacterLook = { ...DEFAULT_LOOK };
    expect(withGear(base, {}, 'blade', 'knife', kindOf)).toMatchObject({ weapon: 'sword', offhand: 'dagger' });
    expect(withGear(base, {}, 'bow1', null, kindOf)).toMatchObject({ weapon: 'bow', offhand: 'none' });
    expect(withGear(base, {}, 'blade', 'small', kindOf)).toMatchObject({ weapon: 'sword', offhand: 'buckler' });
    // Un arma de dos manos en la izquierda no se dibuja; un tipo sin dibujo, tampoco.
    expect(withGear(base, {}, 'blade', 'bow1', kindOf).offhand).toBe('none');
    expect(withGear(base, {}, 'mystery', 'mystery', kindOf)).toMatchObject({ weapon: 'sword', offhand: 'none' });
    expect(gearLookFor({ blade: 'axe' }, 'blade', 'sword')).toBe('axe');
  });
});

/** Todas las combinaciones de un campo cada vez sobre el aspecto de serie, más los de los datos. */
function sampleLooks(): CharacterLook[] {
  const out: CharacterLook[] = [];
  for (const bodyType of BODY_TYPES) out.push({ ...DEFAULT_LOOK, bodyType });
  for (const hairStyle of HAIR_STYLES) for (const headgear of HEADGEAR) out.push({ ...DEFAULT_LOOK, hairStyle, headgear });
  for (const outfit of OUTFITS) out.push({ ...DEFAULT_LOOK, outfit, cape: true, beard: true });
  for (const weapon of WEAPON_LOOKS) out.push({ ...DEFAULT_LOOK, weapon, offhand: 'shield' });
  for (const offhand of OFFHAND_LOOKS) out.push({ ...DEFAULT_LOOK, weapon: 'sword', offhand });
  for (const e of Object.values(wd.assets)) if (e.kind === 'procedural' && e.model === 'humanoid') out.push(...Object.values(e.looks));
  return out;
}

describe('modelo del humanoide', () => {
  it('todas las piezas cuelgan de articulaciones del rig y reparten pesos entre ellas', () => {
    const rig = heroRig();
    for (const look of sampleLooks()) {
      for (const p of heroParts(look)) {
        expect(rig.index.has(p.joint), `${lookKey(look)}: ${p.joint}`).toBe(true);
        if (p.weights) {
          for (const [j, w] of p.weights(new Vector3(0.05, 0.9, 0.05))) {
            expect(rig.index.has(j), j).toBe(true);
            expect(w).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('cuesta una llamada de dibujo (dos con arma que brilla) y menos de 5000 vértices', () => {
    const scene = new Scene(new NullEngine());
    const anim = wd.animation.models.humanoid;
    let i = 0;
    for (const look of sampleLooks()) {
      const c = new ProceduralCharacter(scene, `h${i++}`, 'humanoid', 1, palette as never, anim, 0.15, false, look);
      const verts = c.meshes.reduce((a, m) => a + m.getTotalVertices(), 0);
      expect(c.meshes.length, lookKey(look)).toBe(isCasterWeapon(look.weapon) || isCasterWeapon(look.offhand) ? 2 : 1);
      expect(verts, lookKey(look)).toBeLessThan(5000);
      // La mano derecha (de donde salen los hechizos) está a la altura de la cadera, a un lado.
      const hand = c.socket('handR', new Vector3());
      expect(hand.y).toBeGreaterThan(0.6);
      expect(hand.y).toBeLessThan(1.1);
      expect(c.height).toBeGreaterThan(1.6);
      c.dispose();
    }
  });

  it('los clips del héroe (espada y báculo) sólo tocan articulaciones del rig y apoyan en el suelo', () => {
    for (const caster of [false, true]) {
      const a = proceduralAnim('humanoid', { caster });
      for (const s of ANIM_STATES) {
        const clip = a.clips[s]!;
        for (const t of [0, 0.25, 0.5, 0.75, 1]) evaluateClip(a.rig, clip, t, newPose(a.rig));
      }
      // En reposo, el pie más bajo está en el apoyo (el render baja el modelo eso).
      const foot = restFootY(a);
      expect(foot).toBeGreaterThan(0);
      expect(foot).toBeLessThan(0.1);
      // La voltereta da una vuelta entera: acaba con la cadera como empezó.
      const end = evaluateClip(a.rig, a.clips['evade']!, 1, newPose(a.rig));
      const start = evaluateClip(a.rig, a.clips['evade']!, 0, newPose(a.rig));
      const head = (p: Float32Array): number => pointInModel(a.rig, p, 'head')[1];
      expect(head(end)).toBeCloseTo(head(start), 3);
      // A media voltereta la cabeza queda por debajo de la cadera.
      const mid = evaluateClip(a.rig, a.clips['evade']!, 0.5, newPose(a.rig));
      expect(head(mid)).toBeLessThan(pointInModel(a.rig, mid, 'hips')[1]);
    }
  });

  it('parpadea: en reposo los ojos se esconden un instante y en la muerte se quedan cerrados', () => {
    const a = proceduralAnim('humanoid');
    const eyes = a.rig.index.get('eyes')! * 7 + 4;
    const at = (clip: string, t: number): number => evaluateClip(a.rig, a.clips[clip]!, t, newPose(a.rig))[eyes]!;
    expect(at('idle', 0.1)).toBe(0);
    expect(at('idle', 0.655)).toBeLessThan(-0.03);
    expect(at('death', 1)).toBeLessThan(-0.03);
  });
});
