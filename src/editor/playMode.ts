// PlayModeController — separa Edit Mode de Play Mode en el editor.
// Al entrar en Play Mode, se hace un snapshot del documento del editor y
// se reanuda la simulación del juego. Al salir (Stop), se descarta el
// snapshot y se restaura el estado de edición sin contaminar el documento.
import type { DungeonFloorMapDef } from '../data/dungeonFloorMap';
import type { DungeonEditorDoc } from './dungeonDoc';
import type { EditorDoc } from './doc';

/** Estado del controlador de Play Mode. */
export type PlayModeState = 'edit' | 'playing' | 'stopping';

/** Snapshot del estado del editor al entrar en Play Mode. */
interface EditorSnapshot {
  /** Documento de dungeon serializado, si estaba en modo dungeon. */
  dungeon?: string;
  /** Archivos del overworld serializados, si estaba en modo overworld. */
  overworld?: Record<string, string>;
  /** Si el editor estaba en modo dungeon. */
  isDungeon: boolean;
}

/**
 * PlayModeController gestiona la transición entre Edit Mode y Play Mode.
 * En Edit Mode, el juego está pausado y el editor modifica documentos.
 * En Play Mode, el juego se reanuda con los documentos actuales.
 * Al salir de Play Mode, se restaura el estado de edición sin convertir
 * los cambios de simulación en cambios permanentes.
 */
export class PlayModeController {
  private _state: PlayModeState = 'edit';
  private _snapshot: EditorSnapshot | null = null;

  /** Callback que pausa/reanuda la simulación del juego. */
  private readonly _onToggleSimulation: (paused: boolean) => void;
  /** Callback que aplica el documento actual al mundo. */
  private readonly _onApply: () => void;
  /** Callback que notifica el cambio de estado. */
  private readonly _onStateChange: (state: PlayModeState) => void;

  /** Documento de dungeon activo, si aplica. */
  private _dungeonDoc: DungeonEditorDoc | null = null;
  /** Documento de overworld activo, si aplica. */
  private _overworldDoc: EditorDoc | null = null;

  constructor(options: {
    /** Pausa o reanuda la simulación del juego. */
    onToggleSimulation: (paused: boolean) => void;
    /** Aplica el documento actual al mundo jugable. */
    onApply: () => void;
    /** Notifica el cambio de estado. */
    onStateChange: (state: PlayModeState) => void;
  }) {
    this._onToggleSimulation = options.onToggleSimulation;
    this._onApply = options.onApply;
    this._onStateChange = options.onStateChange;
  }

  /** Estado actual del controlador. */
  get state(): PlayModeState {
    return this._state;
  }

  /** Si estamos en Play Mode. */
  get isPlaying(): boolean {
    return this._state === 'playing';
  }

  /** Si estamos en Edit Mode. */
  get isEditing(): boolean {
    return this._state === 'edit';
  }

  /**
   * Actualiza las referencias a los documentos activos.
   * Se llama cuando el editor cambia de modo (dungeon/overworld).
   */
  setDocuments(dungeonDoc: DungeonEditorDoc | null, overworldDoc: EditorDoc | null): void {
    this._dungeonDoc = dungeonDoc;
    this._overworldDoc = overworldDoc;
  }

  /**
   * Entra en Play Mode. Hace un snapshot del documento actual, aplica los
   * cambios al mundo y reanuda la simulación del juego.
   */
  enterPlayMode(): boolean {
    if (this._state !== 'edit') return false;

    // 1. Hacer snapshot del estado actual
    this._snapshot = this._takeSnapshot();

    // 2. Aplicar el documento actual al mundo
    this._onApply();

    // 3. Pausar el editor (desactivar gizmos, paneles, etc.)
    this._state = 'playing';
    this._onStateChange(this._state);

    // 4. Reanudar la simulación del juego
    this._onToggleSimulation(false);

    return true;
  }

  /**
   * Sale de Play Mode. Descarta el snapshot, restaura el estado de edición
   * y pausa la simulación del juego. Los cambios de simulación (cofres abiertos,
   * enemigos muertos, etc.) no contaminan el documento del editor.
   */
  stopPlayMode(): boolean {
    if (this._state !== 'playing') return false;

    this._state = 'stopping';
    this._onStateChange(this._state);

    // 1. Pausar la simulación del juego
    this._onToggleSimulation(true);

    // 2. Restaurar el documento del snapshot
    this._restoreSnapshot();

    // 3. Volver al estado de edición
    this._state = 'edit';
    this._snapshot = null;
    this._onStateChange(this._state);

    return true;
  }

  /**
   * Toma un snapshot del estado actual del editor para poder restaurarlo
   * al salir de Play Mode.
   */
  private _takeSnapshot(): EditorSnapshot {
    const snapshot: EditorSnapshot = { isDungeon: this._dungeonDoc !== null };

    if (this._dungeonDoc) {
      snapshot.dungeon = this._dungeonDoc.serialize();
    } else if (this._overworldDoc) {
      snapshot.overworld = {};
      for (const file of this._overworldDoc.dirtyFiles()) {
        snapshot.overworld![file] = this._overworldDoc.serialize(file);
      }
    }

    return snapshot;
  }

  /**
   * Restaura el snapshot del editor al estado que tenía al entrar en Play Mode.
   * Los cambios de simulación se descartan.
   */
  private _restoreSnapshot(): void {
    if (!this._snapshot) return;

    if (this._snapshot.isDungeon && this._snapshot.dungeon && this._dungeonDoc) {
      // Restaurar el documento de dungeon desde el snapshot
      const restored = JSON.parse(this._snapshot.dungeon) as DungeonFloorMapDef;
      Object.assign(this._dungeonDoc.data, restored);
      // Asegurar que los campos v2 existen
      this._dungeonDoc.data.overrides = this._dungeonDoc.data.overrides ?? {};
      this._dungeonDoc.data.manualObjects = this._dungeonDoc.data.manualObjects ?? [];
    } else if (!this._snapshot.isDungeon && this._snapshot.overworld && this._overworldDoc) {
      // Restaurar los archivos del overworld desde el snapshot
      // Los cambios de simulación no afectan los archivos del overworld
      // en Play Mode, así que no hay nada que restaurar aquí.
    }
  }

  /**
   * Devuelve el documento serializado actual (para guardar en disco).
   * En Play Mode, devuelve el snapshot original, no los cambios de simulación.
   */
  getSerializableDungeonDoc(): DungeonFloorMapDef | null {
    if (this._state === 'playing' && this._snapshot?.dungeon) {
      return JSON.parse(this._snapshot.dungeon) as DungeonFloorMapDef;
    }
    return this._dungeonDoc?.data ?? null;
  }
}
