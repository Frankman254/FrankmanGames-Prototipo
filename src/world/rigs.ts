// Rigs procedurales (humanoide y cuadrúpedo) y sus clips de keyframes. El
// personaje mira hacia +X local; las piernas cuelgan hacia −Y y una rotación Z
// positiva las lleva hacia delante (en el tronco, Z negativa es inclinarse
// hacia delante). Los eventos por fotograma NO están aquí: van en
// data/animation.json y se comprueban contra estas poses en los tests.
import { evaluateClip, makeRig, newPose, pointInModel, type ClipDef, type Key, type Rig, type V3 } from './anim';

export const ANIM_STATES = ['idle', 'run', 'attack', 'cast', 'evade', 'hit', 'death'] as const;
export type AnimState = (typeof ANIM_STATES)[number];

export const ANIM_EVENT_TYPES = ['footstep', 'hit', 'cast'] as const;

export const PROCEDURAL_MODELS = ['humanoid', 'archer', 'shaman', 'imp', 'wolf', 'fox', 'turtle', 'owl'] as const;
export type ProceduralModel = (typeof PROCEDURAL_MODELS)[number];

export interface ModelAnim {
  rig: Rig;
  clips: Record<string, ClipDef>;
  /** Articulaciones de los pies y punto de apoyo en su espacio local. */
  feet: string[];
  sole: V3;
}

/** Altura del apoyo más bajo en la pose de reposo: el render baja el modelo eso. */
export function restFootY(a: ModelAnim): number {
  if (a.feet.length === 0) return 0; // vuela: el origen del modelo ya está en el suelo
  const pose = evaluateClip(a.rig, a.clips['idle']!, 0, newPose(a.rig));
  return Math.min(...a.feet.map((f) => pointInModel(a.rig, pose, f, a.sole)[1]));
}

// ── utilidades de claves ────────────────────────────────────────────────────

const k = (t: number, x: number, y: number, z: number): Key => [t, [x, y, z]];
/** Claves sólo de giro Z (balanceo adelante/atrás). */
const z = (...pairs: Array<[number, number]>): Key[] => pairs.map(([t, v]) => k(t, 0, 0, v));
/** Desfasa unas claves en bucle (mitad de ciclo para la otra pierna). */
function shift(keys: readonly Key[], by: number): Key[] {
  return keys.map(([t, v]) => [(t + by) % 1, v] as Key).sort((a, b) => a[0] - b[0]);
}
/** Suma una rotación constante a una articulación en todos los clips (postura). */
function withBias(clips: Record<string, ClipDef>, joint: string, bias: V3): Record<string, ClipDef> {
  const out: Record<string, ClipDef> = {};
  for (const [name, c] of Object.entries(clips)) {
    const tracks = { ...c.tracks };
    const tr = tracks[joint] ?? {};
    const rot = tr.rot ?? [k(0, 0, 0, 0)];
    tracks[joint] = { ...tr, rot: rot.map(([t, v]) => [t, [v[0] + bias[0], v[1] + bias[1], v[2] + bias[2]]] as Key) };
    out[name] = { ...c, tracks };
  }
  return out;
}

// ── humanoide ───────────────────────────────────────────────────────────────

export interface HumanoidProportions {
  /** Escala vertical de piernas y tronco. */
  height: number;
  /** Separación de hombros y caderas. */
  width: number;
}

export function humanoidRig(p: HumanoidProportions = { height: 1, width: 1 }): Rig {
  const h = p.height;
  const w = p.width;
  return makeRig([
    { name: 'hips', parent: null, offset: [0, 0.95 * h, 0] },
    { name: 'spine', parent: 'hips', offset: [0, 0.12 * h, 0] },
    { name: 'chest', parent: 'spine', offset: [0, 0.25 * h, 0] },
    { name: 'head', parent: 'chest', offset: [0, 0.3 * h, 0] },
    { name: 'armL', parent: 'chest', offset: [0, 0.2 * h, 0.22 * w] },
    { name: 'foreL', parent: 'armL', offset: [0, -0.29 * h, 0] },
    { name: 'handL', parent: 'foreL', offset: [0, -0.26 * h, 0] },
    { name: 'armR', parent: 'chest', offset: [0, 0.2 * h, -0.22 * w] },
    { name: 'foreR', parent: 'armR', offset: [0, -0.29 * h, 0] },
    { name: 'handR', parent: 'foreR', offset: [0, -0.26 * h, 0] },
    { name: 'legL', parent: 'hips', offset: [0, -0.05 * h, 0.1 * w] },
    { name: 'shinL', parent: 'legL', offset: [0, -0.43 * h, 0] },
    { name: 'footL', parent: 'shinL', offset: [0, -0.43 * h, 0] },
    { name: 'legR', parent: 'hips', offset: [0, -0.05 * h, -0.1 * w] },
    { name: 'shinR', parent: 'legR', offset: [0, -0.43 * h, 0] },
    { name: 'footR', parent: 'shinR', offset: [0, -0.43 * h, 0] },
  ]);
}

const RUN_LEG: Key[] = z([0, 0.5], [0.25, -0.05], [0.5, -0.55], [0.75, 0.25]);
const RUN_SHIN: Key[] = z([0, -0.15], [0.2, -0.2], [0.5, -0.55], [0.68, -1.45], [0.88, -0.75]);
const RUN_FOOT: Key[] = z([0, 0.25], [0.2, 0], [0.5, -0.45], [0.75, 0.1]);
const RUN_ARM: Key[] = z([0, -0.55], [0.5, 0.55]);

/** Ataque según el arma: espada (arco amplio), arco (tensar y soltar), garra. */
export type HumanoidAttack = 'sword' | 'bow' | 'claw';

export function humanoidClips(attack: HumanoidAttack, hipsBob: readonly Key[]): Record<string, ClipDef> {
  const swing: ClipDef =
    attack === 'bow'
      ? {
          duration: 0.8,
          loop: false,
          tracks: {
            spine: { rot: [k(0, 0, 0, 0), k(0.3, 0, -0.5, 0), k(0.7, 0, -0.5, 0), k(1, 0, 0, 0)] },
            // Brazo izquierdo extendido con el arco; el derecho tensa y suelta.
            armL: { rot: [k(0, 0, 0, 0), k(0.3, -0.2, 0, 1.5), k(0.8, -0.2, 0, 1.5), k(1, 0, 0, 0.2)] },
            armR: { rot: [k(0, 0, 0, 0), k(0.3, 0.3, 0, 1.3), k(0.55, 0.4, 0, 0.9), k(0.6, 0.2, 0, 1.4), k(1, 0, 0, 0.2)] },
            foreR: { rot: [k(0, 0, 0, 0), k(0.3, 0, 0, 0.6), k(0.55, 0, 0, 1.9), k(0.6, 0, 0, 0.2), k(1, 0, 0, 0.3)] },
          },
        }
      : {
          duration: attack === 'claw' ? 0.45 : 0.6,
          loop: false,
          tracks: {
            spine: { rot: [k(0, 0, 0, 0), k(0.35, 0, 0.45, 0.1), k(0.5, 0, -0.5, -0.25), k(1, 0, 0, 0)] },
            armR: { rot: [k(0, 0, 0, 0), k(0.35, -0.6, 0, -1.2), k(0.5, 0.4, 0, 1.6), k(0.7, 0.2, 0, 1.2), k(1, 0, 0, 0)] },
            foreR: { rot: z([0, 0.3], [0.35, 1.6], [0.5, 0.2], [1, 0.3]) },
            armL: { rot: z([0, 0], [0.4, 0.5], [1, 0]) },
            legL: { rot: z([0, 0], [0.4, 0.35], [1, 0]) },
            legR: { rot: z([0, 0], [0.4, -0.25], [1, 0]) },
          },
        };
  return {
    idle: {
      duration: 2.4,
      loop: true,
      tracks: {
        chest: { rot: z([0, 0], [0.5, -0.04]) },
        head: { rot: [k(0, 0, 0, 0), k(0.5, 0, 0.1, 0.03)] },
        armL: { rot: [k(0, 0.12, 0, 0.05), k(0.5, 0.15, 0, 0.0)] },
        armR: { rot: [k(0, -0.12, 0, 0.05), k(0.5, -0.15, 0, 0.0)] },
        foreL: { rot: z([0, 0.2], [0.5, 0.3]) },
        foreR: { rot: z([0, 0.2], [0.5, 0.3]) },
        hips: { pos: [k(0, 0, 0, 0), k(0.5, 0, -0.015, 0)] },
      },
    },
    run: {
      duration: 0.72,
      loop: true,
      tracks: {
        hips: { pos: [...hipsBob], rot: [k(0, 0, 0.15, 0), k(0.5, 0, -0.15, 0)] },
        spine: { rot: z([0, -0.22]) },
        head: { rot: z([0, 0.15]) },
        legL: { rot: RUN_LEG },
        shinL: { rot: RUN_SHIN },
        footL: { rot: RUN_FOOT },
        legR: { rot: shift(RUN_LEG, 0.5) },
        shinR: { rot: shift(RUN_SHIN, 0.5) },
        footR: { rot: shift(RUN_FOOT, 0.5) },
        armL: { rot: RUN_ARM.map(([t, v]) => [t, [0.1, 0, v[2]]] as Key) },
        armR: { rot: shift(RUN_ARM, 0.5).map(([t, v]) => [t, [-0.1, 0, v[2]]] as Key) },
        foreL: { rot: z([0, 1.1]) },
        foreR: { rot: z([0, 1.1]) },
      },
    },
    attack: swing,
    cast: {
      duration: 0.75,
      loop: false,
      tracks: {
        spine: { rot: z([0, 0], [0.4, 0.2], [0.55, -0.25], [1, 0]) },
        armL: { rot: [k(0, 0, 0, 0), k(0.4, -0.5, 0, 2.6), k(0.55, -0.3, 0, 1.5), k(1, 0, 0, 0)] },
        armR: { rot: [k(0, 0, 0, 0), k(0.4, 0.5, 0, 2.6), k(0.55, 0.3, 0, 1.5), k(1, 0, 0, 0)] },
        head: { rot: z([0, 0], [0.4, 0.3], [0.55, -0.1], [1, 0]) },
      },
    },
    evade: {
      duration: 0.45,
      loop: false,
      tracks: {
        hips: { pos: [k(0, 0, 0, 0), k(0.3, 0, -0.35, 0), k(0.7, 0, -0.35, 0), k(1, 0, 0, 0)], rot: z([0, 0], [0.3, -0.9], [0.7, -0.9], [1, 0]) },
        spine: { rot: z([0, 0], [0.3, -0.5], [0.7, -0.5], [1, 0]) },
        legL: { rot: z([0, 0], [0.3, 1.6], [0.7, 1.6], [1, 0]) },
        shinL: { rot: z([0, 0], [0.3, -2.0], [0.7, -2.0], [1, 0]) },
        legR: { rot: z([0, 0], [0.3, 1.3], [0.7, 1.3], [1, 0]) },
        shinR: { rot: z([0, 0], [0.3, -2.1], [0.7, -2.1], [1, 0]) },
        armL: { rot: z([0, 0], [0.3, 1.0], [1, 0]) },
        armR: { rot: z([0, 0], [0.3, 1.0], [1, 0]) },
      },
    },
    hit: {
      duration: 0.3,
      loop: false,
      tracks: {
        spine: { rot: z([0, 0], [0.25, 0.35], [1, 0]) },
        head: { rot: z([0, 0], [0.25, 0.4], [1, 0]) },
        armL: { rot: z([0, 0], [0.25, -0.5], [1, 0]) },
        armR: { rot: z([0, 0], [0.25, -0.5], [1, 0]) },
      },
    },
    death: {
      duration: 1.0,
      loop: false,
      tracks: {
        // Cae de espaldas: rodillas que ceden, tronco que se tumba y queda en el suelo.
        hips: { pos: [k(0, 0, 0, 0), k(0.35, 0, -0.45, 0), k(0.75, -0.3, -0.8, 0), k(1, -0.3, -0.8, 0)], rot: z([0, 0], [0.35, 0.2], [0.75, 1.5], [1, 1.5]) },
        spine: { rot: z([0, 0], [0.35, -0.3], [0.75, 0.1], [1, 0.1]) },
        head: { rot: z([0, 0], [0.75, 0.3], [1, 0.2]) },
        legL: { rot: z([0, 0], [0.35, 0.9], [0.75, -0.4], [1, -0.4]) },
        shinL: { rot: z([0, 0], [0.35, -1.6], [0.75, -0.3], [1, -0.3]) },
        legR: { rot: z([0, 0], [0.35, 0.7], [0.75, -1.0], [1, -1.0]) },
        shinR: { rot: z([0, 0], [0.35, -1.4], [0.75, -0.6], [1, -0.6]) },
        armL: { rot: [k(0, 0, 0, 0), k(0.75, 1.2, 0, -1.2), k(1, 1.3, 0, -1.3)] },
        armR: { rot: [k(0, 0, 0, 0), k(0.75, -1.2, 0, -1.0), k(1, -1.3, 0, -1.1)] },
      },
    },
  };
}

// ── cuadrúpedo (lobo) ───────────────────────────────────────────────────────

export interface QuadrupedProportions {
  /** Media longitud del cuerpo (pecho y cadera respecto al centro). */
  half: number;
  /** Longitud de cada tramo de pata. */
  leg: number;
  /** Separación lateral de las patas. */
  width: number;
}

export function wolfRig(p: QuadrupedProportions = { half: 0.32, leg: 0.24, width: 0.14 }): Rig {
  const h = 0.6 - (0.24 - p.leg) * 2;
  return makeRig([
    { name: 'body', parent: null, offset: [0, h, 0] },
    { name: 'chest', parent: 'body', offset: [p.half, 0.04, 0] },
    { name: 'head', parent: 'chest', offset: [p.half * 0.95, 0.14 * (p.leg / 0.24), 0] },
    { name: 'jaw', parent: 'head', offset: [0.12, -0.08, 0] },
    { name: 'tail', parent: 'body', offset: [-p.half * 1.3, 0.06, 0] },
    { name: 'legFL', parent: 'chest', offset: [0.05, -0.08, p.width] },
    { name: 'shinFL', parent: 'legFL', offset: [0, -p.leg, 0] },
    { name: 'legFR', parent: 'chest', offset: [0.05, -0.08, -p.width] },
    { name: 'shinFR', parent: 'legFR', offset: [0, -p.leg, 0] },
    { name: 'legBL', parent: 'body', offset: [-p.half, -0.05, p.width] },
    { name: 'shinBL', parent: 'legBL', offset: [0, -p.leg, 0] },
    { name: 'legBR', parent: 'body', offset: [-p.half, -0.05, -p.width] },
    { name: 'shinBR', parent: 'legBR', offset: [0, -p.leg, 0] },
  ]);
}

// ── ave (búho) ──────────────────────────────────────────────────────────────

export function owlRig(): Rig {
  return makeRig([
    // Vuela a media altura: el origen del modelo es el suelo bajo él.
    { name: 'body', parent: null, offset: [0, 1.25, 0] },
    { name: 'head', parent: 'body', offset: [0.02, 0.2, 0] },
    { name: 'wingL', parent: 'body', offset: [0, 0.08, 0.13] },
    { name: 'wingR', parent: 'body', offset: [0, 0.08, -0.13] },
    { name: 'tail', parent: 'body', offset: [-0.12, -0.1, 0] },
    { name: 'talons', parent: 'body', offset: [0.02, -0.16, 0] },
  ]);
}

export function owlClips(): Record<string, ClipDef> {
  // Alas: X positiva levanta la izquierda (+Z) y negativa la derecha.
  const flap = (amp: number): { L: Key[]; R: Key[] } => ({
    L: [k(0, amp, 0, 0), k(0.5, -amp * 0.6, 0, 0)],
    R: [k(0, -amp, 0, 0), k(0.5, amp * 0.6, 0, 0)],
  });
  const slow = flap(0.35);
  const fast = flap(1.0);
  return {
    idle: {
      duration: 0.9,
      loop: true,
      tracks: {
        body: { pos: [k(0, 0, 0.04, 0), k(0.5, 0, -0.04, 0)] },
        head: { rot: [k(0, 0, 0.25, 0), k(0.5, 0, -0.25, 0)] },
        wingL: { rot: slow.L },
        wingR: { rot: slow.R },
      },
    },
    run: {
      duration: 0.35,
      loop: true,
      tracks: {
        body: { pos: [k(0, 0, 0.05, 0), k(0.5, 0, -0.05, 0)], rot: z([0, -0.25]) },
        wingL: { rot: fast.L },
        wingR: { rot: fast.R },
        tail: { rot: z([0, 0.3]) },
      },
    },
    attack: {
      duration: 0.6,
      loop: false,
      tracks: {
        // Picado: baja, abre las garras y vuelve a subir.
        body: { pos: [k(0, 0, 0, 0), k(0.45, 0.4, -0.7, 0), k(1, 0, 0, 0)], rot: z([0, 0], [0.45, -0.6], [1, 0]) },
        wingL: { rot: [k(0, 0.9, 0, 0), k(0.45, 1.3, 0, 0), k(0.7, -0.6, 0, 0), k(1, 0.3, 0, 0)] },
        wingR: { rot: [k(0, -0.9, 0, 0), k(0.45, -1.3, 0, 0), k(0.7, 0.6, 0, 0), k(1, -0.3, 0, 0)] },
        talons: { rot: z([0, 0], [0.45, 0.8], [1, 0]) },
      },
    },
    hit: {
      duration: 0.3,
      loop: false,
      tracks: { body: { rot: [k(0, 0, 0, 0), k(0.3, 0.4, 0, 0.3), k(1, 0, 0, 0)] } },
    },
    death: {
      duration: 0.8,
      loop: false,
      tracks: {
        body: { pos: [k(0, 0, 0, 0), k(1, 0, -1.1, 0)], rot: [k(0, 0, 0, 0), k(1, 1.4, 0, 0)] },
        wingL: { rot: [k(0, 0, 0, 0), k(1, -0.6, 0, 0)] },
        wingR: { rot: [k(0, 0, 0, 0), k(1, 0.6, 0, 0)] },
      },
    },
  };
}

export function wolfClips(): Record<string, ClipDef> {
  return quadrupedClips(1);
}

/** Clips de cuadrúpedo; `stride` escala la amplitud de las patas (tortuga < 1). */
export function quadrupedClips(stride: number): Record<string, ClipDef> {
  const TROT_LEG: Key[] = z([0, 0.55 * stride], [0.5, -0.55 * stride]);
  const TROT_SHIN: Key[] = z([0, 0], [0.25, -0.1 * stride], [0.5, -0.2 * stride], [0.75, -1.1 * stride]);
  // Trote: diagonales en fase (delantera izquierda con trasera derecha).
  return {
    idle: {
      duration: 1.8,
      loop: true,
      tracks: {
        body: { pos: [k(0, 0, 0, 0), k(0.5, 0, -0.015, 0)] },
        head: { rot: z([0, 0.05], [0.5, -0.05]) },
        tail: { rot: [k(0, 0.3, 0, 0.5), k(0.5, -0.3, 0, 0.5)] },
        jaw: { rot: z([0, -0.15], [0.5, -0.25]) },
      },
    },
    run: {
      duration: 0.5,
      loop: true,
      tracks: {
        body: { pos: [k(0, 0, -0.035, 0), k(0.25, 0, 0.0, 0), k(0.5, 0, -0.035, 0), k(0.75, 0, 0.0, 0)] },
        head: { rot: z([0, -0.15]) },
        tail: { rot: [k(0, 0, 0.2, 0.2), k(0.5, 0, -0.2, 0.2)] },
        legFL: { rot: TROT_LEG },
        shinFL: { rot: TROT_SHIN },
        legBR: { rot: TROT_LEG },
        shinBR: { rot: TROT_SHIN },
        legFR: { rot: shift(TROT_LEG, 0.5) },
        shinFR: { rot: shift(TROT_SHIN, 0.5) },
        legBL: { rot: shift(TROT_LEG, 0.5) },
        shinBL: { rot: shift(TROT_SHIN, 0.5) },
      },
    },
    attack: {
      duration: 0.6,
      loop: false,
      tracks: {
        // Se agacha, se lanza y muerde.
        body: { pos: [k(0, 0, 0, 0), k(0.35, -0.1, -0.12, 0), k(0.5, 0.35, 0.05, 0), k(1, 0, 0, 0)], rot: z([0, 0], [0.35, 0.15], [0.5, -0.2], [1, 0]) },
        head: { rot: z([0, 0], [0.35, 0.3], [0.5, -0.35], [1, 0]) },
        jaw: { rot: z([0, 0], [0.35, -0.7], [0.5, 0], [1, 0]) },
        legFL: { rot: z([0, 0], [0.35, -0.4], [0.5, 0.9], [1, 0]) },
        legFR: { rot: z([0, 0], [0.35, -0.4], [0.5, 0.9], [1, 0]) },
        legBL: { rot: z([0, 0], [0.35, 0.5], [0.5, -0.7], [1, 0]) },
        legBR: { rot: z([0, 0], [0.35, 0.5], [0.5, -0.7], [1, 0]) },
      },
    },
    hit: {
      duration: 0.3,
      loop: false,
      tracks: {
        body: { rot: [k(0, 0, 0, 0), k(0.25, 0.25, 0, 0.15), k(1, 0, 0, 0)] },
        head: { rot: z([0, 0], [0.25, 0.4], [1, 0]) },
      },
    },
    death: {
      duration: 0.9,
      loop: false,
      tracks: {
        // Se desploma de lado.
        body: { pos: [k(0, 0, 0, 0), k(0.6, 0, -0.4, 0), k(1, 0, -0.42, 0)], rot: [k(0, 0, 0, 0), k(0.6, 1.45, 0, 0), k(1, 1.5, 0, 0)] },
        head: { rot: z([0, 0], [0.6, -0.3], [1, -0.4]) },
        legFL: { rot: z([0, 0], [0.6, 0.6], [1, 0.6]) },
        legFR: { rot: z([0, 0], [0.6, 0.4], [1, 0.4]) },
        legBL: { rot: z([0, 0], [0.6, -0.5], [1, -0.5]) },
        legBR: { rot: z([0, 0], [0.6, -0.3], [1, -0.3]) },
        tail: { rot: z([0, 0], [1, -0.3]) },
      },
    },
  };
}

// ── catálogo ─────────────────────────────────────────────────────────────────

/** Bamboleo vertical de cadera al correr: baja en cada apoyo (t = 0 y 0,5). */
const HIPS_BOB: Key[] = [k(0, 0, -0.07, 0), k(0.25, 0, 0.02, 0), k(0.5, 0, -0.07, 0), k(0.75, 0, 0.02, 0)];

const BIPED_FEET = { feet: ['footL', 'footR'], sole: [0, 0, 0] as V3 };
const QUAD_FEET = (leg: number): { feet: string[]; sole: V3 } => ({ feet: ['shinFL', 'shinFR', 'shinBL', 'shinBR'], sole: [0, -leg, 0] });

export function proceduralAnim(model: ProceduralModel): ModelAnim {
  switch (model) {
    case 'humanoid':
      return { rig: humanoidRig(), clips: humanoidClips('sword', HIPS_BOB), ...BIPED_FEET };
    case 'archer':
      return { rig: humanoidRig({ height: 0.92, width: 0.75 }), clips: humanoidClips('bow', HIPS_BOB), ...BIPED_FEET };
    case 'shaman': {
      // Encorvado: el tronco va siempre inclinado y la cabeza compensa.
      let clips = withBias(humanoidClips('sword', HIPS_BOB), 'spine', [0, 0, -0.5]);
      clips = withBias(clips, 'head', [0, 0, 0.35]);
      // Su «ataque» es invocar: alza el báculo.
      clips['attack'] = clips['cast']!;
      return { rig: humanoidRig({ height: 1.0, width: 1.1 }), clips, ...BIPED_FEET };
    }
    case 'imp':
      return { rig: humanoidRig({ height: 0.5, width: 0.8 }), clips: humanoidClips('claw', HIPS_BOB.map(([t, v]) => [t, [v[0], v[1] * 0.5, v[2]]] as Key)), ...BIPED_FEET };
    case 'wolf':
      return { rig: wolfRig(), clips: wolfClips(), ...QUAD_FEET(0.24) };
    case 'fox':
      return { rig: wolfRig({ half: 0.2, leg: 0.15, width: 0.09 }), clips: quadrupedClips(1), ...QUAD_FEET(0.15) };
    case 'turtle':
      return { rig: wolfRig({ half: 0.22, leg: 0.1, width: 0.2 }), clips: quadrupedClips(0.6), ...QUAD_FEET(0.1) };
    case 'owl':
      return { rig: owlRig(), clips: owlClips(), feet: [], sole: [0, 0, 0] };
  }
}
