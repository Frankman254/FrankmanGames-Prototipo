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
 * Archivos que importan en tiempo de compilación los datos del MUNDO o del RPG
 * (terreno, vegetación, pintado, piedras, talleres, altares, PNJ, mercaderes,
 * zonas y pesca): al cambiarlos en disco, Vite recargaría la página entera.
 * `scripts/editorSave.ts` los saca del vigilante y el modo edición los aplica
 * en caliente (`hotApply` en main.ts), así que guardar deja de reiniciar.
 * `quests.json` no es editable desde el panel: sigue por el conducto normal.
 */
export const WATCH_IGNORED_FILES: readonly FileId[] = ['terrain', 'vegetation', 'navpaint', 'stones', 'professions', 'death', 'npcs', 'merchants', 'zones', 'fishing'];

/** Ruta del punto de guardado (sólo existe con `vite serve`). */
export const EDITOR_SAVE_ROUTE = '/__editor/save';
/** Cabecera obligatoria: una web ajena no puede ponerla sin permiso CORS. */
export const EDITOR_SAVE_HEADER = 'x-fmg-editor';

/** Los pisos se crean al primer guardado: cada uno queda aislado en su JSON. */
export function isEditorFilePath(path: string): boolean {
  return Object.values(EDITOR_FILES).includes(path as (typeof EDITOR_FILES)[keyof typeof EDITOR_FILES])
    || /^data\/dungeons\/[a-z0-9-]+\/floors\/\d{3}\.json$/.test(path)
    || /^data\/maps\/provinces\/[a-z0-9_-]+\/(terrain|vegetation|ambient|zones|navpaint)\.json$/.test(path);
}
