#!/usr/bin/env node
/**
 * checkDocs.mjs — Verifica que las rutas src/…, data/…, scripts/…, tests/…,
 * electron/…, assets/…, docs/… citadas en docs/ESTADO_ACTUAL.md existan.
 *
 * Salida: lista de problemas con línea y ruta; código 1 si hay alguno.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Funciones puras (exportadas para pruebas) ──────────────────────────

/** Expande `data/rpg/{items,sets}.json` → [`data/rpg/items.json`, `data/rpg/sets.json`] */
export function expandBraces(s) {
  const m = s.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!m) return [s];
  const [_, pre, inner, post] = m;
  const results = [];
  for (const part of inner.split(',')) {
    const expanded = pre + part + post;
    results.push(...expandBraces(expanded));
  }
  return results;
}

/** Normaliza `src/rpg/character.ts:213` → `src/rpg/character.ts`, `<id>` → `X`, `NNN.json` → `X.json` */
export function normalizeRoute(r) {
  r = r.replace(/:\d+$/, '');
  r = r.replace(/<[^>]+>/g, 'X');
  r = r.replace(/NNN\.json/g, 'X.json');
  return r;
}

/** Extrae las rutas citadas en un texto markdown. */
export function extractRoutes(text) {
  const prefixes = ['src/', 'data/', 'scripts/', 'tests/', 'electron/', 'assets/', 'docs/'];
  const backtickRe = /`((?:src|data|scripts|tests|electron|assets|docs)[^\s`]+)`/g;
  const barePathRe = /\b((?:src|data|scripts|tests|electron|assets|docs)[\/\\][\w\-./]+(?:\.(?:ts|json|mjs|py|css|md|glb|png|wav|ogg|js|html|sh)))\b/g;

  const found = new Set();
  for (const m of text.matchAll(backtickRe)) {
    found.add(m[1]);
  }
  for (const m of text.matchAll(barePathRe)) {
    found.add(m[1]);
  }

  let rawRoutes = [...found].filter(r => prefixes.some(p => r.startsWith(p)));

  const expanded = new Set();
  for (const r of rawRoutes) {
    if (r.includes('{')) {
      for (const e of expandBraces(r)) {
        expanded.add(e);
      }
    } else {
      expanded.add(r);
    }
  }

  return [...expanded].map(normalizeRoute);
}

/** Verifica las rutas contra el filesystem. Devuelve array de rutas que no existen.
 *  Acepta `existsSync` inyectable para pruebas. */
export function checkRoutes(routes, root, existsSync = fs.existsSync) {
  const problems = [];
  for (const route of routes) {
    const fullPath = path.join(root, route);

    // Si tiene X (de <id> o NNN), verificamos que el directorio base exista
    if (route.includes('/X/') || route.endsWith('/X.json')) {
      const dirPath = path.dirname(fullPath);
      let parent = dirPath;
      while (parent && !existsSync(parent)) {
        parent = path.dirname(parent);
      }
      if (parent && existsSync(parent)) {
        continue;
      }
    }

    if (!existsSync(fullPath)) {
      problems.push(route);
    }
  }
  return problems;
}

// ── Modo CLI ────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const docFile = path.join(root, 'docs', 'ESTADO_ACTUAL.md');
const content = fs.readFileSync(docFile, 'utf8');
const lines = content.split('\n');

const routes = extractRoutes(content);
const problems = checkRoutes(routes, root);

if (problems.length === 0) {
  console.log(`✓ ESTADO_ACTUAL.md: ${routes.length} rutas citadas, todas existen.`);
  process.exit(0);
}

// Encontrar las líneas donde aparece cada ruta rota
const output = [];
for (const route of problems) {
  const lineNums = [];
  for (let i = 0; i < lines.length; i++) {
    const origPattern = route.replace(/\/X\//g, '/<id>/').replace(/X\.json/g, 'NNN.json');
    if (lines[i].includes(origPattern) || lines[i].includes(route)) {
      lineNums.push(i + 1);
    }
  }
  output.push(`  Línea(s) ${lineNums.join(', ')}: ${route}`);
}

console.log(`✗ ESTADO_ACTUAL.md: ${problems.length} rutas rotas de ${routes.length} citadas:\n`);
console.log(output.join('\n'));
console.log(`\nTotal: ${problems.length} ruta(s) que no existen.`);
process.exit(1);
