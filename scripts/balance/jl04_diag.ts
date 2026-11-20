// Diagnóstico JL-04: qué equipo rompe el límite de primaria en ember_vanguard
import { loadGameData } from '../../src/data';
import { buildProfile, coverageBands } from './v3/profiles';

const data = loadGameData();
const band = coverageBands(data).find((b) => b.level === 95)!;

for (const classId of Object.keys(data.rpg.classes)) {
    const common = { classId, level: band.level, build: 'balanced' as const, band };
    const naked = buildProfile(data, {
        ...common,
        id: `diag:${classId}:none`,
        seed: 95,
        equipmentTier: 'none',
    }).session.character;
    const equipped = buildProfile(data, {
        ...common,
        id: `diag:${classId}:optimized`,
        seed: 95,
        equipmentTier: 'optimized-obtainable',
    }).session.character;
    const main = data.rpg.classes[classId]!.mainStat ?? 'strength';

    const nakedMain = naked.stats.get(main);
    const eqMain = equipped.stats.get(main);
    const ratio = eqMain / nakedMain;
    const over = ratio > 2.5 ? ' ⚠️ EXCESO' : '';

    console.log(`\n=== ${classId} (main: ${main}) ===`);
    console.log(`  Desnudo: ${nakedMain} | Equipado: ${eqMain} | Ratio: ${ratio.toFixed(2)}x${over}`);
    console.log(`  Vida: desnuda ${naked.maxHealth} | equipada ${equipped.maxHealth} | ratio ${(equipped.maxHealth / naked.maxHealth).toFixed(2)}x`);

    // Mostrar el equipo
    const built = buildProfile(data, {
        ...common,
        id: `diag:${classId}:optimized`,
        seed: 95,
        equipmentTier: 'optimized-obtainable',
    });
    for (const eq of built.equipment) {
        const item = data.rpg.items[eq.itemId]!;
        const strengthFromImplicit = item.implicit.filter((m) => m.stat === main).reduce((s, m) => s + m.value, 0);
        const strengthFromRolls = item.rolls
            .filter((m) => m.stat === main)
            .reduce((s, m) => s + (m.min + m.max) / 2, 0);
        const totalStrength = strengthFromImplicit + strengthFromRolls;
        if (totalStrength > 0) {
            console.log(`  [${eq.slot}] ${eq.itemId} (niv ${item.level}): +${totalStrength.toFixed(1)} ${main} (impl ${strengthFromImplicit} + rolls ${strengthFromRolls.toFixed(1)})`);
        }
    }
}
