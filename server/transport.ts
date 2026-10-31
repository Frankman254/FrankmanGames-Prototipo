// Transporte de la prueba de concepto: una interfaz mínima de conexión con dos
// implementaciones, en memoria (tests deterministas) y WebSocket sobre
// 127.0.0.1 (`npm run server:poc`). El juego en Electron usaría el WebSocket
// del navegador con la misma interfaz.
import { WebSocket, WebSocketServer } from 'ws';
import { wsFrameOverhead } from './protocol';

export interface Connection {
  send(bytes: Uint8Array): void;
  onMessage(cb: (bytes: Uint8Array) => void): void;
  onClose(cb: () => void): void;
  close(): void;
  /** Bytes enviados y recibidos: carga útil y carga + marco WebSocket. */
  readonly stats: ByteStats;
}

export interface ByteStats {
  sentPayload: number;
  sentWire: number;
  recvPayload: number;
  recvWire: number;
  sentMessages: number;
  recvMessages: number;
}

function newStats(): ByteStats {
  return { sentPayload: 0, sentWire: 0, recvPayload: 0, recvWire: 0, sentMessages: 0, recvMessages: 0 };
}

class MemoryConnection implements Connection {
  readonly stats = newStats();
  peer: MemoryConnection | null = null;
  private readonly msgCbs: ((b: Uint8Array) => void)[] = [];
  private readonly closeCbs: (() => void)[] = [];
  private closed = false;

  constructor(private readonly isClient: boolean) {}

  send(bytes: Uint8Array): void {
    if (this.closed || !this.peer) return;
    const wire = bytes.length + wsFrameOverhead(bytes.length, this.isClient);
    this.stats.sentPayload += bytes.length;
    this.stats.sentWire += wire;
    this.stats.sentMessages++;
    this.peer.receive(bytes.slice(), wire);
  }

  receive(bytes: Uint8Array, wire: number): void {
    if (this.closed) return;
    this.stats.recvPayload += bytes.length;
    this.stats.recvWire += wire;
    this.stats.recvMessages++;
    for (const cb of this.msgCbs) cb(bytes);
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.msgCbs.push(cb);
  }

  onClose(cb: () => void): void {
    this.closeCbs.push(cb);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const cb of this.closeCbs) cb();
    this.peer?.close();
  }
}

/** Par de conexiones enlazadas en memoria; la entrega es síncrona. */
export function memoryPair(): { client: Connection; server: Connection } {
  const client = new MemoryConnection(true);
  const server = new MemoryConnection(false);
  client.peer = server;
  server.peer = client;
  return { client, server };
}

class WsConnection implements Connection {
  readonly stats = newStats();

  constructor(private readonly ws: WebSocket, private readonly isClient: boolean) {
    ws.binaryType = 'nodebuffer';
    ws.on('message', (data: Buffer) => {
      this.stats.recvPayload += data.length;
      this.stats.recvWire += data.length + wsFrameOverhead(data.length, !this.isClient);
      this.stats.recvMessages++;
    });
  }

  send(bytes: Uint8Array): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.stats.sentPayload += bytes.length;
    this.stats.sentWire += bytes.length + wsFrameOverhead(bytes.length, this.isClient);
    this.stats.sentMessages++;
    this.ws.send(bytes, { binary: true });
  }

  onMessage(cb: (bytes: Uint8Array) => void): void {
    this.ws.on('message', (data: Buffer) => cb(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)));
  }

  onClose(cb: () => void): void {
    this.ws.on('close', cb);
  }

  close(): void {
    this.ws.close();
  }
}

/** Servidor WebSocket sólo en la interfaz local. `port` 0 = uno libre. */
export async function listenLocal(port: number, onConnection: (c: Connection) => void): Promise<{ port: number; close: () => Promise<void> }> {
  const wss = new WebSocketServer({ host: '127.0.0.1', port, perMessageDeflate: false });
  wss.on('connection', (ws) => onConnection(new WsConnection(ws, false)));
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });
  const addr = wss.address();
  const actual = typeof addr === 'object' && addr ? addr.port : port;
  return {
    port: actual,
    close: () =>
      new Promise<void>((resolve) => {
        for (const c of wss.clients) c.terminate();
        wss.close(() => resolve());
      }),
  };
}

export async function connectLocal(port: number): Promise<Connection> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`, { perMessageDeflate: false });
  const conn = new WsConnection(ws, true);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  return conn;
}
