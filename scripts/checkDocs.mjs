// Validate maintained documentation links. Historical snapshots and tool skills
// retain their original context and are not maintained as current documentation.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function markdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['historico', 'node_modules', '.git', '.agents'].includes(entry.name)) return [];
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? markdown(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}
const files = [
  ...readdirSync(root).filter(name => name.endsWith('.md')).map(name => resolve(root, name)),
  ...markdown(resolve(root, 'docs')), ...markdown(resolve(root, 'agents')),
];
const failures = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8').replace(/```[^\n]*\n[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<(.+)>$/, '$1');
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
    let path;
    try { path = decodeURIComponent(target.split('#')[0]); }
    catch { failures.push(`${relative(root, file)}: invalid encoding ${target}`); continue; }
    if (path && !existsSync(resolve(dirname(file), path))) failures.push(`${relative(root, file)}: ${target}`);
  }
}
if (failures.length) {
  console.error(`Enlaces locales rotos (${failures.length}):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Documentación mantenida: ${files.length} Markdown, enlaces locales correctos (histórico excluido).`);
