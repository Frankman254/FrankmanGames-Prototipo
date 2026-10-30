// Convierte las mediciones en `docs/EQUILIBRIO_2026-10.md`. Las conclusiones se
// escriben a partir de los números (umbrales explícitos más abajo), así que al
// regenerar el informe con otros datos cambian solas.
import type { GameData } from '../../src/data';
import { RARITIES } from '../../src/rpg/contracts';
import type { Measurement } from './battery';
import { ABLATION_SCENARIOS, LADDERS } from './battery';
import { LOST_NOISE, type ClassKey, type KeyMetrics } from './analysis';
import { DEATH_PENALTY } from './economy';
import { mean } from './metrics';
import type { Change, Proposal } from './proposals';
import { SCENARIOS, SKILL_IDS, SKILLS, type SkillId } from './scenarios';

export interface Variant {
  data: GameData;
  m: Measurement;
  k: KeyMetrics;
}

export interface ReportInput {
  base: Variant;
  /** Todos los ajustes a la vez, con la batería completa. */
  proposed: Variant & { changes: Change[] };
  /** Línea base y cada ajuste por separado, con una batería reducida. */
  quickBase: Variant;
  isolated: { proposal: Proposal; changes: Change[]; v: Variant }[];
  wallSeconds: number;
  dataHash: string;
}

// ─── Formato ───────────────────────────────────────────────────────────────

const nf = (x: number, d = 0): string => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '—');
const pct = (x: number, d = 0): string => (Number.isFinite(x) ? `${nf(x * 100, d)} %` : '—');
const points = (x: number): string => (Number.isFinite(x) ? `${x >= 0 ? '+' : '−'}${nf(Math.abs(x) * 100)} pts` : '—');
const signed = (x: number, d = 0): string => (Number.isFinite(x) ? `${x >= 0 ? '+' : '−'}${nf(Math.abs(x) * 100, d)} %` : '—');
const val = (v: unknown): string => (typeof v === 'number' ? nf(v, Number.isInteger(v) ? 0 : 2) : JSON.stringify(v));

function table(head: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

const SKILL_LABEL: Record<SkillId, string> = { malo: 'malo', medio: 'medio', bueno: 'bueno' };

function names(data: GameData) {
  return {
    cls: (id: string) => data.rpg.classes[id]?.name ?? id,
    spell: (id: string) => (id === 'basic' ? 'Ataque básico (arma)' : data.rpg.spells[id]?.name ?? id),
    scen: (id: string) => SCENARIOS.find((s) => s.id === id)?.label ?? id,
  };
}

function classKey(k: KeyMetrics, id: string): ClassKey {
  return k.classes.find((c) => c.classId === id)!;
}

// ─── Conclusiones ──────────────────────────────────────────────────────────

/** Umbrales de las conclusiones automáticas. */
const T = {
  /** Victorias de un jugador malo en la arena por encima de esto = la arena es fácil. */
  arenaEasy: 0.8,
  /** Diferencia de escalera entre clases que se considera clara. */
  ladderGap: 1.5,
  /** Decisiones con un hechizo listo pero sin recurso por debajo de esto = el recurso sobra. */
  starvedLow: 0.15,
  /** Minutos de granja para lo más caro de la tienda por debajo de esto = precios rotos. */
  priceCheap: 5,
};

function conclusions(data: GameData, k: KeyMetrics, m: Measurement): string[] {
  const n = names(data);
  const out: string[] = [];
  const [a, b] = k.classes;
  if (a && b) {
    const strong = (c: ClassKey) => c.ladderWolves.malo + c.ladderGoblins.malo - 50 * c.deathRate.malo;
    const [hi, lo] = strong(a) >= strong(b) ? [a, b] : [b, a];
    const gap = (hi.ladderWolves.malo + hi.ladderGoblins.malo) / Math.max(1, lo.ladderWolves.malo + lo.ladderGoblins.malo);
    out.push(
      `**Clase más fuerte: ${n.cls(hi.classId)}; más débil: ${n.cls(lo.classId)}.** Sin esquivar, la primera vence grupos de hasta ${hi.ladderWolves.malo} lobos y ${hi.ladderGoblins.malo} goblins y la segunda ${lo.ladderWolves.malo} y ${lo.ladderGoblins.malo}; ` +
        `muere en el ${pct(hi.deathRate.malo)} de los grupos y jefes frente al ${pct(lo.deathRate.malo)}. ` +
        (gap >= T.ladderGap
          ? `La diferencia es grande (×${nf(gap, 1)}) y viene de la supervivencia, no del daño: la ${n.cls(hi.classId)} tarda ${signed(rel(hi.ttk, lo.ttk))} en matar.`
          : `La diferencia es pequeña (×${nf(gap, 1)}); en tiempo para matar están a ${signed(rel(hi.ttk, lo.ttk))}.`),
    );
    const worstGood = Math.max(0, ...m.battery.filter((x) => x.skill !== 'malo').map((x) => x.deathRate));
    const arenaBad = Math.min(a.arenaWin.malo, b.arenaWin.malo);
    out.push(
      (worstGood === 0 ? '**Con habilidad media o buena no muere nadie** en ningún escenario de la batería. ' : `**Con habilidad media o buena se muere poco:** como mucho el ${pct(worstGood)} de las partidas de un escenario. `) +
        `La arena se gana el ${pct(arenaBad)} de las veces incluso sin esquivar nada` +
        (arenaBad >= T.arenaEasy ? '. **El contenido actual es fácil para las dos clases.**' : '.'),
    );
  }
  for (const c of k.classes) {
    const ratio = c.lost.malo / Math.max(0.5, c.lost.bueno);
    const ladderMove = c.ladderWolves.bueno - c.ladderWolves.malo;
    out.push(
      `**Habilidad (${n.cls(c.classId)}):** quien esquiva el 90 % pierde ${nf(c.lost.bueno, 1)} de vida por combate y quien no esquiva ${nf(c.lost.malo, 1)} (×${nf(ratio, 1)}). ` +
        (ladderMove > 0
          ? `Esquivar le deja vencer grupos de ${c.ladderWolves.bueno} lobos en vez de ${c.ladderWolves.malo}; prepararse (nivel 4 y buen equipo) sin esquivar, ${c.ladderWolvesPrepared.malo}. Ejecución y preparación pesan, la ejecución más.`
          : `Pero no cambia el resultado: sin esquivar ya vence ${c.ladderWolves.malo} lobos, el tope de la prueba. **Para esta clase la ejecución no decide nada.**`),
    );
  }
  const mand = k.spells.filter((s) => s.verdict === 'obligatorio' && s.spellId !== 'basic');
  const idle = k.spells.filter((s) => s.verdict === 'prescindible' && s.spellId !== 'basic');
  if (mand.length) out.push(`**Hechizos obligatorios** (sin ellos el combate dura ≥ 15 % más): ${mand.map((s) => `${n.spell(s.spellId)} (${signed(s.dTtk)})`).join('; ')}.`);
  if (idle.length) out.push(`**Hechizos que no aportan** (casi no se lanzan y quitarlos no cambia nada que se note): ${idle.map((s) => `${n.spell(s.spellId)} (${pct(s.castShare, 1)} de los lanzamientos, sin él ${signed(s.dTtk)} de tiempo y ${s.dLostAbs >= 0 ? '+' : '−'}${nf(Math.abs(s.dLostAbs), 1)} de vida perdida por combate)`).join('; ')}.`);
  const strongU = k.universals.filter((u) => u.dLost <= -0.3 && u.dLostAbs <= -2);
  if (strongU.length)
    out.push(
      `**Un universal rinde más que los de clase:** ${[...new Set(strongU.map((u) => n.spell(u.spellId)))].join(', ')} en lugar del hechizo de clase menos útil reduce la vida perdida ${strongU.map((u) => `${signed(u.dLost)} con la ${n.cls(u.classId)}`).join(' y ')}.`,
    );
  const basicShare = mean(k.spells.filter((s) => s.spellId === 'basic').map((s) => s.castShare));
  out.push(`**Ataque básico:** es el ${pct(basicShare)} de los lanzamientos: rellena los huecos del enfriamiento global.`);
  const starved = mean(k.classes.map((c) => c.starved));
  const res = mean(k.classes.map((c) => c.resource));
  out.push(
    starved < T.starvedLow
      ? `**El recurso sobra:** sólo en el ${pct(starved)} de las decisiones en combate había un hechizo listo que no se podía pagar, y el recurso medio está al ${pct(res)}. Mandan los enfriamientos; con DEC-2026-004 (recurso + enfriamientos) el recurso debería pesar más. Los combates duran menos de 20 s y empiezan con el recurso lleno, así que pesa más el máximo que la regeneración.`
      : `**El recurso limita:** en el ${pct(starved)} de las decisiones en combate había un hechizo listo que no se podía pagar (recurso medio ${pct(res)}).`,
  );
  const lvl2 = m.xpCurve[1] ?? 0;
  out.push(
    `**Curva de XP:** la primera arena da ${k.arenaXp} XP y el nivel 2 pide ${lvl2}` +
      (lvl2 < k.arenaXp ? ', así que se sube en mitad del primer combate; **subir de nivel cura vida y recurso del todo**, lo que salva combates perdidos' : '') +
      `. Repitiendo la arena se llega al nivel 5 en ${nf(mean(k.classes.map((c) => c.farmLevel5)), 0)} min, al 10 en ${nf(mean(k.classes.map((c) => c.farmLevel10)), 0)} min y al ${nf(mean(k.classes.map((c) => c.farmLevelAtEnd)), 1)} en ${m.options.farmMinutes} min.`,
  );
  const lv = Object.values(data.rpg.enemies).map((e) => e.level);
  out.push(
    `**Los enemigos no escalan:** son de nivel ${Math.min(...lv)}–${Math.max(...lv)} y dan la misma XP a un personaje de cualquier nivel, así que la curva sólo mide horas de repetir lo mismo. Falta contenido de más nivel o una regla de XP por diferencia de nivel (decisión de diseño, no de números).`,
  );
  const income = mean(k.classes.map((c) => c.netGoldPerMin));
  const farmsMedio = m.farms.filter((f) => f.skill === 'medio');
  const potions = farmsMedio.reduce((x, f) => x + f.potions, 0) / Math.max(1, farmsMedio.reduce((x, f) => x + f.minutes, 0) / 60);
  out.push(
    (k.maxPriceMinutes < T.priceCheap
      ? `**Los precios están rotos (demasiado baratos):** se ganan ~${nf(income)} monedas por minuto y lo más caro de la tienda (${k.maxPriceItem}, ${k.maxPrice}) cuesta ${nf(k.maxPriceMinutes, 1)} min de combate; la mitad de la tienda cuesta menos de ${nf(k.medianPriceMinutes * 60)} s.`
      : `**Precios:** con ~${nf(income)} monedas por minuto, lo más caro (${k.maxPriceItem}) cuesta ${nf(k.maxPriceMinutes, 1)} min de combate.`) +
      ` En la granja se beben ${nf(potions, 1)} pociones por hora${potions < 1 ? ': el oro no tiene en qué gastarse' : ''}.`,
  );
  const fish = k.fishGoldPerMin['0.8'] ?? NaN;
  out.push(`**Pesca:** reaccionando al 80 % da ${nf(fish)} monedas por minuto, el ${pct(fish / Math.max(1e-9, income))} de lo que da combatir. Es una actividad tranquila, no una alternativa económica.`);
  return out;
}

function rel(a: number, b: number): number {
  return b > 0 ? a / b - 1 : NaN;
}

// ─── Secciones ─────────────────────────────────────────────────────────────

function method(data: GameData, m: Measurement): string {
  const o = m.options;
  return [
    '## 1. Cómo se midió',
    '',
    `- **Simulación real:** cada partida es un \`World\` y una \`GameSession\` de \`src/\` a 60 Hz, sin pantalla. El bot da las mismas órdenes que el ratón y el teclado (clic para atacar o moverse, teclas 1–6, Espacio, Q/E). Código en \`scripts/balance/\`.`,
    `- **Rotación:** en cada decisión (una cada 0,1 s, como una persona) el bot valora los 6 huecos de la barra a partir de su definición (daño medio × objetivos alcanzados, escudo con poca vida o rodeado, mejora si no la tiene, embestida para acercarse, teletransporte e inmovilizar para quitarse de encima un cuerpo a cuerpo) y lanza el mejor que esté listo. Si no hay ninguno, ataque básico. No es una rotación escrita a mano por hechizo: sirve igual para cualquier hechizo que se ponga en la barra.`,
    `- **Habilidad:** cuando empieza un aviso enemigo cuya área le cubre, el bot decide **una vez** si lo esquiva, con probabilidad ${SKILL_IDS.map((s) => `${SKILL_LABEL[s]} = ${pct(SKILLS[s])}`).join(', ')}. Si lo esquiva, tras 0,3 s ± 20 % de reacción sale del área andando si le da tiempo o con la evasión si no. La clase a distancia, con la misma probabilidad, se aparta cuando un cuerpo a cuerpo se le echa encima (kiting).`,
    '- **Pociones:** bebe por debajo del 35 % de vida y toma un tónico por debajo del 15 % de recurso en combate.',
    '- **Equipo y puntos:** equipa lo que suba una suma ponderada de estadísticas (la principal pesa 1, resistencia física 0,3–0,4, crítico 80 por unidad, el daño del arma 3 por punto de daño por segundo…) sin cambiar de tipo de arma; los puntos van dos a la principal y uno a vitalidad. Invoca la mascota luchadora (Zorro de ceniza) que traen las dos clases.',
    `- **Preparación:** *inicial* = nivel 1 con el kit de la clase; *preparado* = nivel 4 con los puntos gastados y lo mejor de una copia de cada objeto equipable de nivel ≤ 4.`,
    `- **Semillas:** ${o.seeds} por combinación en la batería principal, ${o.sideSeeds} en ablaciones y escaleras. ${m.runs} partidas en la batería principal.`,
    `- **Escenarios de grupo** en un campo abierto de 80 × 80 m (como un prado del mundo continuo); los enemigos aparecen en arco a 9–11 m. La **arena** es la del Slice 01 con sus obstáculos.`,
    '',
    table(
      ['Escenario', 'Tipo', 'Enemigos', 'Límite'],
      SCENARIOS.map((s) => [s.id, s.kind, s.kind === 'arena' ? data.encounter.spawns.map((x) => data.rpg.enemies[x.archetype]?.name ?? x.archetype).join(', ') : s.label, `${s.limit} s`]),
    ),
    '',
    `Una partida se pierde al caer o al llegar al límite. *Tiempo para matar* = mediana de las victorias. *Vida perdida* = lo que de verdad baja la vida (sin lo que absorbe el escudo), por partida. *Golpes/avisos* = golpes enemigos que conectan ÷ avisos cuya área cubría al jugador al empezar.`,
  ].join('\n');
}

function classesSection(data: GameData, m: Measurement, k: KeyMetrics): string {
  const n = names(data);
  const ids = Object.keys(data.rpg.classes);
  const cell = (scen: string, cls: string, skill: SkillId, prep = 'inicial'): string => {
    const a = m.battery.find((x) => x.scenario === scen && x.classId === cls && x.skill === skill && x.prep === prep);
    if (!a) return '—';
    return `${pct(a.winRate)} · ${nf(a.ttk, 1)} s · ${nf(a.lost)}`;
  };
  const head = ['Escenario', ...ids.flatMap((c) => SKILL_IDS.map((s) => `${n.cls(c)} ${SKILL_LABEL[s]}`))];
  const out: string[] = ['## 2. Clases', ''];
  out.push('### 2.1 Victorias · tiempo para matar · vida perdida (nivel 1, kit inicial)', '');
  out.push(table(head, SCENARIOS.map((s) => [s.label, ...ids.flatMap((c) => SKILL_IDS.map((sk) => cell(s.id, c, sk)))])));
  out.push('', '### 2.2 Lo mismo, preparado (nivel 4, puntos y mejor equipo de nivel ≤ 4)', '');
  out.push(table(head, SCENARIOS.map((s) => [s.label, ...ids.flatMap((c) => SKILL_IDS.map((sk) => cell(s.id, c, sk, 'preparado')))])));
  out.push('', '### 2.3 Detalle con habilidad media (nivel 1)', '');
  const det = (a: (typeof m.battery)[number]) => [
    nf(a.dps, 1),
    nf(a.petDps, 1),
    nf(a.taken, 1),
    nf(a.lost, 1),
    pct(a.hitRate),
    nf(a.potions, 2),
    nf(a.tonics, 2),
    pct(a.resource),
    pct(a.resourceFull),
    pct(a.starved),
    nf(a.xpPerMin),
    nf(a.goldPerMin),
  ];
  for (const c of ids) {
    out.push(`**${n.cls(c)}**`, '');
    out.push(
      table(
        ['Escenario', 'DPS', 'DPS mascota', 'Daño entrante', 'Vida perdida', 'Golpes/avisos', 'Pociones', 'Tónicos', 'Recurso medio', 'Recurso lleno', 'Listo sin recurso', 'XP/min', 'Oro/min'],
        SCENARIOS.map((s) => {
          const a = m.battery.find((x) => x.scenario === s.id && x.classId === c && x.skill === 'medio' && x.prep === 'inicial')!;
          return [s.label, ...det(a)];
        }),
      ),
      '',
    );
  }
  out.push(
    '*XP/min y oro/min* son del tiempo de combate solo (sin desplazarse ni descansar); el ritmo real está en la granja (§5 y §7). El oro incluye el valor de venta de lo que se recoge.',
    '',
    '### 2.4 Escaleras: mayor grupo que se vence la mitad de las veces',
    '',
  );
  out.push(
    table(
      ['Prueba', 'Clase', 'Preparación', ...SKILL_IDS.map((s) => SKILL_LABEL[s])],
      LADDERS.flatMap((L) =>
        ids.flatMap((c) =>
          (['inicial', 'preparado'] as const).map((prep) => [
            L.label,
            n.cls(c),
            prep,
            ...SKILL_IDS.map((s) => {
              const r = m.ladder.find((x) => x.ladder === L.id && x.classId === c && x.prep === prep && x.skill === s);
              if (!r) return '—';
              const top = L.sizes[L.sizes.length - 1]!;
              return r.maxSize >= top ? `≥ ${top}` : String(r.maxSize);
            }),
          ]),
        ),
      ),
    ),
  );
  out.push('', `Tamaños probados: ${LADDERS.map((L) => `${L.label} ${L.sizes.join(', ')}`).join('; ')}. «≥ N» = gana incluso el mayor.`, '');
  out.push('### 2.5 Resumen por clase', '');
  out.push(
    table(
      ['Clase', 'DPS (medio)', 'Tiempo para matar medio', 'Parte de la mascota', 'Muertes malo / medio / bueno', 'Vida perdida malo / medio / bueno'],
      k.classes.map((c) => [
        n.cls(c.classId),
        nf(c.dps, 1),
        `${nf(c.ttk, 1)} s`,
        pct(c.petShare),
        SKILL_IDS.map((s) => pct(c.deathRate[s])).join(' / '),
        SKILL_IDS.map((s) => nf(c.lost[s], 1)).join(' / '),
      ]),
    ),
  );
  return out.join('\n');
}

function spellsSection(data: GameData, m: Measurement, k: KeyMetrics): string {
  const n = names(data);
  const out: string[] = ['## 3. Hechizos', ''];
  out.push(`Uso con habilidad media, nivel 1, en todos los escenarios. *Ablación*: la misma batería reducida (${ABLATION_SCENARIOS.join(', ')}; ${m.options.sideSeeds} semillas) con ese hueco vacío; Δ = cambio frente a la barra completa.`, '');
  out.push(
    table(
      ['Clase', 'Hechizo', '% lanzamientos', '% daño directo', 'Lanzamientos/min', 'Δ tiempo sin él', 'Δ vida perdida sin él', 'Δ victorias', 'Veredicto'],
      k.spells.map((s) => [n.cls(s.classId), n.spell(s.spellId), pct(s.castShare, 1), pct(s.damageShare, 1), nf(s.castsPerMin, 1), signed(s.dTtk), Number.isFinite(s.dLost) ? `${signed(s.dLost)} (${s.dLostAbs >= 0 ? '+' : '−'}${nf(Math.abs(s.dLostAbs), 1)})` : '—', points(s.dWin), s.spellId === 'basic' ? '—' : s.verdict]),
    ),
  );
  out.push('', `El daño de la Quemadura (Marca ardiente, Remolino) cuenta aparte como «estado»; por eso la Marca parece hacer poco daño directo. Veredictos: *obligatorio* = sin él se pierden ≥ 10 puntos de victorias o el combate dura ≥ 15 % más; *importante* = dura ≥ 5 % más o se pierde ≥ 25 % más de vida; *prescindible* = menos del 6 % de los lanzamientos y quitarlo no cambia nada que se note (≤ 3 % de tiempo, ≤ 12 % de vida). Los cambios de vida de menos de ${LOST_NOISE} puntos por combate no cuentan (con tan poco daño, un +100 % son 3 puntos).`, '');
  const states = Object.keys(m.battery[0]?.damageBy ?? {}).length ? m.battery.filter((a) => a.skill === 'medio' && a.prep === 'inicial') : [];
  const burn = states.reduce((a, x) => a + (x.damageBy['status:burn'] ?? 0), 0);
  const all = states.reduce((a, x) => a + Object.values(x.damageBy).reduce((p, q) => p + q, 0), 0);
  if (all > 0) out.push(`Daño de estados (Quemadura) sobre el total del jugador: ${pct(burn / all, 1)}.`, '');
  out.push('### 3.1 Hechizos universales en lugar del hechizo de clase menos útil', '');
  out.push(
    table(
      ['Clase', 'Universal', 'Sustituye a', 'Δ tiempo para matar', 'Δ vida perdida'],
      k.universals.map((u) => [n.cls(u.classId), n.spell(u.spellId), n.spell(u.replaces), signed(u.dTtk), `${signed(u.dLost)} (${u.dLostAbs >= 0 ? '+' : '−'}${nf(Math.abs(u.dLostAbs), 1)})`]),
    ),
  );
  return out.join('\n');
}

function skillSection(data: GameData, k: KeyMetrics): string {
  const n = names(data);
  const out = ['## 4. ¿Importa la habilidad? (preparación + ejecución)', ''];
  out.push(
    table(
      ['Clase', 'Golpes/avisos malo / medio / bueno', 'Vida perdida malo / medio / bueno', 'Lobos (inicial) malo / medio / bueno', 'Lobos preparado malo / medio / bueno', 'Arena malo / medio / bueno'],
      k.classes.map((c) => [
        n.cls(c.classId),
        SKILL_IDS.map((s) => pct(c.hitRate[s])).join(' / '),
        SKILL_IDS.map((s) => nf(c.lost[s], 1)).join(' / '),
        SKILL_IDS.map((s) => String(c.ladderWolves[s])).join(' / '),
        SKILL_IDS.map((s) => String(c.ladderWolvesPrepared[s])).join(' / '),
        SKILL_IDS.map((s) => pct(c.arenaWin[s])).join(' / '),
      ]),
    ),
  );
  out.push(
    '',
    'Lectura: la *ejecución* es la columna de habilidad; la *preparación* es pasar de inicial a preparado con la habilidad fija. Si una clase gana lo mismo sin esquivar que esquivando, la ejecución no pesa; si gana lo mismo con o sin equipo, la preparación no pesa.',
  );
  return out.join('\n');
}

function progressionSection(data: GameData, m: Measurement, k: KeyMetrics): string {
  const n = names(data);
  const p = data.rpg.progression;
  const out = ['## 5. Progresión (XP)', ''];
  out.push(
    `Granja: la arena del Slice 01 (único encuentro del mundo, ${k.arenaXp} XP) se repite durante ${m.options.farmMinutes} min como si reapareciera, arrastrando la vida y el recurso entre pasadas, recogiendo el botín, equipándose, vendiendo y descansando hasta el 80 %. Morir cuesta ${DEATH_PENALTY} s. ${m.options.farmSeeds} semillas por clase y habilidad.`,
    '',
  );
  out.push(`Fórmula: xpToNext(n) = round(${p.xp.base} · n^${p.xp.exponent}); nivel máximo ${p.maxLevel}.`, '');
  const levels = [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20].filter((l) => l <= p.maxLevel);
  let cum = 0;
  const cumAt: Record<number, number> = {};
  for (let l = 1; l < p.maxLevel; l++) {
    cum += m.xpCurve[l]!;
    cumAt[l + 1] = cum;
  }
  const farmsBy = (c: string) => m.farms.filter((f) => f.classId === c && f.skill === 'medio');
  out.push(
    table(
      ['Nivel', 'XP del anterior a este', 'XP total', 'Arenas', ...Object.keys(data.rpg.classes).map((c) => `Minuto (${n.cls(c)}, medio)`)],
      levels.map((l) => [
        String(l),
        nf(m.xpCurve[l - 1]!),
        nf(cumAt[l]!),
        nf(cumAt[l]! / Math.max(1, k.arenaXp), 1),
        ...Object.keys(data.rpg.classes).map((c) => {
          const at = farmsBy(c).map((f) => f.levelAt[l]);
          return at.every((x) => x !== undefined) ? nf(mean(at as number[]), 1) : `> ${m.options.farmMinutes}`;
        }),
      ]),
    ),
  );
  out.push('', '### 5.1 Nivel alcanzado en N minutos', '');
  const mins = [5, 10, 20, 30, 45, 60].filter((x) => x <= m.options.farmMinutes);
  out.push(
    table(
      ['Clase', 'Habilidad', ...mins.map((x) => `${x} min`), 'Pasadas', 'Muertes', 'Descanso'],
      Object.keys(data.rpg.classes).flatMap((c) =>
        SKILL_IDS.map((s) => {
          const fs = m.farms.filter((f) => f.classId === c && f.skill === s);
          return [
            n.cls(c),
            SKILL_LABEL[s],
            ...mins.map((x) => nf(mean(fs.map((f) => f.checkpoints.find((cp) => cp.minute === x)?.level ?? NaN)), 1)),
            nf(mean(fs.map((f) => f.clears))),
            nf(mean(fs.map((f) => f.deaths)), 1),
            `${nf(mean(fs.map((f) => f.restSeconds)))} s`,
          ];
        }),
      ),
    ),
  );
  out.push('', 'Nivel con decimales: 7,5 = a mitad de camino del 8.');
  return out.join('\n');
}

function lootSection(data: GameData, m: Measurement): string {
  const n = names(data);
  const out = ['## 6. Botín por rareza', ''];
  const count = Object.fromEntries(RARITIES.map((r) => [r, Object.values(data.rpg.items).filter((i) => i.rarity === r).length]));
  out.push(`Objetos que existen por rareza: ${RARITIES.map((r) => `${r} ${count[r]}`).join(', ')}.`, '');
  out.push(
    table(
      ['Clase', 'Habilidad', ...RARITIES.map((r) => `${r}/min`), 'Minutos por objeto raro', 'Minutos por épico'],
      Object.keys(data.rpg.classes).flatMap((c) =>
        SKILL_IDS.map((s) => {
          const fs = m.farms.filter((f) => f.classId === c && f.skill === s);
          const min = fs.reduce((a, f) => a + f.minutes, 0);
          const per = (r: string) => fs.reduce((a, f) => a + (f.drops as Record<string, number>)[r]!, 0) / Math.max(1, min);
          return [n.cls(c), SKILL_LABEL[s], ...RARITIES.map((r) => nf(per(r), 2)), nf(1 / per('rare'), 1), nf(1 / per('epic'), 0)];
        }),
      ),
    ),
  );
  out.push('', 'Cuenta todo lo que cae al suelo en la granja (pociones y materiales incluidos), por minuto de granja (con desplazamientos y descansos).');
  return out.join('\n');
}

function economySection(data: GameData, m: Measurement, k: KeyMetrics): string {
  const n = names(data);
  const out = ['## 7. Economía', ''];
  out.push('### 7.1 Ingresos por minuto', '');
  out.push(
    table(
      ['Fuente', 'Monedas/min', 'Ventas/min', 'Neto/min'],
      [
        ...k.classes.map((c) => [`Granja, ${n.cls(c.classId)} (medio)`, nf(c.coinsPerMin, 1), nf(c.salesPerMin, 1), nf(c.netGoldPerMin, 1)]),
        ...Object.keys(k.fishGoldPerMin).map((r) => [`Pesca, reacciona al ${pct(Number(r))} (${nf(k.fishCatchPerMin[r]!, 1)} capturas/min)`, '—', '—', nf(k.fishGoldPerMin[r]!, 1)]),
      ],
    ),
  );
  out.push(
    '',
    'Ventas = vender a la herrera lo que no se usa (materiales, equipo que no mejora, amuletos repetidos, peces). Neto = monedas + ventas − pociones compradas. La pesca cuenta las monedas que traen los peces y el valor de venta de todo lo pescado; los peces que curan también podrían beberse.',
    '',
  );
  const income = mean(k.classes.map((c) => c.netGoldPerMin));
  const fish = k.fishGoldPerMin['0.8'] ?? NaN;
  out.push('### 7.2 Lo que cuesta cada objeto de la tienda', '');
  out.push(
    table(
      ['Mercader', 'Objeto', 'Rareza', 'Nivel', 'Precio', 'Minutos de combate', 'Minutos de pesca (80 %)'],
      [...m.prices].sort((a, b) => a.merchantId.localeCompare(b.merchantId) || a.price - b.price).map((p) => [data.rpg.merchants[p.merchantId]?.name ?? p.merchantId, p.name, p.rarity, String(p.level), String(p.price), nf(p.price / income, 1), nf(p.price / fish, 1)]),
    ),
  );
  out.push('', `Minutos de combate = precio ÷ ${nf(income, 1)} monedas netas por minuto (media de las clases en la granja, habilidad media).`);
  return out.join('\n');
}

function proposalsSection(r: ReportInput): string {
  const n = names(r.base.data);
  const out = ['## 8. Ajustes propuestos', ''];
  out.push(
    '> Nada de esto está aplicado: `data/` no se ha tocado. Cada ajuste se aplica a una copia en memoria (`scripts/balance/proposals.ts`) y se vuelve a simular. Son PROPUESTA para que el creador decida.',
    '',
  );
  for (const { proposal: p, changes } of r.isolated) {
    out.push(`### ${p.title} (\`${p.id}\`)`, '', p.why, '');
    out.push(table(['Archivo', 'Campo', 'Ahora', 'Propuesto'], changes.map((c) => [`data/${c.file}`, `\`${c.path}\``, val(c.from), val(c.to)])), '');
  }
  out.push('### 8.1 Resultado con todos los ajustes a la vez (batería completa)', '');
  const b = r.base.k;
  const a = r.proposed.k;
  const rows: string[][] = [];
  for (const c of b.classes) {
    const d = classKey(a, c.classId);
    const nm = n.cls(c.classId);
    rows.push([`${nm}: muertes en grupos y jefes, malo / medio / bueno`, SKILL_IDS.map((s) => pct(c.deathRate[s])).join(' / '), SKILL_IDS.map((s) => pct(d.deathRate[s])).join(' / ')]);
    rows.push([`${nm}: vida perdida por combate, malo / medio / bueno`, SKILL_IDS.map((s) => nf(c.lost[s], 1)).join(' / '), SKILL_IDS.map((s) => nf(d.lost[s], 1)).join(' / ')]);
    rows.push([`${nm}: mayor grupo de lobos, malo / medio / bueno`, SKILL_IDS.map((s) => String(c.ladderWolves[s])).join(' / '), SKILL_IDS.map((s) => String(d.ladderWolves[s])).join(' / ')]);
    rows.push([`${nm}: mayor grupo de lobos preparado, malo`, String(c.ladderWolvesPrepared.malo), String(d.ladderWolvesPrepared.malo)]);
    rows.push([`${nm}: arena, victorias malo / medio / bueno`, SKILL_IDS.map((s) => pct(c.arenaWin[s])).join(' / '), SKILL_IDS.map((s) => pct(d.arenaWin[s])).join(' / ')]);
    rows.push([`${nm}: tiempo para matar medio (medio)`, `${nf(c.ttk, 1)} s`, `${nf(d.ttk, 1)} s`]);
    rows.push([`${nm}: recurso medio en combate`, pct(c.resource), pct(d.resource)]);
    rows.push([`${nm}: decisiones con un hechizo listo sin recurso`, pct(c.starved), pct(d.starved)]);
    rows.push([`${nm}: nivel a los 30 min / al final`, `${nf(c.farmLevelAt30, 1)} / ${nf(c.farmLevelAtEnd, 1)}`, `${nf(d.farmLevelAt30, 1)} / ${nf(d.farmLevelAtEnd, 1)}`]);
    rows.push([`${nm}: minuto del nivel 10`, nf(c.farmLevel10, 1), nf(d.farmLevel10, 1)]);
    rows.push([`${nm}: muertes por hora de granja`, nf(c.farmDeathsPerHour, 1), nf(d.farmDeathsPerHour, 1)]);
    rows.push([`${nm}: oro neto por minuto`, nf(c.netGoldPerMin, 1), nf(d.netGoldPerMin, 1)]);
  }
  rows.push(['Niveles que da la primera arena', String(b.arenaLevelsFromOne), String(a.arenaLevelsFromOne)]);
  rows.push([`Minutos de combate para lo más caro de la tienda`, `${nf(b.maxPriceMinutes, 1)} (${b.maxPriceItem})`, `${nf(a.maxPriceMinutes, 1)} (${a.maxPriceItem})`]);
  rows.push(['Mediana de minutos de combate por objeto de la tienda', nf(b.medianPriceMinutes, 1), nf(a.medianPriceMinutes, 1)]);
  rows.push(['Pesca al 80 %: monedas por minuto', nf(b.fishGoldPerMin['0.8'] ?? NaN, 1), nf(a.fishGoldPerMin['0.8'] ?? NaN, 1)]);
  out.push(table(['Medida', 'Ahora', 'Con los ajustes'], rows), '');
  const verdicts = (k: KeyMetrics) => k.spells.filter((s) => s.spellId !== 'basic').map((s) => `${n.spell(s.spellId)}: ${s.verdict}`);
  out.push('Veredicto de cada hechizo con los ajustes: ' + verdicts(a).join('; ') + '.', '');
  out.push('### 8.2 Cada ajuste por separado (batería reducida)', '');
  out.push(`Batería con ${r.quickBase.m.options.seeds} semillas, escaleras con ${r.quickBase.m.options.sideSeeds} y granja de ${r.quickBase.m.options.farmMinutes} min, comparada con la línea base medida igual. «—» = no se llega en esa granja.`, '');
  const q = r.quickBase.k;
  const metricRow = (label: string, f: (k: KeyMetrics) => string) => [label, f(q), ...r.isolated.map((x) => f(x.v.k))];
  const cls = Object.keys(r.base.data.rpg.classes);
  const both = (f: (c: ClassKey) => string) => (k: KeyMetrics) => cls.map((c) => f(classKey(k, c))).join(' / ');
  out.push(
    table(
      ['Medida (Vanguardia / Tejedora)', 'Base', ...r.isolated.map((x) => x.proposal.id)],
      [
        metricRow('Muertes en grupos, malo', both((c) => pct(c.deathRate.malo))),
        metricRow('Vida perdida por combate, malo', both((c) => nf(c.lost.malo))),
        metricRow('Vida perdida por combate, bueno', both((c) => nf(c.lost.bueno))),
        metricRow('Lobos, malo', both((c) => String(c.ladderWolves.malo))),
        metricRow('Tiempo para matar (medio)', both((c) => nf(c.ttk, 1))),
        metricRow('Recurso medio', both((c) => pct(c.resource))),
        metricRow('Hechizo listo sin recurso', both((c) => pct(c.starved))),
        metricRow('Minuto del nivel 10', both((c) => nf(c.farmLevel10, 0))),
        metricRow('Oro neto/min', both((c) => nf(c.netGoldPerMin))),
        metricRow('Min. para lo más caro', (k) => nf(k.maxPriceMinutes, 1)),
      ],
    ),
  );
  return out.join('\n');
}

function limitations(): string {
  return [
    '## 9. Límites de esta medición',
    '',
    '- El bot es constante: apunta sin errores, nunca se equivoca de tecla y reacciona siempre en 0,3 s. Un jugador real «malo» falla en más cosas que esquivar; uno «bueno» también usa el terreno. Los números son una cota optimista del daño y pesimista del tiempo que se pierde.',
    '- Sólo se mide lo que hay: 6 arquetipos de nivel 1–4 y un único encuentro (la arena). La granja supone que la arena reaparece; en el juego todavía no lo hace.',
    '- Vender y comprar son instantáneos (no se camina al pueblo). La pesca no se combina con mascotas.',
    '- Las mascotas no reciben golpes (así está el juego); el zorro aporta poco daño.',
    '- Los hechizos de huida (Paso del relámpago) valen más para una persona que para el bot, que se aparta andando muy bien: su veredicto es el más dudoso.',
    '- La regla de equipo es una suma ponderada fija; no busca sets ni sinergias.',
    '- No se probó ninguna fórmula nueva (XP por diferencia de nivel): sólo cambios de números en datos.',
  ].join('\n');
}

export function renderReport(r: ReportInput, generatedAt: string): string {
  const { data, m, k } = r.base;
  return [
    '# Equilibrio del contenido — octubre de 2026',
    '',
    `> Generado por \`npm run balance\` (\`scripts/balance/\`) el ${generatedAt}, en ${nf(r.wallSeconds)} s. **No editar a mano:** se sobrescribe al regenerarlo.`,
    `> Datos de \`data/\` con huella \`${r.dataHash}\`. Todas las cifras de juego son PROPUESTA; este informe no cambia ninguna.`,
    '',
    '## Resumen',
    '',
    ...conclusions(data, k, m).map((x) => `- ${x}`),
    '',
    `**Ajustes propuestos** (§8, sin aplicar): ${r.isolated.map((x) => x.proposal.title.toLowerCase()).join('; ')}. Con todos a la vez, ${r.proposed.k.classes.map((c) => `la ${names(data).cls(c.classId)} sin esquivar vence hasta ${c.ladderWolves.malo} lobos (ahora ${classKey(k, c.classId).ladderWolves.malo}) y esquivando ${c.ladderWolves.bueno}`).join('; ')}; la arena sigue ganándose con habilidad media (${r.proposed.k.classes.map((c) => pct(c.arenaWin.medio)).join(' / ')}).`,
    '',
    method(data, m),
    '',
    classesSection(data, m, k),
    '',
    spellsSection(data, m, k),
    '',
    skillSection(data, k),
    '',
    progressionSection(data, m, k),
    '',
    lootSection(data, m),
    '',
    economySection(data, m, k),
    '',
    proposalsSection(r),
    '',
    limitations(),
    '',
  ].join('\n');
}
