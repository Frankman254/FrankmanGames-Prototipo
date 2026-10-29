// Datos del mundo visual (Slice 02): assets, terreno, vegetación, luz y
// personaje. Separado de `schema.ts` para no mezclarse con los datos de juego.
// Todo número aquí es PROPUESTA.
import { Reader } from './validate';

export interface AssetEntry {
  /** Ruta relativa a la raíz del repositorio, p. ej. `assets/kenney/arbol.glb`. */
  file: string;
}

export type AssetManifest = Record<string, AssetEntry>;

export function parseAssets(raw: unknown): AssetManifest {
  const r = new Reader('assets.json');
  const o = r.obj(raw);
  const list = r.child('assets');
  const assets = list.obj(o['assets'], '');
  const out: AssetManifest = {};
  for (const [id, v] of Object.entries(assets)) {
    const c = list.child(id);
    const file = c.str(c.obj(v), 'file');
    if (!/^assets\/[\w\-./]+$/.test(file) || file.includes('..')) c.fail('file', `debe estar dentro de assets/ (llegó "${file}")`);
    out[id] = { file };
  }
  return out;
}
