import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Bot } from '../../server/bot';
import { PocServer } from '../../server/pocServer';
import { memoryPair } from '../../server/transport';

describe('prueba de concepto online', () => {
  it('dos clientes se ven, se mueven y reciben snapshots con bytes medidos', () => {
    const data = loadGameData();
    const server = new PocServer(data, { interestRadius: 500, seed: 7 });
    const a = memoryPair();
    const b = memoryPair();
    server.accept(a.server);
    server.accept(b.server);
    const botA = new Bot(a.client, data, { name: 'A', seed: 1, moveEvery: 0.2 });
    const botB = new Bot(b.client, data, { name: 'B', seed: 2, moveEvery: 0.25 });

    for (let i = 0; i < 360; i++) {
      botA.update(1 / 60);
      botB.update(1 / 60);
      server.step();
    }

    expect(server.clientCount).toBe(2);
    expect(botA.entityId).not.toBeNull();
    expect(botB.entityId).not.toBeNull();
    expect(botA.snapshots).toBeGreaterThan(50);
    expect(botB.snapshots).toBeGreaterThan(50);
    expect(botA.otherAvatarMoves).toBeGreaterThan(0);
    expect(botB.otherAvatarMoves).toBeGreaterThan(0);
    expect(a.client.stats.recvWire).toBeGreaterThan(a.client.stats.recvPayload);
    expect(b.client.stats.sentWire).toBeGreaterThan(b.client.stats.sentPayload);
  });
});
