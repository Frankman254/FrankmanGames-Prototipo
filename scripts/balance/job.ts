/// <reference types="node" />
// Una medición en su propio proceso (para repartir el trabajo entre núcleos).
// Uso: vite-node scripts/balance/job.ts <salida.json> <full|quick> [ajuste…]
import { writeFileSync } from 'node:fs';
import { FULL, measure, QUICK } from './battery';
import { buildData, rawData } from './data';
import { applyProposals } from './proposals';
import { encode } from './serial';

const [out, size, ...ids] = process.argv.slice(2);
if (!out || (size !== 'full' && size !== 'quick')) throw new Error('uso: job.ts <salida.json> <full|quick> [ajuste…]');
const raw = rawData();
const changes = applyProposals(raw, ids);
const m = measure(buildData(raw), size === 'full' ? FULL : QUICK);
writeFileSync(out, encode({ ids, changes, m }));
