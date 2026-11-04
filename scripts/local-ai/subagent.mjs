#!/usr/bin/env node
// Subagente local: ejecuta una tarea delimitada con OMP y Qwen sobre una copia aislada,
// guarda checkpoints fuera del modelo y solo declara exito si pasan los criterios.
//
//   node scripts/local-ai/subagent.mjs run <tarea.json>
//   node scripts/local-ai/subagent.mjs resume <id> [--budget clave=valor ...]
//   node scripts/local-ai/subagent.mjs status <id>
//
// Salida: 0 completed, 2 uso incorrecto, 3 blocked, 4 budget_exhausted, 5 failed.
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORK = process.env.LOCAL_AI_WORK ?? path.join(REPO, "work/local-ai");
const API = process.env.LOCAL_AI_API ?? "http://127.0.0.1:1234/v1";
const OMP = process.env.LOCAL_AI_OMP ?? "omp";

const EXIT = { completed: 0, blocked: 3, budget_exhausted: 4, failed: 5 };
const DEFAULT_BUDGET = {
  maxSeconds: 900,
  maxAttempts: 3,
  maxOutputTokens: 60000,
  maxSteps: 30,
  maxConsecutiveToolErrors: 6,
  idleSeconds: 240,
  serverWaitSeconds: 180,
  maxServerRestarts: 3,
};
const SERVER_ERROR = /couldn't connect|connection refused|econnrefused|fetch failed|socket hang up|no models loaded/i;

const dirOf = (id) => path.join(WORK, id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const norm = (p) => p.replaceAll("\\", "/");

function fail(message) {
  console.error(`subagent: ${message}`);
  process.exit(2);
}

function validate(task) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(task.id ?? "")) fail("id debe ser minusculas, numeros, punto, guion");
  if (!task.instructions) fail("faltan instructions");
  if (!["readonly", "patch"].includes(task.mode ?? "readonly")) fail("mode debe ser readonly o patch");
  if (!task.acceptance?.length) fail("acceptance no puede estar vacio: sin criterios no hay exito verificable");
  for (const file of [...(task.files?.edit ?? []), ...(task.files?.read ?? [])]) {
    if (path.isAbsolute(file) || norm(file).split("/").includes("..")) fail(`ruta fuera del repo: ${file}`);
    if (!fs.existsSync(path.join(REPO, file))) fail(`no existe: ${file}`);
  }
  if ((task.mode ?? "readonly") === "readonly" && task.files?.edit?.length) fail("readonly no admite files.edit");
}

function walk(root, base = root, out = new Map()) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.set(norm(path.relative(base, full)), fs.readFileSync(full));
  }
  return out;
}

function changedFiles(dir) {
  const before = walk(path.join(dir, "baseline"));
  const after = walk(path.join(dir, "sandbox"));
  const changed = [];
  for (const [file, data] of after) if (!before.has(file) || !before.get(file).equals(data)) changed.push(file);
  for (const file of before.keys()) if (!after.has(file)) changed.push(file);
  return changed;
}

// Devuelve a su estado original lo que el modelo toco fuera de files.edit.
function revertOutOfScope(dir, task) {
  const allowed = new Set((task.files?.edit ?? []).map(norm));
  const outside = changedFiles(dir).filter((f) => !allowed.has(f));
  for (const file of outside) {
    const original = path.join(dir, "baseline", file);
    const target = path.join(dir, "sandbox", file);
    if (fs.existsSync(original)) fs.copyFileSync(original, target);
    else fs.rmSync(target, { force: true });
  }
  return outside;
}

function gitStatus() {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" });
  return r.stdout.split("\n").filter((l) => l.trim() && !norm(l).includes("work/local-ai/")).sort();
}

function brief(task) {
  const edit = task.files?.edit ?? [];
  const read = task.files?.read ?? [];
  const rules = task.mode === "patch"
    ? `You may modify only: ${edit.join(", ")}. Every other file is read-only.`
    : "This task is read-only. Do not attempt to change any file.";
  const criteria = task.acceptance.map((a) => `- ${a.name}${a.cmd ? `: \`${a.cmd.join(" ")}\`` : ""}`).join("\n");
  return `# Delegated task ${task.id}
${task.instructions}

## Scope
Your working directory holds only the files for this task. Use relative paths and never read or write outside it.
${rules}
Files available: ${[...edit, ...read].join(", ") || "(none)"}
Do not explore further or make changes the task does not ask for.

## Acceptance criteria
An external harness runs these after you stop. Your own claim of success is not accepted.
You cannot run commands. Do not write test or verification scripts and do not try to run these checks yourself. Check your change by rereading the file, then stop.
${criteria}

## How to finish
End your final message with exactly one line:
STATUS: DONE
or, when you cannot continue without help:
STATUS: BLOCKED <reason>
`;
}

function initTask(taskFile) {
  const task = readJson(taskFile);
  validate(task);
  task.mode ??= "readonly";
  const dir = dirOf(task.id);
  if (fs.existsSync(path.join(dir, "state.json"))) fail(`la tarea ${task.id} ya existe; usa resume`);
  for (const sub of ["baseline", "sandbox", "sessions"]) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  for (const file of [...(task.files?.edit ?? []), ...(task.files?.read ?? [])]) {
    for (const root of ["baseline", "sandbox"]) {
      const target = path.join(dir, root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(REPO, file), target);
    }
  }
  writeJson(path.join(dir, "task.json"), task);
  fs.writeFileSync(path.join(dir, "brief.md"), brief(task), "utf8");
  const state = {
    id: task.id,
    status: "running",
    phase: "prepared",
    budget: { ...DEFAULT_BUDGET, ...task.budget },
    attempt: 0,
    serverRestarts: 0,
    pid: null,
    sessionFile: null,
    feedback: null,
    gitAtStart: gitStatus(),
    filesConsulted: [],
    errors: [],
    tests: [],
    answer: "",
    metrics: { turns: 0, toolCalls: 0, toolErrors: 0, autoRetries: 0, inputTokens: 0, outputTokens: 0, seconds: 0, generationSeconds: 0, interruptions: 0, recoveries: 0 },
    history: [],
  };
  saveState(dir, state, "prepared");
  return { dir, task, state };
}

function saveState(dir, state, phase, note) {
  state.phase = phase;
  state.history.push({ at: new Date().toISOString(), phase, attempt: state.attempt, ...(note ? { note } : {}) });
  writeJson(path.join(dir, "state.json"), state);
}

async function serverReady(model) {
  const id = model.split("/").pop();
  try {
    const res = await fetch(`${API}/models`, { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    return body.data?.some((m) => m.id === id) ?? false;
  } catch {
    return false;
  }
}

async function waitForServer(model, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (await serverReady(model)) return true;
    await sleep(3000);
  }
  return serverReady(model);
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Devuelve true si el modelo intento escribir fuera de su copia.
function recordTool(state, event, dir) {
  state.metrics.toolCalls++;
  // El modo hashline de edit lleva la ruta dentro de input: "[ruta#hash]".
  const target = event.args?.path ?? /^\[(.+?)#/.exec(event.args?.input ?? "")?.[1];
  if (!target) return false;
  const posixRoot = target.startsWith("/") && !/^\/[a-zA-Z]\//.test(target);
  const rel = posixRoot ? target : norm(path.relative(path.join(dir, "sandbox"), path.resolve(path.join(dir, "sandbox"), target)));
  const outside = posixRoot || rel.startsWith("..") || path.isAbsolute(rel);
  if (!outside && !state.filesConsulted.includes(rel)) state.filesConsulted.push(rel);
  if (!outside) return false;
  state.errors.push(`acceso fuera de la copia (${event.toolName}): ${target}`);
  return event.toolName === "write" || event.toolName === "edit";
}

function findSession(dir) {
  const sessions = path.join(dir, "sessions");
  const found = fs.readdirSync(sessions, { recursive: true }).filter((f) => String(f).endsWith(".jsonl")).sort();
  return found.length ? path.join(sessions, String(found.at(-1))) : null;
}

// Lanza OMP y aplica los limites. Termina con el motivo y el texto final del modelo.
function runOmp({ dir, task, state, message }) {
  const budget = state.budget;
  const tools = task.mode === "patch" ? "read,grep,glob,edit,write" : "read,grep,glob";
  const overlay = path.join(dir, "overlay.yml");
  const streamIdle = Math.max(30, Math.min(120, budget.idleSeconds - 30));
  fs.writeFileSync(overlay, `providers:\n  streamIdleTimeoutSeconds: ${streamIdle}\n  streamFirstEventTimeoutSeconds: 300\nretry:\n  maxRetries: 3\nedit:\n  mode: replace\n`, "utf8");
  const args = [
    "-p", "--mode", "json", "--auto-approve",
    "--model", task.model ?? "lm-studio/frankman-local",
    "--tools", tools,
    "--no-skills", "--no-rules", "--no-title", "--no-extensions", "--no-context-files", "--no-lsp",
    "--config", overlay,
    "--session-dir", path.join(dir, "sessions"),
    "--cwd", path.join(dir, "sandbox"),
    "--append-system-prompt", path.join(dir, "brief.md"),
    "--hook", path.join(REPO, "scripts/local-ai/sandbox-guard.js"),
  ];
  if (task.thinking) args.push("--thinking", task.thinking);
  // OMP crea su sesion al empezar: tras un cierre brusco hay que buscarla en disco.
  state.sessionFile ??= findSession(dir);
  if (state.sessionFile && fs.existsSync(state.sessionFile)) args.push("--resume", state.sessionFile);
  args.push(message);

  return new Promise((resolve) => {
    const started = Date.now();
    const baseSeconds = state.metrics.seconds;
    const log = fs.createWriteStream(path.join(dir, "events.jsonl"), { flags: "a" });
    const child = spawn(OMP, args, {
      cwd: path.join(dir, "sandbox"),
      env: { ...process.env, LOCAL_AI_SANDBOX: path.join(dir, "sandbox") },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    state.pid = child.pid;
    saveState(dir, state, "running_model");

    let reason = null;
    let lastEvent = Date.now();
    let finalText = "";
    let finalStop = null;
    let finalError = null;
    let firstDelta = null;
    let lastDelta = null;
    let consecutiveToolErrors = 0;
    const abort = (why) => {
      if (reason) return;
      reason = why;
      killTree(child.pid);
    };
    const tick = setInterval(() => {
      state.metrics.seconds = baseSeconds + (Date.now() - started) / 1000;
      if (Date.now() - lastEvent > budget.idleSeconds * 1000) abort("stalled");
      else if (state.metrics.seconds > budget.maxSeconds) abort("time_budget");
      writeJson(path.join(dir, "state.json"), state);
    }, 2000);

    createInterface({ input: child.stdout }).on("line", (line) => {
      lastEvent = Date.now();
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        log.write(`${JSON.stringify({ type: "text", text: line.slice(0, 500) })}\n`);
        return;
      }
      if (event.type === "message_update") {
        firstDelta ??= Date.now();
        lastDelta = Date.now();
        return;
      }
      if (event.type === "session" && event.path) state.sessionFile = event.path;
      if (event.type === "tool_execution_start" && recordTool(state, event, dir)) abort("scope_violation");
      if (event.type === "tool_execution_end") {
        if (event.isError) state.metrics.toolErrors++;
        consecutiveToolErrors = event.isError ? consecutiveToolErrors + 1 : 0;
        if (consecutiveToolErrors >= budget.maxConsecutiveToolErrors) abort("tool_error_loop");
      }
      if (event.type === "auto_retry_start") {
        state.metrics.autoRetries++;
        if (SERVER_ERROR.test(event.errorMessage ?? "")) abort("server_down");
      }
      if (event.type === "turn_end") {
        const m = event.message ?? {};
        state.metrics.turns++;
        state.metrics.inputTokens += m.usage?.input ?? 0;
        state.metrics.outputTokens += m.usage?.output ?? 0;
        finalStop = m.stopReason ?? finalStop;
        finalError = m.errorMessage ?? null;
        finalText = (m.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("") || finalText;
        if (state.metrics.turns > budget.maxSteps) abort("step_budget");
        if (state.metrics.outputTokens > budget.maxOutputTokens) abort("token_budget");
      }
      log.write(`${JSON.stringify(summarize(event))}\n`);
    });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-2000);
    });
    child.on("error", (e) => {
      reason ??= "spawn_error";
      stderr += String(e);
    });
    child.on("close", (code) => {
      clearInterval(tick);
      log.end();
      state.metrics.seconds = baseSeconds + (Date.now() - started) / 1000;
      if (firstDelta && lastDelta) state.metrics.generationSeconds += (lastDelta - firstDelta) / 1000;
      state.pid = null;
      state.sessionFile ??= findSession(dir);
      resolve({ code, reason, text: finalText, stop: finalStop, error: finalError, stderr });
    });
  });
}

function summarize(event) {
  const base = { type: event.type, at: new Date().toISOString() };
  if (event.toolName) Object.assign(base, { tool: event.toolName, args: event.args });
  if (event.type === "turn_end") {
    const m = event.message ?? {};
    Object.assign(base, { stop: m.stopReason, error: m.errorMessage, usage: m.usage });
  }
  if (event.type === "auto_retry_start") Object.assign(base, { attempt: event.attempt, error: event.errorMessage });
  return base;
}

function runChecks(dir, task, answer) {
  const sandbox = path.join(dir, "sandbox");
  return task.acceptance.map((check) => {
    if (check.outputMatches) {
      const passed = new RegExp(check.outputMatches, check.flags ?? "").test(answer);
      return { name: check.name, type: "outputMatches", passed, output: passed ? "" : `la respuesta no coincide con /${check.outputMatches}/` };
    }
    const cmd = check.cmd.map((part) => part.replaceAll("{repo}", REPO).replaceAll("{sandbox}", sandbox));
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: sandbox, encoding: "utf8", timeout: (check.timeoutSeconds ?? 180) * 1000 });
    return {
      name: check.name,
      type: "cmd",
      command: check.cmd.join(" "),
      exit: r.status,
      passed: r.status === 0,
      output: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? String(r.error) : ""}`.slice(-2000),
    };
  });
}

function writePatch(dir, task) {
  if (task.mode !== "patch") return null;
  const r = spawnSync("git", ["-c", "core.autocrlf=false", "diff", "--no-index", "--no-color", "--", "baseline", "sandbox"], { cwd: dir, encoding: "utf8" });
  const file = path.join(dir, "proposal.patch");
  fs.writeFileSync(file, r.stdout, "utf8");
  return file;
}

function finish(dir, task, state, status, pending = []) {
  state.status = status;
  const patch = writePatch(dir, task);
  const m = state.metrics;
  const result = {
    id: task.id,
    status,
    mode: task.mode,
    filesConsulted: state.filesConsulted,
    proposal: patch ? { patch: norm(patch), applyWith: "git apply -p2 <patch>", changedFiles: changedFiles(dir) } : null,
    answer: state.answer,
    tests: state.tests,
    errors: state.errors,
    pending,
    checkpoint: norm(path.join(dir, "state.json")),
    metrics: {
      ...m,
      attempts: state.attempt,
      seconds: Math.round(m.seconds),
      generationSeconds: Math.round(m.generationSeconds),
      outputTokensPerSecond: m.generationSeconds > 0 ? Math.round((m.outputTokens / m.generationSeconds) * 10) / 10 : null,
    },
  };
  writeJson(path.join(dir, "result.json"), result);
  if (task.output) writeJson(path.resolve(REPO, task.output), result);
  saveState(dir, state, status);
  console.log(JSON.stringify(result, null, 2));
  return EXIT[status];
}

// Comprueba el trabajo sin gastar modelo. Devuelve el resumen de lo que falta.
function verify(dir, task, state) {
  saveState(dir, state, "verifying");
  const outside = revertOutOfScope(dir, task);
  state.tests = runChecks(dir, task, state.answer);
  if (outside.length) {
    state.errors.push(`cambios fuera de alcance revertidos: ${outside.join(", ")}`);
    state.tests.push({ name: "scope", type: "scope", passed: false, output: `solo se pueden cambiar los archivos autorizados; revertidos: ${outside.join(", ")}` });
  }
  const failed = state.tests.filter((t) => !t.passed);
  return failed;
}

function failureText(failed) {
  return failed.map((t) => `- ${t.name}: ${t.output.slice(-900)}`).join("\n");
}

async function loop({ dir, task, state, resumed }) {
  const model = task.model ?? "lm-studio/frankman-local";
  const budget = state.budget;
  let message = "Start the task described in your system instructions.";

  if (resumed) {
    // Si la interrupcion llego despues del trabajo, basta verificar: no se repite nada.
    const failed = verify(dir, task, state);
    if (!failed.length) return finish(dir, task, state, "completed");
    message = `Your previous run was interrupted. The files in your working directory already contain your earlier work: inspect them first and do not redo finished changes. Then finish the task.\nStill failing:\n${failureText(failed)}`;
  } else if (state.feedback) {
    message = state.feedback;
  }

  while (true) {
    if (state.attempt >= budget.maxAttempts) {
      state.errors.push(`intentos agotados (${budget.maxAttempts})`);
      return finish(dir, task, state, state.tests.some((t) => !t.passed) ? "failed" : "budget_exhausted", state.tests.filter((t) => !t.passed).map((t) => t.name));
    }
    if (state.metrics.seconds >= budget.maxSeconds) {
      state.errors.push("presupuesto de tiempo agotado");
      return finish(dir, task, state, "budget_exhausted", ["continuar con resume y mas presupuesto"]);
    }

    saveState(dir, state, "waiting_server");
    if (!(await waitForServer(model, budget.serverWaitSeconds))) {
      state.errors.push(`inferencia no disponible en ${API} tras ${budget.serverWaitSeconds} s`);
      return finish(dir, task, state, "blocked", ["levantar LM Studio y ejecutar resume"]);
    }

    state.attempt++;
    state.feedback = message;
    saveState(dir, state, "attempt_started");
    const run = await runOmp({ dir, task, state, message });
    if (run.text) state.answer = run.text;
    state.history.push({ at: new Date().toISOString(), phase: "attempt_ended", attempt: state.attempt, reason: run.reason, stop: run.stop, exit: run.code });
    writeJson(path.join(dir, "state.json"), state);

    if (run.reason === "server_down" || SERVER_ERROR.test(run.error ?? "")) {
      // Un servidor caido no es un fallo del modelo: no consume intento.
      state.attempt--;
      state.metrics.interruptions++;
      state.serverRestarts++;
      if (state.serverRestarts > budget.maxServerRestarts) {
        state.errors.push("el servidor se cayo demasiadas veces");
        return finish(dir, task, state, "blocked", ["revisar LM Studio y ejecutar resume"]);
      }
      state.metrics.recoveries++;
      message = "The inference server was interrupted and is back. Your earlier work is saved in the working directory: inspect it and continue without redoing finished changes.";
      continue;
    }
    if (run.reason === "time_budget" || run.reason === "step_budget" || run.reason === "token_budget") {
      state.errors.push(`limite alcanzado: ${run.reason}`);
      // El trabajo puede estar terminado aunque el modelo siguiera dando vueltas.
      const failed = verify(dir, task, state);
      if (!failed.length) return finish(dir, task, state, "completed");
      return finish(dir, task, state, "budget_exhausted", ["continuar con resume y mas presupuesto", ...failed.map((t) => t.name)]);
    }
    if (run.reason === "scope_violation") {
      message = "You tried to write outside your working directory, which is not allowed and was stopped. Use only relative paths inside it, do not create verification scripts, and finish the task.";
      continue;
    }
    if (run.reason === "tool_error_loop") {
      const failed = verify(dir, task, state);
      if (!failed.length) return finish(dir, task, state, "completed");
      state.errors.push(`${budget.maxConsecutiveToolErrors} errores de herramienta seguidos`);
      message = `Your last tool calls kept failing, so the run was stopped. Change approach and finish the task.\n${failureText(failed)}`;
      continue;
    }
    if (run.reason === "spawn_error") {
      state.errors.push(`no se pudo ejecutar OMP: ${run.stderr}`);
      return finish(dir, task, state, "failed");
    }
    if (run.reason === "stalled") {
      state.metrics.interruptions++;
      state.metrics.recoveries++;
      state.errors.push(`OMP sin actividad durante ${budget.idleSeconds} s; proceso detenido`);
      message = "Your previous run stalled and was stopped. Inspect your working directory and continue without redoing finished changes.";
      continue;
    }
    if (run.code !== 0 && !run.text) {
      state.errors.push(`OMP termino con codigo ${run.code}: ${run.error ?? run.stderr.slice(-300)}`);
      message = "Your previous run ended with an error. Inspect your working directory and continue.";
      continue;
    }

    // El hook impide que el subagente escriba en el repo, asi que un cambio ajeno a la tarea es de otro agente o persona.
    const touched = gitStatus().filter((l) => !state.gitAtStart.includes(l)).map((l) => norm(l.slice(3).trim()));
    const scope = new Set([...(task.files?.edit ?? []), ...(task.files?.read ?? [])].map(norm));
    const conflicts = touched.filter((file) => scope.has(file));
    for (const file of touched) {
      const note = `cambio ajeno en el repo durante la tarea: ${file}`;
      if (!state.errors.includes(note)) state.errors.push(note);
    }
    if (conflicts.length) {
      return finish(dir, task, state, "blocked", [`la copia quedo desactualizada frente a ${conflicts.join(", ")}: rehacer la tarea`]);
    }

    const blocked = /STATUS:\s*BLOCKED\s*(.*)$/im.exec(run.text);
    if (blocked) {
      state.errors.push(`el modelo declaro bloqueo: ${blocked[1].trim()}`);
      return finish(dir, task, state, "blocked", [blocked[1].trim()]);
    }
    if (run.stop === "length") {
      state.errors.push("respuesta cortada por limite de tokens");
      message = "Your last response was cut off by the token limit. Continue concisely from where you stopped.";
      continue;
    }

    const failed = verify(dir, task, state);
    if (!failed.length) return finish(dir, task, state, "completed");
    message = `The acceptance checks failed. Fix the cause and finish again.\n${failureText(failed)}`;
  }
}

function parseBudget(args, budget) {
  args.forEach((arg, i) => {
    if (arg !== "--budget") return;
    const [key, value] = String(args[i + 1]).split("=");
    if (!(key in DEFAULT_BUDGET) || Number.isNaN(Number(value))) fail(`presupuesto invalido: ${args[i + 1]}`);
    budget[key] = Number(value);
  });
}

async function main() {
  const [command, target, ...rest] = process.argv.slice(2);
  if (command === "run" && target) {
    const ctx = initTask(path.resolve(target));
    process.exitCode = await loop({ ...ctx, resumed: false });
  } else if ((command === "resume" || command === "status") && target) {
    const dir = dirOf(target);
    if (!fs.existsSync(path.join(dir, "state.json"))) fail(`no existe la tarea ${target}`);
    const state = readJson(path.join(dir, "state.json"));
    const task = readJson(path.join(dir, "task.json"));
    if (command === "status") {
      const { history, feedback, gitAtStart, ...visible } = state;
      console.log(JSON.stringify({ ...visible, processAlive: pidAlive(state.pid), lastEvents: history.slice(-5) }, null, 2));
      return;
    }
    if (state.status === "completed") {
      console.log(fs.readFileSync(path.join(dir, "result.json"), "utf8"));
      return;
    }
    if (pidAlive(state.pid)) killTree(state.pid);
    state.pid = null;
    state.status = "running";
    state.metrics.interruptions += ["running_model", "attempt_started", "verifying"].includes(state.phase) ? 1 : 0;
    state.metrics.recoveries += 1;
    parseBudget(rest, state.budget);
    saveState(dir, state, "resumed");
    process.exitCode = await loop({ dir, task, state, resumed: true });
  } else {
    fail("uso: run <tarea.json> | resume <id> [--budget clave=valor] | status <id>");
  }
}

await main();
