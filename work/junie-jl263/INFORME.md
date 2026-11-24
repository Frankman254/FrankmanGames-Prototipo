# JL-263: VIS-02 — Repaso de los efectos de los hechizos

## Diagnóstico

De 108 hechizos en `data/rpg/spells.json`, solo 9 tenían perfil visual en `data/spell-fx.json`. Los otros 99 usaban el fallback genérico de `SpellFx` (una esfera y partículas del color del elemento), sin diferencia de forma entre hechizos del mismo elemento.

### Perfiles existentes (9)
- ember_whirl (fire/círculo self)
- searing_mark (fire/proyectil)
- glacial_lance (frost/línea)
- frost_nova (frost/círculo self)
- gust (air/cono)
- vertigo_whistle (air/proyectil)
- spark (lightning/proyectil)
- piercing_shot (water/línea)
- light_bandage (earth/self curación)

### Cobertura por elemento
| Elemento | Total | Con perfil | Sin perfil |
|----------|-------|------------|------------|
| earth    | 23    | 1          | 22         |
| fire     | 16    | 2          | 14         |
| lightning| 19    | 1          | 18         |
| frost    | 17    | 2          | 15         |
| air      | 18    | 2          | 16         |
| water    | 15    | 1          | 14         |

## Perfiles añadidos (10)

Criterio: hechizos de nivel bajo (1–5), uno icónico por elemento sin representación y con área distintiva.

| ID | Elemento | Área | Forma visual |
|----|----------|------|--------------|
| charge | earth | línea (embestida) | Cono de polvo + partículas de tierra |
| iron_shout | earth | self (buff) | Aura dorada + anillo expansivo |
| storm_focus | lightning | self (buff) | Chispas estáticas + aura eléctrica |
| hunter_arrow | air | single (proyectil) | Proyectil aerodinámico con estela |
| powder_arrow | fire | círculo (atTarget) | Explosión con anillo de fuego + decal |
| leaden_gale | frost | cono | Cono de escarcha + cristales + decal |
| lightning_step | lightning | círculo (atTarget) | Anillo eléctrico + partículas ascendentes |
| reed_cross | earth | cross (proyectil) | Proyectil cilíndrico con estela terrosa |
| gale_star | air | star (proyectil) | Proyectil con remolino + slash lines |
| rime_shard | frost | single (proyectil) | Lanza de hielo con fragmentos |

## Verificación

- `npx tsc --noEmit`: limpio.
- `npx vitest run`: 4878/4878 en verde (suite completa).
- `tests/spellProfile.test.ts`: 8/8 pruebas verdes (actualizado conteo de 9 a 19 perfiles).
- Capturas de Electron omitidas (sin display disponible).

## Qué falta

- 89 hechizos siguen sin perfil (usan fallback genérico).
- Capturas visuales en Electron para comparar antes/después (pendiente de display).
