// Compila el proceso principal de Electron (TypeScript → CJS) con esbuild.
import { build } from 'esbuild';

export async function buildMain() {
  await build({
    entryPoints: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    outdir: 'dist-electron',
    outExtension: { '.js': '.cjs' },
    logLevel: 'warning',
  });
}

if (process.argv[1]?.endsWith('buildMain.mjs')) {
  await buildMain();
}
