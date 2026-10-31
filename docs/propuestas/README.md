# Borradores de datos — elementos y clases

**PROPUESTA. No se cargan en el juego.** Acompañan a
`docs/DISENO_ELEMENTOS_CLASES.md` para que un agente pueda implementarlos en
cuanto el creador responda las preguntas de su §9.

| Archivo | Destino al implementar | Contenido |
|---|---|---|
| `elementos.json` | `src/rpg/contracts.ts`, `data/rpg/progression.json` | 6 elementos, 7 reacciones, clima, 8 estadísticas primarias, fórmulas, curva de XP y alias de migración. |
| `classes.json` | `data/rpg/classes.json` | Las 7 clases, con recurso propio y kit de nivel 1. |
| `spells.json` | `data/rpg/spells.json` | 56 hechizos de clase (8 por clase, 3 en nivel 1). |
| `statuses.json` | `data/rpg/statuses.json` | Estados que usan esos hechizos. |

Mismo formato que `data/rpg/*.json`, con dos diferencias:

- usan los ids nuevos de elemento (`neque`, `bochorno`, `sereno`, `saloma`,
  `bejuco`, `vaiven`) y de estadística (`fibra`, `temple`, `calma`, `pulmon`,
  `arraigo`, `tino`, `aguante`, `malicia`);
- los efectos y campos marcados `"_nuevo"` todavía no existen en
  `EffectDef`/`StatusDef` (lista en el §8 del documento de diseño).

Las cifras son puntos de partida para `npm run balance`, no valores calibrados.
