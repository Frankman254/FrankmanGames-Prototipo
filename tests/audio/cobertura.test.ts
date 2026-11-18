// AUD-00: cobertura de sonidos — qué pide el código y qué existe en sfx.json.
// Las ausencias conocidas (aire y agua) están en PENDIENTE_AUD01; AUD-01 las resuelve.
import { describe, expect, it } from 'vitest';
import { loadAudioData } from '../../src/audio/data';
import { ELEMENTS } from '../../src/rpg/contracts';
import { readdirSync } from 'node:fs';

const data = loadAudioData();

/**
 * Sonidos que cuesForEvent y cuesForSession pueden pedir.
 * Se construyen dinámicamente a partir de ELEMENTS y weaponKinds,
 * más los ids fijos que el código usa directamente.
 */

// sfxElement() en cues.ts traduce lightning → storm; el resto pasa sin cambio.
function sfxElement(el: string): string {
    if (el === 'lightning') return 'storm';
    return el;
}

// Tipos de golpe que weaponKindOf puede devolver.
const WEAPON_KINDS = ['blade', 'heavy', 'blunt', 'staff', 'wand', 'orb', 'unarmed'] as const;

// Todos los ids dinámicos que cuesForEvent puede construir.
function dynamicSoundIds(): string[] {
    const ids: string[] = [];
    // cast / impact por elemento (con sfxElement).
    for (const el of ELEMENTS) {
        const sfx = sfxElement(el);
        ids.push(`cast_${sfx}`);
        ids.push(`impact_${sfx}`);
    }
    ids.push('impact_physical'); // damage toPlayer con basic attack, counter.
    ids.push('cast_physical');   // no usado directamente, pero existe.
    // swing_ por tipo de arma.
    for (const wk of WEAPON_KINDS) {
        ids.push(`swing_${wk}`);
    }
    return ids;
}

// Todos los ids fijos que el código usa directamente (cues.ts, director.ts).
const FIXED_IDS = [
    // Combate.
    'crit',
    'crit_taken',
    'hurt',
    'evade',
    'summon',
    'heal',
    'telegraph',
    'enemy_death',
    'player_death',
    // Botín.
    'loot_drop',
    'loot_rare',
    'pickup',
    'coins',
    // Progreso.
    'level_up',
    // Pesca.
    'fish_cast',
    'fish_plop',
    'fish_nibble',
    'fish_bite',
    'fish_catch',
    'fish_escape',
    // Viaje y misiones.
    'stone_activate',
    'stone_travel',
    'boat_depart',
    'quest_accept',
    'quest_complete',
    // UI.
    'ui_click',
    'ui_open',
    'ui_close',
    'shop_buy',
    'shop_sell',
    // Desplazamiento.
    'footstep_path',
    'footstep_grass',
    // IDs fijos usados en cues.ts (reflect, teleport, rewind, trapTriggered, reveal).
    'cast_storm',
    'cast_frost',
    'impact_earth',
    'cast_earth',
] as const;

// Las ausencias conocidas que AUD-01 debe resolver.
const PENDIENTE_AUD01 = ['cast_air', 'cast_water', 'impact_air', 'impact_water'] as const;

describe('audio: cobertura de sonidos', () => {
    it('cada id que cuesForEvent puede pedir existe en sfx.json (salvo PENDIENTE_AUD01)', () => {
        const pending = new Set<string>(PENDIENTE_AUD01);
        const dynamic = dynamicSoundIds();
        const allIds = [...new Set([...dynamic, ...FIXED_IDS])];
        const missing: string[] = [];
        for (const id of allIds) {
            if (pending.has(id)) continue;
            if (!data.sfx.sounds[id]) {
                missing.push(id);
            }
        }
        expect(missing, `ids faltantes en sfx.json: ${missing.join(', ')}`).toEqual([]);
    });

    it('PENDIENTE_AUD01 declara exactamente los ids que faltan hoy', () => {
        // Esta prueba falla cuando PENDIENTE_AUD01 se vacía (AUD-01 los añade).
        // Mientras haya ids en la lista, deben faltar de verdad.
        for (const id of PENDIENTE_AUD01) {
            expect(data.sfx.sounds[id], `${id} debería faltar hasta que AUD-01 lo añada`).toBeUndefined();
        }
        // Y ningún otro id dinámico o fijo debe faltar.
        const pending = new Set<string>(PENDIENTE_AUD01);
        const dynamic = dynamicSoundIds();
        const allIds = [...new Set([...dynamic, ...FIXED_IDS])];
        for (const id of allIds) {
            if (pending.has(id)) continue;
            expect(data.sfx.sounds[id], `${id} debe existir en sfx.json`).toBeDefined();
        }
    });

    it('cada muestra de samples apunta a un archivo WAV que existe en generated_original/', () => {
        const dir = 'src/audio/sfx/generated_original';
        const files = readdirSync(dir).filter((f) => f.endsWith('.wav'));
        const missing: string[] = [];
        for (const [id, sample] of Object.entries(data.sfx.samples)) {
            if (!files.includes(sample.file)) {
                missing.push(`${id} → ${sample.file}`);
            }
        }
        expect(missing, `muestras con archivo faltante: ${missing.join(', ')}`).toEqual([]);
    });

    it('cada muestra de samples tiene una receta de respaldo en sounds', () => {
        const missing: string[] = [];
        for (const id of Object.keys(data.sfx.samples)) {
            if (!data.sfx.sounds[id]) {
                missing.push(id);
            }
        }
        expect(missing, `samples sin receta de respaldo: ${missing.join(', ')}`).toEqual([]);
    });

    it('ELEMENTS tiene 6 elementos y sfxElement mapea lightning a storm', () => {
        expect(ELEMENTS).toHaveLength(6);
        expect(ELEMENTS).toContain('air');
        expect(ELEMENTS).toContain('water');
        // sfxElement traduce lightning → storm; por eso cast_storm e impact_storm
        // cubren tanto a storm como a lightning.
        expect(data.sfx.sounds['cast_storm']).toBeDefined();
        expect(data.sfx.sounds['impact_storm']).toBeDefined();
    });

    it('los 7 tipos de swing_ existen (blade, heavy, blunt, staff, wand, orb, unarmed)', () => {
        for (const wk of WEAPON_KINDS) {
            expect(data.sfx.sounds[`swing_${wk}`], `swing_${wk}`).toBeDefined();
        }
    });
});

