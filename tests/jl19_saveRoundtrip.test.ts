// JL-19: Prueba de ida y vuelta del guardado.
// 50 estados aleatorios con semilla fija → toSave() → fromSave() → igual.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { slotsFor } from '../src/rpg/items';
import type { EquipSlot, PrimaryStat, SaveData } from '../src/rpg/contracts';
import { EQUIP_SLOTS, PRIMARY_STATS } from '../src/rpg/contracts';
import { Rng } from '../src/sim/rng';

const data = loadGameData();
const content = data.rpg;
const classIds = Object.keys(content.classes);

/**
 * Construye un personaje con un estado variado usando una semilla
 * determinista. Sube de nivel, asigna puntos, da objetos, equipa,
 * aprende hechizos y configura la barra.
 */
function randomCharacter(seed: number): Character {
    const rng = new Rng(seed);
    const classId = classIds[Math.floor(rng.next() * classIds.length)]!;
    const ch = Character.create(content, classId, `Rng${seed}`, rng);

    // Subir a un nivel aleatorio (1..maxLevel) dando la XP necesaria.
    const targetLevel = 1 + Math.floor(rng.next() * content.progression.maxLevel);
    // gainXp sube de nivel hasta que la XP no alcanza más.
    // Dar mucha XP para llegar al nivel objetivo.
    const p = content.progression;
    let totalXp = 0;
    for (let lvl = 1; lvl < targetLevel; lvl++) {
        totalXp += Math.round(p.xp.base * Math.pow(lvl, p.xp.exponent));
    }
    if (totalXp > 0) ch.gainXp(totalXp);

    // Asignar puntos de forma aleatoria.
    while (ch.unspentStatPoints > 0) {
        const stat = PRIMARY_STATS[Math.floor(rng.next() * PRIMARY_STATS.length)]!;
        const result = ch.spendStatPoint(stat);
        if (!result.ok) break;
    }

    // Dar objetos aleatorios de la definición.
    const itemIds = Object.keys(content.items);
    const numItems = 3 + Math.floor(rng.next() * 15);
    for (let i = 0; i < numItems; i++) {
        const itemId = itemIds[Math.floor(rng.next() * itemIds.length)]!;
        const itemDef = content.items[itemId];
        if (itemDef) {
            const qty = 1 + Math.floor(rng.next() * (itemDef.maxStack > 1 ? itemDef.maxStack : 1));
            ch.give(itemId, qty);
        }
    }

    // Equipar objetos equipables que haya en la mochila.
    for (const inst of ch.inventory.slots) {
        if (!inst || rng.next() >= 0.5) continue;
        const def = content.items[inst.itemId];
        if (!def) continue;
        const options = slotsFor(def);
        if (options.length === 0) continue;
        const slot = options[Math.floor(rng.next() * options.length)] as EquipSlot;
        ch.equip(inst.uid, slot);
    }

    // Aprender hechizos universales aleatorios.
    const allSpells = Object.values(content.spells);
    const universalSpells = allSpells.filter((s) => s.classId === 'universal');
    const numSpells = Math.floor(rng.next() * universalSpells.length);
    const shuffled = [...universalSpells].sort(() => rng.next() - 0.5);
    for (let i = 0; i < numSpells; i++) {
        const spell = shuffled[i];
        if (spell) ch.spellbook.learn(spell.id);
    }

    // Configurar barra con hechizos conocidos.
    const known = ch.spellbook.view().known;
    const hotbarSize = content.progression.hotbarSize;
    for (let i = 0; i < hotbarSize; i++) {
        if (known.length > 0 && rng.next() < 0.6) {
            const idx = Math.floor(rng.next() * known.length);
            const spell = known[idx]!;
            ch.spellbook.hotbar[i] = spell.spellId;
        }
    }

    // Oro aleatorio.
    ch.gold = Math.floor(rng.next() * 10000);

    return ch;
}

/** Extrae los campos comparables de un SaveData, ignorando savedAt y version. */
function saveFingerprint(save: SaveData): object {
    return {
        name: save.name,
        classId: save.classId,
        sex: save.sex,
        level: save.level,
        xp: save.xp,
        gold: save.gold,
        allocated: { ...save.allocated },
        unspentStatPoints: save.unspentStatPoints,
        inventory: save.inventory.map((inst) =>
            inst ? { uid: inst.uid, itemId: inst.itemId, quantity: inst.quantity } : null,
        ),
        bank: (save.bank ?? []).map((inst) => ({
            uid: inst.uid,
            itemId: inst.itemId,
            quantity: inst.quantity,
        })),
        equipment: Object.fromEntries(
            Object.entries(save.equipment).map(([slot, inst]) => [
                slot,
                inst ? { uid: inst.uid, itemId: inst.itemId, quantity: inst.quantity } : undefined,
            ]),
        ),
        known: save.known.map((k) => ({ spellId: k.spellId, rank: k.rank })),
        hotbar: [...save.hotbar],
        activePetItemUid: save.activePetItemUid,
        spectral: save.spectral ? { ...save.spectral } : undefined,
        professions: save.professions ? { ...save.professions } : undefined,
    };
}

/** Extrae los campos comparables de un Character cargado. */
function charFingerprint(ch: Character): object {
    return {
        name: ch.name,
        classId: ch.classDef.id,
        sex: ch.sex,
        level: ch.level,
        xp: ch.xp,
        gold: ch.gold,
        allocated: { ...ch.allocated },
        unspentStatPoints: ch.unspentStatPoints,
        inventory: ch.inventory.slots.map((inst) =>
            inst ? { uid: inst.uid, itemId: inst.itemId, quantity: inst.quantity } : null,
        ),
        bank: ch.bank.view().map((inst) => ({
            uid: inst.uid,
            itemId: inst.itemId,
            quantity: inst.quantity,
        })),
        equipment: Object.fromEntries(
            EQUIP_SLOTS.map((slot) => {
                const inst = ch.equipment.get(slot);
                return [
                    slot,
                    inst ? { uid: inst.uid, itemId: inst.itemId, quantity: inst.quantity } : undefined,
                ];
            }),
        ),
        known: ch.spellbook.view().known.map((k) => ({ spellId: k.spellId, rank: k.rank })),
        hotbar: [...ch.spellbook.view().hotbar],
        activePetItemUid: ch.activePetItemUid,
        spectral: ch.spectral.toSave(),
        professions: ch.professions.toSave(),
    };
}

describe('JL-19: ida y vuelta del guardado (50 estados aleatorios)', () => {
    for (let i = 0; i < 50; i++) {
        const seed = 42000 + i;
        it(`semilla ${seed}: guardar → cargar → igual`, () => {
            const original = randomCharacter(seed);
            const save = original.toSave(new Date('2026-11-20T00:00:00Z'));
            const loaded = Character.fromSave(content, save, new Rng(seed));

            const fpSave = saveFingerprint(save);
            const fpLoaded = charFingerprint(loaded);

            expect(fpLoaded).toEqual(fpSave);
        });
    }
});
