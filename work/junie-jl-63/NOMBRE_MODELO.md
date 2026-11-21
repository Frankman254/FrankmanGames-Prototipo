# Auditoría: Nombre vs. Modelo de criaturas

Generado: 2026-11-21 por Junie (JL-63).
Fuentes: `data/rpg/enemies.json` (nombres), `data/assets.json` (plantillas y modelos), `assets/models/` (GLB disponibles).

## Resumen

- **78 arquetipos** en total.
- **15 usan `bestia`/`wolf`** (perro cimarrón genérico) aunque son tigrillos, jaguares, águilas, tapires, ranas, ostras, tiburones, calamares, coyotes, monos, etc.
- **13 usan `arquero`/`archer`** (humanoide con arco) aunque son quetzales, búhos, pavos, sirenas, pescadores fantasmas, etc.
- **13 usan `personaje`/`humanoid`** (humanoide genérico) aunque son yetis, diablos, colosos, marineros ahogados, etc.
- **10 usan `diablillo`/`imp`** (diablillo genérico) aunque son chitras, gotas de lluvia, mosquitos, medusas, perlas rodantes, etc.
- **11 usan `chaman`/`shaman`** (humanoide con staff) — algunos encajan (brujos, hechiceros), otros no (sirena, tulivieja).
- **16 tienen plantilla GLB propia** (cangrejo, garza, caimán, pecarí, jabalí, cripta_rata/bruto/guardian, espejo).

## Modelos GLB disponibles en `assets/models/`

Animales con clips de enemigo (idle, walk/run, attack, hit, death):
- `jaguar.glb` — jaguar
- `buho.glb` — búho
- `zorro.glb` — zorro
- `tortuga.glb` — tortuga
- `cangrejo.glb` — cangrejo (ya integrado JL-45b)
- `caiman.glb` — caimán (ya integrado JL-61)
- `garza.glb` — garza (ya integrada JL-61)
- `pecari.glb` — pecarí (ya integrado JL-61)
- `jabali.glb` — jabalí (ya integrado JL-61)
- `cripta_rata.glb` + variantes (ya integrados JL-61)
- `cripta_bruto.glb` + variantes (ya integrados JL-61)
- `cripta_guardian.glb` + variantes (ya integrados JL-61)
- `diablica_espejo.glb` — La Espeja (ya integrada)

Animales sin clips de enemigo completos (solo decorativos o sin rig):
- `aguila_arpia.glb` — montura, no enemigo
- `ave_gallote.glb`, `ave_tijereta.glb` — aves decorativas

## Tabla completa (ordenada por gravedad del desajuste)

### CRÍTICO — Nombre y modelo son completamente distintos

| ID | Nombre | Qué es | Plantilla | Modelo | Problema | Modelo propio disponible |
|---|---|---|---|---|---|---|
| `darien_harpy` | Águila Harpía Real | ave de presa | bestia | wolf | Águila = perro | `aguila_arpia.glb` (montura, sin clips enemigo) |
| `darien_tapir` | Macho de Monte Insomne | tapir (mamífero) | bestia | wolf | Tapir = perro | No hay |
| `darien_neque` | �ñeque Guerrero | roedor (agutí) | bestia | wolf | Roedor = perro | No hay |
| `perlas_shark` | Tiburón Martillo Patrón | tiburón | bestia | wolf | Tiburón = perro | No hay |
| `perlas_squid` | Calamar Gigante Madrugador | calamar | bestia | wolf | Calamar = perro | No hay |
| `perlas_oyster` | Ostra Mordelona | ostra | bestia | wolf | Ostra = perro | No hay |
| `bocas_frog` | Rana Dorada Venenosa | rana | rana | rana_venenosa.glb | ✓ Corregido (JL-72) |
| `baru_jaguar` | Jaguar Friolento del Barú | jaguar | jaguar | jaguar.glb | ✓ Corregido (JL-72) |
| `baru_elder` | Gran Jaguar del Barú | jaguar | jaguar_anciano | jaguar_anciano.glb | ✓ Corregido (JL-72) |
| `ash_alpha` | Tigrillo de Ceniza | tigrillo (felino) | bestia | wolf | Felino = perro | `jaguar.glb` (aproximado) |
| `fortuna_coyote` | Coyote de la Helada | coyote | bestia | wolf | Coyote ≈ perro (parecido) | `zorro.glb` (aproximado) |
| `ancon_titi` | Mono Tití Trasnochado | mono | bestia | wolf | Mono = perro | No hay |
| `boquete_owl` | Búho Chismoso | búho | arquero | archer | Búho = humanoide | `buho.glb` ✓ |
| `boquete_quetzal` | Quetzal Cascarrabias | ave | arquero | archer | Ave = humanoide | No hay (aves sin clips) |
| `ancon_pavo` | Pavo Gritón | ave | arquero | archer | Ave = humanoide | `ave_gallote.glb` (sin clips enemigo) |
| `bocas_siren` | Sirena Desafinada | sirena (humanoide) | chaman | shaman | Sirena ≈ chaman (aceptable) | No hay |
| `bocas_jelly` | Aguamala Pegajosa | medusa | diablillo | imp | Medusa = diablillo | No hay |
| `perlas_pearl` | Perla Rodante | perla/esfera | diablillo | imp | Perla = diablillo | No hay |
| `darien_mosquito` | Zancudo Tamaño Familiar | mosquito | diablillo | imp | Insecto = diablillo | No hay |
| `cerropunta_wisp` | Jirón de Neblina | espíritu/neblina | diablillo | imp | Espíritu = diablillo | No hay |
| `baru_ember` | Brasita Saltarina | espíritu de fuego | diablillo | imp | Espíritu = diablillo | No hay |
| `ancon_soul` | Alma en Pena de la Parada | alma/espíritu | diablillo | imp | Espíritu = diablillo | No hay |
| `fortuna_flake` | Copito Malcriado | copo de nieve | diablillo | imp | Copo = diablillo | No hay |
| `boquete_drizzle` | Gotita de Bajareque | gota de lluvia | diablillo | imp | Gota = diablillo | No hay |
| `chame_chitra` | Chitra Picadora | insecto | diablillo | imp | Insecto = diablillo | No hay |
| `perlas_fisher` | Pescador Fantasma de las Perlas | fantasma humanoide | arquero | archer | Fantasma ≈ arquero (aceptable) | `fantasma.glb` (sin clips enemigo) |
| `bocas_pirate` | Pirata de Isla Colón | pirata humanoide | arquero | archer | Pirata ≈ arquero (aceptable) | No hay |
| `baru_yeti` | Abominable Turista del Barú | yeti | personaje | humanoid | Yeti ≈ humanoide (aceptable) | No hay |
| `bocas_drowned` | Marinero Ahogado | cadáver humanoide | personaje | humanoid | Cadáver ≈ humanoide (aceptable) | `fantasma.glb` (sin clips enemigo) |
| `ancon_bus` | Diablo Rojo Desbocado | diablo (bus) | personaje | humanoid | Diablo ≈ humanoide (aceptable) | No hay |
| `fortuna_gale` | Ventarrón Andante | espíritu de viento | personaje | humanoid | Espíritu ≈ humanoide (aceptable) | No hay |
| `fortuna_titan` | Coloso del Embalse | gigante | personaje | humanoid | Gigante ≈ humanoide (aceptable) | No hay |
| `cerropunta_wraith` | Espanto de la Neblina | espíritu | personaje | humanoid | Espíritu ≈ humanoide (aceptable) | `fantasma.glb` (sin clips enemigo) |

### ACEPTABLE — Nombre y modelo coinciden o son similares

| ID | Nombre | Qué es | Plantilla | Modelo | Estado |
|---|---|---|---|---|---|
| `melee` | Sato Cimarrón | perro | bestia | wolf | ✓ Correcto |
| `night_sato` | Sato Aullador de Medianoche | perro | bestia | wolf | ✓ Correcto |
| `alpha_wolf` | Sato Jefe de la Jauría | perro | bestia | wolf | ✓ Correcto |
| `ranged` | Duende Tirapiedras | duende | arquero | archer | ✓ Correcto |
| `trapper` | Trampero del Matorral | humanoide | arquero | archer | ✓ Correcto |
| `goblin_veteran` | Duende Tirapiedras Veterano | duende | arquero | archer | ✓ Correcto |
| `summoner` | Curandero de Huesos | humanoide | chaman | shaman | ✓ Correcto |
| `minion` | Diablico Sucio | diablillo | diablillo | imp | ✓ Correcto |
| `grave_brute` | Matón de la Tulivieja | humanoide | personaje | humanoid | ✓ Correcto |
| `crypt_warden` | El Sacristán Sin Cabeza | humanoide | personaje | humanoid | ✓ Correcto |
| `chame_witch` | Brujo del Manglar | humanoide | chaman | shaman | ✓ Correcto |
| `boquete_witch` | Bruja del Bajareque | humanoide | chaman | shaman | ✓ Correcto |
| `boquete_foreman` | Capataz del Cafetal | humanoide | personaje | humanoid | ✓ Correcto |
| `boquete_picker` | Recolector de Café Rabioso | humanoide | personaje | humanoid | ✓ Correcto |
| `cerropunta_farmer` | Fresero Francotirador | humanoide | arquero | archer | ✓ Correcto |
| `cerropunta_shaman` | Chamán de la Neblina | humanoide | chaman | shaman | ✓ Correcto |
| `baru_lookout` | Vigía del Cráter | humanoide | arquero | archer | ✓ Correcto |
| `baru_sorcerer` | Hechicero del Volcán | humanoide | chaman | shaman | ✓ Correcto |
| `darien_blowgun` | Cerbatanero del Tapón | humanoide | arquero | archer | ✓ Correcto |
| `darien_witch` | Brujo del Tapón | humanoide | chaman | shaman | ✓ Correcto |
| `bocas_captain` | Capitán Calipso | humanoide | personaje | humanoid | ✓ Correcto |
| `espejo_bailarin` | Bailarín del Diablo Espejo | humanoide | personaje | humanoid | ✓ Correcto |
| `espejo_cascabelero` | Cascabelero del Diablo Espejo | humanoide | arquero | archer | ✓ Correcto |
| `espejo_llamador` | Llamador de la Ronda | humanoide | chaman | shaman | ✓ Correcto |
| `fortuna_archer` | Arquero de la Ventisca | humanoide | arquero | archer | ✓ Correcto |
| `fortuna_shaman` | Brujo Escarchado de Fortuna | humanoide | chaman | shaman | ✓ Correcto |
| `ancon_driver` | El Chofer Sin Frenos | humanoide | personaje | humanoid | ✓ Correcto |
| `ancon_tulivieja` | Tulivieja Mayor | humanoide | chaman | shaman | ✓ Correcto |
| `perlas_witch` | Bruja de las Perlas | humanoide | chaman | shaman | ✓ Correcto |
| `la_espeja` | La Diablica Espejo | humanoide | espejo | diablica_espejo.glb | ✓ Correcto (GLB propio) |
| `chame_crab` | Cangrejo Machetero | cangrejo | cangrejo | cangrejo.glb | ✓ Correcto (GLB propio) |
| `chame_grandcrab` | Cangrejo Abuelo | cangrejo | cangrejo | cangrejo.glb | ✓ Correcto (GLB propio) |
| `chame_heron` | Garza Flechera | garza | garza | garza.glb | ✓ Correcto (GLB propio) |
| `chame_caiman` | Caimán Trasnochador | caimán | caiman | caiman.glb | ✓ Correcto (GLB propio) |
| `cerropunta_peccary` | Saíno Escarchado | pecarí | pecari | pecari.glb | ✓ Correcto (GLB propio) |
| `cerropunta_boar` | Saíno Mayor de la Fría | jabalí | jabali | jabali.glb | ✓ Correcto (GLB propio) |
| `cripta_rata` | Ratón de la Cripta | rata | cripta_rata | cripta_rata.glb | ✓ Correcto (GLB propio) |
| `cripta_bruto` | Bruto de la Cripta | bruto | cripta_bruto | cripta_bruto.glb | ✓ Correcto (GLB propio) |
| `cripta_guardian` | Guardián de la Cripta | guardián | cripta_guardian | cripta_guardian.glb | ✓ Correcto (GLB propio) |

## Cambios provisionales posibles (GLB con clips de enemigo)

La tarea JL-63 pide usar modelos propios más parecidos si ya existen en `assets/models/` con los clips de enemigo. Estos son candidatos:

| ID | Nombre | Modelo actual | Modelo propuesto | Clips del GLB |
|---|---|---|---|---|
| `baru_jaguar` | Jaguar Friolento del Barú | wolf → jaguar.glb | ✓ Integrado (JL-72) |
| `baru_elder` | Gran Jaguar del Barú | wolf → jaguar_anciano.glb | ✓ Integrado (JL-72) |
| `ash_alpha` | Tigrillo de Ceniza | wolf | `jaguar.glb` (aproximado) | idle, run, attack, hit, death ✓ |
| `boquete_owl` | Búho Chismoso | archer | `buho.glb` | idle, run, attack, hit, death ✓ |
| `fortuna_coyote` | Coyote de la Helada | wolf | `zorro.glb` (aproximado) | idle, run, attack, hit, death ✓ |

**Aplicados en JL-72:** `baru_jaguar` → `jaguar.glb`, `baru_elder` → `jaguar_anciano.glb`, `bocas_frog` → `rana_venenosa.glb`. Plantillas creadas en `data/assets.json` y entradas `enemy.*` actualizadas.

**No aplicados automáticamente:** `ash_alpha` (tigrillo → jaguar aproximado), `boquete_owl` (búho → buho.glb), `fortuna_coyote` (coyote → zorro.glb aproximado). Requieren autorización del coordinador.

## Para OMP — Lista de prioridades

Los arquetipos que más necesitan modelo propio, ordenados por lo mal que se ven hoy:

### Prioridad alta — Animal que no es animal similar

| ID | Nombre | Qué necesita |
|---|---|---|
| `darien_harpy` | Águila Harpía Real | Modelo de ave de presa con clips de enemigo (aguila_arpia.glb es montura, necesita versión enemigo) |
| `darien_tapir` | Macho de Monte Insomne | Modelo de tapir |
| `perlas_shark` | Tiburón Martillo Patrón | Modelo de tiburón |
| `perlas_squid` | Calamar Gigante Madrugador | Modelo de calamar |
| `perlas_oyster` | Ostra Mordelona | Modelo de ostra |
| (ya integrado JL-72: `bocas_frog` → rana_venenosa.glb) |
| `ancon_titi` | Mono Tití Trasnochado | Modelo de mono |

### Prioridad media — Criatura no animal con modelo animal

| ID | Nombre | Qué necesita |
|---|---|---|
| `darien_neque` | Ñeque Guerrero | Modelo de espíritu indígena |
| `bocas_jelly` | Aguamala Pegajosa | Modelo de medusa |
| `perlas_pearl` | Perla Rodante | Modelo esférico |
| `darien_mosquito` | Zancudo Tamaño Familiar | Modelo de insecto |
| `cerropunta_wisp` | Jirón de Neblina | Modelo de neblina/espíritu |
| `baru_ember` | Brasita Saltarina | Modelo de brasita/espíritu de fuego |
| `ancon_soul` | Alma en Pena de la Parada | Modelo de alma/espíritu |
| `fortuna_flake` | Copito Malcriado | Modelo de copo de nieve |
| `boquete_drizzle` | Gotita de Bajareque | Modelo de gota de lluvia |
| `chame_chitra` | Chitra Picadora | Modelo de insecto |

### Prioridad media — Ave con modelo incorrecto

| ID | Nombre | Qué necesita |
|---|---|---|
| `boquete_quetzal` | Quetzal Cascarrabias | Modelo de ave con clips de enemigo |
| `ancon_pavo` | Pavo Gritón | Modelo de ave con clips de enemigo |

### Prioridad baja — Cambios provisionales posibles con GLB existentes

| ID | Nombre | Modelo actual | Modelo GLB disponible |
|---|---|---|---|
| (ya integrado JL-72) `baru_jaguar` → jaguar.glb |
| (ya integrado JL-72) `baru_elder` → jaguar_anciano.glb |
| `ash_alpha` | Tigrillo de Ceniza | wolf | `jaguar.glb` (aproximado) |
| `boquete_owl` | Búho Chismoso | archer | `buho.glb` |
| `fortuna_coyote` | Coyote de la Helada | wolf | `zorro.glb` (aproximado) |

### Notas

- `darien_harpy` no usa la montura (Q25: la arpía real es montura y mascota). Queda para la familia de águilas de OMP-FA-21.
- `fantasma.glb` existe pero sin clips de enemigo completos: no sirve para `perlas_fisher`, `bocas_drowned` ni `cerropunta_wraith` hasta que OMP lo complete.
- `rana_*.glb` integrados en JL-72 (FA-07): `bocas_frog` ahora usa `rana_venenosa.glb`.
- `jaguar.glb` y `jaguar_anciano.glb` integrados en JL-72 (FA-05): `baru_jaguar` y `baru_elder` actualizados.
- Corrección: `darien_neque` es un roedor (agutí), no un espíritu indígena.
