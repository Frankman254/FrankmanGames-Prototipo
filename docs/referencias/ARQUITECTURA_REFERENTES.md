# Patrones de arquitectura de los referentes

Síntesis nueva de la guía DOFUS y README/REPORT de FATE, identificados por hash en [procedencia](README.md). Describe ideas generales; no traslada implementaciones, datos ni fórmulas.

## DOFUS: responsabilidades y presentación

La guía distingue resolución de reglas y reproducción visual de resultados. Para este proyecto interesa mantener un núcleo de simulación independiente y vistas que consuman su estado y eventos. Una previsualización debe compartir reglas con la resolución para evitar discrepancias; en tiempo real refleja solo el instante consultado.

Otros patrones útiles: definiciones de habilidades y efectos en datos propios; interfaces alimentadas por vistas de estado; tokens visuales comunes; equipo visual unido a puntos estables del rig; sonidos disparados por eventos; catálogo de recursos y carga según necesidad. Son opciones de arquitectura, no una autorización para copiar esquemas o contenido.

La traducción a mundo continuo requiere separar navegación y colisión de la decoración, controlar visibilidad y medir transiciones. Las recomendaciones de streaming de la guía son propuestas: el estado actual solo acredita selección de sectores. La guía mezcla un pipeline 2D histórico con recomendaciones 3D posteriores; para continuar aquí se usan modelos GLB y clips, no el pipeline del referente.

## FATE: datos y bucle de acción

README y REPORT describen una investigación estática de un ejecutable Windows, con contenido definido por datos, instancias de objetos, navegación/combate y eventos temporales de animación. La lección general es separar definiciones e instancias, lógica y representación, contenido y parámetros. Los detalles internos observados no se necesitan para instalar el prototipo ni para producir contenido original.

El análisis también distingue caché regenerable y estado persistente. En Mac conviene reinstalar herramientas y dependencias para su arquitectura, y transferir solo los editables y guardados propios que se necesiten, sin asumir compatibilidad de formatos del referente.

No se trasladan sus formatos binarios, cargadores, herramientas de extracción, símbolos, tablas de objetos, coeficientes, nombres de contenido ni partidas. No hace falta instalar ninguno de los juegos de referencia para continuar FrankmanGames.

## Aplicación al repositorio actual

Consultar docs/ARQUITECTURA.md para responsabilidades reales: electron abre la ventana; src/main.ts compone; src/sim y src/rpg resuelven; src/render representa; src/ui presenta menús; data contiene contenido propio; scripts/blender produce modelos. Los referentes justifican preguntas y experimentos, no cambios automáticos en esas fronteras.
