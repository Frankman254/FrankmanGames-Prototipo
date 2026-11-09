/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildData, rawData } from '../data';
import { collectV3Evidence, renderV3Report } from './report';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const out = option('--out', 'work/balance/V3_BASELINE.md');
const json = option('--json', 'work/balance/V3_BASELINE.json');
const data = buildData(rawData());
const evidence = collectV3Evidence(data);
mkdirSync(dirname(out), { recursive: true });
mkdirSync(dirname(json), { recursive: true });
writeFileSync(out, renderV3Report(data, evidence));
writeFileSync(json, JSON.stringify(evidence, null, 2));
console.log(`Evidencia V3 escrita en ${out} y ${json}.`);
