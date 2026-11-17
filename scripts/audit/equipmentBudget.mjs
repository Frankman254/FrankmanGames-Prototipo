#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('data/rpg/items.json', ROOT), 'utf8'));
const items = Object.entries(raw.items).map(([id, def]) => ({ id, ...def }));
const equipment = items.filter((item) => item.slot);

const modifiers = (item) => [...(item.implicit ?? []), ...(item.rolls ?? [])];
const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
};
const bandStart = (level) => Math.floor((level - 1) / 20) * 20 + 1;
const bands = new Map();
for (const item of equipment) {
    const start = bandStart(item.level);
    const list = bands.get(start) ?? [];
    list.push(item);
    bands.set(start, list);
}

console.log('EQUIPO POR FRANJA');
console.log('franja\tpiezas\tarmas\tsets\tmediana_líneas');
for (const [start, list] of [...bands].sort(([a], [b]) => a - b)) {
    const sets = new Set(list.map((item) => item.setId).filter(Boolean));
    console.log(
        `${start}-${start + 19}\t${list.length}\t${list.filter((item) => item.weapon).length}\t${sets.size}\t${median(list.map((item) => modifiers(item).length))}`,
    );
}

const weapons = equipment
    .filter((item) => item.weapon)
    .map((item) => {
        const averageHit = (item.weapon.min + item.weapon.max) / 2;
        const dps = averageHit * item.weapon.speed;
        return { ...item, lines: modifiers(item).length, dps, dpsPerLevel: dps / Math.max(1, item.level) };
    });

console.log('\nARMAS CON UNA LÍNEA O MENOS');
console.log('id\tnivel\tdaño\tvelocidad\tdps\tlíneas');
for (const item of weapons.filter((item) => item.lines <= 1).sort((a, b) => a.level - b.level)) {
    console.log(
        `${item.id}\t${item.level}\t${item.weapon.min}-${item.weapon.max}\t${item.weapon.speed}\t${item.dps.toFixed(1)}\t${item.lines}`,
    );
}

console.log('\nMAYOR DPS NORMALIZADO POR NIVEL (señal, no veredicto de balance)');
console.log('id\tnivel\tdps/nivel\tdps\tlíneas');
for (const item of [...weapons].sort((a, b) => b.dpsPerLevel - a.dpsPerLevel).slice(0, 15)) {
    console.log(`${item.id}\t${item.level}\t${item.dpsPerLevel.toFixed(2)}\t${item.dps.toFixed(1)}\t${item.lines}`);
}

const missingBands = [];
for (let start = 1; start <= 181; start += 20) if (!bands.has(start)) missingBands.push(`${start}-${start + 19}`);
console.log(`\nFRANJAS SIN EQUIPO: ${missingBands.length ? missingBands.join(', ') : 'ninguna'}`);
console.log(
    'Nota: daño/segundo × nivel solo detecta candidatos. EQ-02 valida cada cambio con el simulador de combate.',
);
