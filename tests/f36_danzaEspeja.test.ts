// F36-DANZA: las danzas de La Espeja sustituyen al clip de lanzar cuando usa sus hechizos.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { parseAssets } from '../src/data/worldSchema';
import { spellSpeed } from '../src/render/characters/gltfCharacter';

const ROOT = join(__dirname, '..');
const gltf = { kind: 'gltf', file: 'assets/a/b.glb', runSpeed: 4, clips: { idle: 'Idle' } };

/** Nombres de las animaciones de un GLB (trozo JSON de la cabecera). */
function glbAnimations(file: string): string[] {
    const buf = readFileSync(join(ROOT, file));
    const len = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as { animations?: { name: string }[] };
    return (json.animations ?? []).map((a) => a.name);
}

describe('danzas de hechizo (spellClips)', () => {
    it('son opcionales y validan clip y momento de impacto', () => {
        const plain = parseAssets({ assets: { g: gltf } })['g']!;
        expect(plain.kind === 'gltf' && plain.spellClips).toEqual([]);
        const ok = parseAssets({ assets: { g: { ...gltf, spellClips: [{ clip: 'Danza', t: 0.5 }] } } })['g']!;
        expect(ok.kind === 'gltf' && ok.spellClips).toEqual([{ clip: 'Danza', t: 0.5 }]);
        expect(() => parseAssets({ assets: { g: { ...gltf, spellClips: [{ clip: 'Danza', t: 1.5 }] } } })).toThrow(
            /spellClips\.0\.t/,
        );
        expect(() => parseAssets({ assets: { g: { ...gltf, spellClips: {} } } })).toThrow(/spellClips/);
    });

    it('La Espeja baila dos danzas que existen en su GLB', () => {
        const entry = loadWorldData().assets['enemy.la_espeja']!;
        if (entry.kind !== 'gltf') throw new Error('espejo debe ser glTF');
        expect(entry.spellClips.map((s) => s.clip)).toEqual(['Danza_Reflejo', 'Danza_Brinco']);
        const anims = glbAnimations(entry.file);
        for (const s of entry.spellClips) expect(anims).toContain(s.clip);
    });

    it('acompasa el impacto de la danza con el aviso del hechizo', () => {
        // Impacto a 0,7 s de un clip de 1,1 s, aviso de 0,7 s: velocidad normal.
        expect(spellSpeed(0.7 / 1.1, 1.1, 0.7)).toBeCloseTo(1, 5);
        // Aviso el doble de largo: la danza va a media velocidad.
        expect(spellSpeed(0.5, 1, 1)).toBeCloseTo(0.5, 5);
        // Límites para avisos absurdos.
        expect(spellSpeed(0.5, 1, 0)).toBe(3);
        expect(spellSpeed(0.1, 1, 10)).toBe(0.25);
    });
});

describe('partida de prueba para enfrentarse a La Espeja', () => {
    it('el piso 30 de la cripta tiene a La Espeja de guardiana y una partida por clase a su nivel', async () => {
        const { loadGameData } = await import('../src/data');
        const { loadDungeon } = await import('../src/data/dungeonSchema');
        const { guardianCoverageProfiles } = await import('../src/dev/presetCoverage');
        const { buildProfile } = await import('../scripts/balance/v3/profiles');
        const data = loadGameData();
        const dungeon = loadDungeon(data);
        const bosses = guardianCoverageProfiles(data, dungeon);
        const espeja = bosses.filter((b) => b.guardian.archetype === 'la_espeja');
        expect(espeja.map((b) => b.floor + 1)).toEqual([30, 30, 30]);
        expect(new Set(espeja.map((b) => b.profile.classId))).toEqual(new Set(Object.keys(data.rpg.classes)));
        for (const b of espeja) {
            expect(b.profile.level).toBe(b.guardian.level);
            expect(b.profile.build).toBe('balanced');
            const built = buildProfile(data, b.profile);
            expect(built.session.character.level).toBe(b.guardian.level);
        }
        // Cada piso con guardián tiene sus tres partidas.
        const guarded = dungeon.floors.filter((f) => f.guardian).length;
        expect(bosses).toHaveLength(guarded * Object.keys(data.rpg.classes).length);
    });
});
