import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('JL-168/JL-246: PROCEDENCIA.md cubre todos los archivos de assets/', () => {
  const root = path.resolve(__dirname, '..');
  const assetsDir = path.join(root, 'assets');
  const procedenciaPath = path.join(root, 'PROCEDENCIA.md');

  // Recorre assets/ y devuelve todas las rutas relativas (assets/...)
  const walk = (dir: string, base = ''): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const rel = base ? path.posix.join(base, e.name) : e.name;
      if (e.isDirectory()) return walk(path.join(dir, e.name), rel);
      // Excluye archivos de sistema y caché
      if (e.name === '.DS_Store' || e.name.endsWith('.blend1')) return [];
      return [rel];
    });
  const diskFiles = walk(assetsDir).sort();

  const procedencia = fs.readFileSync(procedenciaPath, 'utf8');

  // Extrae todas las rutas assets/... mencionadas en PROCEDENCIA.md
  // Soporta `assets/...`, assets/... (sin backticks), y rutas en inventarios literales
  const assetsRegex = /`?assets\/([^'`"\s,)]+)/g;
  const mentioned = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = assetsRegex.exec(procedencia)) !== null) {
    const name = m[1];
    if (name) mentioned.add(name);
  }

  it(`todos los ${diskFiles.length} archivos en assets/ tienen mención en PROCEDENCIA.md`, () => {
    const orphans = diskFiles.filter((f: string) => !mentioned.has(f));
    expect(orphans, 'Archivos en assets/ sin fila en PROCEDENCIA.md').toEqual([]);
  });

  it(`los archivos concretos mencionados en PROCEDENCIA.md existen en disco`, () => {
    const diskSet = new Set(diskFiles);
    // Filtra referencias genéricas: directorios (terminan en /), plantillas (<...>),
    // puntos sueltos ("."), y palabras sueltas sin extensión.
    const concrete = [...mentioned].filter((f: string) => {
      if (f === '.' || f.endsWith('/') || f.includes('<')) return false;
      // Debe tener extensión de archivo
      if (!/\.[a-zA-Z0-9]+$/i.test(f)) return false;
      return true;
    });
    const missing = concrete.filter((f: string) => !diskSet.has(f));
    expect(missing, 'Archivos concretos mencionados en PROCEDENCIA pero ausentes en disco').toEqual([]);
  });

  it('no hay duplicados en los nombres de archivos en assets/', () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const f of diskFiles) {
      if (seen.has(f)) dups.push(f);
      seen.add(f);
    }
    expect(dups, 'Nombres duplicados en assets/').toEqual([]);
  });
});
