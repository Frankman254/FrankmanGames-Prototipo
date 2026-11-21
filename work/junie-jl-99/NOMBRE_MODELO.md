# Auditoría: Nombre vs. Modelo de criaturas

Generado: 2026-11-21T20:41:56.158Z por scripts/audit/nombreModelo.ts
Fuentes: data/rpg/enemies.json (nombres), data/assets.json (plantillas y modelos)

## Resumen

- **78 arquetipos** en total.
- **6 discordancias altas**: nombre y modelo son completamente distintos.
- **7 discordancias medias**: nombre y modelo no coinciden pero son cercanos.
- **6 discordancias bajas**: aceptable pero mejorable.
- **59 correctos**: nombre y modelo coinciden o son similares.

### Uso de templates genéricos

| Template | Cantidad |
|---|---|
| personaje | 13 |
| arquero | 12 |
| chaman | 11 |
| diablillo | 10 |
| bestia | 7 |

## Discordancias (ordenadas por gravedad)

### ALTA — 6

| ID | Nombre | Template | Modelo | Problema |
|---|---|---|---|---|
| `ancon_titi` | Mono Tití Trasnochado | bestia | assets/models/bestia.glb | Animal ≠ bestia genérica |
| `bocas_pirate` | Pirata de Isla Colón | arquero | assets/models/arquero.glb | Animal ≠ humanoide |
| `bocas_siren` | Sirena Desafinada | chaman | assets/models/chaman.glb | Animal ≠ humanoide |
| `perlas_oyster` | Ostra Mordelona | bestia | assets/models/bestia.glb | Animal ≠ bestia genérica |
| `perlas_shark` | Tiburón Martillo Patrón | bestia | assets/models/bestia.glb | Animal ≠ bestia genérica |
| `perlas_squid` | Calamar Gigante Madrugador | bestia | assets/models/bestia.glb | Animal ≠ bestia genérica |

### MEDIA — 7

| ID | Nombre | Template | Modelo | Problema |
|---|---|---|---|---|
| `ancon_pavo` | Pavo Gritón | arquero | assets/models/arquero.glb | Ave ≠ humanoide |
| `boquete_quetzal` | Quetzal Cascarrabias | arquero | assets/models/arquero.glb | Ave ≠ humanoide |
| `chame_chitra` | Chitra Picadora | diablillo | assets/models/diablillo.glb | Animal ≠ diablillo |
| `darien_mosquito` | Zancudo Tamaño Familiar | diablillo | assets/models/diablillo.glb | Animal ≠ diablillo |
| `fortuna_gale` | Ventarrón Andante | personaje | assets/models/personaje.glb | No humanoide en personaje |
| `minion` | Diablico Sucio | diablillo | assets/models/diablillo.glb | No diablillo |
| `perlas_pearl` | Perla Rodante | diablillo | assets/models/diablillo.glb | Esfera ≠ diablillo |

### BAJA — 6

| ID | Nombre | Template | Modelo | Problema |
|---|---|---|---|---|
| `ancon_soul` | Alma en Pena de la Parada | diablillo | assets/models/diablillo.glb | Espíritu ≈ diablillo |
| `baru_ember` | Brasita Saltarina | diablillo | assets/models/diablillo.glb | Espíritu ≈ diablillo |
| `cerropunta_wisp` | Jirón de Neblina | diablillo | assets/models/diablillo.glb | Espíritu ≈ diablillo |
| `cerropunta_wraith` | Espanto de la Neblina | personaje | assets/models/personaje.glb | Espíritu ≈ humanoide |
| `fortuna_flake` | Copito Malcriado | diablillo | assets/models/diablillo.glb | Espíritu ≈ diablillo |
| `perlas_fisher` | Pescador Fantasma de las Perlas | arquero | assets/models/arquero.glb | Espíritu ≈ humanoide |

## Correctos (59)

| ID | Nombre | Template | Modelo |
|---|---|---|---|
| `alpha_wolf` | Sato Jefe de la Jauría | bestia | assets/models/bestia.glb |
| `ancon_bus` | Diablo Rojo Desbocado | personaje | assets/models/personaje.glb |
| `ancon_driver` | El Chofer Sin Frenos | personaje | assets/models/personaje.glb |
| `ancon_tulivieja` | Tulivieja Mayor | chaman | assets/models/chaman.glb |
| `ash_alpha` | Tigrillo de Ceniza | jaguar | assets/models/jaguar.glb |
| `baru_elder` | Gran Jaguar del Barú | jaguar_anciano | assets/models/jaguar_anciano.glb |
| `baru_jaguar` | Jaguar Friolento del Barú | jaguar | assets/models/jaguar.glb |
| `baru_lookout` | Vigía del Cráter | arquero | assets/models/arquero.glb |
| `baru_sorcerer` | Hechicero del Volcán | chaman | assets/models/chaman.glb |
| `baru_yeti` | Abominable Turista del Barú | personaje | assets/models/personaje.glb |
| `bocas_captain` | Capitán Calipso | personaje | assets/models/personaje.glb |
| `bocas_drowned` | Marinero Ahogado | personaje | assets/models/personaje.glb |
| `bocas_frog` | Rana Dorada Venenosa | rana | assets/models/rana_venenosa.glb |
| `bocas_jelly` | Aguamala Pegajosa | diablillo | assets/models/diablillo.glb |
| `boquete_drizzle` | Gotita de Bajareque | diablillo | assets/models/diablillo.glb |
| `boquete_foreman` | Capataz del Cafetal | personaje | assets/models/personaje.glb |
| `boquete_owl` | Búho Chismoso | buho | assets/models/buho.glb |
| `boquete_picker` | Recolector de Café Rabioso | personaje | assets/models/personaje.glb |
| `boquete_witch` | Bruja del Bajareque | chaman | assets/models/chaman.glb |
| `cerropunta_boar` | Saíno Mayor de la Fría | jabali | assets/models/jabali.glb |
| `cerropunta_farmer` | Fresero Francotirador | arquero | assets/models/arquero.glb |
| `cerropunta_peccary` | Saíno Escarchado | pecari | assets/models/pecari.glb |
| `cerropunta_shaman` | Chamán de la Neblina | chaman | assets/models/chaman.glb |
| `chame_caiman` | Caimán Trasnochador | caiman | assets/models/caiman.glb |
| `chame_crab` | Cangrejo Machetero | cangrejo | assets/models/cangrejo.glb |
| `chame_grandcrab` | Cangrejo Abuelo | cangrejo | assets/models/cangrejo.glb |
| `chame_heron` | Garza Flechera | garza | assets/models/garza.glb |
| `chame_witch` | Brujo del Manglar | chaman | assets/models/chaman.glb |
| `cripta_bruto` | Bruto de la Cripta | cripta_bruto | assets/models/cripta_bruto.glb |
| `cripta_bruto_cueva` | cripta_bruto_cueva | cripta_bruto_cueva | assets/models/cripta_bruto_cueva.glb |
| `cripta_bruto_huaca` | cripta_bruto_huaca | cripta_bruto_huaca | assets/models/cripta_bruto_huaca.glb |
| `cripta_guardian` | Guardián de la Cripta | cripta_guardian | assets/models/cripta_guardian.glb |
| `cripta_guardian_cueva` | cripta_guardian_cueva | cripta_guardian_cueva | assets/models/cripta_guardian_cueva.glb |
| `cripta_guardian_huaca` | cripta_guardian_huaca | cripta_guardian_huaca | assets/models/cripta_guardian_huaca.glb |
| `cripta_rata` | Ratón de la Cripta | cripta_rata | assets/models/cripta_rata.glb |
| `cripta_rata_cueva` | cripta_rata_cueva | cripta_rata_cueva | assets/models/cripta_rata_cueva.glb |
| `cripta_rata_huaca` | cripta_rata_huaca | cripta_rata_huaca | assets/models/cripta_rata_huaca.glb |
| `crypt_warden` | El Sacristán Sin Cabeza | personaje | assets/models/personaje.glb |
| `darien_blowgun` | Cerbatanero del Tapón | arquero | assets/models/arquero.glb |
| `darien_harpy` | Águila Harpía Real | aguila_arpia | assets/models/aguila_arpia.glb |
| `darien_neque` | Ñeque Guerrero | neque | assets/models/neque.glb |
| `darien_tapir` | Macho de Monte Insomne | tapir | assets/models/tapir.glb |
| `darien_witch` | Brujo del Tapón | chaman | assets/models/chaman.glb |
| `espejo_bailarin` | Bailarín del Diablo Espejo | personaje | assets/models/personaje.glb |
| `espejo_cascabelero` | Cascabelero del Diablo Espejo | arquero | assets/models/arquero.glb |
| `espejo_llamador` | Llamador de la Ronda | chaman | assets/models/chaman.glb |
| `fortuna_archer` | Arquero de la Ventisca | arquero | assets/models/arquero.glb |
| `fortuna_coyote` | Coyote de la Helada | zorro | assets/models/zorro.glb |
| `fortuna_shaman` | Brujo Escarchado de Fortuna | chaman | assets/models/chaman.glb |
| `fortuna_titan` | Coloso del Embalse | personaje | assets/models/personaje.glb |
| `goblin_veteran` | Duende Tirapiedras Veterano | arquero | assets/models/arquero.glb |
| `grave_brute` | Matón de la Tulivieja | personaje | assets/models/personaje.glb |
| `la_espeja` | La Diablica Espejo | espejo | assets/models/diablica_espejo.glb |
| `melee` | Sato Cimarrón | bestia | assets/models/bestia.glb |
| `night_sato` | Sato Aullador de Medianoche | bestia | assets/models/bestia.glb |
| `perlas_witch` | Bruja de las Perlas | chaman | assets/models/chaman.glb |
| `ranged` | Duende Tirapiedras | arquero | assets/models/arquero.glb |
| `summoner` | Curandero de Huesos | chaman | assets/models/chaman.glb |
| `trapper` | Trampero del Matorral | arquero | assets/models/arquero.glb |

