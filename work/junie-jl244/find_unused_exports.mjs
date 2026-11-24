// Find exported symbols from src/ that are never imported elsewhere in src/ or tests/
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, relative } from 'path';

const root = process.cwd();
const srcDir = join(root, 'src');
const testsDir = join(root, 'tests');

// Collect all exported symbols: { file -> [{name, line}] }
async function collectExports(dir) {
  const exports = new Map();
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = join(dir, e.name);
      const s = await stat(full);
      if (s.isDirectory()) {
        await walk(full);
      } else if (e.name.endsWith('.ts')) {
        const text = await readFile(full, 'utf-8');
        const lines = text.split('\n');
        const fileRel = relative(root, full);
        const found = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Only track VALUE exports (functions, classes, const/let/var, enum) — skip types/interfaces
          const named = line.match(/^export\s+(?:function|class|const|let|var|enum)\s+(\w+)/);
          if (named) {
            found.push({ name: named[1], line: i + 1 });
          }
          // export { A, B, C } — skip if preceded by 'type'
          const brace = line.match(/^export\s*\{([^}]+)\}/);
          if (brace && !line.includes('type')) {
            for (const item of brace[1].split(',')) {
              const m = item.trim().match(/^(\w+)/);
              if (m) found.push({ name: m[1], line: i + 1 });
            }
          }
        }
        if (found.length) exports.set(fileRel, found);
      }
    }
  }
  await walk(dir);
  return exports;
}

// Collect all imports across src/, tests/, scripts/, electron/
async function collectImports(dirs) {
  const imported = new Set();
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = join(dir, e.name);
      const s = await stat(full);
      if (s.isDirectory()) {
        await walk(full);
      } else if (e.name.endsWith('.ts') || e.name.endsWith('.mjs')) {
        const text = await readFile(full, 'utf-8');
        // Find all import statements
        const importRegex = /import\s+(?:\{([^}]*)\}|(\w+))/g;
        let m;
        while ((m = importRegex.exec(text)) !== null) {
          if (m[1]) {
            for (const item of m[1].split(',')) {
              const name = item.trim().split(/\s+as\s+/)[0].trim();
              if (name) imported.add(name);
            }
          } else if (m[2]) {
            imported.add(m[2]);
          }
        }
      }
    }
  }
  for (const d of dirs) {
    if (d && await stat(d).catch(() => null)) {
      await walk(d);
    }
  }
  return imported;
}

// Also check if a symbol is used in the same file (self-use)
function isUsedInFile(text, name) {
  // Remove the export line itself and check if name appears elsewhere
  const lines = text.split('\n');
  const withoutExport = lines.filter(l => !l.match(new RegExp(`^export\\s+(?:function|class|const|let|var|enum)\\s+${name}\\b`)));
  const joined = withoutExport.join('\n');
  // Check for usage as identifier (not in comments or strings ideally, but good enough)
  return joined.match(new RegExp(`\\b${name}\\b`));
}

const exports = await collectExports(srcDir);
const imported = await collectImports([srcDir, testsDir, join(root, 'scripts'), join(root, 'electron')]);

const unused = [];
for (const [file, syms] of exports) {
  for (const sym of syms) {
    if (!imported.has(sym.name)) {
      // Check self-use
      const fullPath = join(root, file);
      const text = await readFile(fullPath, 'utf-8');
      const selfUsed = isUsedInFile(text, sym.name);
      if (!selfUsed) {
        unused.push({ file, name: sym.name, line: sym.line, selfUsed: false });
      } else {
        unused.push({ file, name: sym.name, line: sym.line, selfUsed: true });
      }
    }
  }
}

// Sort by file, then line
unused.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

let md = '# Exportaciones sin uso en src/\n\n';
const selfUsed = unused.filter(u => u.selfUsed);
const trulyUnused = unused.filter(u => !u.selfUsed);
md += `- **Total:** ${unused.length} exportaciones de valor (funciones, clases, const/enum) sin importar por nombre en otro archivo.\n`;
md += `- **${trulyUnused.length}** candidatas reales: no se usan en el mismo archivo ni se importan desde otro.\n`;
md += `- **${selfUsed.length}** se usan solo en el mismo archivo (auto-referencia): exportadas pero solo consumidas localmente.\n\n`;

md += '## Candidatas reales (no usadas en el mismo archivo, no importadas desde otro)\n\n';
md += '| Archivo | Línea | Símbolo |\n|---|---|---|\n';
for (const u of trulyUnused) {
  md += `${u.file} | ${u.line} | ${u.name} |\n`;
}

md += '\n## Auto-usadas (exportadas pero solo usadas en el mismo archivo)\n\n';
md += '| Archivo | Línea | Símbolo |\n|---|---|---|\n';
for (const u of selfUsed) {
  md += `${u.file} | ${u.line} | ${u.name} |\n`;
}

md += '\n## Notas\n\n';
md += '- Esta lista solo busca `import { X }` por nombre. Los accesos dinámicos (`obj[X]`), los usos en HTML/JS del renderer, o las referencias vía barrel imports pueden no detectarse.\n';
md += '- Las clases que se instancian en el mismo archivo donde se definen aparecen como "auto-usadas".\n';
md += '- **No se borra nada**: el coordinador decide qué exportaciones quitar.\n';

await writeFile(join(root, 'work/junie-jl244/LISTA.md'), md);
console.log(`Encontrados ${unused.length} exportaciones sin uso.`);
