# Animaciones V3: Locomoción, Integración y Pipeline Reutilizable

## Estado actual
Master: `9c3d9da`. El runtime solo usa `idle` o `run`. Los GLB traen clips `Caminar` pero nunca se reproducen.
El parche `arte/omp-locomocion/CAMBIOS_PROPUESTOS.patch` propone integrar `walk` con histéresis pero no se aplicó.

## Correcciones en progreso

### ✓ Step 1: Integrar walk al runtime con histéresis
- [x] Crear `src/world/locomotion.ts`
- [x] Añadir `walk` a `ANIM_STATES` y clip procedural en `rigs.ts`
- [x] Extender `CharacterModel` con `hasClip?()` y `runSpeed?`
- [x] Actualizar `gltfCharacter.ts`
- [x] Actualizar `proceduralCharacter.ts`
- [x] Actualizar `playerAvatar.ts`
- [x] Añadir `"walk": "Caminar"` a `data/assets.json`
- [x] Añadir walk footstep a `data/animation.json`
- [x] Crear `tests/locomocion.test.ts`
### * Step 2: Integrar en master y publicar
- Crear `src/world/locomotion.ts` con `pickGait()` y `GAIT_BAND`.
- Añadir `walk` a `ANIM_STATES` en `src/world/rigs.ts` + clip procedural.
- Extender `CharacterModel` con `hasClip?()` y `runSpeed?`.
- Actualizar `gltfCharacter.ts`: `hasClip`, `runSpeed`, `isLoop('walk')`, fallback walk→run.
- Actualizar `playerAvatar.ts`: estado `gait` con histéresis en `sync()`.
- Añadir `"walk": "Caminar"` a plantillas héroe en `data/assets.json`.
- Crear `tests/locomocion.test.ts` con 11 tests.

### ✓ Step 2: Mejorar poses biomecánicas de Caminar y Correr
- Corregir `_walk_contact`, `_walk_passing`, `_stride`, `_run_down` en `fg_rig.py`.
- Regenerar GLB del Cazador masculino y femenino.
- Validar con `validar_cazador_anime.py`.

### ✓ Step 3: Verificar Disparar y Lanzar con armas reales
- Probar Cazador con arco en Electron.
- Verificar sockets y sincronización.

### ✓ Step 4: Crear documentación reutilizable
- `docs/animacion/ANIMATION_CONTRACT.md`
- `docs/animacion/QUALITY_CHECKLIST.md`
- `docs/animacion/RETARGETING.md`
- `scripts/blender/README_ANIMACIONES.md`

### ✓ Step 5: Integrar en master y publicar
- Validar todo, commits separados, push a master.

---

## Diseño Técnico

### 1. Integrar `walk` al runtime (adaptar el parche)

**`src/world/locomotion.ts`** (nuevo):
```typescript
export const GAIT_BAND = { runEnter: 0.85, runExit: 0.75 };
export function pickGait(
  prev: 'idle' | 'walk' | 'run',
  speed: number,
  naturalRunSpeed: number,
  canWalk: boolean
): 'idle' | 'walk' | 'run' {
  if (speed === 0) return 'idle';
  if (!canWalk) return speed > 0 ? 'run' : 'idle';
  const ratio = speed / naturalRunSpeed;
  if (prev === 'run' && ratio < GAIT_BAND.runExit) return 'walk';
  if (prev === 'walk' && ratio >= GAIT_BAND.runEnter) return 'run';
  if (ratio >= GAIT_BAND.runEnter) return 'run';
  return 'walk';
}
```

**`src/world/rigs.ts`**: añadir `walk` a `ANIM_STATES` + clip procedural `walk`.

**`src/render/characters/characterModel.ts`**: añadir `hasClip?()` y `runSpeed?` al contrato.

**`src/render/characters/gltfCharacter.ts`**:
- `hasClip(state)`: devuelve si tiene grupo para ese estado.
- `runSpeed`: desde `entry.runSpeed`.
- `isLoop('walk')`: true.
- `play('walk')`: sin clip Caminar usa el grupo de correr con eventos de run.
- Cadencia: `speed / (runSpeed * dur(run) / dur(walk))`.

**`src/render/characters/playerAvatar.ts`**:
- Estado `gait` con histéresis.
- `sync()`: usar `pickGait()` en lugar de `moving ? 'run' : 'idle'`.
- Preservar muerte, one-shots, montado.

**`data/assets.json`**: añadir `"walk": "Caminar"` a las 7 plantillas de héroe + eventos `walk`.

**`tests/locomocion.test.ts`** (nuevo): 11 tests del parche adaptados.

### 2. Mejorar poses biomecánicas en `fg_rig.py`

**Caminar** (`_walk_contact`, `_walk_passing`):
- `thighR`: -22° → -32° (más flexión de cadera).
- `shinR`: 6° → 15° (más flexión de rodilla).
- `footR`: -5° → -8° (más dorsiflexión).
- `hips`: rotación Z 2° → 5° (más inclinación lateral).
- `spine`: añadir X 5° (inclinación del torso).
- `foreArmR`: -32° → -45° (más flexión de codo).

**Correr** (`_stride`, `_run_down`):
- `thighR`: -36° → -45° (más flexión de cadera).
- `shinR`: 12° → 30° (más flexión de rodilla).
- `footR`: -6° → -10° (más dorsiflexión).
- `hips`: rotación X 7° → 5° (menos oscilación vertical).
- `spine`: añadir X 8° (más inclinación del torso).

## Testing

- `tests/locomocion.test.ts`: 11 tests.
- `npm run typecheck`: sin errores.
- `npm test`: todos pasando.
- `npm run build`: sin errores.
- Electron: verificar visualmente Caminar, Correr, Disparar, Lanzar.
