/// <reference types="node" />
// `npm run balance`: mide los datos actuales, cada ajuste propuesto por
// separado y todos juntos, y escribe docs/EQUILIBRIO_2026-10.md.
// Cada medición corre en un proceso aparte, tantos a la vez como núcleos.
// Opciones: --jobs N (procesos a la vez), --out <ruta del informe>.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';
import { keyMetrics } from './analysis';
import type { Measurement } from './battery';
import { buildData, rawData } from './data';
import { applyProposals, PROPOSALS, type Change } from './proposals';
import { renderReport, type Variant } from './report';
import { decode } from './serial';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const outPath = opt('--out') ?? 'docs/EQUILIBRIO_2026-10.md';
const parallel = Math.max(1, Number(opt('--jobs') ?? cpus().length));

interface Job {
  name: string;
  size: 'full' | 'quick';
  ids: string[];
}

const ALL = PROPOSALS.map((p) => p.id);
const jobs: Job[] = [
  { name: 'base', size: 'full', ids: [] },
  { name: 'todos', size: 'full', ids: ALL },
  { name: 'base-rapida', size: 'quick', ids: [] },
  ...ALL.map((id) => ({ name: id, size: 'quick' as const, ids: [id] })),
];

const dir = mkdtempSync(join(tmpdir(), 'balance-'));
const viteNode = join('node_modules', 'vite-node', 'vite-node.mjs');

function runJob(j: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const child = spawn(process.execPath, [viteNode, 'scripts/balance/job.ts', join(dir, `${j.name}.json`), j.size, ...j.ids], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`la medición ${j.name} terminó con código ${code}`));
      console.log(`  ${j.name.padEnd(12)} ${((performance.now() - t0) / 1000).toFixed(0)} s`);
      resolve();
    });
  });
}

/** Huella corta de los JSON de `data/` (FNV-1a de 32 bits). */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

async function main(): Promise<void> {
  const t0 = performance.now();
  console.log(`Equilibrio: ${jobs.length} mediciones, ${parallel} a la vez…`);
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(parallel, queue.length) }, async () => {
      for (let j = queue.shift(); j; j = queue.shift()) await runJob(j);
    }),
  );
  const load = (name: string): Variant & { changes: Change[] } => {
    const r = decode<{ ids: string[]; changes: Change[]; m: Measurement }>(readFileSync(join(dir, `${name}.json`), 'utf8'));
    const raw = rawData();
    applyProposals(raw, r.ids);
    const data = buildData(raw);
    return { data, m: r.m, k: keyMetrics(data, r.m), changes: r.changes };
  };
  const base = load('base');
  const report = renderReport(
    {
      base,
      proposed: load('todos'),
      quickBase: load('base-rapida'),
      isolated: PROPOSALS.map((p) => {
        const v = load(p.id);
        return { proposal: p, changes: v.changes, v };
      }),
      wallSeconds: (performance.now() - t0) / 1000,
      dataHash: hash(JSON.stringify(rawData())),
    },
    new Date().toISOString().slice(0, 10),
  );
  writeFileSync(outPath, report);
  rmSync(dir, { recursive: true, force: true });
  console.log(`Informe escrito en ${outPath} (${((performance.now() - t0) / 1000).toFixed(0)} s).`);
}

main().catch((e: unknown) => {
  rmSync(dir, { recursive: true, force: true });
  console.error(e);
  process.exit(1);
});
