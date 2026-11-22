# JL-138: Contraste de los temas viento y claro

## Problema
El escenario Electron `contraste` fallaba en los temas `viento` y `claro`:
- Viento: H2 "Personaje" y "Mochila y equipo" con ratio 2.2:1 (necesita 4.5:1)
- Claro: mismos H2 con ratio 2.7:1

## Causa
Los temas `viento` y `claro` no definían `--band` ni `--band-ink`. Usaban el default:
- `--band: color-mix(in srgb, var(--gold) 34%, var(--paper-0))` → fondo claro
- `--band-ink: #ffffff` → texto blanco

Texto blanco sobre fondo claro = contraste muy bajo.

## Solución
Agregar `--band` y `--band-ink` explícitos en `src/ui/styles/themes.css`:

| Tema | --band | --band-ink | Ratio |
|------|--------|------------|-------|
| viento | #0f3d6b (azul oscuro) | #e8f0f8 (casi blanco) | 9.6:1 |
| claro | #5a3e14 (marrón oscuro) | #f0e6d0 (beige claro) | 7.9:1 |

## Validación
- Escenario `contraste`: 8/8 checks en verde (los 8 temas pasan)
- `jl30_contrast.test.ts`: 11/11 pruebas verdes
- Typecheck limpio (solo balM3.ts ajeno)
- El único fallo del escenario es `postProcessManager` de Babylon (pre-existente, JL-137)
