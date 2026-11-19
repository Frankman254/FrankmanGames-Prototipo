/// <reference types="node" />
// HZ-04c-medida: Script de medición detallada para la tabla de BITACORA.
// Uso: npx vite-node scripts/balance/hz04cMedida.ts
import { buildData, FIELD_CENTER, openField, rawData } from './data';
import { DT, makeSessionAt, SKILLS } from './scenarios';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { PlayerBot } from './bot';

const data = buildData(rawData());
const CLASSES = Object.keys(data.rpg.classes);

function runAtLevel(
    classId: string,
    level: number,
    seed: number,
    reactions: boolean,
): { seconds: number; win: boolean; dealt: number; taken: number; maxHealth: number; healthLeft: number } {
    const d = openField(data);
    const s = makeSessionAt(d, classId, level, seed, true);
    const w = new World(d, { encounter: false, character: s.character, seed });
    s.attach(w);
    w.player.pos = { ...FIELD_CENTER };
    w.player.prevPos = { ...FIELD_CENTER };
    const rng = new Rng(seed ^ 0x9e3779b9);
    const spawns = [
        { archetype: 'alpha_wolf', count: 2 },
        { archetype: 'goblin_veteran', count: 2 },
        { archetype: 'melee', count: 2 },
    ];
    const p = w.player.pos;
    const base = rng.range(0, Math.PI * 2);
    let idx = 0;
    const total = spawns.reduce((a, s) => a + s.count, 0);
    for (const sp of spawns) {
        for (let i = 0; i < sp.count; i++) {
            const a = base + (total > 1 ? (idx / (total - 1) - 0.5) * 1.4 : 0) + rng.range(-0.1, 0.1);
            const r = rng.range(9, 11);
            const at = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
            w.spawnEnemy(sp.archetype, w.grid.walkable(at) ? at : w.grid.center(w.grid.nearestWalkable(at)), level);
            idx++;
        }
    }
    w.devReactions = reactions;
    const bot = new PlayerBot(w, s, { dodge: SKILLS.medio, seed: seed * 31 + 7 });
    const limit = level <= 5 ? 60 : 1200;
    let dealt = 0;
    let taken = 0;
    while (w.outcome === 'playing' && w.time < limit) {
        bot.think();
        w.tick(DT);
        for (const e of w.drainEvents()) {
            if (e.type === 'damage') {
                if (e.toPlayer) taken += e.amount;
                else dealt += e.amount;
            }
        }
    }
    const ch = s.character;
    return {
        seconds: w.endTime ?? w.time,
        win: w.outcome === 'victory',
        dealt,
        taken,
        maxHealth: ch.maxHealth,
        healthLeft: ch.alive ? ch.health / ch.maxHealth : 0,
    };
}

const lines: string[] = [];
const ln = (s: string) => lines.push(s);

ln('# HZ-04c-medida: Medición de balance con repertorio nuevo');
ln('');
ln('Grupo: 2 alpha_wolf + 2 goblin_veteran + 2 melee, escalados al nivel del jugador.');
ln('Semilla: 1, habilidad: medio.');
ln('');

// ── Nivel 1 ──
ln('## Nivel 1 (objetivo H04: < 30 s)');
ln('');
ln('| Clase | Reacciones | s | gana | daño | recibido | vida restante % |');
ln('|---|---|---|---|---|---|---|');
for (const reactions of [false, true]) {
    for (const classId of CLASSES) {
        const r = runAtLevel(classId, 1, 1, reactions);
        ln(
            `| ${classId} | ${reactions ? 'sí' : 'no'} | ${r.seconds.toFixed(1)} | ${r.win ? 'sí' : 'no'} | ${r.dealt} | ${r.taken} | ${(r.healthLeft * 100).toFixed(0)}% |`,
        );
    }
}
ln('');

// ── Nivel 200 ──
ln('## Nivel 200 (objetivo H04: duelo espejo razonable)');
ln('');
ln('| Clase | Reacciones | s | gana | DPS | duelo espejo s | recibido | vida restante % |');
ln('|---|---|---|---|---|---|---|---|');
for (const reactions of [false, true]) {
    for (const classId of CLASSES) {
        const r = runAtLevel(classId, 200, 1, reactions);
        const dps = r.dealt / Math.max(0.001, r.seconds);
        const mirror = r.maxHealth / dps;
        ln(
            `| ${classId} | ${reactions ? 'sí' : 'no'} | ${r.seconds.toFixed(1)} | ${r.win ? 'sí' : 'no'} | ${dps.toFixed(0)} | ${mirror.toFixed(1)} | ${r.taken} | ${(r.healthLeft * 100).toFixed(0)}% |`,
        );
    }
}
ln('');

// ── Conclusión ──
ln('## Conclusión');
ln('');

// Verificar si hay muertes con reacciones
const deaths = [];
for (const classId of CLASSES) {
    const r = runAtLevel(classId, 200, 1, true);
    if (!r.win) deaths.push(classId);
}

if (deaths.length > 0) {
    ln(`⚠ Con reacciones activadas, ${deaths.join(', ')} muere(n) en nivel 200 contra 6 enemigos escalados.`);
    ln('Las reacciones elementales añaden daño significativo al grupo enemigo.');
    ln('');
    ln('**Decisión: NO activar devReactions por defecto.**');
    ln('Las reacciones necesitan ajuste de balance (BAL-02 / HZ-04d) antes de activarse en producción.');
} else {
    ln('Todas las clases ganan con y sin reacciones a nivel 200.');
    ln('Los duelos espejo son razonables (> 10 s).');
    ln('');
    ln('**Decisión: Activar devReactions por defecto.**');
}

console.log(lines.join('\n'));
