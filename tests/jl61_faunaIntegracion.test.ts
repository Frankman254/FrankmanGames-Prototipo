import { describe, expect, it } from 'vitest';
import { parseAssets } from '../src/data/worldSchema';
import { loadWorldData } from '../src/data/worldData';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const assetsRaw = require('../data/assets.json');

describe('JL-61: integración de modelos OMP en master', () => {
  describe('FA-02: caiman y garza', () => {
    it('plantilla caiman existe con los campos obligatorios', () => {
      const t = assetsRaw.templates['caiman'];
      expect(t).toBeDefined();
      expect(t.kind).toBe('gltf');
      expect(t.file).toBe('assets/models/caiman.glb');
      expect(t.clips.idle).toBe('Reposo');
      expect(t.clips.walk).toBe('Caminar');
      expect(t.clips.run).toBe('Caminar');
      expect(t.clips.hit).toBe('Golpeado');
      expect(t.clips.death).toBe('Morir');
      expect(t.clips.attack).toBe('Atacar');
    });

    it('plantilla garza existe con los campos obligatorios', () => {
      const t = assetsRaw.templates['garza'];
      expect(t).toBeDefined();
      expect(t.kind).toBe('gltf');
      expect(t.file).toBe('assets/models/garza.glb');
      expect(t.clips.idle).toBe('Reposo');
      expect(t.clips.walk).toBe('Caminar');
      expect(t.clips.run).toBe('Caminar');
      expect(t.clips.hit).toBe('Golpeado');
      expect(t.clips.death).toBe('Morir');
      expect(t.clips.attack).toBe('Atacar');
    });

    it('GLB de caiman y garza existen en disco', () => {
      expect(existsSync(join(ROOT, 'assets', 'models', 'caiman.glb'))).toBe(true);
      expect(existsSync(join(ROOT, 'assets', 'models', 'garza.glb'))).toBe(true);
    });

    it('chame_caiman usa la plantilla caiman', () => {
      const entry = assetsRaw.assets['enemy.chame_caiman'];
      expect(entry).toBeDefined();
      expect(entry.template).toBe('caiman');
      expect(entry.model).toBeUndefined();
      expect(entry.template).not.toBe('bestia');
    });

    it('chame_heron usa la plantilla garza', () => {
      const entry = assetsRaw.assets['enemy.chame_heron'];
      expect(entry).toBeDefined();
      expect(entry.template).toBe('garza');
      expect(entry.model).toBeUndefined();
      expect(entry.template).not.toBe('arquero');
    });

    it('parseAssets acepta las plantillas sin lanzar', () => {
      expect(() => parseAssets(assetsRaw)).not.toThrow();
    });

    it('chame_caiman resuelve a gltf con el archivo correcto', () => {
      const wd = loadWorldData();
      const entry = wd.assets['enemy.chame_caiman'];
      expect(entry).toBeDefined();
      expect(entry?.kind).toBe('gltf');
      if (entry?.kind === 'gltf') {
        expect(entry.file).toBe('assets/models/caiman.glb');
        expect(entry.clips.idle).toBe('Reposo');
      }
    });

    it('chame_heron resuelve a gltf con el archivo correcto', () => {
      const wd = loadWorldData();
      const entry = wd.assets['enemy.chame_heron'];
      expect(entry).toBeDefined();
      expect(entry?.kind).toBe('gltf');
      if (entry?.kind === 'gltf') {
        expect(entry.file).toBe('assets/models/garza.glb');
        expect(entry.clips.idle).toBe('Reposo');
      }
    });
  });

  describe('FA-04: pecari y jabali', () => {
    it('plantilla pecari existe con los campos obligatorios', () => {
      const t = assetsRaw.templates['pecari'];
      expect(t).toBeDefined();
      expect(t.kind).toBe('gltf');
      expect(t.file).toBe('assets/models/pecari.glb');
      expect(t.clips.idle).toBe('Reposo');
      expect(t.clips.walk).toBe('Caminar');
      expect(t.clips.run).toBe('Caminar');
      expect(t.clips.hit).toBe('Golpeado');
      expect(t.clips.death).toBe('Morir');
      expect(t.clips.attack).toBe('Atacar');
    });

    it('plantilla jabali existe con los campos obligatorios', () => {
      const t = assetsRaw.templates['jabali'];
      expect(t).toBeDefined();
      expect(t.kind).toBe('gltf');
      expect(t.file).toBe('assets/models/jabali.glb');
      expect(t.clips.idle).toBe('Reposo');
      expect(t.clips.walk).toBe('Caminar');
      expect(t.clips.run).toBe('Caminar');
      expect(t.clips.hit).toBe('Golpeado');
      expect(t.clips.death).toBe('Morir');
      expect(t.clips.attack).toBe('Atacar');
    });

    it('GLB de pecari y jabali existen en disco', () => {
      expect(existsSync(join(ROOT, 'assets', 'models', 'pecari.glb'))).toBe(true);
      expect(existsSync(join(ROOT, 'assets', 'models', 'jabali.glb'))).toBe(true);
    });

    it('cerropunta_peccary usa la plantilla pecari', () => {
      const entry = assetsRaw.assets['enemy.cerropunta_peccary'];
      expect(entry).toBeDefined();
      expect(entry.template).toBe('pecari');
      expect(entry.model).toBeUndefined();
      expect(entry.template).not.toBe('bestia');
    });

    it('cerropunta_boar usa la plantilla jabali', () => {
      const entry = assetsRaw.assets['enemy.cerropunta_boar'];
      expect(entry).toBeDefined();
      expect(entry.template).toBe('jabali');
      expect(entry.model).toBeUndefined();
      expect(entry.template).not.toBe('bestia');
    });

    it('cerropunta_peccary resuelve a gltf con el archivo correcto', () => {
      const wd = loadWorldData();
      const entry = wd.assets['enemy.cerropunta_peccary'];
      expect(entry).toBeDefined();
      expect(entry?.kind).toBe('gltf');
      if (entry?.kind === 'gltf') {
        expect(entry.file).toBe('assets/models/pecari.glb');
      }
    });

    it('cerropunta_boar resuelve a gltf con el archivo correcto', () => {
      const wd = loadWorldData();
      const entry = wd.assets['enemy.cerropunta_boar'];
      expect(entry).toBeDefined();
      expect(entry?.kind).toBe('gltf');
      if (entry?.kind === 'gltf') {
        expect(entry.file).toBe('assets/models/jabali.glb');
      }
    });
  });

  describe('FA-03: variantes de cripta por tramo', () => {
    const variantes = [
      { tipo: 'rata', variant: 'cueva' },
      { tipo: 'rata', variant: 'huaca' },
      { tipo: 'guardian', variant: 'cueva' },
      { tipo: 'guardian', variant: 'huaca' },
      { tipo: 'bruto', variant: 'cueva' },
      { tipo: 'bruto', variant: 'huaca' },
    ];

    for (const { tipo, variant } of variantes) {
      const tplKey = `cripta_${tipo}_${variant}`;
      const enemyKey = `enemy.cripta_${tipo}_${variant}`;
      const glbName = `cripta_${tipo}_${variant}.glb`;

      it(`plantilla ${tplKey} existe`, () => {
        const t = assetsRaw.templates[tplKey];
        expect(t).toBeDefined();
        expect(t.kind).toBe('gltf');
        expect(t.file).toBe(`assets/models/${glbName}`);
        expect(t.clips.idle).toBe('Reposo');
      });

      it(`enemy.${enemyKey} apunta a la plantilla ${tplKey}`, () => {
        const entry = assetsRaw.assets[enemyKey];
        expect(entry).toBeDefined();
        expect(entry.template).toBe(tplKey);
      });

      it(`GLB ${glbName} existe en disco`, () => {
        expect(existsSync(join(ROOT, 'assets', 'models', glbName))).toBe(true);
      });
    }

    it('parseAssets acepta las 6 variantes sin lanzar', () => {
      expect(() => parseAssets(assetsRaw)).not.toThrow();
    });

    it('las 6 entradas enemy resuelven a gltf con el archivo correcto', () => {
      const wd = loadWorldData();
      for (const { tipo, variant } of variantes) {
        const enemyKey = `enemy.cripta_${tipo}_${variant}`;
        const entry = wd.assets[enemyKey];
        expect(entry, `${enemyKey} existe`).toBeDefined();
        expect(entry?.kind, `${enemyKey} es gltf`).toBe('gltf');
        if (entry?.kind === 'gltf') {
          expect(entry.file).toBe(`assets/models/cripta_${tipo}_${variant}.glb`);
        }
      }
    });

    it('las entradas base siguen funcionando', () => {
      const wd = loadWorldData();
      for (const tipo of ['rata', 'guardian', 'bruto']) {
        const entry = wd.assets[`enemy.cripta_${tipo}`];
        expect(entry, `enemy.cripta_${tipo} existe`).toBeDefined();
        expect(entry?.kind).toBe('gltf');
        if (entry?.kind === 'gltf') {
          expect(entry.file).toBe(`assets/models/cripta_${tipo}.glb`);
        }
      }
    });
  });
});
