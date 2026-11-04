// Criterio de aceptacion de la tarea de ejemplo: Rng.pick funciona y no altera el resto de la secuencia.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.join(process.argv[2], "node_modules/typescript"));

const source = fs.readFileSync("src/sim/rng.ts", "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function("module", "exports", outputText)(mod, mod.exports);
const { Rng } = mod.exports;

// Valores calculados con el archivo original: las secuencias existentes no pueden cambiar.
const original = new Rng(42);
assert.strictEqual(original.next(), 0.6011037519201636);
assert.strictEqual(original.int(1, 100), 45);

const items = ["a", "b", "c"];
const seen = new Set();
const rng = new Rng(7);
for (let i = 0; i < 200; i++) seen.add(rng.pick(items));
assert.deepStrictEqual([...seen].sort(), items);
assert.throws(() => new Rng(1).pick([]), RangeError);

// pick debe consumir exactamente un valor, igual que int.
const a = new Rng(9);
const b = new Rng(9);
assert.strictEqual(a.pick(items), items[b.int(0, 2)]);
assert.strictEqual(a.next(), b.next());
