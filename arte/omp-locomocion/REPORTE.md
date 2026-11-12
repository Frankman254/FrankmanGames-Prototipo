# REPORTE — Locomoción: estado `walk` con banda de histéresis (2026-11-12)

Trabajo para revisión humana. **Nada aplicado en producción ni en Git**: el
parche vive en `CAMBIOS_PROPUESTOS.patch` (verificable con `git apply --check`
contra el árbol actual de master) y las ediciones probadas en un sandbox
aislado (`work/omp-locomocion/sandbox`, copia del repo, descartable).

## Auditoría (lo que estaba roto)

1. `src/world/rigs.ts` — `ANIM_STATES = ['idle','run','attack','cast','evade','hit','death']`:
   sin `walk`. Los GLB de los héroes **sí traen el clip**: medido en
   `personaje.glb` (chunk de animación), `Reposo 2,000 s / Caminar 1,067 s /
   Correr 0,667 s`, 48 canales cada uno, 30 fps. Tienen `Caminar`: personaje,
   centinela±f(±_anime), oraculo±f(±_anime), cazador±f(±_anime), arquero,
   chaman, diablillo. **No** lo tienen: bestia, zorro, buho, tortuga ni ningún
   procedual de bicho — el fallback es obligatorio.
2. `src/render/characters/playerAvatar.ts:134` — `m.play(moving ? 'run' : 'idle')`:
   el jugador pasaba de reposo directamente a correr a cualquier velocidad.
   Con peso, clima o ralentizaciones el modelo corría el clip de correr
   despacio (`speedRatio` mínimo 0.3, gltfCharacter), que se lee como patinar.
3. Efecto colateral detectado: el fallback antiguo de `play()` usaba el grupo
   `idle` para cualquier estado sin clip — pedir `walk` a un animal habría
   dejado al bicho hecho estatua andando. Se corrigió en el parche (walk→run).
4. `data/assets.json` — las 7 plantillas de héroe mapeaban `idle/run` pero
   ninguna `walk`; `data/animation.json` — el humanoide procedural no tenía
   clip de caminar ni eventos.

## Parche propuesto (9 ficheros, +~180 líneas)

| Fichero | Cambio |
|---|---|
| `src/world/locomotion.ts` (nuevo) | Regla pura `pickGait(prev, speed, naturalRun, canWalk)` con `GAIT_BAND = { runEnter: 0.85, runExit: 0.75 }` sobre el `runSpeed` propio de cada modelo. Sin dependencias: testeable sin escena ni balance. |
| `src/world/rigs.ts` | `walk` en `ANIM_STATES` + clip `walk` procedural del héroe (duración 1,05 s ≈ el «Caminar» de los GLB; medio recorrido de zancada, apoyo en t=0 y 0,5). |
| `src/render/characters/characterModel.ts` | Contrato: `hasClip?(state)` opcional y `runSpeed` opcional. |
| `src/render/characters/gltfCharacter.ts` | `hasClip`/`runSpeed`; `walk` es bucle; `play()` con **clave de evento**: sin clip «Caminar» usa el grupo y los eventos de correr (idéntico al comportamiento anterior); con clip, cadencia `speed / (runSpeed · dur(run)/dur(walk))`. |
| `src/render/characters/proceduralCharacter.ts` | `clipFor` walk→run cuando falta (animales), cadencia proporcional a duración cuando existe. |
| `src/render/characters/playerAvatar.ts` | Estado `gait` con histéresis: en reposo/idle no se pisa (al reanudar se retoma la marcha que tocaba), muerte y one-shots intactos. |
| `data/assets.json` | 7 plantillas de héroe: `"walk": "Caminar"` + eventos `walk` (mismos instantes de apoyo que `run`: el clip real tiene las zancadas en las mismas fases normalizadas, medido en las curvas). |
| `data/animation.json` | Eventos `walk` del humanoide procedural. |
| `tests/locomocion.test.ts` (nuevo) | Ver abajo. |

Qué **no** cambia: ninguna velocidad de la simulación (`moveSpeed`, peso,
clima, `runSpeed` de datos). La banda es adimensional: cada modelo anda por
debajo del 75 % de SU paso natural y vuelve a correr al 85 %. Los enemigos y
mascotas siguen pidiendo `run` directo (fuera del alcance del encargo); como
bonus, `?anim=walk` funciona ya en `characterGallery`.

### Cross-fade

No hizo falta tocarlo: `play()` ya funda por pesos (`fading` + `blendSeconds`
de `data/animation.json`, 0,15 s). El parche lo ejerce entre los tres estados
de locomoción con una prueba que comprueba que el anterior baja de peso, el
nuevo sube, y al terminar el fundido el viejo se detiene sin congelar nada.
Idle→walk→run y run→idle (parada) comparten el mismo mecanismo.

### Pisadas sincronizadas

- Héroes glTF: eventos `walk` en assets.json con los apoyos reales del clip
  medidos del GLB (cadera en su mínimo en t=0 y t≈0,5; zancadas alternas
  0,05/0,55). El controlador emite el evento por la **clave del clip usado**:
  nativo = eventos de `walk`, fallback = eventos de `run`. Nunca suena un
  paso con el pie arriba.
- Procedural: el clip `walk` nuevo declara sus apoyos y los eventos de
  animation.json se comprueban contra la FK del rig, igual que los de `run`.

### Compatibilidad (modelos sin «Caminar»)

Tres capas: (1) las plantillas que no mapean walk → `hasClip('walk')=false` →
`pickGait` siempre devuelve `run` → código idéntico al de antes; (2) si aun
así alguien pide `walk` (p. ej. un futuro enemigo), glTF y procedural usan el
grupo/clip de correr con sus eventos y su cadencia clásica — sin estatua idle;
(3) `hasClip` es opcional en el contrato: un `CharacterModel` externo que no
lo implemente se trata como «no sabe caminar» (`?? false`).

## Pruebas (11 nuevas + suite)

- **Selección**: umbrales exactos dentro/fuera de la banda; sin parpadeo
  walk/run en la zona media (ida y vuelta); sin clip o sin datos → run.
- **Fallback**: glTF sin grupo Caminar → usa el de correr a ratio clásico,
  bucle, `state==='walk'` visible pero eventos de run; procedural bicho igual
  vía `clipFor`.
- **Clip real**: `clipSeconds('walk')≈1,067` con grupos de duración medida;
  cadencia walk y run a velocidad natural dan ratio ~1; fundido a tres bandas
  idle→walk→run→(20 frames) deja un solo grupo sonando.
- **Apoyos del clip procedural**: cada footstep de `walk` cae con el pie más
  bajo a <1 cm de su mínimo y alterna pies (patrón del test existente de run).
- **Integración avatar**: lento→walk, tope→run, parado→idle y reanuda;
  histéresis viva a través de `sync`; animal nunca oye `play('walk')`;
  montado sigue sin caminar el jinete.

## Salida de las verificaciones (sandbox, en `pruebas/`)

- `pruebas/tsc.txt` — `npx tsc --noEmit`: **exit 0**.
- `pruebas/vitest-locomocion.txt` — `npx vitest run tests/locomocion.test.ts`:
  **11/11** en verde.
- `pruebas/vitest-completa.txt` — suite completa: **1204/1204** (140 ficheros;
  sobre la base de 1193 + las 11 nuevas), con el parche aplicado en sandbox.
- `git apply --check CAMBIOS_PROPUESTOS.patch` contra el árbol de master:
  **limpio** (el árbol de master trae trabajo de editor por delante del
  snapshot del sandbox; el parche sólo toca los 9 ficheros de arriba).

## Fallos pendientes / notas para el coordinador

- Ninguno conocido en la lógica probada. Lo que **no** se puede probar sin
  ventana/GPU: la sensación del fundido a 60 fps y el polvo de pisadas en
  marcha nueva — comprobar con `npm run dev` (pasear con Shift/ralentizado
  contra correr).
- La lámina visual de animaciones no aplica (no es asset): la revisión es la
  partida y `personajes.html?anim=walk`.
- Decisión de contenido abierta (NO tomada): los enemigos con clip «Caminar»
  (arquero, chaman, diablillo) siguen corriendo siempre; si se quiere
  hostilidad más creíble, `enemyView.ts` puede reutilizar `pickGait` en un
  lote posterior.
- Valores de la banda (0,75/0,85) = **PROPUESTA** ajustable en un sitio
  (`GAIT_BAND`); no son balance aprobado.

## Texto para PROCEDENCIA.md si se integra

Nada nuevo: ni assets ni dependencias. Sólo código y datos propios del
proyecto (mencionar en la bitácora al integrar).
