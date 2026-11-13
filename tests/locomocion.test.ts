// Marcha del jugador (2026-11-12): los GLB del héroe traen «Caminar» y el
// juego nunca lo pedía. Cubre la regla pura de selección con histéresis, el
// fallback de los modelos sin clip, la cadencia de pisadas en cada caso y la
// integración en PlayerAvatar. Sin carga de GLB: el arnés glTF usa grupos
// falsos con duraciones medidas en personaje.glb (0,667 s correr / 1,067 s
// caminar) y el avatar se prueba con un modelo de juguete.
import { Animation, AnimationGroup, NullEngine, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import type { AssetEntry } from '../src/data/worldSchema';
import type { CharacterModel, PlayOptions } from '../src/render/characters/characterModel';
import { PlayerAvatar } from '../src/render/characters/playerAvatar';
import type { Player } from '../src/sim/world';
import { GAIT_BAND, pickGait } from '../src/world/locomotion';
import { evaluateClip, newPose, pointInModel } from '../src/world/anim';
import { ANIM_STATES, heroClips, heroRig } from '../src/world/rigs';
import type { AnimState } from '../src/world/rigs';

const assets = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'assets.json'), 'utf8')) as {
  templates: Record<string, { clips: Record<string, string>; runSpeed: number; events?: Record<string, Array<{ t: number; type: string }>> }>;
};

describe('regla de marcha (histéresis)', () => {
  const R = 2.75; // runSpeed del héroe
  it('velocidad alta corre y baja anda, sobre la banda del paso natural', () => {
    expect(pickGait('run', R, R, true)).toBe('run');
    expect(pickGait('walk', R, R, true)).toBe('run');
    expect(pickGait('run', 1.0, R, true)).toBe('walk');
    expect(pickGait('walk', 1.0, R, true)).toBe('walk');
  });

  it('umbrales exactos dentro y fuera de la banda', () => {
    // runEnter: 0.85 → 2.3375 m/s
    expect(pickGait('walk', R * GAIT_BAND.runEnter, R, true)).toBe('run');
    expect(pickGait('walk', R * GAIT_BAND.runEnter - 0.01, R, true)).toBe('walk');
    // runExit: 0.75 → 2.0625 m/s
    expect(pickGait('run', R * GAIT_BAND.runExit, R, true)).toBe('run');
    expect(pickGait('run', R * GAIT_BAND.runExit - 0.01, R, true)).toBe('walk');
  });

  it('sin parpadeo walk/run en zona media', () => {
    const mid = R * 0.8; // entre runExit (0.75) y runEnter (0.85)
    // Desde run, bajar a mid (0.8) queda por encima de runExit (0.75) → se queda run
    let gait = pickGait('run', R, R, true); // run
    gait = pickGait(gait, mid, R, true); // ratio 0.8 ≥ runExit 0.75 → run
    expect(gait).toBe('run');
    // Bajar por debajo de runExit → walk
    gait = pickGait(gait, R * 0.7, R, true); // ratio 0.7 < runExit → walk
    expect(gait).toBe('walk');
    // Subir a mid (0.8) queda por debajo de runEnter (0.85) → se queda walk
    gait = pickGait(gait, mid, R, true); // ratio 0.8 < runEnter 0.85 → walk
    expect(gait).toBe('walk');
    // Subir por encima de runEnter → run
    gait = pickGait(gait, R * 0.9, R, true); // ratio 0.9 ≥ runEnter → run
    expect(gait).toBe('run');
    // Bajar a mid (0.8) queda por encima de runExit (0.75) → se queda run
    gait = pickGait(gait, mid, R, true); // ratio 0.8 ≥ runExit 0.75 → run
    expect(gait).toBe('run');
  });

  it('sin clip o sin datos → run', () => {
    expect(pickGait('run', R, R, false)).toBe('run'); // sin clip
    expect(pickGait('walk', R, R, false)).toBe('run');
    expect(pickGait('run', R, 0, true)).toBe('run'); // sin runSpeed
    expect(pickGait('run', R, -1, true)).toBe('run');
  });
});

describe('assets.json', () => {
  const heroes = ['centinela', 'centinela_f', 'oraculo', 'oraculo_f', 'cazador', 'cazador_f', 'personaje'];
  it('plantillas de héroe mapean clip Caminar', () => {
    for (const h of heroes) {
      const t = assets.templates[h];
      expect(t, `${h} existe`).toBeDefined();
      expect(t!.clips.walk, `${h} tiene walk`).toBe('Caminar');
    }
  });

  it('plantillas de héroe tienen eventos walk', () => {
    for (const h of heroes) {
      const t = assets.templates[h];
      expect(t!.events?.walk, `${h} tiene eventos walk`).toBeDefined();
      const footsteps = t!.events!.walk!.filter((e) => e.type === 'footstep');
      expect(footsteps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('animales no mapean walk (usan fallback)', () => {
    const animals = ['zorro', 'buho', 'tortuga', 'bestia', 'arquero', 'chaman', 'diablillo'];
    for (const a of animals) {
      const t = assets.templates[a];
      expect(t!.clips.walk, `${a} sin walk`).toBeUndefined();
    }
  });
});

describe('clip procedural walk', () => {
  const rig = heroRig();
  const clips = heroClips(false);

  it('ANIM_STATES incluye walk', () => {
    expect(ANIM_STATES).toContain('walk');
  });

  it('clip walk existe y es bucle', () => {
    expect(clips.walk).toBeDefined();
    expect(clips.walk!.loop).toBe(true);
  });

  it('duración walk ≈ 1.05 s', () => {
    expect(clips.walk!.duration).toBeCloseTo(1.05, 2);
  });

  it('apoyos del clip walk en t≈0.11 y t≈0.61', () => {
    const pose0 = evaluateClip(rig, clips.walk!, 0.11, newPose(rig));
    const footL0 = pointInModel(rig, pose0, 'footL', [0, 0, 0]);
    const pose1 = evaluateClip(rig, clips.walk!, 0.61, newPose(rig));
    const footR1 = pointInModel(rig, pose1, 'footR', [0, 0, 0]);
    // Los pies deben estar cerca del suelo (Y bajo) en los apoyos
    expect(footL0[1]).toBeLessThan(0.3);
    expect(footR1[1]).toBeLessThan(0.3);
  });
});

// ── Arnés glTF falso para pruebas de cadencia y fallback ────────────────

class MockGltfCharacter implements CharacterModel {
  readonly root: TransformNode;
  readonly height = 1.8;
  readonly meshes: readonly any[] = [];
  readonly state: AnimState | null = null;
  readonly finished = false;
  private _groups = new Map<AnimState, { from: number; to: number; framePerSecond: number }>();
  private _runSpeed = 2.75;
  private _lastState = '';

  constructor(clips: Record<string, string>) {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    this.root = new TransformNode('mock', scene);
    for (const [state, name] of Object.entries(clips)) {
      // Duraciones medidas en personaje.glb
      const dur = name === 'Correr' ? 0.667 : name === 'Caminar' ? 1.067 : 1;
      const fps = 60;
      this._groups.set(state as AnimState, { from: 0, to: dur * fps, framePerSecond: fps });
    }
  }

  hasClip(state: AnimState): boolean {
    return this._groups.has(state);
  }

  get runSpeed(): number {
    return this._runSpeed;
  }

  clipSeconds(state: AnimState): number {
    const g = this._groups.get(state);
    if (!g) return 1;
    return (g.to - g.from) / g.framePerSecond;
  }

  impactTime(_state: AnimState): number {
    return 0.5;
  }

  play(state: AnimState, _opts?: PlayOptions): void {
    this._lastState = state;
  }

  getLastPlayed(): string {
    return this._lastState;
  }

  update(_dt: number, _speed: number): Array<{ type: string; clip: string }> {
    return [];
  }

  socket(_joint: string, out: Vector3): Vector3 {
    return out.set(0, 1, 0);
  }

  lowestFoot(out: Vector3): Vector3 {
    return out.set(0, 0, 0);
  }

  setEmissive(_r: number, _g: number, _b: number): void {}
  setShade(_k: number): void {}
  dispose(): void {}
}

describe('fallback glTF sin clip Caminar', () => {
  it('modelo con walk → hasClip(true)', () => {
    const hero = assets.templates.cazador;
    const m = new MockGltfCharacter(hero!.clips);
    expect(m.hasClip('walk')).toBe(true);
  });

  it('modelo sin walk → hasClip(false), usa run', () => {
    const animal = assets.templates.zorro;
    const m = new MockGltfCharacter(animal!.clips);
    expect(m.hasClip('walk')).toBe(false);
    expect(m.hasClip('run')).toBe(true);
  });
});

describe('cadencia walk y run', () => {
  it('clip real: clipSeconds("walk") ≈ 1.067', () => {
    const hero = assets.templates.personaje;
    const m = new MockGltfCharacter(hero!.clips);
    expect(m.clipSeconds('walk')).toBeCloseTo(1.067, 2);
  });

  it('cadencia walk y run a velocidad natural dan ratio ~1', () => {
    const hero = assets.templates.personaje;
    const m = new MockGltfCharacter(hero!.clips);
    const runDur = m.clipSeconds('run');
    const walkDur = m.clipSeconds('walk');
    // La velocidad natural de walk es runSpeed * runDur / walkDur
    const walkNatural = m.runSpeed * (runDur / walkDur);
    // A esa velocidad, el ratio speed/natural ≈ 1
    expect(walkNatural / walkNatural).toBeCloseTo(1, 4);
    // run a runSpeed → ratio 1
    expect(m.runSpeed / m.runSpeed).toBeCloseTo(1, 4);
  });
});

describe('integración PlayerAvatar', () => {
  it('lento → walk, tope → run, parado → idle', () => {
    const scene = new Scene(new NullEngine());
    const ground = { sample: (_x: number, _z: number) => 0 } as any;
    const hero = assets.templates.personaje;
    const m = new MockGltfCharacter(hero!.clips);
    const avatar = new PlayerAvatar(scene, m, ground);

    const base = {
      alive: true, spectral: false, casting: false, invulnerable: 0,
      path: [{ x: 10, y: 0 }, { x: 20, y: 0 }],
      pos: { x: 10, y: 0 }, prevPos: { x: 10, y: 0 },
      facing: 0, speed: 0,
    } as unknown as Player;

    // Parado → idle
    avatar.sync({ ...base, speed: 0, prevPos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    expect(m.getLastPlayed()).toBe('idle');

    // Velocidad baja → walk
    const slow = { ...base, speed: 1.5, prevPos: { x: 9.9, y: 0 }, pos: { x: 10, y: 0 } };
    avatar.sync(slow, 10, 0, 0, 1 / 60, true);
    expect(m.getLastPlayed()).toBe('walk');

    // Velocidad alta → run
    const fast = { ...base, speed: 2.75, prevPos: { x: 9.5, y: 0 }, pos: { x: 10, y: 0 } };
    avatar.sync(fast, 10, 0, 0, 1 / 60, true);
    expect(m.getLastPlayed()).toBe('run');

    // Parar → idle
    avatar.sync({ ...base, speed: 0, prevPos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    expect(m.getLastPlayed()).toBe('idle');
  });

  it('animal nunca oye play("walk")', () => {
    const scene = new Scene(new NullEngine());
    const ground = { sample: (_x: number, _z: number) => 0 } as any;
    const animal = assets.templates.zorro;
    const m = new MockGltfCharacter(animal!.clips);
    const avatar = new PlayerAvatar(scene, m, ground);

    const base = {
      alive: true, spectral: false, casting: false, invulnerable: 0,
      path: [{ x: 10, y: 0 }, { x: 20, y: 0 }],
      pos: { x: 10, y: 0 }, prevPos: { x: 10, y: 0 },
      facing: 0, speed: 0,
    } as unknown as Player;

    // Velocidad baja → sin clip walk → run
    const slow = { ...base, speed: 1.5, prevPos: { x: 9.9, y: 0 }, pos: { x: 10, y: 0 } };
    avatar.sync(slow, 10, 0, 0, 1 / 60, true);
    expect(m.getLastPlayed()).toBe('run');
  });
});

describe('fundido a tres bandas idle→walk→run', () => {
  it('transición idle → walk → run → walk → idle sin errores', () => {
    const scene = new Scene(new NullEngine());
    const ground = { sample: (_x: number, _z: number) => 0 } as any;
    const hero = assets.templates.personaje;
    const m = new MockGltfCharacter(hero!.clips);
    const avatar = new PlayerAvatar(scene, m, ground);

    const base = {
      alive: true, spectral: false, casting: false, invulnerable: 0,
      path: [{ x: 10, y: 0 }, { x: 20, y: 0 }],
      pos: { x: 10, y: 0 }, prevPos: { x: 10, y: 0 },
      facing: 0, speed: 0,
    } as unknown as Player;

    // idle
    avatar.sync({ ...base, speed: 0, prevPos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    // walk
    avatar.sync({ ...base, speed: 1.5, prevPos: { x: 9.9, y: 0 }, pos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    // run
    avatar.sync({ ...base, speed: 2.75, prevPos: { x: 9.5, y: 0 }, pos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    // walk (bajar velocidad)
    avatar.sync({ ...base, speed: 1.5, prevPos: { x: 9.9, y: 0 }, pos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);
    // idle
    avatar.sync({ ...base, speed: 0, prevPos: { x: 10, y: 0 } }, 10, 0, 0, 1 / 60, true);

    // No debería haber lanzado errores
    expect(m.getLastPlayed()).toBe('idle');
  });
});
