import { NullEngine, Scene } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadFx } from '../src/data/fxSchema';
import { loadSpellFx } from '../src/data/spellFxSchema';
import { SpellFx } from '../src/render/fx/spellFx';
import { World } from '../src/sim/world';
import { HeightField } from '../src/world/terrain';

// Polyfill OffscreenCanvas para Babylon.js en Node (DynamicTexture lo necesita).
if (typeof (globalThis as any).OffscreenCanvas === 'undefined') {
  (globalThis as any).OffscreenCanvas = class {
    constructor(
      public readonly width: number,
      public readonly height: number,
    ) {}
    getContext() {
      const ctx = {
        fillStyle: '',
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
        putImageData: () => {},
        fillText: () => {},
        strokeText: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        clip: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        transform: () => {},
        rotate: () => {},
        scale: () => {},
        translate: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        rect: () => {},
        measureText: () => ({ width: 0 }),
      };
      return ctx as any;
    }
  };
}

/** Suelo plano para el test. */
const flat = new HeightField(80, 80, 1, new Float32Array(81 * 81));

/** Los 9 hechizos con perfil visual. */
const PROFILED_SPELLS = [
  'ember_whirl',
  'searing_mark',
  'glacial_lance',
  'frost_nova',
  'gust',
  'vertigo_whistle',
  'spark',
  'piercing_shot',
  'light_bandage',
];

function setup() {
  const data = loadGameData();
  const w = new World(data, { encounter: false });
  const scene = new Scene(new NullEngine());
  const profiles = loadSpellFx();
  const fx = new SpellFx(
    scene,
    loadFx(),
    flat,
    () => ({ x: w.player.pos.x + 5, y: w.player.pos.y }),
    (out) => out.set(w.player.pos.x, 1.5, w.player.pos.y),
    profiles,
  );
  return { w, scene, fx, engine: scene.getEngine()! };
}

describe('J2-fix: perfiles visuales no dejan meshes huérfanos', () => {
  it('cada perfil lanza sin dejar meshes "fxProfile*" tras 5 s de simulación', () => {
    for (const spellId of PROFILED_SPELLS) {
      const { w, scene, fx, engine } = setup();

      // Asegurar un enemigo como objetivo para hechizos de un objetivo.
      const spell = w.content.spells[spellId];
      if (spell && spell.area.type === 'single') {
        w.spawnEnemy('melee', { x: w.player.pos.x + 5, y: w.player.pos.y });
      }

      // Simular el suceso de cast.
      fx.handleEvents(w, [{ type: 'cast', ability: spellId, targetId: undefined }]);

      // Avanzar 5 segundos para que todo se libere.
      for (let i = 0; i < 300; i++) {
        w.tick(1 / 60);
        fx.sync(w, 1 / 60);
      }

      // Contar meshes que contienen "fxProfile" en el nombre.
      const orphaned = scene.meshes.filter((m) => m.name.includes('fxProfile'));
      expect(orphaned.map((m) => m.name), `${spellId}: sin meshes huérfanos tras 5 s`).toHaveLength(0);

      // También verificar que no haya proyectiles activos.
      // (Accedemos al array interno a través de la propiedad privada; en test es aceptable.)
      const projCount = (fx as any).projectiles?.length ?? 0;
      expect(projCount, `${spellId}: sin proyectiles activos tras 5 s`).toBe(0);

      // Limpiar.
      fx.reset();
      scene.dispose();
      engine.dispose();
    }
  });

  it('los perfiles con proyectil (single) registran el mesh en this.projectiles', () => {
    const projectileSpells = ['searing_mark', 'vertigo_whistle', 'spark'];
    for (const spellId of projectileSpells) {
      const { w, scene, fx, engine } = setup();

      // Crear un enemigo como objetivo.
      const enemy = w.spawnEnemy('melee', { x: w.player.pos.x + 8, y: w.player.pos.y });

      // Lanzar el hechizo.
      fx.handleEvents(w, [{ type: 'cast', ability: spellId, targetId: enemy.id }]);

      // Inmediatamente después del cast, debe haber un proyectil registrado.
      const proj = (fx as any).projectiles;
      expect(proj.length, `${spellId}: tiene proyectil registrado`).toBeGreaterThan(0);

      // El proyectil debe estar cerca del lanzador (mano).
      const first = proj[0];
      expect(first.mesh, `${spellId}: mesh del proyectil existe`).toBeDefined();

      // Limpiar.
      fx.reset();
      scene.dispose();
      engine.dispose();
    }
  });

  it('los perfiles con área line registran el mesh con línea', () => {
    const lineSpells = ['glacial_lance', 'piercing_shot'];
    for (const spellId of lineSpells) {
      const { w, scene, fx, engine } = setup();

      fx.handleEvents(w, [{ type: 'cast', ability: spellId, targetId: undefined }]);

      const proj = (fx as any).projectiles;
      expect(proj.length, `${spellId}: tiene proyectil registrado`).toBeGreaterThan(0);

      // El proyectil debe tener una línea (line property).
      const first = proj[0];
      expect(first.line, `${spellId}: proyectil con línea`).toBeDefined();

      // Limpiar.
      fx.reset();
      scene.dispose();
      engine.dispose();
    }
  });

  it('los perfiles de área (sin proyectil) crean la forma del área', () => {
    const areaSpells = ['ember_whirl', 'frost_nova', 'gust', 'light_bandage'];
    for (const spellId of areaSpells) {
      const { w, scene, fx, engine } = setup();

      fx.handleEvents(w, [{ type: 'cast', ability: spellId, targetId: undefined }]);

      // Debería haber un flash de área (fxArea) o efectos de perfil activos.
      const flashes = (fx as any).flashes;
      const activeFx = (fx as any).profileManager?._activeFx;

      // Al menos uno de los dos debe tener contenido.
      const hasArea = flashes.length > 0 || (activeFx && activeFx.length > 0);
      expect(hasArea, `${spellId}: tiene efectos de área o perfil activos`).toBe(true);

      // Limpiar.
      fx.reset();
      scene.dispose();
      engine.dispose();
    }
  });
});
