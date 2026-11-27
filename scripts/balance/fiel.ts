// BAL-P0-FIEL: batería de combate fiel al juego, a igualdad de nivel. Solo mide: no cambia cifras.
//
// Responde a la auditoría externa del 2026-11-26 (balM3.ts, auditCombat.ts y auditBuilds.ts no
// reproducen el juego). Aquí todo sale del producto:
// - el personaje es un `Character` real subido de nivel con su XP (`makeSessionAt`);
// - el enemigo es el arquetipo real a su nivel base (`World.spawnEnemy` → `EnemySystem.archetypeAt`
//   y `EnemyActor`), con sus ataques, avisos, hechizos e IA;
// - el combate corre en un `World` a 60 Hz con el bot de `bot.ts`, GCD, recurso, enfriamientos,
//   pociones y mascota incluidos.
//
// Perfiles del personaje:
// - `sin_puntos`: el nivel y los hechizos de clase, sin gastar puntos ni equipo. Solo diagnóstico.
// - `preparado`: puntos gastados (`spendPoints`) y lo mejor de CADA objeto de nivel ≤ N, sin mirar
//   si se puede conseguir. Es un techo, no el equipo «razonable»: ese perfil falta (ver TAREAS).
//
//   npm run balance:fiel -- [--seeds 10] [--skill medio] [--limit 120] [--out work/balance/FIEL]
import { mkdirSync, writeFileSync } from 'node:fs';
import type { GameData } from '../../src/data';
import { xpToNext } from '../../src/rpg/progression';
import { GameSession } from '../../src/rpg/session';
import { Character } from '../../src/rpg/character';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { PlayerBot } from './bot';
import { buildData, FIELD_CENTER, openField, rawData } from './data';
import { summonPet } from './gear';
import { Recorder } from './metrics';
import { DT, makeSessionAt, placeGroup, SKILLS, type SkillId } from './scenarios';

type Role = 'normal' | 'distancia' | 'bruto';
interface Foe {
    id: string;
    role: Role;
}
/** Un arquetipo por papel en cada franja; el jugador va siempre al nivel base del enemigo. */
export const BANDS: Foe[][] = [
    [{ id: 'melee', role: 'normal' }, { id: 'ranged', role: 'distancia' }, { id: 'alpha_wolf', role: 'bruto' }],
    [{ id: 'chame_crab', role: 'normal' }, { id: 'chame_heron', role: 'distancia' }, { id: 'chame_grandcrab', role: 'bruto' }],
    [{ id: 'boquete_quetzal', role: 'distancia' }, { id: 'boquete_picker', role: 'bruto' }, { id: 'boquete_foreman', role: 'bruto' }],
    [{ id: 'cerropunta_peccary', role: 'normal' }, { id: 'cerropunta_farmer', role: 'distancia' }, { id: 'cerropunta_boar', role: 'bruto' }],
    [{ id: 'baru_jaguar', role: 'normal' }, { id: 'baru_lookout', role: 'distancia' }, { id: 'baru_elder', role: 'bruto' }],
    [{ id: 'darien_neque', role: 'normal' }, { id: 'darien_blowgun', role: 'distancia' }, { id: 'darien_harpy', role: 'bruto' }],
    [{ id: 'bocas_frog', role: 'normal' }, { id: 'bocas_pirate', role: 'distancia' }, { id: 'bocas_captain', role: 'bruto' }],
    [{ id: 'perlas_oyster', role: 'normal' }, { id: 'perlas_fisher', role: 'distancia' }, { id: 'perlas_shark', role: 'bruto' }],
    [{ id: 'fortuna_archer', role: 'distancia' }, { id: 'fortuna_gale', role: 'bruto' }, { id: 'fortuna_coyote', role: 'bruto' }],
    [{ id: 'ancon_titi', role: 'normal' }, { id: 'ancon_pavo', role: 'distancia' }, { id: 'ancon_bus', role: 'bruto' }],
];

export type Profile = 'sin_puntos' | 'preparado';

export interface FielSpec {
    classId: string;
    foe: Foe;
    count: number;
    profile: Profile;
    skill: SkillId;
    seed: number;
    limit: number;
}

export interface FielRun {
    classId: string;
    enemy: string;
    role: Role;
    level: number;
    count: number;
    profile: Profile;
    seed: number;
    win: boolean;
    died: boolean;
    /** Segundos hasta acabar con el grupo, caer o el límite. */
    seconds: number;
    playerMaxHealth: number;
    enemyMaxHealth: number;
    healthLeft: number;
    potions: number;
    dealt: number;
    petDealt: number;
    healthLost: number;
    starved: number;
}

/** Nivel `level` sin gastar puntos ni equiparse: solo los hechizos que la clase aprende sola. */
function bareSession(data: GameData, classId: string, level: number, seed: number): GameSession {
    const rng = new Rng(seed);
    const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Bot', rng), rng);
    let xp = 0;
    for (let l = 1; l < level; l++) xp += xpToNext(data.rpg.progression, l);
    s.character.gainXp(xp);
    s.character.restore();
    summonPet(s);
    return s;
}

export function enemyLevel(data: GameData, id: string): number {
    return data.rpg.enemies[id]?.level ?? 1;
}

export function runFiel(field: GameData, spec: FielSpec): FielRun {
    const level = enemyLevel(field, spec.foe.id);
    const seed = spec.seed * 7919 + 17;
    const s =
        spec.profile === 'preparado'
            ? makeSessionAt(field, spec.classId, level, seed, true)
            : bareSession(field, spec.classId, level, seed);
    const w = new World(field, { encounter: false, character: s.character, seed: spec.seed });
    s.attach(w);
    w.player.pos = { ...FIELD_CENTER };
    w.player.prevPos = { ...FIELD_CENTER };
    placeGroup(w, [{ archetype: spec.foe.id, count: spec.count }], new Rng(spec.seed ^ 0x9e3779b9));
    const first = w.enemies.list[0];
    const enemyMaxHealth = first ? first.def.maxHealth : 0;
    const bot = new PlayerBot(w, s, { dodge: SKILLS[spec.skill], seed: spec.seed * 31 + 7 });
    const rec = new Recorder(w);
    while (w.outcome === 'playing' && w.time < spec.limit) {
        bot.think();
        w.tick(DT);
        rec.step(DT, bot.inCombat());
    }
    const ch = s.character;
    return {
        classId: spec.classId,
        enemy: spec.foe.id,
        role: spec.foe.role,
        level,
        count: spec.count,
        profile: spec.profile,
        seed: spec.seed,
        win: w.outcome === 'victory',
        died: w.outcome === 'defeat',
        seconds: w.endTime ?? w.time,
        playerMaxHealth: ch.maxHealth,
        enemyMaxHealth,
        healthLeft: ch.alive ? ch.health / ch.maxHealth : 0,
        potions: bot.counters.potions,
        dealt: rec.tally.dealt,
        petDealt: rec.tally.petDealt,
        healthLost: rec.tally.healthLost,
        starved: bot.counters.decisions > 0 ? bot.counters.starved / bot.counters.decisions : 0,
    };
}

export function quantile(xs: readonly number[], q: number): number {
    if (xs.length === 0) return NaN;
    const a = [...xs].sort((x, y) => x - y);
    const i = (a.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return a[lo]! + (a[hi]! - a[lo]!) * (i - lo);
}

interface Row {
    key: string;
    runs: FielRun[];
}

function summarize(rows: Row[], limit: number): string {
    const f = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');
    const lines = [
        '| Clase | Perfil | Nv | Enemigo (papel) | × | Vida PJ | Vida enemigo | Victorias | Muertes | TTK P10 / mediana / P90 (s) | Vida restante (mediana) | Pociones (mediana) |',
        '|---|---|---:|---|---:|---:|---:|---:|---:|---|---:|---:|',
    ];
    for (const r of rows) {
        const x = r.runs[0]!;
        const wins = r.runs.filter((q) => q.win);
        const t = wins.map((q) => q.seconds);
        lines.push(
            `| ${x.classId} | ${x.profile} | ${x.level} | ${x.enemy} (${x.role}) | ${x.count} | ${x.playerMaxHealth} | ${x.enemyMaxHealth} | ${wins.length}/${r.runs.length} | ${r.runs.filter((q) => q.died).length} | ${
                t.length ? `${f(quantile(t, 0.1), 1)} / ${f(quantile(t, 0.5), 1)} / ${f(quantile(t, 0.9), 1)}` : `— (límite ${limit} s)`
            } | ${f(quantile(r.runs.map((q) => q.healthLeft * 100), 0.5))} % | ${f(quantile(r.runs.map((q) => q.potions), 0.5))} |`,
        );
    }
    return lines.join('\n');
}

export function main(): void {
    const args = process.argv.slice(2);
    const opt = (name: string, def: string) => {
        const i = args.indexOf(name);
        return i >= 0 && args[i + 1] ? args[i + 1]! : def;
    };
    const seeds = Number(opt('--seeds', '10'));
    const skill = opt('--skill', 'medio') as SkillId;
    const limit = Number(opt('--limit', '120'));
    const out = opt('--out', 'work/balance/FIEL');
    const only = opt('--clases', '');
    const bandsArg = opt('--franjas', '');
    const data = buildData(rawData());
    const field = openField(data);
    const classes = only ? only.split(',') : Object.keys(data.rpg.classes);
    const bands = bandsArg ? bandsArg.split(',').map((b) => BANDS[Number(b)]!) : BANDS;
    const rows: Row[] = [];
    const t0 = Date.now();
    for (const band of bands)
        for (const foe of band)
            for (const count of foe.role === 'bruto' ? [1] : [1, 3])
                for (const classId of classes)
                    for (const profile of ['sin_puntos', 'preparado'] as Profile[]) {
                        const runs: FielRun[] = [];
                        for (let seed = 1; seed <= seeds; seed++)
                            runs.push(runFiel(field, { classId, foe, count, profile, skill, seed, limit }));
                        rows.push({ key: `${classId}/${profile}/${foe.id}x${count}`, runs });
                        process.stdout.write('.');
                    }
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    mkdirSync(out.replace(/\/[^/]*$/, '') || '.', { recursive: true });
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/runs.json`, JSON.stringify(rows.flatMap((r) => r.runs), null, 1));
    writeFileSync(
        `${out}/FIEL.md`,
        [
            '# BAL-P0-FIEL — combate a igualdad de nivel (medición, no balance aprobado)',
            '',
            `${seeds} semillas por fila, bot «${skill}», límite ${limit} s, campo abierto, mascota invocada. Generado en ${secs} s con \`npm run balance:fiel\`.`,
            '`preparado` = puntos gastados + lo mejor de cada objeto de nivel ≤ N sin mirar si se consigue (techo). `sin_puntos` = diagnóstico.',
            'TTK solo de las victorias. Las cifras de `data/` siguen siendo PROPUESTA: esto no las cambia.',
            '',
            summarize(rows, limit),
            '',
        ].join('\n'),
    );
    console.log(`\n${rows.length} filas en ${secs} s → ${out}/FIEL.md`);
}

