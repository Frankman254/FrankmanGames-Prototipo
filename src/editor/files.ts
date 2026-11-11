// Archivos que el modo edición puede escribir, con su ruta desde la raíz del
// repositorio. Es también la lista blanca del punto de guardado de desarrollo
// (scripts/editorSave.ts): nada fuera de aquí se escribe nunca.
export const EDITOR_FILES = {
  terrain: 'data/terrain.json',
  vegetation: 'data/vegetation.json',
  npcs: 'data/rpg/npcs.json',
  merchants: 'data/rpg/merchants.json',
  zones: 'data/zones.json',
  fishing: 'data/rpg/fishing.json',
  navpaint: 'data/navpaint.json',
  stones: 'data/stones.json',
  professions: 'data/rpg/professions.json',
  death: 'data/death.json',
} as const;
export type FileId = keyof typeof EDITOR_FILES;
export const FILE_IDS = Object.keys(EDITOR_FILES) as FileId[];

/**
 * Archivos que importan en tiempo de compilación los datos del MUNDO
 * (terrain, vegetación, caminos de datos, piedras, talleres, altares): al
 * cambiarlos en disco, Vite recarga la página entera. `scripts/editorSave.ts`
 * los saca del vigilante y `src/editor/hotApply.ts` los aplica en caliente,
 * así que guardar deja de reiniciar el editor. `fishing` y `zones` siguen por
 * el conducto normal: no se importan desde `src/` y no provocan recarga.
 */
export const WATCH_IGNORED_FILES: readonly FileId[] = ['terrain', 'vegetation', 'navpaint', 'stones', 'professions', 'death'];

/** Ruta del punto de guardado (sólo existe con `vite serve`). */
export const EDITOR_SAVE_ROUTE = '/__editor/save';
/** Cabecera obligatoria: una web ajena no puede ponerla sin permiso CORS. */
export const EDITOR_SAVE_HEADER = 'x-fmg-editor';
