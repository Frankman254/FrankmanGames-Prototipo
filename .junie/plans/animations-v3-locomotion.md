# Animaciones V3: Corrección de poses, calibración y GLB

## Estado actual

Master: `f003e02`. El estado `walk` está integrado en el runtime, pero las poses biomecánicas son deficientes y la calibración de velocidades es incorrecta.

### Problemas identificados

1. **Poses en `fg_rig.py`**: zancadas muy cortas (0.174m walk, 0.289m run), manos que penetran torso, brazos rígidos, pies que deslizan.
2. **`runSpeed=2.75`** es la velocidad del jugador, no la natural del clip: el ratio siempre es ≥1, así que el personaje siempre corre.
3. **No se midió la longitud de zancada real**: la velocidad natural se calculó por proporción de duración, no por `stride_length / cycle_duration`.
4. **Arma (espada)** puede atravesar pierna o suelo en algunas poses.
5. **Transición Reposo→Caminar** puede llevar las manos a la cadera.

### Modelos afectados

- `centinela_anime.glb` (masculino, 3.7MB)
- `centinela_f_anime.glb` (femenino, 4.0MB) — el que ve el creador con espada
- Ambos usan `fg_rig.biped_clips()` para las animaciones
- Generados por `centinela.py` → `fg_heroe.py` → `fg_rig.py`

### Análisis de zancadas (k=1.0, 1.7m)

**Walk actual**: thigh -22°, shin 6° → reach 0.174m → speed 0.33 m/s
**Run actual**: thigh -36°, shin 12° → reach 0.289m → speed 0.87 m/s

**Walk corregido**: thigh -32°, shin 18° → reach 0.305m → speed 0.57 m/s
**Run corregido**: thigh -45°, shin 30° → reach 0.440m → speed 1.32 m/s

Para centinela (k=1.05): walk ~0.60 m/s, run ~1.39 m/s

### Decisión de calibración

`runSpeed` en assets.json debe ser la velocidad a la que el clip de correr se ve natural.
Con las correcciones: ~1.39 m/s para centinela.

- A 2.75 m/s: ratio = 2.75/1.39 = 1.98 → run ✓
- A 1.0 m/s: ratio = 1.0/1.39 = 0.72 → walk ✓ (por debajo de runExit 0.75)
- Banda: 1.04-1.18 m/s (zona muerta para evitar parpadeo)

### Bloqueos

- **Blender MCP no accesible** desde Python (timeout). No puedo usar `look` ni `execute_blender_code`.
- **Blender background SÍ funciona**: puedo regenerar GLBs con `blender --background --python centinela.py`.
- **Sin revisión visual**: no puedo verificar las poses en Blender con ventana. El creador debe verificar en Electron.

## Hitos

### ✓ Hito 1: Corregir poses biomecánicas en `fg_rig.py`

**ARMS (reposo)**: ±18° (de ±12°), codos -35° (de -22°).
**_walk_contact**: thigh -32° (de -22°), shin 18° (de 6°), foot -8° (de -5°), hips Z 6° (de 5°), spine X 5° (de 0°), foreArm -45° (de -32°), upperArm 22° (de 18°).
**_walk_passing**: thigh -8° (de -3°), foreArm -48° (de -34°), upperArm 8° (de 3°).
**_stride**: thigh -45° (de -36°), shin 30° (de 12°), foot -10° (de -6°), spine X 8° (de 5°).
**_run_down**: thigh -35° (de -29°), shin 35° (de 22°).
**_passing**: thigh -8° (de -6°), shin 10° (de 8°).
**Reposo clip**: frame 31 upperArm ±20° (de ±14°).

### ✓ Hito 2: Calibrar velocidades y regenerar GLB

- Velocidades naturales calculadas: walk 0.57 m/s, run 1.32 m/s (k=1.0).
- `runSpeed` actualizado de 2.75 a 1.3 en 7 plantillas de héroe + modelo procedural.
- GLBs regenerados: centinela.glb (2.2MB), centinela_f.glb (2.3MB) con 8 clips cada uno.
- Banda de histéresis: runEnter 1.12 m/s, runExit 0.99 m/s.
- 18/18 tests de locomoción pasando.

### ✓ Hito 3: Integrar en master y publicar

- Typecheck: limpio.
- Tests: 1243/1245 pasando (2 fallos pre-existentes no relacionados).
- Build: exitoso (6.30s).
- Integrado en master: commit `1824272`.
- Publicado en origin/master.
- ESTADO_ACTUAL.md actualizado.
- Pendiente: revisión visual en Electron (requiere ventana/GPU, local).
