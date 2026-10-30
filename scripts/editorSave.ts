// Punto de guardado del modo edición, sólo en desarrollo (`vite serve`, que es
// lo que arranca `npm run dev`). Recibe `{ files: { "data/x.json": "texto" } }`
// y escribe esos archivos en el repositorio. Vite ve el cambio y recarga el
// juego, que vuelve a leer los JSON.
//
// Por qué aquí y no por IPC de Electron: el proceso principal y el renderer
// empaquetado quedan exactamente igual (sin preload, sin acceso a disco,
// sandbox intacto), y este código ni siquiera existe en `vite build`. Defensas:
// lista blanca de rutas (src/editor/files.ts), sólo POST con JSON y una
// cabecera propia (una web ajena no puede mandarla sin permiso CORS, que aquí
// nunca se da), origen local, tamaño máximo y que cada archivo sea JSON válido.
// La escritura es atómica (archivo temporal + rename).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { EDITOR_FILES, EDITOR_SAVE_HEADER, EDITOR_SAVE_ROUTE } from '../src/editor/files';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set<string>(Object.values(EDITOR_FILES));

export type SaveCheck = { ok: true; files: Array<{ path: string; text: string }> } | { ok: false; status: number; error: string };

/** Valida la petición (lógica pura, con tests). */
export function checkSaveRequest(req: { method?: string; headers: Record<string, string | string[] | undefined> }, body: string): SaveCheck {
  if (req.method !== 'POST') return { ok: false, status: 405, error: 'sólo POST' };
  if (req.headers[EDITOR_SAVE_HEADER] !== '1') return { ok: false, status: 403, error: 'falta la cabecera del editor' };
  const ct = String(req.headers['content-type'] ?? '');
  if (!ct.startsWith('application/json')) return { ok: false, status: 415, error: 'se esperaba application/json' };
  const origin = req.headers['origin'];
  if (origin !== undefined && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(origin))) {
    return { ok: false, status: 403, error: `origen no permitido: ${String(origin)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, error: 'el cuerpo no es JSON' };
  }
  const files = (parsed as { files?: unknown } | null)?.files;
  if (!files || typeof files !== 'object') return { ok: false, status: 400, error: 'falta "files"' };
  const out: Array<{ path: string; text: string }> = [];
  for (const [p, text] of Object.entries(files as Record<string, unknown>)) {
    if (!ALLOWED.has(p)) return { ok: false, status: 403, error: `ruta no permitida: ${p}` };
    if (typeof text !== 'string') return { ok: false, status: 400, error: `${p}: se esperaba texto` };
    try {
      JSON.parse(text);
    } catch (e) {
      return { ok: false, status: 400, error: `${p}: JSON inválido (${(e as Error).message})` };
    }
    out.push({ path: p, text });
  }
  if (out.length === 0) return { ok: false, status: 400, error: 'nada que guardar' };
  return { ok: true, files: out };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(new Error('demasiado grande'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function reply(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function editorSavePlugin(): Plugin {
  return {
    name: 'fmg-editor-save',
    apply: 'serve',
    configureServer(server) {
      const root = path.resolve(server.config.root);
      server.middlewares.use(EDITOR_SAVE_ROUTE, (req, res) => {
        void (async () => {
          let body = '';
          try {
            body = await readBody(req);
          } catch (e) {
            return reply(res, 413, { ok: false, error: (e as Error).message });
          }
          const check = checkSaveRequest(req, body);
          if (!check.ok) return reply(res, check.status, { ok: false, error: check.error });
          const written: string[] = [];
          try {
            for (const f of check.files) {
              const abs = path.resolve(root, f.path);
              if (!abs.startsWith(root + path.sep)) throw new Error(`fuera del proyecto: ${f.path}`);
              const tmp = `${abs}.editor-tmp`;
              await fs.writeFile(tmp, f.text, 'utf8');
              await fs.rename(tmp, abs);
              written.push(f.path);
            }
          } catch (e) {
            return reply(res, 500, { ok: false, error: (e as Error).message, written });
          }
          server.config.logger.info(`[editor] guardado: ${written.join(', ')}`, { timestamp: true });
          reply(res, 200, { ok: true, written });
        })();
      });
    },
  };
}
