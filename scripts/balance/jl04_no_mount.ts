// Ratio sin montura
import { loadGameData } from '../../src/data';
import { buildProfile, coverageBands } from './v3/profiles';

const data = loadGameData();
const band = coverageBands(data).find((b) => b.level === 95)!;

for (const classId of Object.keys(data.rpg.classes)) {
    const main = data.rpg.classes[classId]!.mainStat ?? 'strength';
    
    // Naked
    const naked = buildProfile(data, {
        id: `noMount:${classId}:none`, seed: 95, classId, level: band.level,
        build: 'balanced' as const, equipmentTier: 'none' as const, band,
    }).session.character;
    
    // Equipped sin montura (desequipar mount después)
    const built = buildProfile(data, {
        id: `noMount:${classId}:optimized`, seed: 95, classId, level: band.level,
        build: 'balanced' as const, equipmentTier: 'optimized-obtainable' as const, band,
    });
    const ch = built.session.character;
    if (ch.equipment.get('mount')) ch.unequip('mount');
    ch.restore();
    
    const nakedMain = naked.stats.get(main);
    const noMountMain = ch.stats.get(main);
    const ratio = noMountMain / nakedMain;
    const over = ratio > 2.5 ? ' ⚠️ EXCESO' : '';
    
    console.log(`${classId} (${main}): desnudo ${nakedMain} | sin montura ${noMountMain} | ratio ${ratio.toFixed(2)}x${over}`);
}
