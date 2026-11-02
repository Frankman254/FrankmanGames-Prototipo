# Integración y limpieza de ramas — 2026-11-02

Petición del creador: integrar entregas verificadas en master y no dejar ramas
de trabajo abandonadas. La regla queda incorporada en AGENTS.md.

## Resultado

- Master local actualizado por fast-forward desde 2c3387c a f6c43e5.
- Merge real 0d684cd: integra cbb9fcc (informe OMP) y 786a49f
  (auditoría, correcciones y protocolo de agentes).
- Merge publicado en origin/master.
- Eliminadas 20 ramas locales y 42 remotas; quedan master y origin/master.
  origin/HEAD es un alias simbólico, no otra rama de trabajo.
- Ocho worktrees antiguos de Claude se dejaron en HEAD separado, sin borrar
  carpetas ni modificar sus archivos; antes se comprobó que estaban limpios y
  que sus commits ya pertenecían a master.
- El worktree separado de OMP ya estaba en HEAD separado; no se modificó.

## Excepción archivada de forma explícita

slice04-audio, c3eaa05, era la única rama histórica con un commit exclusivo:
una migración de versiones mayores de Electron, electron-builder, esbuild,
Vite y Vitest, junto a una configuración local de arranque. No contiene
implementación de audio pendiente. Su diff no se aplicó ni se fingió un merge.

Se preservó el commit mediante la etiqueta anotada y publicada
archive/2026-11-02/slice04-toolchain-propuesta. Después se eliminaron las ramas
local y remota de esa propuesta. La migración de herramientas sigue sin adoptar;
se puede retomar desde esa etiqueta con pruebas y revisión específicas.
El código de audio incorporado anteriormente permanece en master.

## Protección y verificación

- Respaldo completo verificado, con historia y referencias anteriores:
  work/branch-cleanup/2026-11-02/antes.bundle.
- Inventario original, plan y resultado JSON en esa misma carpeta, ignorada por Git
  para no publicar el respaldo binario dentro del repositorio.
- Cada rama eliminada se comprobó por ancestro contra master, salvo la propuesta
  archivada indicada arriba.
- Borrado remoto atómico con comprobación del SHA esperado de cada referencia:
  si alguna rama hubiese avanzado, la operación debía rechazarse.
  No se reescribió historia de master.
- El árbol del merge 0d684cd coincide exactamente con 786a49f, verificado con
  git diff --exit-code 786a49f 0d684cd. Es el código que pasó 689/689 pruebas,
  typecheck y build en la ronda anterior; no se repitió la batería por un merge
  sin cambios de contenido. Esta limpieza solo añade documentación y reglas.
- Se regeneró el índice de commits después de detectar un aviso de archivos de
  commit-graph ausentes; las consultas posteriores ya no muestran el aviso.

## Recuperación

Para consultar la propuesta de herramientas, usar la etiqueta archive/2026-11-02/
slice04-toolchain-propuesta (una sola etiqueta, sin salto de línea).
El respaldo local permite recuperar las referencias anteriores sin recrearlas
ahora. Los commits incorporados siguen accesibles desde la historia de master.

## Flujo siguiente

Cada agente entrega su diff y pruebas. El coordinador revisa, integra en master,
publica y elimina la rama de entrega. Una propuesta descartada se documenta y
archiva; no se fusiona código sin revisar solo para vaciar la lista de ramas.

## Segunda limpieza: espacios que seguían apareciendo en Cursor

A petición del creador se retiraron también los ocho worktrees obsoletos de
.claude/worktrees mediante git worktree remove:

- arquitectura-online-7bdd9c
- combate-v2-e3be70
- mapa-hud-753fd4
- mazmorras-f10e93
- modo-edicion-717950
- muerte-botin-c5e2d6
- mundo-clima-44deea
- opciones-temas-fc7730

Se comprobaron de nuevo sus commits como ancestros de master, ausencia de cambios
pendientes y que los únicos archivos ignorados pertenecían a node_modules, dist
y dist-electron. No se utilizó borrado forzado de worktrees. Las rutas absolutas
se verificaron dentro del directorio .claude/worktrees del checkout principal.
Git retiró las carpetas y sus registros, para evitar entradas antiguas en el editor.
No había archivos de esos worktrees seguidos por Git ni publicados en GitHub;
se trataba de copias locales excluidas en .git/info/exclude.

Se conservó el worktree separado FrankmanGames-Prototipo-worktree-audit-espectral:
la captura del creador mostraba trabajo de OMP en curso allí. No se inspeccionaron
ni descartaron sus modificaciones. .claude/launch.json también se conserva:
es configuración de arranque seguida por Git, no un espacio de agente.

El listado detallado de rutas/commits retirados está en
work/branch-cleanup/2026-11-02/worktrees-retirados.json.
Si Cursor mantiene alguna entrada en caché, actualizar el panel de control de
código fuente o recargar su ventana; no hay que borrar más código para ocultarla.
