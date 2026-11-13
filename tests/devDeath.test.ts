import { describe, it, expect } from 'vitest';
import { forceDeath, exhaustPulse, forceDeathAndExhaust } from '../src/rpg/devDeath';
import { Character } from '../src/rpg/character';
import { Energy } from '../src/rpg/energy';
import { Rng } from '../src/sim/rng';
import { content } from './rpg/helpers';

describe('T15: herramientas de desarrollo para muerte y Pulso', () => {
  describe('forceDeath', () => {
    it('mata al personaje vivo y activa el estado espectral', () => {
      const c = Character.create(content(), 'ember_vanguard', 'A', new Rng(1));
      c.restore();
      expect(c.alive).toBe(true);
      expect(c.spectral.active).toBe(false);

      const result = forceDeath(c);
      expect(result).toBe(true);
      expect(c.alive).toBe(false);
      expect(c.health).toBe(0);
      expect(c.spectral.active).toBe(true);
    });

    it('no hace nada si el personaje ya está muerto', () => {
      const c = Character.create(content(), 'ember_vanguard', 'B', new Rng(2));
      c.restore();
      c.health = 0;
      expect(c.alive).toBe(false);

      const result = forceDeath(c);
      expect(result).toBe(false);
      expect(c.spectral.active).toBe(false);
    });

    it('es idempotente: llamar dos veces solo mata la primera', () => {
      const c = Character.create(content(), 'ember_vanguard', 'C', new Rng(3));
      c.restore();
      expect(forceDeath(c)).toBe(true);
      expect(forceDeath(c)).toBe(false);
    });
  });

  describe('exhaustPulse', () => {
    it('agota el Pulso cuando tiene valor', () => {
      const e = new Energy(content().energy);
      expect(e.value).toBeGreaterThan(0);
      expect(e.exhausted).toBe(false);

      const result = exhaustPulse(e);
      expect(result).toBe(true);
      expect(e.value).toBe(0);
      expect(e.exhausted).toBe(true);
    });

    it('no hace nada si el Pulso ya está a 0', () => {
      const e = new Energy(content().energy);
      e.value = 0;
      e.exhausted = true;

      const result = exhaustPulse(e);
      expect(result).toBe(false);
    });

    it('agota desde cualquier valor intermedio', () => {
      const e = new Energy(content().energy);
      e.value = e.def.max / 2;
      expect(e.value).toBeGreaterThan(0);

      const result = exhaustPulse(e);
      expect(result).toBe(true);
      expect(e.value).toBe(0);
      expect(e.exhausted).toBe(true);
    });
  });

  describe('forceDeathAndExhaust', () => {
    it('mata y agota el Pulso a la vez', () => {
      const c = Character.create(content(), 'ember_vanguard', 'D', new Rng(4));
      c.restore();
      const e = new Energy(content().energy);

      const result = forceDeathAndExhaust(c, e);
      expect(result).toBe(true);
      expect(c.alive).toBe(false);
      expect(c.spectral.active).toBe(true);
      expect(e.value).toBe(0);
      expect(e.exhausted).toBe(true);
    });

    it('devuelve true si solo uno de los dos cambió', () => {
      const c = Character.create(content(), 'ember_vanguard', 'E', new Rng(5));
      c.restore();
      const e = new Energy(content().energy);
      e.value = 0;
      e.exhausted = true;

      const result = forceDeathAndExhaust(c, e);
      expect(result).toBe(true);
      expect(c.alive).toBe(false);
    });

    it('devuelve false si ambos ya estaban en el estado final', () => {
      const c = Character.create(content(), 'ember_vanguard', 'F', new Rng(6));
      c.restore();
      c.health = 0;
      const e = new Energy(content().energy);
      e.value = 0;
      e.exhausted = true;

      const result = forceDeathAndExhaust(c, e);
      expect(result).toBe(false);
    });
  });

  describe('integración con el personaje real', () => {
    it('forceDeath reduce la vida a 0 independientemente del nivel', () => {
      const c = Character.create(content(), 'ember_vanguard', 'G', new Rng(7));
      c.restore();
      const maxHealth = c.maxHealth;
      expect(maxHealth).toBeGreaterThan(0);

      forceDeath(c);
      expect(c.health).toBe(0);
      expect(c.alive).toBe(false);
    });

    it('exhaustPulse marca agotado aunque el Pulso estaba casi lleno', () => {
      const e = new Energy(content().energy);
      expect(e.value).toBeCloseTo(e.def.start);

      exhaustPulse(e);
      expect(e.exhausted).toBe(true);
      expect(e.value).toBe(0);
      // penaltyMods puede estar vacío (los datos no definen modificadores de penalización).
      expect(e.penaltyMods()).toEqual([]);
    });
  });
});
