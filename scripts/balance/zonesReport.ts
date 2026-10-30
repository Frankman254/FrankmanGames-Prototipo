// Informe del escenario «zona contra nivel del jugador» (docs/EQUILIBRIO_ZONAS.md).
import type { ZoneAgg, ZoneMeasurement } from './zones';
import { ZONE_PLAYER_LEVELS, ZONE_SKILLS } from './zones';

const pct = (x: number): string => `${Math.round(x * 100)} %`;
const sec = (x: number): string => (Number.isFinite(x) ? `${x.toFixed(1)} s` : '—');

function cell(a: ZoneAgg | undefined): string {
  if (!a) return '—';
  const os = a.oneShotRate > 0 ? ` (${pct(a.oneShotRate)} de un golpe)` : '';
  return `${pct(a.deathRate)}${os} · ${sec(a.ttkPerKill)}`;
}

/** Comprobaciones de lo que pidió el creador, en frases que se pueden leer sin las tablas. */
function checks(m: ZoneMeasurement): string[] {
  const get = (zone: string, lv: number, skill: string): ZoneAgg | undefined => m.rows.find((r) => r.zone === zone && r.playerLevel === lv && r.skill === skill);
  const out: string[] = [];
  const elite = m.zones.reduce((a, b) => (b.levelMin > a.levelMin ? b : a));
  const e1 = get(elite.id, 1, 'malo');
  if (e1) out.push(`${e1.oneShotRate >= 0.5 ? '✔' : '✘'} Nivel 1 sin esquivar en ${elite.name}: muere de un golpe en el ${pct(e1.oneShotRate)} de las partidas (se pide que pueda pasar).`);
  for (const z of m.zones) {
    // Nivel del jugador más cercano por debajo de la franja.
    const inBand = [...ZONE_PLAYER_LEVELS].filter((l) => l >= z.levelMin && l <= z.levelMax);
    for (const lv of inBand) {
      const a = get(z.id, lv, 'medio');
      if (a) out.push(`${a.deathRate <= 0.25 ? '✔' : '✘'} Nivel ${lv} (dentro de la franja) en ${z.name}, habilidad media: muere el ${pct(a.deathRate)}, ${sec(a.ttkPerKill)} por monstruo.`);
    }
    const below = [...ZONE_PLAYER_LEVELS].filter((l) => l + 5 <= z.levelMin);
    const lv = below[below.length - 1];
    if (lv === undefined) continue;
    const med = get(z.id, lv, 'medio');
    const good = get(z.id, lv, 'bueno');
    if (med && good) {
      const ok = med.deathRate >= 0.5 && good.deathRate < med.deathRate;
      out.push(`${ok ? '✔' : '✘'} Nivel ${lv} en ${z.name} (≥ 5 niveles por debajo): muere el ${pct(med.deathRate)} con habilidad media y el ${pct(good.deathRate)} con habilidad buena (se pide que exija habilidad).`);
    }
  }
  return out;
}

export function renderZonesReport(m: ZoneMeasurement, date: string, dataHash: string): string {
  const L: string[] = [];
  const o = m.options;
  L.push('# Equilibrio por zonas — zona contra nivel del jugador');
  L.push('');
  L.push(`> PROPUESTA. Generado por \`npm run balance -- --zones\` el ${date} (datos ${dataHash}). Números de \`data/zones.json\`, \`data/enemies.json\` y \`data/rpg/\`; nada aquí está aprobado.`);
  L.push('');
  L.push('## Cómo se mide');
  L.push('');
  L.push(`- Para cada zona con franja, cada nivel de jugador (${ZONE_PLAYER_LEVELS.join(', ')}), cada clase (${m.classes.join(', ')}) y cada habilidad del bot (malo = no esquiva, medio = esquiva la mitad de los avisos, bueno = el 90 %), ${o.seeds} partidas.`);
  L.push(`- Cada partida: campo abierto, un grupo de ${o.group} monstruos tirados con la tabla y la franja de la zona (arquetipo por peso, nivel uniforme + \`levelBonus\`), a 9–11 m. Límite ${o.limit} s.`);
  L.push('- El jugador de nivel N tiene la XP de ese nivel, los puntos gastados en su estadística principal, lo mejor del equipo de nivel ≤ N (hoy no hay equipo por encima de nivel 4) y su mascota luchadora.');
  L.push('- **Muertes** = partidas perdidas; **de un golpe** = murió de un solo impacto teniendo más del 90 % de la vida; **TTK** = mediana de segundos por monstruo abatido en las partidas ganadas.');
  L.push('');
  L.push('## Lo que se pidió, comprobado');
  L.push('');
  for (const c of checks(m)) L.push(`- ${c}`);
  L.push('');
  L.push('## Tablas por zona');
  L.push('');
  L.push('Cada celda: muertes (de ellas, de un golpe) · TTK por monstruo.');
  for (const z of m.zones) {
    L.push('');
    L.push(`### ${z.name} · niv. ${z.levelMin}–${z.levelMax}`);
    L.push('');
    L.push(`| Nivel del jugador | ${ZONE_SKILLS.map((s) => `Habilidad ${s}`).join(' | ')} | Golpe máx. (medio) | XP/min (medio) |`);
    L.push(`|---|${ZONE_SKILLS.map(() => '---').join('|')}|---|---|`);
    for (const lv of ZONE_PLAYER_LEVELS) {
      const rows = ZONE_SKILLS.map((s) => m.rows.find((r) => r.zone === z.id && r.playerLevel === lv && r.skill === s));
      const med = rows[ZONE_SKILLS.indexOf('medio')];
      L.push(`| ${lv} | ${rows.map(cell).join(' | ')} | ${med ? pct(med.maxHit) + ' de la vida' : '—'} | ${med ? Math.round(med.xpPerMin) : '—'} |`);
    }
  }
  L.push('');
  L.push('## Lectura');
  L.push('');
  L.push('- El daño que recibe y hace cada lado ya lleva el multiplicador por diferencia de nivel (`levelDifference` en `data/zones.json`).');
  L.push('- Riesgo y premio: la XP por minuto sube con la zona mientras el jugador sobrevive. Ir por encima de la franja da más XP a quien esquiva bien y mata al que no esquiva.');
  L.push('- La zona élite está pensada por encima del nivel máximo del jugador (20): con el equipo actual, a nivel 20 sólo sobrevive con frecuencia quien esquiva casi todo. Es la comprobación que sale en ✘; se deja así a propósito y se pregunta en `docs/HANDOFF_ZONAS.md`.');
  L.push('- El jugador de nivel 20 lleva equipo de nivel ≤ 4 (no hay más en `data/rpg/items.json`): las zonas altas están medidas sin el equipo que tendría de verdad. Cuando exista, hay que volver a pasar este informe.');
  L.push('- El bot no huye ni elige grupos: entra en todos los combates. En el juego un jugador puede rodear a los monstruos de nivel alto (su vista es de 12–14 m).');
  L.push('');
  return L.join('\n');
}
