# Bitácora reciente

## 2026-11-03 — Cámara conectada

R04: `src/camera/` sólo lo usaban sus tests. Ahora mandan modos, encuadres y suavidad: giro y zoom persiguen su objetivo sin saltos y el resultado no depende de los fotogramas. Las pruebas no acreditan la sensación: el creador debe probarla.

## 2026-11-03 — Compendio

R02 cerrada: ventana con criaturas, objetos y zonas sacados de los datos, con probabilidad de botín por tabla. Comprobada en el navegador. Muestra todo: el creador la pidió también para depurar.

## 2026-11-03 — Subagente local con checkpoints y benchmark de Qwen

Infraestructura, sin cambios en el juego. `scripts/local-ai/subagent.mjs` ejecuta tareas con Qwen y OMP sobre una copia aislada, guarda checkpoints, solo declara éxito con criterios ejecutados y entrega parches sin aplicarlos. Documentación, mediciones e investigación de pesos en [local-ai](local-ai/README.md). Se mantiene Q4_K_M con 128K: Q6_K no mostró ventaja (12 de 21 contra 14 de 21) y fue 16% más lento.

Resultados: `node scripts/local-ai/e2e.mjs` 20/20, incluidas interrupciones y servidor reiniciado. Tarea real sobre `src/sim/rng.ts` interrumpida y reanudada, parche no aplicado. `npm test` 754/754 antes de los cambios simultáneos de otro agente en `src/`. Sin resolver: la causa del congelamiento de OMP 18.15.0.

## 2026-11-03 — Pesca con bancos de peces

R01 cerrada: círculos visibles en el agua donde se pesca, con cargas y reaparición en otro sitio. Corregido un error real: el clic se calculaba contra el fondo del estanque, así que caía lejos de lo que se veía. El aviso de zona peligrosa saltaba a +5 niveles fijos; ahora a los 20 que pidió el creador, en `data/zones.json → dangerLevelGap` (§18.4). C04: la mochila rellena la ventana. Probado con clic real en el navegador.

## 2026-11-03 — Integridad de objetos y comparación con el cuestionario

Se compara `PREGUNTAS_CREADOR.md` con el código: lo pedido y sin fila queda en `TAREAS.md` (R01–R10). C01 y C02 cerradas con `tests/rpg/itemIntegrity.test.ts`, que reproducía los fallos antes de corregirlos: UID repetidos al cargar (equipo → mochila → banco, sin duplicar ni perder objetos, reparaciones en `Character.loadRepairs`), pilas que mezclaban tiradas y bonificaciones, y `ItemFactory.split` que perdía la bonificación. No cambia ninguna cifra de juego.

## 2026-11-02 — Consolidación documental y revisión de OMP

Base inspeccionada ac150a2. Se centraliza estado/evidencia, arquitectura y tareas; roadmap conserva prioridades de producto. Handoffs y entregas útiles archivados; prompts caducados, diagnósticos no verificados y copias fallidas retirados del árbol, recuperables en Git. Preguntas/respuestas y skills preservadas. Tres borradores Canvas 2D no seguidos respaldados fuera del repo y retirados por atribuir una DEC y render no existentes.

Entrada: 766 pruebas verdes pero TypeScript fallaba. Se recuperan las 9 pruebas de comportamiento de progresión/botín sustituidas por OMP y se elimina el archivo redundante de 6 pruebas de banco; no se cambian reglas ni cifras de juego. Pendientes reales: UID entre ubicaciones, propiedades al fusionar pilas, configInicial sin consumidor y casillas según tamaño.

Resultados: npm test 754/754 (82 archivos); npm run build correcto, incluido typecheck; docs:check 20 documentos correctos y rechaza enlace roto de prueba; balance --zones --zone-seeds 1 genera informe en work/balance. Bundle grande Vite sigue como aviso. Se corrigió un salto de línea CRLF introducido en .gitignore durante la limpieza y se repitió regresión completa: verde. Datos de juego, skills y respuestas originales preservados.

Reorganización: 51 Markdown de docs raíz → 11, 49 movimientos, 24 residuos documentales y un generador temporal retirados; agents 27 → 1. Residuos versionados recuperables en Git; borradores no seguidos respaldados fuera del repo. Ver [estado](ESTADO_ACTUAL.md).

La bitácora anterior queda conservada en [histórico](historico/BITACORA_HASTA_2026-11-02.md). No se ejecutó revisión visual Electron.
