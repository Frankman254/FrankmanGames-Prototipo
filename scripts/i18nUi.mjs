// `node scripts/i18nUi.mjs [salida.json]`: textos fijos de la interfaz (src/ui y src/main.ts)
// que aún no tienen inglés en data/i18n/ (F07). Sin argumento, solo cuenta y lista por archivo.
// Es un buscador aproximado de literales: lo que encuentra se revisa a mano antes de traducir.
import fs from 'node:fs';
import path from 'node:path';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const en = { ...read('data/i18n/en.json'), ...read('data/i18n/en.content.json'), ...read('data/i18n/en.ui.json') };
const files = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []));
const skipDir = /[\\/](fake|editor|dev)[\\/]/;
const all = [...files('src/ui').filter((f) => !skipDir.test(f)), 'src/main.ts'];
const NOT_TEXT = /^[.#[]|^[a-z]+(\.[a-z-]+)+$|px|rgba?\(|var\(--|^\/|\.json|\.glb|=>|^[a-z-]+:|^M[0-9 ]/;
const LINE_SKIP = /console\.|import |throw new|querySelector|classList|dataset|addEventListener|getItem|setItem/;
const by = {};
const seen = new Set();
for (const f of all) {
  const src = fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !LINE_SKIP.test(l))
    .join('\n');
  for (const m of src.matchAll(/(['`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
    const t = m[2];
    if (t.length < 2 || !/[a-záéíóúñ]/i.test(t) || /^[a-z][a-zA-Z0-9_.-]*$/.test(t) || NOT_TEXT.test(t)) continue;
    if (m[1] === '`' && t.includes('${')) continue;
    if (!/[A-ZÁÉÍÓÚÑ¿¡]|\s/.test(t) || en[t] !== undefined || seen.has(t)) continue;
    seen.add(t);
    (by[f.replace(/\\/g, '/')] ??= []).push(t);
  }
}
const out = process.argv[2];
if (out) fs.writeFileSync(out, JSON.stringify(by, null, 1));
console.log(`${seen.size} textos sin inglés`);
if (!out) for (const [f, list] of Object.entries(by)) console.log(`  ${f}: ${list.length}`);
