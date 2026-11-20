// SAV-02: Autoguardado configurable y copia de seguridad de ranura anterior.
import { describe, it, expect, beforeEach } from 'vitest';
import {
    MemoryStore,
    SaveStore,
    SLOT_BACKUP_PREFIX,
} from '../src/ui/menus/saveStore';
import { parseSave } from '../src/data/schema';
import type { SaveData } from '../src/rpg/contracts';

function makeSave(name = 'Test', slot = 0): SaveData {
    return {
        version: 3,
        name,
        classId: 'vg',
        level: 1,
        xp: 0,
        gold: 0,
        inventory: [],
        equipment: {},
        known: [],
        hotbar: [],
        savedAt: `2026-11-20T${String(slot).padStart(2, '0')}:00:00Z`,
        allocated: {},
        unspentStatPoints: 0,
        activePetItemUid: null,
    };
}

describe('SAV-02: parseSave', () => {
    it('valores por defecto con objeto vacío', () => {
        const def = parseSave({});
        expect(def.autosaveSeconds).toBe(5);
        expect(def.backup).toBe(false);
    });

    it('lee autosaveSeconds y backup', () => {
        const def = parseSave({ autosaveSeconds: 10, backup: true });
        expect(def.autosaveSeconds).toBe(10);
        expect(def.backup).toBe(true);
    });

    it('backup false por defecto', () => {
        const def = parseSave({ autosaveSeconds: 3 });
        expect(def.backup).toBe(false);
    });

    it('backup true solo si es boolean true', () => {
        expect(parseSave({ backup: true }).backup).toBe(true);
        expect(parseSave({ backup: false }).backup).toBe(false);
        expect(parseSave({ backup: 1 }).backup).toBe(false);
        expect(parseSave({}).backup).toBe(false);
    });

    it('falla si autosaveSeconds está fuera de rango', () => {
        expect(() => parseSave({ autosaveSeconds: 0 })).toThrow();
        expect(() => parseSave({ autosaveSeconds: 5000 })).toThrow();
    });

    it('usa el valor por defecto cuando no hay autosaveSeconds', () => {
        expect(parseSave({}).autosaveSeconds).toBe(5);
    });
});

describe('SAV-02: SaveStore.backupAndWrite', () => {
    let store: SaveStore;
    let mem: MemoryStore;

    beforeEach(() => {
        mem = new MemoryStore();
        store = new SaveStore(mem);
    });

    it('guarda sin respaldo si la ranura está vacía', () => {
        store.backupAndWrite(0, makeSave('Primera', 0));
        expect(store.read(0)?.name).toBe('Primera');
        expect(mem.getItem(SLOT_BACKUP_PREFIX + '0')).toBeNull();
    });

    it('copia el guardado anterior antes de sobrescribir', () => {
        store.write(1, makeSave('Anterior', 1));
        store.backupAndWrite(1, makeSave('Nuevo', 1));
        const actual = store.read(1);
        const backup = store.readBackup(1);
        expect(actual?.name).toBe('Nuevo');
        expect(backup?.name).toBe('Anterior');
    });

    it('cada backupAndWrite sobrescribe el respaldo anterior', () => {
        store.write(2, makeSave('v1', 2));
        store.backupAndWrite(2, makeSave('v2', 2));
        store.backupAndWrite(2, makeSave('v3', 2));
        const backup = store.readBackup(2);
        expect(backup?.name).toBe('v2'); // solo la última copia
    });

    it('readBackup devuelve null si no hay respaldo', () => {
        expect(store.readBackup(5)).toBeNull();
    });

    it('readBackup maneja JSON inválido', () => {
        mem.setItem(SLOT_BACKUP_PREFIX + '3', 'no es json');
        expect(store.readBackup(3)).toBeNull();
    });

    it('write() sin backup no crea respaldo', () => {
        store.write(4, makeSave('Antes', 4));
        store.write(4, makeSave('Después', 4));
        expect(store.read(4)?.name).toBe('Después');
        expect(store.readBackup(4)).toBeNull();
    });

    it('el respaldo conserva el nombre de la ranura', () => {
        const s1: SaveData = { ...makeSave('ConLabel', 6), label: 'Mi partida' };
        store.write(6, s1);
        store.backupAndWrite(6, makeSave('SinLabel', 6));
        const backup = store.readBackup(6);
        expect(backup?.label).toBe('Mi partida');
        expect(backup?.name).toBe('ConLabel');
    });
});

describe('SAV-02: SLOT_BACKUP_PREFIX', () => {
    it('tiene el formato correcto', () => {
        expect(SLOT_BACKUP_PREFIX).toBe('frankmangames.backup.slot.');
        expect(SLOT_BACKUP_PREFIX + '0').toBe('frankmangames.backup.slot.0');
    });
});
