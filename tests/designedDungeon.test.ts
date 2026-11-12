import { describe, expect, it } from 'vitest';
import dungeonJson from '../data/dungeons/cripta-tulivieja.json';
import bossesJson from '../data/bosses.json';
import { completeBoss, createBossState, updateBoss, validateBossDef, type BossDef } from '../src/sim/bossPhases';
import {
  activateTrigger,
  createPuzzleState,
  shouldSpawnRare,
  tickPuzzle,
  validateDesignedFloor,
  type DesignedDungeonDef,
} from '../src/world/designedDungeon';

const dungeon = dungeonJson as unknown as DesignedDungeonDef;
const boss = (bossesJson.bosses['matriarca-hilo'] as unknown) as BossDef;

describe('mazmorra diseñada', () => {
  it('tiene cinco pisos finitos, hechos a mano y validados', () => {
    expect(dungeon.floors).toHaveLength(5);
    for (const floor of dungeon.floors) {
      expect(floor.mode).toBe('hand');
      const result = validateDesignedFloor(floor);
      expect(result.errors, floor.id).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('las palancas y placas abren puertas; las temporizadas vuelven a cerrar', () => {
    const floor = dungeon.floors[1]!;
    const active = activateTrigger(floor, createPuzzleState(), 'placa-centro', 10);
    expect(active.openedDoors.has('reja-losetas')).toBe(true);
    expect(tickPuzzle(floor, active, 17.9).openedDoors.has('reja-losetas')).toBe(true);
    expect(tickPuzzle(floor, active, 18).openedDoors.has('reja-losetas')).toBe(false);
  });

  it('las puertas aceptan proximidad y rechazan activaciones desconocidas', () => {
    const floor = structuredClone(dungeon.floors[0]!);
    floor.doors![0]!.activation = 'proximity';
    expect(validateDesignedFloor(floor).errors).toEqual([]);
    (floor.doors![0] as unknown as { activation: string }).activation = 'enemigo';
    expect(validateDesignedFloor(floor).errors).toContain('reja-atrio tiene activación desconocida: enemigo');
  });

  it('el atajo queda desbloqueado para el camino de regreso', () => {
    const floor = dungeon.floors[2]!;
    const active = activateTrigger(floor, createPuzzleState(), 'palanca-atajo', 1);
    expect(active.shortcuts.has('atajo-candil')).toBe(true);
    expect(tickPuzzle(floor, active, 999).openedDoors.has('atajo-candil')).toBe(true);
  });

  it('el monstruo raro respeta su probabilidad y anuncia señal audiovisual', () => {
    const floor = dungeon.floors[2]!;
    expect(floor.rareSpawn?.id).toBe('silbador-de-cal');
    expect(floor.rareSpawn?.sign.message.length).toBeGreaterThan(8);
    expect(shouldSpawnRare(floor, 0.01)).toBe(true);
    expect(shouldSpawnRare(floor, 0.5)).toBe(false);
  });
});

describe('jefe por fases', () => {
  it('valida tres fases, cambia por umbral y pide una pausa de cámara', () => {
    expect(() => validateBossDef(boss)).not.toThrow();
    const first = updateBoss(boss, createBossState(true), 1, 0.65);
    expect(first.state.phaseIndex).toBe(1);
    expect(first.events).toContainEqual({ type: 'phase', phase: 'nudos-vivos', requestCameraPauseMs: 850 });
  });

  it('es inmune mientras viven invocaciones y entra en furia por tiempo', () => {
    let state = createBossState(true);
    ({ state } = updateBoss(boss, state, 1, 0.65, 2));
    const freed = updateBoss(boss, state, boss.enrageSeconds, 0.65, 0);
    expect(freed.state.enraged).toBe(true);
    expect(freed.events.some((e) => e.type === 'immunity' && !e.active)).toBe(true);
    expect(freed.events.some((e) => e.type === 'enrage')).toBe(true);
  });

  it('la recompensa especial sólo se emite en la primera victoria', () => {
    expect(completeBoss(boss, createBossState(true))).toEqual([{ type: 'first-kill-reward', itemId: 'moonstone_amulet' }]);
    expect(completeBoss(boss, createBossState(false))).toEqual([]);
  });
});
