import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { decodeClient, decodeServer, encodeClient, encodeServer, PROTOCOL_VERSION, quantizeFacing, REJECT, type ServerMsg } from '../../server/protocol';
import { PocServer } from '../../server/pocServer';
import { memoryPair } from '../../server/transport';

describe('protocolo binario', () => {
  it('ida y vuelta de los mensajes del cliente', () => {
    const hello = encodeClient({ type: 'hello', version: PROTOCOL_VERSION, name: 'Aventurera' });
    expect(decodeClient(hello)).toEqual({ type: 'hello', version: PROTOCOL_VERSION, name: 'Aventurera' });
    const move = encodeClient({ type: 'move', seq: 7, x: 12.5, y: 40.25 });
    expect(move.length).toBe(13);
    expect(decodeClient(move)).toEqual({ type: 'move', seq: 7, x: 12.5, y: 40.25 });
  });

  it('ida y vuelta de una instantánea: 11 bytes por entidad', () => {
    const m: ServerMsg = {
      type: 'snapshot',
      tick: 1234,
      ackSeq: 9,
      entities: [
        { id: 1_000_000, kind: 1, x: 1050, y: 2000, facing: 64, flags: 3 },
        { id: 5, kind: 2, x: 0, y: 65535, facing: 255, flags: 1 },
      ],
      removed: [42],
    };
    const b = encodeServer(m);
    expect(b.length).toBe(13 + 2 * 11 + 4);
    expect(decodeServer(b)).toEqual(m);
  });

  it('rechaza mensajes mal formados sin lanzar', () => {
    expect(decodeClient(new Uint8Array([]))).toBeNull();
    expect(decodeClient(new Uint8Array([0x02, 1, 2]))).toBeNull();
    expect(decodeClient(new Uint8Array([0x7f]))).toBeNull();
    const nan = encodeClient({ type: 'move', seq: 1, x: Number.NaN, y: 1 });
    expect(decodeClient(nan)).toBeNull();
  });

  it('el rumbo se cuantiza en 256 pasos', () => {
    expect(quantizeFacing(0)).toBe(0);
    expect(quantizeFacing(Math.PI)).toBe(128);
    expect(quantizeFacing(-Math.PI / 2)).toBe(192);
  });
});

describe('validación de órdenes en el servidor', () => {
  function connect(server: PocServer) {
    const p = memoryPair();
    server.accept(p.server);
    const received: ServerMsg[] = [];
    p.client.onMessage((b) => received.push(decodeServer(b)));
    p.client.send(encodeClient({ type: 'hello', version: PROTOCOL_VERSION, name: 'T' }));
    const welcome = received[0];
    if (welcome?.type !== 'welcome') throw new Error('sin bienvenida');
    return { conn: p.client, id: welcome.entityId, received };
  }

  it('limita el ritmo de órdenes y descarta destinos fuera del mundo o repetidos', () => {
    const server = new PocServer(loadGameData(), { moveRate: 5, moveBurst: 3 });
    const c = connect(server);
    for (let seq = 1; seq <= 6; seq++) c.conn.send(encodeClient({ type: 'move', seq, x: 20 + seq, y: 10 }));
    const rejects = () => c.received.filter((m) => m.type === 'reject');
    expect(rejects().length).toBe(3);
    expect(rejects().every((m) => m.type === 'reject' && m.reason === REJECT.rate)).toBe(true);

    for (let i = 0; i < 60; i++) server.step();
    c.conn.send(encodeClient({ type: 'move', seq: 2, x: 30, y: 30 }));
    c.conn.send(encodeClient({ type: 'move', seq: 10, x: -5, y: 30 }));
    c.conn.send(encodeClient({ type: 'move', seq: 11, x: 30, y: 9999 }));
    expect(rejects().slice(3).map((m) => m.type === 'reject' && m.reason)).toEqual([REJECT.invalid, REJECT.invalid, REJECT.invalid]);
    expect(server.rejectedCount(c.id)).toBe(6);
  });

  it('el área de interés oculta y retira entidades lejanas', () => {
    const server = new PocServer(loadGameData(), { interestRadius: 5 });
    const a = connect(server);
    const b = connect(server);
    const seenBy = (c: typeof a) => {
      const set = new Set<number>();
      for (const m of c.received) {
        if (m.type !== 'snapshot') continue;
        for (const e of m.entities) set.add(e.id);
        for (const id of m.removed) set.delete(id);
      }
      return set;
    };
    for (let i = 0; i < 3; i++) server.step();
    expect(seenBy(a).has(b.id)).toBe(true);
    // B se aleja más de 5 m: A deja de recibirlo y se le avisa de que salió.
    b.conn.send(encodeClient({ type: 'move', seq: 1, x: 40, y: 10 }));
    for (let i = 0; i < 120; i++) server.step();
    expect(seenBy(a).has(b.id)).toBe(false);
    expect(seenBy(a).has(a.id)).toBe(true);
  });
});
