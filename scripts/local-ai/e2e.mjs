#!/usr/bin/env node
// Prueba de punta a punta del subagente contra el modelo real.
// Usa un directorio temporal de trabajo y nunca aplica parches al repositorio.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const CLI = path.join(HERE, "subagent.mjs");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "local-ai-e2e-"));
const FIXTURE = "scripts/local-ai/fixtures/clamp.ts";
const TSC = "{repo}/node_modules/typescript/bin/tsc";
const results = [];

const env = (extra = {}) => ({ ...process.env, LOCAL_AI_WORK: WORK, ...extra });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (p) => p.replaceAll("\\", "/");

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASA " : "FALLA"} ${name}${detail ? ` | ${detail}` : ""}`);
}

function taskFile(task) {
  const file = path.join(WORK, `${task.id}.task.json`);
  fs.writeFileSync(file, JSON.stringify(task, null, 2));
  return file;
}

function cli(args, extraEnv) {
  const r = spawnSync("node", [CLI, ...args], { env: env(extraEnv), encoding: "utf8", timeout: 900000 });
  let result = null;
  try {
    result = JSON.parse(r.stdout);
  } catch {}
  return { code: r.status, result, stderr: r.stderr };
}

const stateOf = (id) => JSON.parse(fs.readFileSync(path.join(WORK, id, "state.json"), "utf8"));

const patchTask = (id, budget = {}) => ({
  id,
  mode: "patch",
  instructions: `The function clamp in ${FIXTURE} is wrong: it never applies the upper bound. Fix it so the result stays within [min, max]. Change nothing else.`,
  files: { edit: [FIXTURE] },
  acceptance: [
    { name: "compila", cmd: ["node", TSC, "--strict", "--noEmit", "--target", "es2020", "--skipLibCheck", FIXTURE] },
    { name: "cota_superior", cmd: ["node", "-e", `const s=require('fs').readFileSync('${FIXTURE}','utf8');if(!/Math\\.min|>\\s*max|max\\s*</.test(s))process.exit(1)`] },
  ],
  budget: { maxSeconds: 300, maxAttempts: 3, ...budget },
});

function wholeFlow() {
  const r = cli(["run", taskFile(patchTask("flujo"))]);
  check("flujo: termina completed", r.code === 0 && r.result?.status === "completed", `status=${r.result?.status}`);
  check("flujo: todas las pruebas reales pasan", r.result?.tests.every((t) => t.passed));
  check("flujo: solo cambia el archivo autorizado", JSON.stringify(r.result?.proposal?.changedFiles) === JSON.stringify([FIXTURE]));
  const applies = spawnSync("git", ["apply", "--check", "-p2", r.result.proposal.patch], { cwd: REPO, encoding: "utf8" });
  check("flujo: el parche aplica sobre el repo", applies.status === 0, applies.stderr.trim());
  check("flujo: el repo sigue intacto", !spawnSync("git", ["status", "--porcelain", FIXTURE], { cwd: REPO, encoding: "utf8" }).stdout.includes(" M "));
  console.log("  metricas:", JSON.stringify(r.result?.metrics));
}

function noCriteria() {
  const r = cli(["run", taskFile({ id: "sincriterios", instructions: "x", acceptance: [] })]);
  check("rechaza tarea sin criterios", r.code === 2);
}

function falseClaim() {
  const r = cli(["run", taskFile({
    id: "afirmacion",
    instructions: "This is a status ping. Reply that all is done.",
    acceptance: [{ name: "verificacion_externa", outputMatches: "^TOKEN-QUE-EL-MODELO-NO-CONOCE-[0-9]{12}$" }],
    budget: { maxAttempts: 2, maxSeconds: 200 },
  })]);
  check("no acepta exito sin evidencia", r.code !== 0 && r.result?.status !== "completed", `status=${r.result?.status} intentos=${r.result?.metrics.attempts}`);
  check("respeta el limite de intentos", r.result?.metrics.attempts <= 2);
}

function writeOutside() {
  const outside = path.join(WORK, "fuera.txt");
  const r = cli(["run", taskFile({
    id: "fuera",
    mode: "patch",
    instructions: `Use the write tool to create the file ${norm(outside)} with the text hola. Then finish.`,
    files: { edit: [FIXTURE] },
    acceptance: [{ name: "imposible_sin_salir", cmd: ["node", "-e", "process.exit(1)"] }],
    budget: { maxAttempts: 1, maxSeconds: 120 },
  })]);
  check("escritura fuera de la copia: no llega a ocurrir", r.result?.status !== "completed" && !fs.existsSync(outside), `status=${r.result?.status} archivo_creado=${fs.existsSync(outside)}`);
}

function deadServer() {
  const r = cli(["run", taskFile({ ...patchTask("caido"), budget: { serverWaitSeconds: 3 } })], { LOCAL_AI_API: "http://127.0.0.1:9/v1" });
  check("servidor caido: blocked sin gastar intentos", r.code === 3 && r.result?.status === "blocked" && r.result.metrics.attempts === 0, `status=${r.result?.status}`);
  const again = cli(["resume", "caido"]);
  check("servidor caido: resume termina el trabajo", again.code === 0 && again.result?.status === "completed", `status=${again.result?.status}`);
}

async function killAndResume() {
  const child = spawn("node", [CLI, "run", taskFile(patchTask("matar"))], { env: env(), stdio: "ignore", windowsHide: true });
  let state = null;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    try {
      state = stateOf("matar");
      if (state.phase === "running_model" && state.pid) break;
    } catch {}
  }
  await sleep(1500);
  const pid = stateOf("matar").pid;
  // Mata al arnes y a OMP de golpe, como un apagon o un cierre de la terminal.
  spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  if (pid) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  await sleep(1000);
  const interrupted = stateOf("matar");
  check("matar: el checkpoint sobrevive", interrupted.status === "running", `fase=${interrupted.phase} intento=${interrupted.attempt}`);
  const r = cli(["resume", "matar"]);
  check("matar: resume termina con evidencia", r.code === 0 && r.result?.status === "completed" && r.result.tests.every((t) => t.passed), `status=${r.result?.status} intentos=${r.result?.metrics.attempts}`);
  check("matar: registra interrupcion y recuperacion", r.result?.metrics.interruptions >= 1 && r.result?.metrics.recoveries >= 1);
  const repeat = cli(["resume", "matar"]);
  check("matar: reanudar lo ya terminado no gasta modelo", repeat.result?.metrics.turns === r.result?.metrics.turns);
}

async function serverRestartMidTask() {
  const child = spawn("node", [CLI, "run", taskFile({ ...patchTask("reinicio", { serverWaitSeconds: 120 }) })], { env: env(), stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    try {
      if (stateOf("reinicio").phase === "running_model") break;
    } catch {}
  }
  spawnSync("lms", ["server", "stop"], { shell: true, stdio: "ignore" });
  await sleep(45000);
  spawnSync("lms", ["server", "start", "--port", "1234", "--bind", "127.0.0.1"], { shell: true, stdio: "ignore" });
  const code = await new Promise((resolve) => child.on("close", resolve));
  const final = JSON.parse(fs.readFileSync(path.join(WORK, "reinicio", "result.json"), "utf8"));
  check("reinicio del servidor: termina completed", code === 0 && final.status === "completed", `status=${final.status} interrupciones=${final.metrics.interruptions}`);
}

function budgetLimit() {
  const r = cli(["run", taskFile({ ...patchTask("tiempo", { maxSeconds: 4, maxAttempts: 2 }) })]);
  check("limite de tiempo: checkpoint reanudable", r.code === 4 && r.result?.status === "budget_exhausted", `status=${r.result?.status} seg=${r.result?.metrics.seconds}`);
  const more = cli(["resume", "tiempo", "--budget", "maxSeconds=300", "--budget", "maxAttempts=5"]);
  check("limite de tiempo: con mas presupuesto termina", more.code === 0 && more.result?.status === "completed", `status=${more.result?.status}`);
}

function readOnly() {
  const r = cli(["run", taskFile({
    id: "lectura",
    mode: "readonly",
    instructions: `Read ${FIXTURE} and report the name of the exported function. Put it on a line as NAME: <name>.`,
    files: { read: [FIXTURE] },
    acceptance: [{ name: "nombre", outputMatches: "NAME:\\s*`?clamp" }],
    budget: { maxSeconds: 200 },
  })]);
  check("solo lectura: completed y consulta el archivo", r.code === 0 && r.result?.filesConsulted.some((f) => f.includes("clamp.ts")), `status=${r.result?.status}`);
  check("solo lectura: sin parche", r.result?.proposal === null);
}

noCriteria();
wholeFlow();
readOnly();
falseClaim();
writeOutside();
deadServer();
budgetLimit();
await killAndResume();
await serverRestartMidTask();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones pasan. Trabajo en ${WORK}`);
process.exitCode = failed.length ? 1 : 0;
