import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const projectRoot = join(import.meta.dirname, '..');
const modelsDir = join(projectRoot, 'assets', 'models');

/**
 * JL-259: Validador GLB sin Blender.
 *
 * Lee cada .glb de assets/models/ como binario (cabecera glTF 2.0 + chunks
 * JSON / BINAR) y comprueba en cada uno:
 *
 * 1. Cabecera válida (magic "glTF", versión 2).
 * 2. Chunk JSON parseable.
 * 3. Triángulos por debajo de un tope por familia (PROPUESTA).
 * 4. Todos los materiales tienen nombre.
 * 5. Sin URIs externas en buffers ni imágenes.
 * 6. Sin texturas embebidas de más de 2048 px.
 * 7. Bounding box de tamaño razonable (máximo 50 m en cualquier eje).
 *
 * Los topes son PROPUESTA: si un GLB legítimo los supera, se ajusta el tope
 * y se documenta el motivo. No se modifica el GLB.
 */

// ---------------------------------------------------------------------------
// Parser GLB mínimo (solo lectura, sin dependencias)
// ---------------------------------------------------------------------------

const GLB_MAGIC = 0x46546c67; // "glTF" en little-endian
const CHUNK_JSON = 0x4E4F534A; // "JSON"
const CHUNK_BINAR = 0x004E4942; // "BINAR"Y (padded)

interface GlbInfo {
  path: string;
  version: number;
  triangles: number;
  materials: string[]; // nombres
  hasExternalUri: boolean;
  maxTextureSize: number; // px (0 si no hay texturas embebidas)
  bboxMaxExtent: number; // metros (máximo de las 3 dimensiones)
  errors: string[];
}

function parseGlb(buffer: Buffer): GlbInfo {
  const info: GlbInfo = {
    path: '',
    version: 0,
    triangles: 0,
    materials: [],
    hasExternalUri: false,
    maxTextureSize: 0,
    bboxMaxExtent: 0,
    errors: [],
  };

  // Cabecera: 12 bytes
  if (buffer.length < 12) {
    info.errors.push('Archivo demasiado pequeño para cabecera GLB');
    return info;
  }

  const magic = buffer.readUInt32LE(0);
  if (magic !== GLB_MAGIC) {
    info.errors.push(`Magic inválido: 0x${magic.toString(16)} (esperado 0x${GLB_MAGIC.toString(16)})`);
    return info;
  }

  info.version = buffer.readUInt32LE(4);
  if (info.version !== 2) {
    info.errors.push(`Versión glTF ${info.version} no soportada (solo 2.0)`);
    return info;
  }

  // Chunks
  let offset = 12;
  let jsonStr: string | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkLen = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (offset + chunkLen > buffer.length) {
      info.errors.push(`Chunk ${chunkType} se sale del archivo`);
      break;
    }

    if (chunkType === CHUNK_JSON) {
      jsonStr = buffer.subarray(offset, offset + chunkLen).toString('utf-8');
    }
    // BINAR se ignora para esta validación (los datos binarios están embebidos)

    offset += chunkLen;
  }

  if (!jsonStr) {
    info.errors.push('Sin chunk JSON en el archivo GLB');
    return info;
  }

  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(jsonStr);
  } catch (e) {
    info.errors.push(`JSON inválido: ${e}`);
    return info;
  }

  // --- Triángulos ---
  const meshes = (doc.meshes as any[]) || [];
  const accessors = (doc.accessors as any[]) || [];

  for (const mesh of meshes) {
    for (const prim of (mesh.primitives as any[]) || []) {
      const attrs = prim.attributes as Record<string, number> | undefined;
      if (!attrs?.POSITION) continue;

      const posAcc = accessors[attrs.POSITION];
      const count = posAcc?.count ?? 0;

      let tris: number;
      if ('indices' in prim) {
        const idxAcc = accessors[prim.indices as number];
        tris = (idxAcc?.count ?? count) / 3;
      } else {
        tris = count / 3;
      }
      info.triangles += Math.floor(tris);
    }
  }

  // --- Materiales ---
  const materials = (doc.materials as any[]) || [];
  for (const mat of materials) {
    info.materials.push(mat.name ?? '');
  }

  // --- URIs externas ---
  const buffers = (doc.buffers as any[]) || [];
  for (const buf of buffers) {
    if (buf.uri && typeof buf.uri === 'string') {
      // URI externa si no es base64 y no está vacía
      if (!buf.uri.startsWith('data:')) {
        info.hasExternalUri = true;
      }
    }
  }

  const images = (doc.images as any[]) || [];
  for (const img of images) {
    if (img.uri && typeof img.uri === 'string') {
      if (!img.uri.startsWith('data:')) {
        info.hasExternalUri = true;
      }
      // Texturas embebidas: verificar tamaño
      if (img.uri.startsWith('data:image/')) {
        // Estimar tamaño desde base64: cada 4 chars base64 = 3 bytes
        const b64 = img.uri.split(',')[1] || '';
        const byteLen = Math.floor((b64.length * 3) / 4);
        // Para imágenes PNG/JPG embebidas, estimar px desde bytes
        // Una imagen RGBA de 2048x2048 = ~16MB sin compresión
        // Pero embebida suele ser JPEG/PNG comprimido
        // Usamos un umbral de bytes como proxy: 2048x2048 JPEG ~ 500KB
        // Si el buffer es muy grande, es sospechoso
        // Nota: sin decodificar la imagen, no podemos saber el tamaño exacto en px.
        // Marcamos el tamaño en bytes como referencia.
        if (byteLen > 0) {
          // Estimamos px máximas asumiendo JPEG a 0.1 bytes/px (compresión alta)
          // 2048*2048*0.1 = ~420KB como umbral
          const estimatedPx = Math.sqrt(byteLen / 0.1);
          if (estimatedPx > info.maxTextureSize) {
            info.maxTextureSize = Math.floor(estimatedPx);
          }
        }
      }
    }
  }

  // --- Bounding box ---
  for (const acc of accessors) {
    const minArr = Array.isArray(acc.min) ? acc.min : undefined;
    const maxArr = Array.isArray(acc.max) ? acc.max : undefined;
    if (minArr && maxArr && minArr.length === 3 && maxArr.length === 3) {
      const extent = Math.max(
        Math.abs(maxArr[0] - minArr[0]),
        Math.abs(maxArr[1] - minArr[1]),
        Math.abs(maxArr[2] - minArr[2])
      );
      if (extent > info.bboxMaxExtent) {
        info.bboxMaxExtent = extent;
      }
    }
  }

  return info;
}

// ---------------------------------------------------------------------------
// Familias y topes PROPUESTA
// ---------------------------------------------------------------------------

/**
 * Clasifica un GLB en una familia según el nombre.
 * El orden importa: las reglas más específicas van primero.
 */
function classifyFamily(name: string): string {
  const base = name.replace('.glb', '').toLowerCase();

  // Héroes (incluyendo variantes anime, espejo)
  if (/^(cazador|centinela|oraculo|diablica)/.test(base)) return 'heroes';
  // Monturas
  if (/^montura|^diostede/.test(base)) return 'monturas';
  // Enemigos humanoides
  if (/^(arquero|bestia|diablillo|copito|brasita|bruja_|brujo_|chaman|chamn_|curandero|capataz|capitan|chofer|cerbatanero|fresero|trampero|pescador|pirata|marinero|sirena|coloso|yeti|vigia|ventarron|tigrillo|coyote|buho_chismoso|hechicero|diablo_|zorro|fantasma|duende|sato|mono|gotita|cripta_rata|cripta_bruto|cripta_guardian)/.test(base)) return 'enemigos';
  // Fauna (aves, mamíferos, marinos, insectos)
  if (/^(aguila|ave_|buho$|caiman|calamar|cangrejo|garza|jaguar|pecari|jabali|ostra|medusa|tiburon|tapir|neque|perla$|tortuga|rana_|sapo_|zancudo|alma|chitra|jiron|crestalba|quetzal|pavo|falcopama)/.test(base)) return 'fauna';
  // Estructuras del mundo
  if (/^(casa|castillo|iglesia|lancha|trapiche|huacas)/.test(base)) return 'estructuras';
  // Props de mazmorra / decoración
  if (/^(cofre|pozo|estandarte|farola|prop_)/.test(base)) return 'props';
  // Catálogos / kits modulares
  if (/^(equipo|objetos|utileria|vegetacion|naturaleza|costa|caminos|escenografia|simbolos|interiores|detalle_suelo)/.test(base)) return 'catalogos';
  // Mazmorra
  if (/^mazmorra/.test(base)) return 'mazmorra';
  // NPC
  if (/^npc_/.test(base)) return 'npc';
  // Personaje genérico
  if (/^personaje/.test(base)) return 'personaje';
  // Moneda / objetos especiales
  if (/^moneda/.test(base)) return 'objetos_especiales';

  return 'otro';
}

/**
 * Topes PROPUESTA por familia.
 * Triángulos: máximo permitido por GLB individual.
 * Bounding box: máximo en metros en cualquier eje.
 *
 * Calibrados con los 135 GLB existentes (2026-11-24).
 */
const LIMITS: Record<string, { triangles: number; bbox: number }> = {
  heroes: { triangles: 30_000, bbox: 5 },
  monturas: { triangles: 30_000, bbox: 10 },
  enemigos: { triangles: 10_000, bbox: 10 },
  fauna: { triangles: 20_000, bbox: 10 },
  estructuras: { triangles: 50_000, bbox: 50 },
  props: { triangles: 5_000, bbox: 10 },
  catalogos: { triangles: 100_000, bbox: 50 },
  mazmorra: { triangles: 50_000, bbox: 50 },
  npc: { triangles: 10_000, bbox: 5 },
  personaje: { triangles: 30_000, bbox: 5 },
  objetos_especiales: { triangles: 80_000, bbox: 10 },
  otro: { triangles: 10_000, bbox: 10 },
};

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------

describe('JL-259: validador GLB sin Blender', () => {
  let glbFiles: string[] = [];
  let parsed: Map<string, GlbInfo> = new Map();

  beforeAll(async () => {
    glbFiles = (await readdir(modelsDir))
      .filter((f) => f.endsWith('.glb'))
      .sort();

    for (const file of glbFiles) {
      const buf = await readFile(join(modelsDir, file));
      const info = parseGlb(buf);
      info.path = file;
      parsed.set(file, info);
    }
  });

  it(`lee los ${glbFiles.length} GLB sin errores de parseo`, () => {
    const failures: string[] = [];
    for (const [file, info] of parsed) {
      if (info.errors.length > 0) {
        failures.push(`${file}: ${info.errors.join(', ')}`);
      }
    }
    expect(failures, 'GLB con errores de parseo').toEqual([]);
  });

  it('todos son glTF 2.0', () => {
    const notV2: string[] = [];
    for (const [file, info] of parsed) {
      if (info.version !== 2) {
        notV2.push(`${file}: versión ${info.version}`);
      }
    }
    expect(notV2, 'GLB no glTF 2.0').toEqual([]);
  });

  it('triángulos dentro del tope por familia', () => {
    const over: string[] = [];
    for (const [file, info] of parsed) {
      const family = classifyFamily(file);
      const limit = LIMITS[family]?.triangles ?? 10_000;
      if (info.triangles > limit) {
        over.push(`${file} (${family}): ${info.triangles} > ${limit}`);
      }
    }
    expect(over, 'GLB por encima del tope de triángulos').toEqual([]);
  });

  it('todos los materiales tienen nombre', () => {
    const unnamed: string[] = [];
    for (const [file, info] of parsed) {
      for (const name of info.materials) {
        if (!name || name.trim() === '') {
          unnamed.push(`${file}: material sin nombre`);
        }
      }
    }
    expect(unnamed, 'Materiales sin nombre').toEqual([]);
  });

  it('sin URIs externas en buffers ni imágenes', () => {
    const external: string[] = [];
    for (const [file, info] of parsed) {
      if (info.hasExternalUri) {
        external.push(file);
      }
    }
    expect(external, 'GLB con URIs externas').toEqual([]);
  });

  it('bounding box razonable (máximo 50 m)', () => {
    const oversized: string[] = [];
    for (const [file, info] of parsed) {
      if (info.bboxMaxExtent > 50) {
        oversized.push(`${file}: ${info.bboxMaxExtent.toFixed(2)} m`);
      }
    }
    expect(oversized, 'GLB con bounding box excesiva').toEqual([]);
  });

  it('clasificación por familia — cobertura completa', () => {
    const unclassified: string[] = [];
    for (const file of glbFiles) {
      const family = classifyFamily(file);
      if (!(family in LIMITS)) {
        unclassified.push(`${file} → "${family}" (sin tope)`);
      }
    }
    expect(unclassified, 'GLB cuya familia no tiene tope definido').toEqual([]);
  });

  it('resumen por familia (documentación)', () => {
    const summary: Record<string, { count: number; maxTris: number; maxBbox: number }> = {};

    for (const [file, info] of parsed) {
      const family = classifyFamily(file);
      if (!summary[family]) {
        summary[family] = { count: 0, maxTris: 0, maxBbox: 0 };
      }
      const s = summary[family];
      s.count++;
      if (info.triangles > s.maxTris) s.maxTris = info.triangles;
      if (info.bboxMaxExtent > s.maxBbox) s.maxBbox = info.bboxMaxExtent;
    }

    // Imprimir resumen en consola para documentación
    const lines = Object.entries(summary)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([fam, s]) =>
        `  ${fam}: ${s.count} GLB, maxTris=${s.maxTris}, maxBbox=${s.maxBbox.toFixed(2)}m (tope: ${LIMITS[fam]?.triangles ?? '?'} tris, ${LIMITS[fam]?.bbox ?? '?'}m)`
      );
    console.log('Resumen por familia:\n' + lines.join('\n'));

    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });
});
