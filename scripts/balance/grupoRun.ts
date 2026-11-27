// GRP-01: coste de simular compañeros. Mismo combate (semillas fijas) con 1, 2 y 4 participantes;
// mide el tick (media y máximo), búsquedas de camino, actores y sucesos, y las métricas de cada uno.
// Uso: npm run lab:grupo -- [--mismo-nivel] [--out <ruta>]
// Sin --out escribe work/claude-grp/grp01/rendimiento.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadGameData } from '../../src/data';
import { World } from '../../src/sim/world';
import { makeGroupLab, type MemberSpec } from './grupo';
import { rosterForMode } from './grupoRunConfig';

const base = loadGameData();
const BASE_ROSTER: MemberSpec[] = [
    { classId: 'ember_vanguard', level: 10 },
    { classId: 'storm_weaver', level: 10 },
    { classId: 'mangrove_hunter', level: 10 },
    { classId: 'storm_weaver', level: 10 },
];
const ENEMIES = [
    { archetype: 'melee', count: 4 },
    { archetype: 'ranged', count: 2 },
];
const args = process.argv.slice(2);
const sameLevel = args.includes('--mismo-nivel');
const ROSTER = rosterForMode(BASE_ROSTER, ENEMIES, base, sameLevel);
const outputOption = args.indexOf('--out');
const outputPath = outputOption < 0 ? 'work/claude-grp/grp01/rendimiento.json' : args[outputOption + 1];
if (!outputPath || outputPath.startsWith('--')) throw new Error('--out requiere una ruta');
const SEEDS = [1, 2, 3, 4, 5];
const MAX_TICKS = 60 * 120;

// Zona real (con paredes): el grupo empieza donde empieza el jugador.
const ZONE_START = new World(base, { encounter: false }).player.pos;

interface Row {
    zone: 'campo' | 'zona';
    players: number;
    seed: number;
    ticks: number;
    tickMeanMs: number;
    tickMaxMs: number;
    pathSearches: number;
    actorsMax: number;
    events: number;
    won: boolean;
    seconds: number;
    metrics: ReturnType<ReturnType<typeof makeGroupLab>['ledger']['report']>;
}

function once(n: number, seed: number, zone: Row['zone'] = 'campo'): Row {
    const lab = makeGroupLab(
        base,
        ROSTER.slice(0, n),
        zone === 'campo'
            ? { seed, enemies: ENEMIES }
            : { seed, enemies: ENEMIES, data: base, at: { ...ZONE_START }, enemyDistance: 14 },
    );
    const w = lab.world;
    const s0 = w.pathfinder.stats.searches;
    let total = 0;
    let max = 0;
    let ticks = 0;
    let events = 0;
    let actorsMax = 0;
    while (ticks < MAX_TICKS && w.enemies.aliveCount() > 0 && w.outcome === 'playing') {
        const t0 = performance.now();
        lab.bots.forEach((b, i) => w.as(lab.ids[i]!, () => b.think()));
        w.tick(1 / 60);
        const dt = performance.now() - t0;
        const ev = w.drainEvents();
        events += ev.length;
        lab.ledger.step(ev, 1 / 60);
        total += dt;
        max = Math.max(max, dt);
        ticks++;
        actorsMax = Math.max(actorsMax, n + w.enemies.aliveCount() + w.pets.length + w.missiles.length);
    }
    return {
        zone,
        players: n,
        seed,
        ticks,
        tickMeanMs: total / ticks,
        tickMaxMs: max,
        pathSearches: w.pathfinder.stats.searches - s0,
        actorsMax,
        events,
        won: w.enemies.aliveCount() === 0,
        seconds: ticks / 60,
        metrics: lab.ledger.report(),
    };
}

// Calentamiento del JIT para que el primer caso no pague la compilación.
once(1, 99);
once(4, 99);

const rows: Row[] = [];
for (const zone of ['campo', 'zona'] as const)
    for (const n of [1, 2, 4]) for (const seed of SEEDS) rows.push(once(n, seed, zone));

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const summary = (['campo', 'zona'] as const).flatMap((zone) =>
    [1, 2, 4].map((n) => {
        const r = rows.filter((x) => x.players === n && x.zone === zone);
        return {
            zone,
            players: n,
            tickMeanMs: +avg(r.map((x) => x.tickMeanMs)).toFixed(4),
            tickMaxMs: +Math.max(...r.map((x) => x.tickMaxMs)).toFixed(3),
            pathSearchesPerSecond: +avg(r.map((x) => x.pathSearches / x.seconds)).toFixed(2),
            actorsMax: Math.max(...r.map((x) => x.actorsMax)),
            eventsPerSecond: +avg(r.map((x) => x.events / x.seconds)).toFixed(1),
            combatSeconds: +avg(r.map((x) => x.seconds)).toFixed(1),
            wins: r.filter((x) => x.won).length,
        };
    }),
);
console.log(
    `Modo de nivel: ${sameLevel ? 'mismo nivel (máximo base enemigo)' : 'predeterminado'}; ` +
        `niveles de jugadores: ${[...new Set(ROSTER.map((member) => member.level))].join(', ')}`,
);
for (const s of summary) {
    const one = summary.find((x) => x.zone === s.zone && x.players === 1)!;
    console.log(
        `[${s.zone}] ${s.players} jugador(es): tick ${s.tickMeanMs} ms (máx ${s.tickMaxMs}) ×${(s.tickMeanMs / one.tickMeanMs).toFixed(2)} | ` +
            `caminos/s ${s.pathSearchesPerSecond} | actores máx ${s.actorsMax} | sucesos/s ${s.eventsPerSecond} | ` +
            `combate ${s.combatSeconds} s | victorias ${s.wins}/${SEEDS.length}`,
    );
}
const four = rows.find((x) => x.zone === 'campo' && x.players === 4 && x.seed === 1)!;
console.log('\nMétricas, 4 jugadores, semilla 1:');
for (const m of four.metrics)
    console.log(
        `  #${m.id}: daño ${m.damageDealt}, recibido ${m.damageTaken}, curación ${m.healing}, ` +
            `activo ${m.activeSeconds.toFixed(1)} s, bajas ${m.kills}, muertes ${m.deaths}, parte ${(m.participation * 100).toFixed(1)} %`,
    );
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
    outputPath,
    JSON.stringify(
        {
            playerLevelMode: sameLevel ? 'mismo-nivel' : 'predeterminado',
            roster: ROSTER,
            enemies: ENEMIES,
            summary,
            rows,
        },
        null,
        2,
    ),
);
