#!/usr/bin/env python3
"""Benchmark FrankmanAI: mide velocidad, VRAM y calidad con tareas de TypeScript verificadas.

Uso:
  python bench.py --selftest
  python bench.py --label q4_k_m --model frankman-local --seeds 1,2,3
"""
import argparse
import json
import re
import statistics
import subprocess
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:1234/v1/chat/completions"
TSC = str(Path.home() / "AppData/Roaming/npm/tsc.cmd")
RESULTS = Path(__file__).resolve().parents[2] / "work/local-ai/bench"
MAX_TOKENS = 6000
TIMEOUT = 420

SYSTEM = "You are a senior TypeScript engineer. Follow the requested output format exactly."


def fence(lang, wanted):
    return f"{wanted} Reply with the final code in one fenced ```{lang} block."


def run(cmd, cwd, timeout=60):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr)[-1500:]


def extract_code(text):
    blocks = re.findall(r"```[a-zA-Z]*\n(.*?)```", text, re.S)
    return blocks[-1] if blocks else None


def extract_json(text):
    code = extract_code(text)
    for candidate in (code, text):
        if not candidate:
            continue
        match = re.search(r"[\[{].*[\]}]", candidate, re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except ValueError:
                pass
    return None


def check_ts(answer, node_test):
    """Compila con --strict y ejecuta las pruebas de comportamiento."""
    code = extract_code(answer)
    if not code:
        return False, "sin bloque de codigo"
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "sol.ts").write_text(code, encoding="utf-8")
        (Path(d) / "test.js").write_text(
            "const assert = require('assert');\nconst s = require('./sol.js');\n" + node_test,
            encoding="utf-8",
        )
        rc, out = run([TSC, "--strict", "--target", "es2020", "--module", "commonjs", "--skipLibCheck", "sol.ts"], d)
        if rc != 0:
            return False, "tsc: " + out
        rc, out = run(["node", "test.js"], d)
        return (rc == 0), ("ok" if rc == 0 else "test: " + out)


# ---------- Tareas ----------

FIX_TYPES_SRC = """export interface Item { id: string; qty: number; weight?: number }
export function totalWeight(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.weight * i.qty, 0);
}
export function findItem(items: Item[], id: string): Item {
  return items.find(i => i.id === id);
}"""
FIX_TYPES_TEST = """
assert.strictEqual(s.totalWeight([{id:'a',qty:2,weight:3},{id:'b',qty:5}]), 6);
assert.strictEqual(s.totalWeight([]), 0);
assert.strictEqual(s.findItem([{id:'a',qty:1}], 'z'), undefined);
assert.strictEqual(s.findItem([{id:'a',qty:1}], 'a').qty, 1);
"""
FIX_TYPES_REF = """```ts
export interface Item { id: string; qty: number; weight?: number }
export function totalWeight(items: Item[]): number {
  return items.reduce((sum, i) => sum + (i.weight ?? 0) * i.qty, 0);
}
export function findItem(items: Item[], id: string): Item | undefined {
  return items.find(i => i.id === id);
}
```"""

DAMAGE_TEST = """
const t = {hp:100, armor:5};
assert.deepStrictEqual(s.applyDamage(t, 20, false), {hp:85, armor:5});
assert.deepStrictEqual(s.applyDamage(t, 20, true), {hp:65, armor:5});
assert.deepStrictEqual(s.applyDamage(t, 3, false), {hp:99, armor:5});
assert.deepStrictEqual(s.applyDamage(t, 0, false), {hp:100, armor:5});
assert.deepStrictEqual(s.applyDamage({hp:4, armor:0}, 50, false), {hp:0, armor:0});
assert.deepStrictEqual(t, {hp:100, armor:5});
"""
DAMAGE_REF = """```ts
export interface Target { hp: number; armor: number }
export function applyDamage(t: Target, raw: number, crit: boolean): Target {
  if (raw <= 0) return { ...t };
  const dmg = Math.max(1, (crit ? raw * 2 : raw) - t.armor);
  return { ...t, hp: Math.max(0, t.hp - dmg) };
}
```"""

REFACTOR_SRC = """export function lootTier(level: number, luck: number, boss: boolean): string {
  if (boss) {
    if (level >= 20) {
      if (luck > 50) { return "legendary"; } else { return "epic"; }
    } else {
      if (luck > 50) { return "epic"; } else { return "rare"; }
    }
  } else {
    if (level >= 20) {
      if (luck > 80) { return "epic"; } else { if (luck > 30) { return "rare"; } else { return "common"; } }
    } else {
      if (luck > 80) { return "rare"; } else { return "common"; }
    }
  }
}"""
REFACTOR_TEST = """
const f = (level, luck, boss) => {
  if (boss) {
    if (level >= 20) return luck > 50 ? 'legendary' : 'epic';
    return luck > 50 ? 'epic' : 'rare';
  }
  if (level >= 20) return luck > 80 ? 'epic' : (luck > 30 ? 'rare' : 'common');
  return luck > 80 ? 'rare' : 'common';
};
for (const level of [1, 19, 20, 21, 50])
  for (const luck of [0, 30, 31, 50, 51, 80, 81, 100])
    for (const boss of [true, false])
      assert.strictEqual(s.lootTier(level, luck, boss), f(level, luck, boss));
const src = require('fs').readFileSync('sol.ts', 'utf8');
assert.ok((src.match(/\\belse\\b/g) || []).length === 0, 'still uses else');
"""
REFACTOR_REF = """```ts
export function lootTier(level: number, luck: number, boss: boolean): string {
  const high = level >= 20;
  if (boss) {
    if (high) return luck > 50 ? "legendary" : "epic";
    return luck > 50 ? "epic" : "rare";
  }
  if (high) return luck > 80 ? "epic" : luck > 30 ? "rare" : "common";
  return luck > 80 ? "rare" : "common";
}
```"""

CLAMP_GOOD = "module.exports={clamp:(v,a,b)=>Math.min(Math.max(v,a),b)};"
CLAMP_MUTANTS = [
    "module.exports={clamp:(v,a,b)=>Math.min(v,b)};",
    "module.exports={clamp:(v,a,b)=>Math.max(v,a)};",
    "module.exports={clamp:(v,a,b)=>v<a?a:(v>b?a:v)};",
]
CLAMP_REF = """```js
const assert = require('assert');
const { clamp } = require('./target.js');
assert.strictEqual(clamp(5, 0, 10), 5);
assert.strictEqual(clamp(-1, 0, 10), 0);
assert.strictEqual(clamp(11, 0, 10), 10);
```"""


def check_tests(answer):
    """Las pruebas del modelo deben pasar con clamp bueno y fallar con cada mutante."""
    code = extract_code(answer)
    if not code:
        return False, "sin bloque de codigo"
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "tests.js").write_text(code, encoding="utf-8")
        (Path(d) / "target.js").write_text(CLAMP_GOOD, encoding="utf-8")
        rc, out = run(["node", "tests.js"], d)
        if rc != 0:
            return False, "falla con clamp correcto: " + out
        survived = 0
        for mutant in CLAMP_MUTANTS:
            (Path(d) / "target.js").write_text(mutant, encoding="utf-8")
            rc, _ = run(["node", "tests.js"], d)
            survived += rc == 0
        return survived == 0, f"mutantes sobrevivientes: {survived}/{len(CLAMP_MUTANTS)}"


ERRORS_SRC = """interface Player { name: string; hp: number }
const p: Player = { name: "A", hp: "10" };
function heal(x: Player, n: number): void { x.hp += n; }
heal(p);
const total: number = p.name;
console.log(p.hp.toFixed(1), total);"""
ERRORS_LINES = {2, 4, 5}


def check_errors(answer):
    data = extract_json(answer)
    if not isinstance(data, list):
        return False, "sin lista JSON"
    try:
        lines = {int(x) for x in data}
    except (TypeError, ValueError):
        return False, f"JSON invalido: {data}"
    return lines == ERRORS_LINES, f"lineas: {sorted(lines)}"


CONTRACT_SRC = """export interface InventoryStore {
  add(id: string, qty: number): void;      // qty <= 0 throws RangeError; never exceed capacity per id, excess is discarded
  remove(id: string, qty: number): boolean; // false and no change when there is not enough stock; removes the id when it reaches 0
  count(id: string): number;               // 0 when absent
  ids(): string[];                         // ids with stock, sorted alphabetically
  onChange(cb: (id: string, qty: number) => void): void; // cb runs after each effective change with the new qty
}"""
CONTRACT_TEST = """
const inv = new s.Inventory(10);
const ev = [];
inv.onChange((i, q) => ev.push([i, q]));
assert.throws(() => inv.add('a', 0), RangeError);
assert.throws(() => inv.add('a', -1), RangeError);
inv.add('b', 4); inv.add('a', 15);
assert.strictEqual(inv.count('a'), 10);
assert.strictEqual(inv.count('zz'), 0);
assert.deepStrictEqual(inv.ids(), ['a', 'b']);
assert.strictEqual(inv.remove('b', 9), false);
assert.strictEqual(inv.count('b'), 4);
const before = ev.length;
inv.add('a', 3);
assert.strictEqual(ev.length, before, 'no effective change must not fire');
assert.strictEqual(inv.remove('b', 4), true);
assert.deepStrictEqual(inv.ids(), ['a']);
assert.deepStrictEqual(ev, [['b', 4], ['a', 10], ['b', 0]]);
"""
CONTRACT_REF = """```ts
export interface InventoryStore {
  add(id: string, qty: number): void;
  remove(id: string, qty: number): boolean;
  count(id: string): number;
  ids(): string[];
  onChange(cb: (id: string, qty: number) => void): void;
}
export class Inventory implements InventoryStore {
  private stock = new Map<string, number>();
  private cbs: ((id: string, qty: number) => void)[] = [];
  constructor(private capacity: number) {}
  private emit(id: string, qty: number) { this.cbs.forEach(cb => cb(id, qty)); }
  add(id: string, qty: number): void {
    if (qty <= 0) throw new RangeError("qty");
    const cur = this.count(id);
    const next = Math.min(this.capacity, cur + qty);
    if (next === cur) return;
    this.stock.set(id, next);
    this.emit(id, next);
  }
  remove(id: string, qty: number): boolean {
    const cur = this.count(id);
    if (cur < qty) return false;
    const next = cur - qty;
    if (next === 0) this.stock.delete(id); else this.stock.set(id, next);
    this.emit(id, next);
    return true;
  }
  count(id: string): number { return this.stock.get(id) ?? 0; }
  ids(): string[] { return [...this.stock.keys()].sort(); }
  onChange(cb: (id: string, qty: number) => void): void { this.cbs.push(cb); }
}
```"""

STATS = ["Regen", "Armor", "Stamina", "Focus", "Speed", "Luck", "Mana", "Poise", "Crit", "Dodge", "Block", "Haste"]
SOURCES = ["Tick", "Aura", "Buff", "Gear", "Rune", "Perk", "Zone", "Food", "Skill", "Set", "Weather", "Biome"]
BUG_NAME = "computeCritBiome3"


def build_haystack():
    """Unos 12K tokens de codigo; una sola funcion contradice su documentacion."""
    out = []
    for round_ in range(1, 4):
        for stat in STATS:
            for source in SOURCES:
                name = f"compute{stat}{source}{round_}"
                op = "-" if name == BUG_NAME else "+"
                out.append(
                    f"/** Returns the {stat.lower()} total: base plus the {source.lower()} bonus, never negative. */\n"
                    f"export function {name}(base: number, bonus: number): number {{ return Math.max(0, base {op} bonus); }}"
                )
    return "\n".join(out)


def check_bug(answer):
    data = extract_json(answer)
    name = data.get("function") if isinstance(data, dict) else None
    return name == BUG_NAME, f"respuesta: {name}"


TASKS = {
    "fix_types": {
        "prompt": fence("ts", f"This file fails under `tsc --strict`:\n```ts\n{FIX_TYPES_SRC}\n```\nFix it keeping the exports. A missing weight counts as 0, and findItem returns undefined when nothing matches."),
        "check": lambda a: check_ts(a, FIX_TYPES_TEST),
        "ref": FIX_TYPES_REF,
    },
    "implement_damage": {
        "prompt": fence("ts", "Write and export `interface Target { hp: number; armor: number }` and `function applyDamage(t: Target, raw: number, crit: boolean): Target`. Rules, in order: raw <= 0 changes nothing. A crit doubles raw. Then subtract armor, but a hit with raw > 0 always deals at least 1. hp never goes below 0. Return a new object and never mutate the input. It must compile under `tsc --strict`."),
        "check": lambda a: check_ts(a, DAMAGE_TEST),
        "ref": DAMAGE_REF,
    },
    "refactor_loot": {
        "prompt": fence("ts", f"Refactor this function so it does not use the `else` keyword anywhere, not even in comments. Behaviour and export must stay identical for every input:\n```ts\n{REFACTOR_SRC}\n```"),
        "check": lambda a: check_ts(a, REFACTOR_TEST),
        "ref": REFACTOR_REF,
    },
    "write_tests": {
        "prompt": fence("js", "`./target.js` exports `clamp(value, min, max)`, which limits value to the range [min, max]. Write a plain Node.js test script using `require('assert')` and `require('./target.js')`. No test framework. It must exit 0 with a correct clamp and throw if any boundary behaviour is wrong."),
        "check": check_tests,
        "ref": CLAMP_REF,
    },
    "find_errors": {
        "prompt": "Find every line of this TypeScript file that `tsc --strict` reports as an error. Lines are numbered from 1.\n```ts\n" + ERRORS_SRC + "\n```\nReply with only a JSON array of the line numbers.",
        "check": check_errors,
        "ref": "[2, 4, 5]",
    },
    "implement_contract": {
        "prompt": fence("ts", f"Implement and export `class Inventory implements InventoryStore`, with `constructor(capacity: number)` as the capacity per id. Also export the interface. It must compile under `tsc --strict` and follow this contract exactly:\n```ts\n{CONTRACT_SRC}\n```"),
        "check": lambda a: check_ts(a, CONTRACT_TEST),
        "ref": CONTRACT_REF,
    },
    "long_context_bug": {
        "prompt": "Exactly one function in this file does not do what its documentation says.\n```ts\n" + build_haystack() + '\n```\nReply with only JSON in the form {"function": "<name>"}.',
        "check": check_bug,
        "ref": '{"function": "' + BUG_NAME + '"}',
    },
}


# ---------- Telemetria ----------

class GpuSampler(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.samples = []
        self.done = threading.Event()

    @staticmethod
    def read():
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=index,memory.used,memory.total,utilization.gpu,power.draw,power.limit,temperature.gpu",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10).stdout
        return [[float(x) for x in line.split(",")] for line in out.strip().splitlines()]

    def run(self):
        while not self.done.wait(1.0):
            try:
                self.samples.append(self.read())
            except (subprocess.SubprocessError, ValueError):
                pass

    def summary(self):
        result = {}
        for g in range(len(self.samples[0]) if self.samples else 0):
            rows = [s[g] for s in self.samples]
            result[f"gpu{g}"] = {
                "mem_peak_mib": max(r[1] for r in rows),
                "mem_total_mib": rows[0][2],
                "util_avg": round(statistics.mean(r[3] for r in rows), 1),
                "power_peak_w": max(r[4] for r in rows),
                "power_limit_w": rows[0][5],
                "temp_peak_c": max(r[6] for r in rows),
            }
        return result


# ---------- Ejecucion ----------

def chat(model, task, prompt, seed):
    body = json.dumps({
        "model": model,
        "stream": True,
        "stream_options": {"include_usage": True},
        "temperature": 0.2,
        "seed": seed,
        "max_tokens": MAX_TOKENS,
        "messages": [
            # El identificador al inicio invalida la cache de prompt entre pruebas.
            {"role": "system", "content": f"[run {task}-{seed}] {SYSTEM}"},
            {"role": "user", "content": prompt},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(API, body, {"Content-Type": "application/json"})
    start = time.time()
    first = None
    content, finish, usage = [], None, {}
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        for raw in resp:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:") or line.endswith("[DONE]"):
                continue
            event = json.loads(line[5:])
            usage = event.get("usage") or usage
            for choice in event.get("choices", []):
                delta = choice.get("delta") or {}
                if first is None and (delta.get("content") or delta.get("reasoning_content")):
                    first = time.time()
                content.append(delta.get("content") or "")
                finish = choice.get("finish_reason") or finish
    end = time.time()
    completion = usage.get("completion_tokens", 0)
    gen_secs = end - first if first else 0
    return {
        "answer": "".join(content),
        "finish": finish,
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": completion,
        "ttft_s": round(first - start, 2) if first else None,
        "total_s": round(end - start, 2),
        "gen_tps": round(completion / gen_secs, 2) if gen_secs else None,
        "prompt_tps": round(usage.get("prompt_tokens", 0) / (first - start), 1) if first else None,
    }


def selftest():
    """Las soluciones de referencia pasan y una respuesta mala falla."""
    ok = True
    for name, task in TASKS.items():
        good, detail = task["check"](task["ref"])
        bad, _ = task["check"]("```ts\nexport const nothing = 1;\n```")
        print(f"{name}: referencia={'OK' if good else 'FALLA'} mala_rechazada={'OK' if not bad else 'FALLA'} ({detail})")
        ok &= good and not bad
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--label")
    ap.add_argument("--model", default="frankman-local")
    ap.add_argument("--seeds", default="1,2,3")
    ap.add_argument("--tasks", default=",".join(TASKS))
    args = ap.parse_args()

    if args.selftest:
        raise SystemExit(0 if selftest() else 1)

    RESULTS.mkdir(parents=True, exist_ok=True)
    out_path = RESULTS / f"{args.label}.jsonl"
    sampler = GpuSampler()
    idle = sampler.read()
    sampler.start()
    rows = []
    with out_path.open("w", encoding="utf-8") as out:
        for seed in [int(s) for s in args.seeds.split(",")]:
            for name in args.tasks.split(","):
                task = TASKS[name]
                try:
                    r = chat(args.model, name, task["prompt"], seed)
                    r["passed"], r["detail"] = task["check"](r["answer"])
                except Exception as e:  # una prueba caida cuenta como fallo, no detiene la corrida
                    r = {"passed": False, "detail": f"excepcion: {e}", "finish": "error"}
                r.update(task=name, seed=seed)
                rows.append(r)
                out.write(json.dumps(r, ensure_ascii=False) + "\n")
                out.flush()
                print(f"[{args.label}] seed={seed} {name}: {'PASA' if r['passed'] else 'FALLA'} "
                      f"gen={r.get('gen_tps')} t/s total={r.get('total_s')}s fin={r.get('finish')} | {' '.join(r['detail'].split())[:100]}", flush=True)
    sampler.done.set()
    sampler.join(3)

    timed = [r for r in rows if r.get("gen_tps")]
    prompt_big = [r["prompt_tps"] for r in timed if r["task"] == "long_context_bug"]
    summary = {
        "label": args.label,
        "runs": len(rows),
        "passed": sum(r["passed"] for r in rows),
        "by_task": {n: sum(r["passed"] for r in rows if r["task"] == n) for n in args.tasks.split(",")},
        "truncated": sum(r.get("finish") == "length" for r in rows),
        "errors": sum(r.get("finish") == "error" for r in rows),
        "gen_tps_median": statistics.median(r["gen_tps"] for r in timed) if timed else None,
        "total_s_sum": round(sum(r.get("total_s", 0) for r in rows), 1),
        "long_prompt_tps_median": statistics.median(prompt_big) if prompt_big else None,
        "gpu_before": idle,
        "gpu": sampler.summary(),
    }
    (RESULTS / f"{args.label}.summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
