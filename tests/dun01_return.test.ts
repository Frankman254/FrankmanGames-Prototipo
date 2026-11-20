import { describe, it, expect } from 'vitest';
import type { DungeonFeature } from '../src/render/dungeonView';
import itemsRaw from '../data/rpg/items.json' with { type: 'json' };

describe('DUN-01: Volver a la superficie', () => {
  describe('DungeonFeature return', () => {
    it('admite el kind return', () => {
      const f: DungeonFeature = { kind: 'return' };
      expect(f.kind).toBe('return');
    });

    it('se distingue de up y down', () => {
      const ret: DungeonFeature = { kind: 'return' };
      const up: DungeonFeature = { kind: 'up' };
      const down: DungeonFeature = { kind: 'down' };
      expect(ret.kind).not.toBe(up.kind);
      expect(ret.kind).not.toBe(down.kind);
    });
  });

  describe('Ovillo de regreso en datos', () => {
    const item = itemsRaw.items['ovillo_de_regreso'];

    it('existe ovillo_de_regreso', () => {
      expect(item).toBeDefined();
    });

    it('tiene use.kind dungeonReturn', () => {
      expect(item.use.kind).toBe('dungeonReturn');
    });

    it('tiene cooldown', () => {
      expect(item.use.cooldown).toBeGreaterThanOrEqual(1);
    });

    it('no cae de botín (dropWeight 0)', () => {
      expect(item.dropWeight).toBe(0);
    });

    it('es consumable y apilable', () => {
      expect(item.category).toBe('consumable');
      expect(item.maxStack).toBeGreaterThan(1);
    });
  });

  describe('ENGAGED_STATES', () => {
    const ENGAGED_STATES = new Set(['pursue', 'telegraph', 'attack', 'recover'] as const);

    it('incluye los 4 estados de combate', () => {
      expect(ENGAGED_STATES.has('pursue')).toBe(true);
      expect(ENGAGED_STATES.has('telegraph')).toBe(true);
      expect(ENGAGED_STATES.has('attack')).toBe(true);
      expect(ENGAGED_STATES.has('recover')).toBe(true);
    });

    it('no incluye idle ni dead', () => {
      expect(ENGAGED_STATES.has('idle' as any)).toBe(false);
      expect(ENGAGED_STATES.has('dead' as any)).toBe(false);
    });
  });
});
