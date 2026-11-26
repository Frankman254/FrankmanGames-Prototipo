import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeSession } from '../src/ui/menus/fake/fakeSession';
import { MemoryStore, SaveStore, V1_BACKUP_PREFIX, saveReadNotice } from '../src/ui/menus/saveStore';

const fixturesDir = join(__dirname, 'fixtures');

describe('JL-337: lector de guardados dañados y antiguos', () => {
    it('identifica un JSON truncado y da un aviso claro sin romper la lista', () => {
        const memory = new MemoryStore();
        memory.setItem('frankmangames.save.0', '{"version":3,"name":"Aldara"');
        const saves = new SaveStore(memory);

        const result = saves.readResult(0);

        expect(result.kind).toBe('invalid');
        expect(saveReadNotice(result, 0)).toEqual({
            template:
                'No se puede leer el guardado de la ranura {slot}. Puede estar dañado o usar una versión no compatible.',
            vars: { slot: 1 },
            tone: 'warn',
        });
        expect(() => saves.list()).not.toThrow();
        expect(saves.unreadableSlots()).toEqual([0]);
    });

    it('carga un guardado válido que trae un campo adicional desconocido', () => {
        const memory = new MemoryStore();
        const save = FakeSession.create('ember_vanguard', 'Aldara', 1).save();
        memory.setItem('frankmangames.save.1', JSON.stringify({ ...save, futureField: { ignoredByGame: true } }));
        const saves = new SaveStore(memory);

        const result = saves.readResult(1);

        expect(result.kind).toBe('loaded');
        if (result.kind !== 'loaded') throw new Error('El guardado actual debería leerse.');
        expect(result.data).toMatchObject({ name: 'Aldara', classId: 'ember_vanguard', version: 3 });
        expect(saveReadNotice(result, 1)).toEqual({
            template: 'Cargada la ranura {slot}.',
            vars: { slot: 2 },
            tone: 'info',
        });
    });

    it('migra una versión antigua al leerla, conserva respaldo y avisa', () => {
        const memory = new MemoryStore();
        const raw = readFileSync(join(fixturesDir, 'save_v1.json'), 'utf-8');
        memory.setItem('frankmangames.save.2', raw);
        const saves = new SaveStore(memory);

        expect(saves.list()[2]).not.toBeNull();
        const result = saves.readResult(2);

        expect(result.kind).toBe('migrated');
        if (result.kind !== 'migrated') throw new Error('El guardado v1 debería migrarse.');
        expect(result.data).toMatchObject({ version: 3, migration: { sourceVersion: 1 } });
        expect(memory.getItem(V1_BACKUP_PREFIX + 2)).toBe(raw);
        expect(saveReadNotice(result, 2)).toEqual({
            template: 'Guardado antiguo (versión {version}) actualizado y cargado en la ranura {slot}.',
            vars: { slot: 3, version: 1 },
            tone: 'info',
        });
        saves.acknowledgeMigration(2);
        expect(saves.readResult(2).kind).toBe('loaded');
    });
});
