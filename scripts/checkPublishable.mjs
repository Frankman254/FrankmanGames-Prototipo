// Guardián del paquete: falla si el build lleva un archivo que no se puede publicar.
// Compara por contenido (SHA-256), no por nombre: Vite renombra con hash y un
// archivo copiado con otro nombre también se detecta. Fuentes vetadas:
// `assets/dev_dungeon/` (música de otro juego, PROCEDENCIA.md 2026-11-10) y
// `reference_assets/` (copias de estudio, AGENTS.md regla 2). Además, ningún
// texto empaquetado puede citar esas carpetas.
//
//   node scripts/checkPublishable.mjs            revisa dist/ y dist-electron/
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN_DIRS = ['assets/dev_dungeon', 'reference_assets'];
// `release/` no hace falta: electron-builder empaqueta exactamente dist/** y dist-electron/**.
export const OUTPUT_DIRS = ['dist', 'dist-electron'];
const TEXT = /\.(js|mjs|cjs|html|css|json|map)$/i;

function* walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (entry.isFile()) yield full;
    }
}

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Lista de problemas: archivos vetados copiados y textos que citan carpetas vetadas. */
export function findUnpublishable(root, forbidden = FORBIDDEN_DIRS, outputs = OUTPUT_DIRS) {
    const banned = new Map(); // tamaño → [{hash, source}]
    for (const dir of forbidden)
        for (const file of walk(path.join(root, dir))) {
            if (path.basename(file) === 'README.md') continue;
            const size = statSync(file).size;
            if (size === 0) continue;
            const list = banned.get(size) ?? [];
            list.push({ hash: sha(file), source: path.relative(root, file) });
            banned.set(size, list);
        }
    const problems = [];
    for (const out of outputs)
        for (const file of walk(path.join(root, out))) {
            const rel = path.relative(root, file);
            const same = banned.get(statSync(file).size);
            if (same) {
                const hash = sha(file);
                for (const b of same) if (b.hash === hash) problems.push(`${rel} es una copia de ${b.source}`);
            }
            if (TEXT.test(file)) {
                const text = readFileSync(file, 'utf8');
                for (const dir of forbidden) if (text.includes(dir)) problems.push(`${rel} cita «${dir}»`);
            }
        }
    return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = process.cwd();
    if (!existsSync(path.join(root, 'dist'))) {
        console.error('checkPublishable: no hay dist/; ejecuta antes vite build');
        process.exit(1);
    }
    const problems = findUnpublishable(root);
    if (problems.length) {
        console.error('checkPublishable: el paquete lleva material no publicable:');
        for (const p of problems) console.error(`  - ${p}`);
        process.exit(1);
    }
    console.log('checkPublishable: dist/ sin material de otros juegos ni de estudio');
}
