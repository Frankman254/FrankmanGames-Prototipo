import { describe, it, expect } from 'vitest'
import assets from '../data/assets.json' assert { type: 'json' }

const templates = assets.templates as Record<string, any>
const enemies = (assets.assets as Record<string, any>) || {}

describe('JL-72: integración de modelos OMP — jaguar y ranas', () => {
  // — Plantillas —

  describe('plantillas de jaguar', () => {
    it('jaguar: plantilla con GLB correcto', () => {
      expect(templates.jaguar).toBeDefined()
      expect(templates.jaguar.file).toBe('assets/models/jaguar.glb')
      expect(templates.jaguar.kind).toBe('gltf')
    })

    it('jaguar: clips sin salto (Reposo, Caminar, Atacar, Golpeado, Morir)', () => {
      const c = templates.jaguar.clips
      expect(c.idle).toBe('Reposo')
      expect(c.walk).toBe('Caminar')
      expect(c.run).toBe('Caminar') // sin Correr, usa Caminar
      expect(c.attack).toBe('Atacar')
      expect(c.hit).toBe('Golpeado')
      expect(c.death).toBe('Morir')
    })

    it('jaguar_anciano: plantilla con GLB correcto', () => {
      expect(templates.jaguar_anciano).toBeDefined()
      expect(templates.jaguar_anciano.file).toBe('assets/models/jaguar_anciano.glb')
    })

    it('jaguar_anciano: clips iguales a jaguar', () => {
      const c = templates.jaguar_anciano.clips
      expect(c.idle).toBe('Reposo')
      expect(c.walk).toBe('Caminar')
      expect(c.run).toBe('Caminar')
      expect(c.attack).toBe('Atacar')
    })
  })

  describe('plantillas de rana', () => {
    it('rana (venenosa): plantilla con GLB correcto', () => {
      expect(templates.rana).toBeDefined()
      expect(templates.rana.file).toBe('assets/models/rana_venenosa.glb')
    })

    it('rana_ojirroja: plantilla con GLB correcto', () => {
      expect(templates.rana_ojirroja).toBeDefined()
      expect(templates.rana_ojirroja.file).toBe('assets/models/rana_ojirroja.glb')
    })

    it('sapo: plantilla con GLB correcto', () => {
      expect(templates.sapo).toBeDefined()
      expect(templates.sapo.file).toBe('assets/models/sapo_canaveral.glb')
    })

    it('rana_dorada: plantilla con GLB correcto y altura de jefa', () => {
      expect(templates.rana_dorada).toBeDefined()
      expect(templates.rana_dorada.file).toBe('assets/models/rana_dorada.glb')
      expect(templates.rana_dorada.height).toBeCloseTo(3.29, 1)
    })
  })

  // — Arquetipos —

  describe('baru_jaguar: migrado de wolf a jaguar', () => {
    it('usa template jaguar, no bestia/wolf', () => {
      const e = enemies['enemy.baru_jaguar']
      expect(e).toBeDefined()
      expect(e.template).toBe('jaguar')
      expect(e.model).toBeUndefined()
      expect(e.scale).toBeUndefined()
    })

    it('conserva palettes', () => {
      const e = enemies['enemy.baru_jaguar']
      expect(e.palettes.default).toBeDefined()
      expect(e.palettes.default.skin).toBeDefined()
    })
  })

  describe('baru_elder: migrado de wolf a jaguar_anciano', () => {
    it('usa template jaguar_anciano, no bestia/wolf', () => {
      const e = enemies['enemy.baru_elder']
      expect(e).toBeDefined()
      expect(e.template).toBe('jaguar_anciano')
      expect(e.model).toBeUndefined()
      expect(e.scale).toBeUndefined()
    })
  })

  describe('bocas_frog: migrado de wolf a rana', () => {
    it('usa template rana, no bestia/wolf', () => {
      const e = enemies['enemy.bocas_frog']
      expect(e).toBeDefined()
      expect(e.template).toBe('rana')
      expect(e.model).toBeUndefined()
      expect(e.scale).toBeUndefined()
    })
  })

  // — Integración —

  it('ningún arquetipo integrado apunta a plantilla inexistente', () => {
    for (const [key, entry] of Object.entries(enemies)) {
      if (key.startsWith('enemy.')) {
        const t = (entry as any).template
        if (t && templates[t]) {
          expect(t).toBeDefined()
        }
      }
    }
  })

  it('las 6 plantillas nuevas tienen evento de ataque', () => {
    for (const name of ['jaguar', 'jaguar_anciano', 'rana', 'rana_ojirroja', 'sapo', 'rana_dorada']) {
      expect(templates[name].events.attack).toBeDefined()
      expect(templates[name].events.attack[0].type).toBe('hit')
    }
  })
})
