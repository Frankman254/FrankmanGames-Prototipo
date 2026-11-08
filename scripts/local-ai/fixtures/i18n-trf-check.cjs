// Criterio de aceptacion de la tarea i18n-trf: trf traduce la plantilla y luego sustituye los datos.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.join(process.argv[2], "node_modules/typescript"));

const source = fs.readFileSync("src/i18n.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
});
const table = { "Nivel {n}": "Level {n}", "{a} de {b}": "{b}'s {a}", "Sin datos": "No data" };
const fakeRequire = (name) => {
  assert.ok(name.endsWith("en.json"), `import inesperado: ${name}`);
  return { __esModule: true, default: table };
};
const mod = { exports: {} };
new Function("module", "exports", "require", outputText)(mod, mod.exports, fakeRequire);
const { trf, tr, setLanguage } = mod.exports;

assert.strictEqual(typeof trf, "function");
// En español: la plantilla no cambia, solo se rellena.
assert.strictEqual(trf("Nivel {n}", { n: 3 }), "Nivel 3");
assert.strictEqual(trf("Nivel {n}", { n: 0 }), "Nivel 0");
// Un marcador repetido se sustituye todas las veces.
assert.strictEqual(trf("{x}+{x}", { x: "a" }), "a+a");
// Lo que no tenga dato se deja visible y sin romper.
assert.strictEqual(trf("Hola {nombre}", {}), "Hola {nombre}");
// Sin variables funciona como tr.
assert.strictEqual(trf("Sin datos"), "Sin datos");
// Los caracteres especiales de replace y los valores con llaves son texto literal.
assert.strictEqual(trf("Oro: {v}", { v: "$& $1 $$" }), "Oro: $& $1 $$");
assert.strictEqual(trf("{a} {b}", { a: "{b}", b: "x" }), "{b} x");
// Una propiedad heredada no cuenta como dato.
assert.strictEqual(trf("{toString}", {}), "{toString}");

setLanguage("en");
assert.strictEqual(trf("Nivel {n}", { n: 3 }), "Level 3");
assert.strictEqual(trf("{a} de {b}", { a: "espada", b: "Ana" }), "Ana's espada");
assert.strictEqual(trf("Sin datos"), "No data");
assert.strictEqual(trf("Sin traducir {n}", { n: 1 }), "Sin traducir 1");
assert.strictEqual(tr("Nivel {n}"), "Level {n}");
setLanguage("es");
