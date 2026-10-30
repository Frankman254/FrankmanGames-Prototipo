// Protocolo binario propio de la prueba de concepto online (PROPUESTA).
// Todo little-endian. El primer byte de cada mensaje es su tipo; cliente →
// servidor por debajo de 0x80, servidor → cliente desde 0x80. Las posiciones
// viajan en centímetros sin signo (u16: hasta 655 m, el tamaño de una celda
// de mundo; ver docs/ARQUITECTURA_ONLINE.md §5) y el rumbo en 256 pasos.

export const PROTOCOL_VERSION = 1;

export const MSG = {
  hello: 0x01,
  move: 0x02,
  welcome: 0x81,
  snapshot: 0x82,
  reject: 0x83,
} as const;

/** Tipo de entidad en una instantánea. */
export const KIND = { avatar: 1, enemy: 2 } as const;

/** Motivos de rechazo de una orden. */
export const REJECT = { rate: 1, invalid: 2 } as const;

export interface HelloMsg {
  type: 'hello';
  version: number;
  name: string;
}

export interface MoveMsg {
  type: 'move';
  /** Número de orden del cliente: el servidor lo devuelve en `ackSeq`. */
  seq: number;
  x: number;
  y: number;
}

export type ClientMsg = HelloMsg | MoveMsg;

export interface WelcomeMsg {
  type: 'welcome';
  version: number;
  entityId: number;
  tickHz: number;
  snapshotHz: number;
}

/** Estado cuantizado de una entidad tal como viaja. */
export interface EntityState {
  id: number;
  kind: number;
  /** Centímetros. */
  x: number;
  y: number;
  /** 0–255 = 0–2π. */
  facing: number;
  /** Bit 0: vivo; bit 1: en movimiento. */
  flags: number;
}

export interface SnapshotMsg {
  type: 'snapshot';
  tick: number;
  /** Última orden del cliente ya aplicada (para la reconciliación). */
  ackSeq: number;
  /** Entidades nuevas o cambiadas desde la última instantánea a este cliente. */
  entities: EntityState[];
  /** Entidades que salieron del área de interés o desaparecieron. */
  removed: number[];
}

export interface RejectMsg {
  type: 'reject';
  seq: number;
  reason: number;
}

export type ServerMsg = WelcomeMsg | SnapshotMsg | RejectMsg;

const ENTITY_BYTES = 11;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function quantizePos(m: number): number {
  return Math.max(0, Math.min(0xffff, Math.round(m * 100)));
}

export function quantizeFacing(rad: number): number {
  const turns = rad / (2 * Math.PI);
  return Math.round((turns - Math.floor(turns)) * 256) & 0xff;
}

export function encodeClient(m: ClientMsg): Uint8Array {
  if (m.type === 'hello') {
    const name = enc.encode(m.name).subarray(0, 32);
    const b = new Uint8Array(4 + name.length);
    const v = new DataView(b.buffer);
    v.setUint8(0, MSG.hello);
    v.setUint16(1, m.version, true);
    v.setUint8(3, name.length);
    b.set(name, 4);
    return b;
  }
  const b = new Uint8Array(13);
  const v = new DataView(b.buffer);
  v.setUint8(0, MSG.move);
  v.setUint32(1, m.seq, true);
  v.setFloat32(5, m.x, true);
  v.setFloat32(9, m.y, true);
  return b;
}

/** Devuelve null si el mensaje está mal formado (el servidor no se fía del cliente). */
export function decodeClient(b: Uint8Array): ClientMsg | null {
  if (b.length < 1) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  switch (b[0]) {
    case MSG.hello: {
      if (b.length < 4) return null;
      const len = v.getUint8(3);
      if (b.length !== 4 + len || len > 32) return null;
      return { type: 'hello', version: v.getUint16(1, true), name: dec.decode(b.subarray(4)) };
    }
    case MSG.move: {
      if (b.length !== 13) return null;
      const x = v.getFloat32(5, true);
      const y = v.getFloat32(9, true);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { type: 'move', seq: v.getUint32(1, true), x, y };
    }
    default:
      return null;
  }
}

export function encodeServer(m: ServerMsg): Uint8Array {
  if (m.type === 'welcome') {
    const b = new Uint8Array(9);
    const v = new DataView(b.buffer);
    v.setUint8(0, MSG.welcome);
    v.setUint16(1, m.version, true);
    v.setUint32(3, m.entityId, true);
    v.setUint8(7, m.tickHz);
    v.setUint8(8, m.snapshotHz);
    return b;
  }
  if (m.type === 'reject') {
    const b = new Uint8Array(6);
    const v = new DataView(b.buffer);
    v.setUint8(0, MSG.reject);
    v.setUint32(1, m.seq, true);
    v.setUint8(5, m.reason);
    return b;
  }
  const b = new Uint8Array(13 + m.entities.length * ENTITY_BYTES + m.removed.length * 4);
  const v = new DataView(b.buffer);
  v.setUint8(0, MSG.snapshot);
  v.setUint32(1, m.tick, true);
  v.setUint32(5, m.ackSeq, true);
  v.setUint16(9, m.entities.length, true);
  let o = 11;
  for (const e of m.entities) {
    v.setUint32(o, e.id, true);
    v.setUint8(o + 4, e.kind);
    v.setUint16(o + 5, e.x, true);
    v.setUint16(o + 7, e.y, true);
    v.setUint8(o + 9, e.facing);
    v.setUint8(o + 10, e.flags);
    o += ENTITY_BYTES;
  }
  v.setUint16(o, m.removed.length, true);
  o += 2;
  for (const id of m.removed) {
    v.setUint32(o, id, true);
    o += 4;
  }
  return b;
}

export function decodeServer(b: Uint8Array): ServerMsg {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  switch (b[0]) {
    case MSG.welcome:
      return { type: 'welcome', version: v.getUint16(1, true), entityId: v.getUint32(3, true), tickHz: v.getUint8(7), snapshotHz: v.getUint8(8) };
    case MSG.reject:
      return { type: 'reject', seq: v.getUint32(1, true), reason: v.getUint8(5) };
    case MSG.snapshot: {
      const n = v.getUint16(9, true);
      const entities: EntityState[] = [];
      let o = 11;
      for (let i = 0; i < n; i++) {
        entities.push({
          id: v.getUint32(o, true),
          kind: v.getUint8(o + 4),
          x: v.getUint16(o + 5, true),
          y: v.getUint16(o + 7, true),
          facing: v.getUint8(o + 9),
          flags: v.getUint8(o + 10),
        });
        o += ENTITY_BYTES;
      }
      const r = v.getUint16(o, true);
      o += 2;
      const removed: number[] = [];
      for (let i = 0; i < r; i++) {
        removed.push(v.getUint32(o, true));
        o += 4;
      }
      return { type: 'snapshot', tick: v.getUint32(1, true), ackSeq: v.getUint32(5, true), entities, removed };
    }
    default:
      throw new Error(`Mensaje de servidor desconocido: ${b[0]}`);
  }
}

/**
 * Bytes que añade el marco WebSocket (RFC 6455) a un mensaje binario de
 * `len` bytes. Los mensajes del cliente van enmascarados (+4).
 */
export function wsFrameOverhead(len: number, fromClient: boolean): number {
  const header = len < 126 ? 2 : len < 65536 ? 4 : 10;
  return header + (fromClient ? 4 : 0);
}
