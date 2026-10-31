import { describe, expect, it } from 'vitest';
import { HudProfileBook, autoUiScale, normalizeProfiles, uiViewportBounds } from '../src/ui/map/hudProfiles';
import { FlagBook, FogOfWar, loadFog, minimapToWorld, projectToMinimap, saveFog } from '../src/ui/map/mapLogic';

class Store {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

describe('mapa y HUD', () => {
  it('proyecta mundo a minimapa y vuelve al mismo punto', () => {
    const center = { x: 100, y: 70 };
    const point = { x: 112, y: 91 };
    for (const yaw of [0, Math.PI / 3, Math.PI]) {
      const pixel = projectToMinimap(point, center, yaw, 2.5, 220);
      const roundTrip = minimapToWorld(pixel, center, yaw, 2.5, 220);
      expect(roundTrip.x).toBeCloseTo(point.x, 8);
      expect(roundTrip.y).toBeCloseTo(point.y, 8);
    }
  });

  it('revela, serializa y restaura la niebla por casillas', () => {
    const fog = new FogOfWar(64, 64, 4);
    expect(fog.explored).toBe(0);
    expect(fog.reveal(16, 16, 9)).toBe(true);
    expect(fog.isRevealed(16, 16)).toBe(true);
    const restored = loadFog(saveFog(fog), 64, 64, 4);
    expect(restored.isRevealed(16, 16)).toBe(true);
    expect(restored.explored).toBeCloseTo(fog.explored);
    expect(loadFog(saveFog(fog), 64, 64, 8).explored).toBe(0);
  });

  it('limpia, limita, renombra y elimina banderas', () => {
    const flags = new FlagBook(100, 80, 2);
    const a = flags.add(-4, 90, '  Casa   vieja  ')!;
    expect(a).toMatchObject({ name: 'Casa vieja', x: 0, y: 80 });
    expect(flags.rename(a.id, 'Puerto')).toBe(true);
    expect(flags.add(50, 40)).not.toBeNull();
    expect(flags.add(1, 1)).toBeNull();
    expect(flags.remove(a.id)).toBe(true);
    expect(flags.toJSON()).toHaveLength(1);
  });

  it('crea, cambia, renombra y borra perfiles persistentes', () => {
    const store = new Store();
    const profiles = new HudProfileBook(store);
    profiles.setPosition('minimap', { x: 900.4, y: 25.6 });
    const second = profiles.create(' Exploración ');
    expect(second.positions.minimap).toEqual({ x: 900, y: 26 });
    expect(profiles.rename(second.id, 'Mapa')).toBe(true);
    expect(profiles.switchTo('p1')).toBe(true);
    expect(profiles.remove(second.id)).toBe(true);
    expect(new HudProfileBook(store).active.id).toBe('p1');
    expect(normalizeProfiles({ profiles: [] }).profiles).toHaveLength(1);
  });

  it('calcula escala automática con DPR, límites y redondeo', () => {
    const def = { refWidth: 1440, refHeight: 810, boost: 1.1, min: 0.85, max: 2, step: 0.05, bigScreenPx: 1440, bigScreenBonus: 0.1 };
    expect(autoUiScale(1440, 810, 1, def)).toBe(1.1);
    expect(autoUiScale(1920, 1080, 2, def)).toBe(1.55);
    expect(autoUiScale(320, 200, 1, def)).toBe(0.85);
    expect(autoUiScale(8000, 4000, 2, def)).toBe(2);
  });

  it('limita cualquier pantalla al viewport incluso con interfaz ampliada', () => {
    expect(uiViewportBounds(1266, 792, 1.5)).toEqual({ width: 828, height: 512 });
    const tiny = uiViewportBounds(240, 180, 2);
    expect(tiny).toEqual({ width: 108, height: 78 });
    expect(tiny.width * 2).toBeLessThanOrEqual(240);
    expect(tiny.height * 2).toBeLessThanOrEqual(180);
  });
});
