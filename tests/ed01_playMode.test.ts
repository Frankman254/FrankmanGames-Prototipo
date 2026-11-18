// ED-01: Play Mode del editor — pruebas de PlayModeController.
// Verifica que snapshot → restaurar devuelve el mismo documento y que
// entrar dos veces no duplica el snapshot.
import { describe, it, expect, beforeEach } from 'vitest';
import { PlayModeController, type PlayModeState } from '../src/editor/playMode';
import { DungeonEditorDoc } from '../src/editor/dungeonDoc';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

function makeFloor() {
    const game = loadGameData();
    const dungeon = loadDungeon(game);
    return generateFloor(dungeon, 6);
}

describe('ED-01: Play Mode del editor', () => {
    let toggleCalls: boolean[] = [];
    let applyCalls: number = 0;
    let stateChanges: PlayModeState[] = [];

    let ctrl: PlayModeController;

    beforeEach(() => {
        toggleCalls = [];
        applyCalls = 0;
        stateChanges = [];
        ctrl = new PlayModeController({
            onToggleSimulation: (paused) => toggleCalls.push(paused),
            onApply: () => { applyCalls++; },
            onStateChange: (s) => stateChanges.push(s),
        });
    });

    describe('estado inicial', () => {
        it('empieza en edit mode', () => {
            expect(ctrl.state).toBe('edit');
            expect(ctrl.isEditing).toBe(true);
            expect(ctrl.isPlaying).toBe(false);
        });
    });

    describe('enterPlayMode', () => {
        it('cambia a playing y reanuda la simulación', () => {
            const ok = ctrl.enterPlayMode();
            expect(ok).toBe(true);
            expect(ctrl.state).toBe('playing');
            expect(ctrl.isPlaying).toBe(true);
            // onToggleSimulation(false) = reanudar
            expect(toggleCalls).toContain(false);
        });

        it('no entra si ya está playing', () => {
            ctrl.enterPlayMode();
            const ok2 = ctrl.enterPlayMode();
            expect(ok2).toBe(false);
            expect(toggleCalls.length).toBe(1); // solo una llamada
        });

        it('emite onStateChange a playing', () => {
            ctrl.enterPlayMode();
            expect(stateChanges).toContain('playing');
        });

        it('llama a onApply una vez', () => {
            ctrl.enterPlayMode();
            expect(applyCalls).toBe(1);
        });
    });

    describe('stopPlayMode', () => {
        it('vuelve a edit y pausa la simulación', () => {
            ctrl.enterPlayMode();
            const ok = ctrl.stopPlayMode();
            expect(ok).toBe(true);
            expect(ctrl.state).toBe('edit');
            expect(ctrl.isEditing).toBe(true);
            expect(ctrl.isPlaying).toBe(false);
            // onToggleSimulation(true) = pausar
            expect(toggleCalls).toContain(true);
        });

        it('no para si no está playing', () => {
            const ok = ctrl.stopPlayMode();
            expect(ok).toBe(false);
            expect(toggleCalls).toEqual([]);
        });

        it('emite stopping y luego edit', () => {
            ctrl.enterPlayMode();
            stateChanges = [];
            ctrl.stopPlayMode();
            expect(stateChanges).toContain('stopping');
            expect(stateChanges).toContain('edit');
        });
    });

    describe('snapshot y restauración', () => {
        it('snapshot → restaurar da el mismo documento (dungeon)', () => {
            const floor = makeFloor();
            const dd = new DungeonEditorDoc(floor);
            ctrl.setDocuments(dd, null);

            // Contar los objetos manuales antes de entrar.
            const initialManualCount = (dd.data.manualObjects ?? []).length;

            // Añadir un objeto manual antes de entrar en Play Mode.
            dd.begin('add');
            dd.addObject('barrel' as any, 10, 10);
            dd.commit();

            // Debería haber un manual object más.
            expect((dd.data.manualObjects ?? []).length).toBe(initialManualCount + 1);

            // Entrar en Play Mode — toma snapshot.
            ctrl.enterPlayMode();

            // Simular cambios de juego: añadir otro objeto manual.
            dd.begin('gameplay');
            dd.addObject('door' as any, 15, 15);
            dd.commit();

            // Verificar que el documento tiene el objeto añadido durante Play Mode.
            const manualDuringPlay = (dd.data.manualObjects ?? []).length;
            expect(manualDuringPlay).toBe(initialManualCount + 2);

            // Salir de Play Mode — restaura el snapshot.
            ctrl.stopPlayMode();

            // El documento debe estar restaurado: solo el barril añadido antes de Play Mode.
            const manualAfterStop = (dd.data.manualObjects ?? []).length;
            expect(manualAfterStop).toBe(initialManualCount + 1);

            // La puerta añadida durante Play Mode no debe estar.
            const hasDoor = (dd.data.manualObjects ?? []).some((m) => m.kind === 'door');
            expect(hasDoor).toBe(false);

            // El barril añadido antes de Play Mode debe seguir ahí.
            const hasBarrel = (dd.data.manualObjects ?? []).some((m) => m.kind === 'barrel');
            expect(hasBarrel).toBe(true);
        });

        it('entrar dos veces seguidas no duplica el snapshot', () => {
            const floor = makeFloor();
            const dd = new DungeonEditorDoc(floor);
            ctrl.setDocuments(dd, null);

            const initialManualCount = (dd.data.manualObjects ?? []).length;

            ctrl.enterPlayMode();
            ctrl.stopPlayMode();

            // Segundo ciclo.
            ctrl.enterPlayMode();
            ctrl.stopPlayMode();

            // El documento debe tener el mismo número de objetos manuales que al inicio.
            expect((dd.data.manualObjects ?? []).length).toBe(initialManualCount);
        });

        it('getSerializableDungeonDoc devuelve el snapshot durante Play Mode', () => {
            const floor = makeFloor();
            const dd = new DungeonEditorDoc(floor);
            ctrl.setDocuments(dd, null);

            const initialManualCount = (dd.data.manualObjects ?? []).length;

            ctrl.enterPlayMode();

            // Modificar el documento durante Play Mode.
            dd.begin('play');
            dd.addObject('door' as any, 5, 5);
            dd.commit();

            // getSerializableDungeonDoc debe devolver el snapshot original.
            const serializable = ctrl.getSerializableDungeonDoc();
            expect(serializable).not.toBeNull();
            expect((serializable!.manualObjects ?? []).length).toBe(initialManualCount);

            // El documento real tiene el objeto añadido.
            expect((dd.data.manualObjects ?? []).length).toBe(initialManualCount + 1);
        });
    });

    describe('secuencia completa', () => {
        it('edit → play → stop → play → stop mantiene el documento', () => {
            const floor = makeFloor();
            const dd = new DungeonEditorDoc(floor);
            ctrl.setDocuments(dd, null);

            const initialManualCount = (dd.data.manualObjects ?? []).length;

            // Ciclo 1.
            ctrl.enterPlayMode();
            dd.addObject('door' as any, 1, 1);
            ctrl.stopPlayMode();

            // Ciclo 2.
            ctrl.enterPlayMode();
            dd.addObject('torch' as any, 2, 2);
            ctrl.stopPlayMode();

            // El documento debe tener el mismo número de objetos manuales que al inicio.
            expect((dd.data.manualObjects ?? []).length).toBe(initialManualCount);
        });
    });
});
