# PROPUESTA — Ranas de Coclá (FA-07)

**Fecha:** 2026-11-21
**Estado:** PROPUESTA — espera aprobación del creador antes de entrar en `data/`.
**Origen:** OMP-FA-07 (`f972583`) entrega 4 GLB: `rana_venenosa.glb`, `rana_ojirroja.glb`, `sapo_canaveral.glb`, `rana_dorada.glb`.

## Contexto

La zona de Coclá (Archipiélago de Bocas del Toro, franja 65–80) tiene hoy un solo arquetipo de rana: `bocas_frog` (Rana Dorada Venenosa, nivel 65). FA-07 entrega 4 modelos propios para ampliar la familia.

## Arquetipos propuestos

| Id | Nombre | Nivel | Base | Vida | Daño | Zona | Botín | Notas |
|---|---|---|---|---|---|---|---|---|
| `cocle_frog_poison` | Rana Venenosa de Coclá | 70 | melee | 480 | 38–44 | cocla | veneno (consumible) | Usa `rana_venenosa.glb`, template `rana` |
| `cocle_frog_redeye` | Rana Ojirroja de Coclá | 75 | melee | 520 | 42–50 | cocla | — | Usa `rana_ojirroja.glb`, template `rana_ojirroja` |
| `cocle_toad` | Sapo del Cañaveral | 80 | melee | 600 | 48–56 | cocla | — | Usa `sapo_canaveral.glb`, template `sapo` |
| `cocle_goldenfrog` | **Rana Dorada de Coclá** (jefa) | 85 | alpha_wolf | 2400 | 80–100 | cocla | diadema de oro (item especial) | Usa `rana_dorada.glb`, template `rana_dorada`, k=2.0 |

## Cifras

Todas las cifras son **PROPUESTA**. Se extrapolan de `bocas_frog` (nivel 65, vida 420, daño 34–40) con la misma progresión que usan los arquetipos vecinos de la zona (baru_jaguar nivel 45 → baru_elder nivel 48).

## Integración en datos (cuando el creador apruebe)

1. Añadir los 4 arquetipos a `data/rpg/enemies.json` (nombres, nivel, stats, i18n en inglés).
2. Añadir las entradas visuales a `data/enemies.json` (base, scale, palettes, resist).
3. Registrar en `data/assets.json`:
   - Las plantillas ya están (JL-72): `rana`, `rana_ojirroja`, `sapo`, `rana_dorada`.
   - Las entradas `enemy.cocle_*` con su template y palettes.
4. Añadir spawns en `data/zones.json` (cocla) o en `data/dungeon.json` si hay piso dedicado.
5. Traducciones en `data/i18n/en.content.json`.

## Lo que ya está hecho

- ✅ 6 plantillas en `data/assets.json` (jaguar, jaguar_anciano, rana, rana_ojirroja, sapo, rana_dorada).
- ✅ `bocas_frog` migrado de wolf → template `rana`.
- ✅ `baru_jaguar` migrado de wolf → template `jaguar`.
- ✅ `baru_elder` migrado de wolf → template `jaguar_anciano`.
- ❌ Los 4 arquetipos nuevos de Coclá **no** están en `data/` hasta que el creador apruebe las cifras.
