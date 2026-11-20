// JL-20: Prueba que un guardado real generado con Character.toSave() (con fecha
// de hace una semana) carga sin error con Character.fromSave().
// El fixture se generó con scripts/generateOldSave.ts usando semilla fija (Rng 42).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { migrateSave } from '../src/ui/menus/saveStore';

const fixturesDir = join(__dirname, 'fixtures');
const content = loadGameData().rpg;

function loadFixture(name: string): unknown {
    const raw = readFileSync(join(fixturesDir, name), 'utf-8');
    return JSON.parse(raw);
}

describe('JL-20: carga de un guardado real de hace una semana', () => {
    it('el fixture existe y es un guardado v3', () => {
        const raw = loadFixture('save_old_week.json');
        expect(raw).toHaveProperty('version', 3);
        expect(raw).toHaveProperty('name', 'GuardadoSemana');
        expect(raw).toHaveProperty('classId', 'ember_vanguard');
        expect(raw).toHaveProperty('level', 50);
        // La fecha debe ser anterior a hoy.
        const savedAt = new Date((raw as { savedAt: string }).savedAt).getTime();
        const now = Date.now();
        expect(now - savedAt).toBeGreaterThan(0);
    });

    it('migrateSave no falla con el guardado', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw);
        expect(migrated).not.toBeNull();
        expect(migrated!.version).toBe(3);
        // Un guardado v3 no necesita migración: sin info de migración.
        expect(migrated!.migration).toBeUndefined();
    });

    it('Character.fromSave carga el personaje sin error', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw)!;
        const ch = Character.fromSave(content, migrated, new Rng(99));
        expect(ch.name).toBe('GuardadoSemana');
        expect(ch.classDef.id).toBe('ember_vanguard');
        expect(ch.level).toBe(50);
        expect(ch.gold).toBe(350);
        expect(ch.allocated.strength).toBe(20);
        expect(ch.allocated.vitality).toBe(10);
        expect(ch.unspentStatPoints).toBe(5);
    });

    it('los objetos de la mochila se restauran', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw)!;
        const ch = Character.fromSave(content, migrated, new Rng(99));
        // El fixture tiene short_sword, padded_vest, pociones y pergaminos.
        const inv = ch.inventory.slots.filter((s): s is NonNullable<typeof s> => s !== null);
        expect(inv.length).toBeGreaterThan(0);
        const ids = inv.map((i) => i.itemId);
        expect(ids).toContain('short_sword');
        expect(ids).toContain('minor_health_potion');
    });

    it('los hechizos conocidos se restauran', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw)!;
        const ch = Character.fromSave(content, migrated, new Rng(99));
        const known = [...ch.spellbook.known.keys()];
        // ember_vanguard de nivel 50 debe tener al menos los hechizos iniciales.
        expect(known.length).toBeGreaterThan(0);
        expect(known).toContain('charge'); // universal inicial
    });

    it('el lugar guardado se conserva', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw)!;
        expect(migrated.place).toMatchObject({
            scene: 'overworld',
            x: 141.5,
            y: 120.25,
            stone: 'raspadura',
        });
    });

    it('ida y vuelta: guardar → cargar conserva los datos clave', () => {
        const raw = loadFixture('save_old_week.json');
        const migrated = migrateSave(raw)!;
        const ch1 = Character.fromSave(content, migrated, new Rng(99));
        // Volver a guardar
        const save2 = ch1.toSave(new Date());
        // Y cargar de nuevo
        const ch2 = Character.fromSave(content, save2, new Rng(100));
        expect(ch2.name).toBe(ch1.name);
        expect(ch2.level).toBe(ch1.level);
        expect(ch2.gold).toBe(ch1.gold);
        expect(ch2.allocated).toEqual(ch1.allocated);
        expect(ch2.unspentStatPoints).toBe(ch1.unspentStatPoints);
    });
});
