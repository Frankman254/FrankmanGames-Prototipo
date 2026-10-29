// Animación por keyframes para personajes hechos de piezas: rig de articulaciones,
// clips con claves de rotación (Euler) y desplazamiento, mezcla entre clips y
// eventos por fotograma (`footstep`, `hit`, `cast`) que vienen de los datos.
// Puro: sin DOM ni render. La convención de rotación es la de Babylon
// (yaw = Y, pitch = X, roll = Z), así el render aplica los mismos cuaterniones.

export type V3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface JointDef {
  name: string;
  parent: string | null;
  /** Posición de reposo en el espacio del padre (metros). */
  offset: V3;
}

export interface Rig {
  joints: JointDef[];
  index: Map<string, number>;
  parents: Int16Array;
}

/** Clave: tiempo normalizado [0, 1] y valor. */
export type Key = readonly [number, V3];

export interface ClipDef {
  /** Duración en segundos a velocidad 1. */
  duration: number;
  loop: boolean;
  /** Por articulación: claves de rotación (radianes) y de desplazamiento. */
  tracks: Record<string, { rot?: readonly Key[]; pos?: readonly Key[] }>;
}

export interface AnimEventDef {
  t: number;
  type: string;
}

export interface AnimEvent {
  type: string;
  clip: string;
}

export function makeRig(joints: JointDef[]): Rig {
  const index = new Map(joints.map((j, i) => [j.name, i]));
  const parents = new Int16Array(joints.length);
  joints.forEach((j, i) => {
    const p = j.parent === null ? -1 : index.get(j.parent);
    if (p === undefined || p >= i) throw new Error(`rig: el padre de ${j.name} debe ir antes (${j.parent})`);
    parents[i] = p;
  });
  return { joints, index, parents };
}

export function quatFromEuler(x: number, y: number, z: number): Quat {
  const hr = z * 0.5;
  const hp = x * 0.5;
  const hy = y * 0.5;
  const sr = Math.sin(hr);
  const cr = Math.cos(hr);
  const sp = Math.sin(hp);
  const cp = Math.cos(hp);
  const sy = Math.sin(hy);
  const cy = Math.cos(hy);
  return [cy * sp * cr + sy * cp * sr, sy * cp * cr - cy * sp * sr, cy * cp * sr - sy * sp * cr, cy * cp * cr + sy * sp * sr];
}

export function quatMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function quatRotate(q: Quat, v: V3): V3 {
  // v' = v + 2w(q×v) + 2 q×(q×v)
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

const ease = (k: number): number => k * k * (3 - 2 * k);

function sampleKeys(keys: readonly Key[], t: number, loop: boolean): V3 {
  const n = keys.length;
  if (n === 1) return keys[0]![1];
  if (t <= keys[0]![0] && !loop) return keys[0]![1];
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (t >= a[0] && t <= b[0]) {
      const k = b[0] > a[0] ? ease((t - a[0]) / (b[0] - a[0])) : 0;
      return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k];
    }
  }
  const last = keys[n - 1]!;
  if (!loop) return last[1];
  // En bucle, de la última clave a la primera (desplazada en 1).
  const first = keys[0]!;
  const span = first[0] + 1 - last[0];
  const pos = t >= last[0] ? t - last[0] : t + 1 - last[0];
  const k = span > 0 ? ease(pos / span) : 0;
  return [last[1][0] + (first[1][0] - last[1][0]) * k, last[1][1] + (first[1][1] - last[1][1]) * k, last[1][2] + (first[1][2] - last[1][2]) * k];
}

/** Pose: por articulación, cuaternión (4) + desplazamiento sobre el reposo (3). */
export type Pose = Float32Array;

export function newPose(rig: Rig): Pose {
  const p = new Float32Array(rig.joints.length * 7);
  for (let i = 0; i < rig.joints.length; i++) p[i * 7 + 3] = 1;
  return p;
}

export function evaluateClip(rig: Rig, clip: ClipDef, t: number, out: Pose): Pose {
  out.fill(0);
  for (let i = 0; i < rig.joints.length; i++) out[i * 7 + 3] = 1;
  for (const [name, tr] of Object.entries(clip.tracks)) {
    const i = rig.index.get(name);
    if (i === undefined) throw new Error(`clip: articulación desconocida ${name}`);
    if (tr.rot) {
      const e = sampleKeys(tr.rot, t, clip.loop);
      out.set(quatFromEuler(e[0], e[1], e[2]), i * 7);
    }
    if (tr.pos) out.set(sampleKeys(tr.pos, t, clip.loop), i * 7 + 4);
  }
  return out;
}

/** Mezcla `b` sobre `a` con peso `w` (nlerp de cuaterniones), en `a`. */
export function blendPose(a: Pose, b: Pose, w: number): void {
  for (let o = 0; o < a.length; o += 7) {
    const dot = a[o]! * b[o]! + a[o + 1]! * b[o + 1]! + a[o + 2]! * b[o + 2]! + a[o + 3]! * b[o + 3]!;
    const s = dot < 0 ? -w : w;
    let l = 0;
    for (let k = 0; k < 4; k++) {
      a[o + k] = a[o + k]! * (1 - w) + b[o + k]! * s;
      l += a[o + k]! * a[o + k]!;
    }
    l = Math.sqrt(l) || 1;
    for (let k = 0; k < 4; k++) a[o + k] = a[o + k]! / l;
    for (let k = 4; k < 7; k++) a[o + k] = a[o + k]! * (1 - w) + b[o + k]! * w;
  }
}

/** Posición en el espacio del modelo de un punto local de una articulación (cinemática directa). */
export function pointInModel(rig: Rig, pose: Pose, joint: string, local: V3 = [0, 0, 0]): V3 {
  const chain: number[] = [];
  for (let i = rig.index.get(joint)!; i >= 0; i = rig.parents[i]!) chain.unshift(i);
  let q: Quat = [0, 0, 0, 1];
  let p: V3 = [0, 0, 0];
  for (const i of chain) {
    const off = rig.joints[i]!.offset;
    const o = i * 7;
    const local3: V3 = [off[0] + pose[o + 4]!, off[1] + pose[o + 5]!, off[2] + pose[o + 6]!];
    const r = quatRotate(q, local3);
    p = [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
    q = quatMul(q, [pose[o]!, pose[o + 1]!, pose[o + 2]!, pose[o + 3]!]);
  }
  const r = quatRotate(q, local);
  return [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
}

/** Eventos cuyo instante normalizado cae en (from, to]; con bucle, `to` < `from` significa vuelta. */
export function crossedEvents(events: readonly AnimEventDef[], from: number, to: number, wrapped: boolean): AnimEventDef[] {
  return events.filter((e) => (wrapped ? e.t > from || e.t <= to : e.t > from && e.t <= to));
}

interface Layer {
  clip: string;
  time: number;
  speed: number;
}

/**
 * Reproduce un clip a la vez con fundido desde el anterior. `update` avanza el
 * tiempo, devuelve los eventos cruzados del clip actual y deja la pose mezclada.
 */
export class Animator {
  readonly pose: Pose;
  private readonly tmp: Pose;
  private cur: Layer | null = null;
  private prev: Layer | null = null;
  private fade = 1;

  constructor(
    readonly rig: Rig,
    private readonly clips: Record<string, ClipDef>,
    private readonly events: Record<string, readonly AnimEventDef[]>,
    private readonly blendSeconds: number,
  ) {
    this.pose = newPose(rig);
    this.tmp = newPose(rig);
  }

  get current(): string | null {
    return this.cur?.clip ?? null;
  }

  /** Tiempo normalizado del clip actual (0–1). */
  get normalizedTime(): number {
    if (!this.cur) return 0;
    const d = this.clips[this.cur.clip]!;
    return this.cur.time / d.duration;
  }

  /** ¿El clip actual (sin bucle) llegó al final? */
  get finished(): boolean {
    if (!this.cur) return true;
    const d = this.clips[this.cur.clip]!;
    return !d.loop && this.cur.time >= d.duration;
  }

  has(clip: string): boolean {
    return clip in this.clips;
  }

  /** Cambia de clip (sin efecto si ya suena, salvo `restart`). `speed` escala el tiempo. */
  play(clip: string, speed = 1, restart = false): void {
    if (!this.clips[clip]) throw new Error(`animación desconocida: ${clip}`);
    if (this.cur && this.cur.clip === clip && !restart) {
      this.cur.speed = speed;
      return;
    }
    this.prev = this.cur;
    this.cur = { clip, time: 0, speed };
    this.fade = this.prev ? 0 : 1;
  }

  setSpeed(speed: number): void {
    if (this.cur) this.cur.speed = speed;
  }

  update(dt: number): AnimEvent[] {
    const out: AnimEvent[] = [];
    if (!this.cur) return out;
    const c = this.cur;
    const def = this.clips[c.clip]!;
    const from = c.time / def.duration;
    c.time += dt * c.speed;
    let wrapped = false;
    if (def.loop) {
      if (c.time >= def.duration) {
        c.time %= def.duration;
        wrapped = true;
      }
    } else if (c.time > def.duration) c.time = def.duration;
    const to = c.time / def.duration;
    if (wrapped || to > from) {
      for (const e of crossedEvents(this.events[c.clip] ?? [], from, to, wrapped)) out.push({ type: e.type, clip: c.clip });
    }

    if (this.prev) {
      const pd = this.clips[this.prev.clip]!;
      this.prev.time = pd.loop ? (this.prev.time + dt * this.prev.speed) % pd.duration : Math.min(pd.duration, this.prev.time + dt * this.prev.speed);
      this.fade = this.blendSeconds > 0 ? Math.min(1, this.fade + dt / this.blendSeconds) : 1;
    }
    evaluateClip(this.rig, def, c.time / def.duration, this.pose);
    if (this.prev && this.fade < 1) {
      const pd = this.clips[this.prev.clip]!;
      evaluateClip(this.rig, pd, this.prev.time / pd.duration, this.tmp);
      blendPose(this.tmp, this.pose, ease(this.fade));
      this.pose.set(this.tmp);
    } else {
      this.prev = null;
    }
    return out;
  }
}
