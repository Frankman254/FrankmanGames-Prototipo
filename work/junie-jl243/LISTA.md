# JL-243: `as any` y `as unknown as` en src/sim/, src/world/, src/rpg/

## Resueltos (5 casos eliminados)

| Archivo | Línea | Antes | Después | Motivo |
|---|---|---|---|---|
| `src/sim/world.ts` | 1272 | `(ch as any).level` | `ch.level` | `ch` ya es `Character` con `level` |
| `src/rpg/effects.ts` | 100 | `(ctx.caster as any).level` | `ctx.caster.level` | `Actor` ahora tiene `level` |
| `src/rpg/effects.ts` | 127 | `(ctx.caster as any).level` | `ctx.caster.level` | idem |
| `src/rpg/effects.ts` | 180 | `(ctx.caster as any).level` | `ctx.caster.level` | idem |
| `src/rpg/effects.ts` | 511 | `(ctx.caster as any).level` | `ctx.caster.level` | idem |
| `src/rpg/effects.ts` | 468 | `stat as any` | `stat as StatId` | `StatId` existe en contracts |
| `src/rpg/effects.ts` | 523 | `stat as any` | `stat as StatId` | idem |
| `src/rpg/content.ts` | 1630 | `{ val: v } as any` | `{ val: v }` | `Record<string, unknown>` acepta `{val: number}` |

## Cambios de tipo

- `src/rpg/actor.ts`: añadido `level = 1` a `Actor` (Pet usa 1, Character y EnemyActor lo sobrescriben)
- `src/rpg/character.ts`: `level` → `override level`
- `src/rpg/enemy.ts`: `level` → `override readonly level`
- `src/rpg/effects.ts`: importado `StatId` de contracts

## No resolubles (4 casos, legítimos)

| Archivo | Línea | Motivo |
|---|---|---|
| `src/world/barriada.ts` | 26 | Vite no tipa imports JSON automáticamente |
| `src/world/dungeon.ts` | 161 | Vite no tipa imports JSON automáticamente |
| `src/world/pageWorker.ts` | 12 | `self` en WebWorker no tiene `postMessage` tipado |
| `src/rpg/appearance.ts` | 50 | Vite no tipa imports JSON automáticamente |

## Validación

- `npx tsc --noEmit`: limpio (solo errores pre-existentes de balM3.ts ajeno)
- `npx vitest run`: 4830/4830 en verde
