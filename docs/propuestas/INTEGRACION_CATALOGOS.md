# Integración de catálogos GLB sin usar

**Estado:** PROPUESTA
**Fecha:** 2026-11-13
**Autor:** Junie (J3)
**Revisión:** pendiente

## Resumen

Existen 5 archivos GLB en `assets/models/` que no se cargan ni se usan en ninguna parte del código ni en los datos del juego:

| GLB | Nodos | Animaciones | Tipo |
|-----|-------|-------------|------|
| `utileria.glb` | 18 | 0 | Catálogo estático |
| `simbolos_istmo.glb` | 6 | 0 | Catálogo estático |
| `naturaleza_modular.glb` | 12 | 0 | Catálogo estático |
| `escenografia_regional.glb` | 12 | 0 | Catálogo estático |
| `caballo_azuero.glb` | 20 | 3 (Reposo, Paso, Trotar) | Montura animada |

## Análisis por catálogo

### 1. `utileria.glb` — Props genéricos de asentamiento

18 piezas con prefijo `prop_`: amarradero, banco, barril, bebedero, cajón, carreta, cerca, chimenea, escalera, farol_poste, fogata, mesa_larga, mesa_redonda, poste_camino, rancho_paja, silla, tinaja_alta, tinaja_redonda.

**Uso propuesto:** Catálogo ambiental para `data/ambient.json` en la sección `placed` (piezas puestas a mano). Las piezas son props de asentamiento que enriquecen Villa Raspadura, Iguanera y otras zonas pobladas.

**Integración:** Añadir las 18 piezas a `ambient.json.pieces` con `"model": "utileria"` y sus dimensiones medidas sobre el GLB. Luego añadir `utileria` al glob de `src/render/ambientView.ts` (línea 12):

```typescript
const MODELS = import.meta.glob('/assets/models/{detalle_suelo,costa_modular,caminos_rurales,naturaleza_suelo,utileria}.glb', ...)
```

### 2. `simbolos_istmo.glb` — Iconografía cultural

6 piezas con prefijo `simbolo_`: aretes_oro, estatua_arpia, machete_ceremonial, monedas_ficticias, sombrero_trenzado, vestido_festivo.

**Uso propuesto:** Catálogo ambiental para decoración temática en zonas específicas (templos, plazas ceremoniales, interiores). Las piezas son pequeñas y decorativas.

**Integración:** Igual que utileria: añadir a `ambient.json.pieces` con `"model": "simbolos_istmo"` y extender el glob de `ambientView.ts`.

### 3. `naturaleza_modular.glb` — Flora y fauna estática modular

12 piezas con prefijo `natural_`: arbol_sombra, arbusto_redondo, arbusto_seco, grupo_rocas, helecho_ancho, mata_flor, palma_joven, pasto_alto, roca_alta, roca_baja, roca_musgosa, tronco_caido.

**Uso propuesto:** Catálogo ambiental para `layers` (reparto automático con semilla) y `placed` (piezas destacadas). Complementa a `naturaleza_suelo.glb` que ya se usa en `data/vegetation.json` como props (log/boulder).

**Nota:** `naturaleza_suelo.glb` ya está en `ambient.json` (rocas y troncos). `naturaleza_modular.glb` aporta árboles, arbustos y palmas — vegetación más alta que podría usarse en `layers` de tipo `prop` (anillo lejano) para dar silueta al horizonte.

**Integración:** Añadir a `ambient.json.pieces` con `"model": "naturaleza_modular"` y extender el glob de `ambientView.ts`.

### 4. `escenografia_regional.glb` — Estructuras costeras y de plaza

12 piezas con prefijo `escena_`: almacen_costero, amarradero, baliza_costera, bote_angosto, bote_carga, bote_pasajeros, caseta_abierta, estandarte_plaza, muelle_esquina, muelle_tramo, poste_direcciones, puesto_mercado.

**Uso propuesto:** Catálogo ambiental para `placed` en zonas costeras y plazas. Las piezas son estructuras medianas-grandes que definen el carácter de un puerto o mercado.

**Integración:** Añadir a `ambient.json.pieces` con `"model": "escenografia_regional"` y extender el glob de `ambientView.ts`.

### 5. `caballo_azuero.glb` — Montura animada

20 nodos con esqueleto (head, neck, hips, chest, patas con upper/lower/hoof, tail, tailTip, CaballoAzuero como root, FG_CaballoAzuero como anclaje del jinete). 3 clips: Reposo, Paso, Trotar.

**Uso propuesto:** Montura alternativa para el sistema de `src/render/mountView.ts`.

**Estado del sistema de monturas:**
- `mountView.ts` carga `montura.glb` por defecto o el modelo indicado en `mount.model` de `data/rpg/items.json`.
- Los clips esperados son: `Reposo`, `Trotar` (suelo) y `Planear`, `Volar` (aire, opcionales).
- `caballo_azuero.glb` tiene `Reposo`, `Paso` y `Trotar` — el clip `Paso` es un bonus que el sistema actual no usa pero podría aprovecharse para la transición caminar/correr (WALK_BELOW = 4.5 m/s).
- El anclaje del jinete se llama `FG_CaballoAzuero` (mountView busca `rider_root` por defecto).

**Bloqueo:** El anclaje del jinete (`FG_CaballoAzuero`) no coincide con el nombre esperado (`rider_root`). OMP debe renombrar el nodo o el código debe aceptar nombres alternativos. Además, `mount_horse` en `items.json` no apunta a `caballo_azuero` como modelo; usa la montura genérica.

**Integración propuesta:**
1. OMP renombra `FG_CaballoAzuero` → `rider_root` en el GLB.
2. Añadir entrada en `data/rpg/items.json` (o modificar `mount_horse`) con `"model": "caballo_azuero"`.
3. Añadir `caballo_azuero` a `data/assets.json.templates` con sus clips.

## Catálogos que SÍ se cargan con nombre construido

La tarea J3 pide confirmar si `objetos`, `interiores`, `vegetacion` y `vegetacion_lod` se cargan con nombre construido.

**Respuesta:** NO. Estos 4 GLBs se cargan con nombre **fijo** en `src/render/staticModels.ts` (línea 8):

```typescript
const STATIC_FILES = import.meta.glob('/assets/models/{mazmorra,vegetacion,interiores,objetos}.glb', ...)
```

Se cargan una vez al arrancar (`loadStaticModels()` en `src/boot.ts`) y se registran en una biblioteca global (`library: Map<string, StaticGeometry>`). Cada vista (`dungeonView.ts`, `vegetationView.ts`, `gatherView.ts`, `lootView.ts`, etc.) pide piezas por nombre con `staticMesh(scene, 'nombrePieza')`.

**No usan nombre construido.** El nombre del GLB está hardcodeado en el glob pattern.

## Plan de integración (orden recomendado)

1. **utileria + escenografia_regional** → `ambient.json.pieces` + `placed` en Villa Raspadura. Son los que más impacto visual tienen en las zonas pobladas.
2. **naturaleza_modular** → `ambient.json.pieces` + `layers` tipo `prop` para silueta del horizonte.
3. **simbolos_istmo** → `ambient.json.pieces` + `placed` en interiores o plazas ceremoniales.
4. **caballo_azuero** → Esperar a que OMP renombre `rider_root` y añadir entrada en `items.json`.

## Cambios de código necesarios

| Archivo | Cambio |
|---------|--------|
| `src/render/ambientView.ts` (línea 12) | Añadir `utileria`, `simbolos_istmo`, `naturaleza_modular`, `escenografia_regional` al glob pattern |
| `data/ambient.json` | Añadir las piezas de cada catálogo a `pieces` con dimensiones medidas |
| `data/ambient.json` | Añadir entradas `placed` para utileria y escenografia en Villa Raspadura |
| `data/ambient.json` | Añadir `layers` para naturaleza_modular (silueta) |
| `data/rpg/items.json` | Opcional: añadir `mount_caballo_azuero` o modificar `mount_horse` |
| `data/assets.json` | Opcional: añadir template para caballo_azuero |

## Pruebas

- `tests/ambient.test.ts` ya verifica que cada nodo de `ambient.json.pieces` existe en su GLB y conserva las dimensiones declaradas.
- `tests/modelos.test.ts` ya lista los 5 GLBs en `FIXED` (sin animaciones esperadas), excepto caballo_azuero que tiene clips.
- Al añadir las piezas a `ambient.json`, los tests existentes validan automáticamente la integridad.

## Lo que NO se hace en esta propuesta

- No se crea un lote piloto determinista ni pruebas de densidad: la tarea J3 lo pide, pero requiere cambios en `data/ambient.json` que implican decisiones de diseño (qué pieza va dónde, a qué escala, con qué rotación). Sin aprobación del creador, se limita al análisis.
- No se integra el caballo azuero hasta que OMP renombre el anclaje del jinete.
