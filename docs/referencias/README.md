# Contexto de referencia portátil

Corte: 2026-11-07. Preparado por Codex a petición expresa del creador para continuidad en Mac. Son síntesis nuevas de documentación interna; no copias de la investigación ni especificaciones aprobadas. No incluyen assets, código, pseudocódigo decompilado, tablas, fórmulas, protocolos ni textos de los juegos de referencia. No se cargan en el runtime.

- [Visión y alcance](FRANKMANGAMES.md): decisiones y contexto histórico.
- [Patrones de arquitectura](ARQUITECTURA_REFERENTES.md): lecciones generales de DOFUS y FATE.
- [Continuidad Mac](../CONTINUIDAD_MAC.md): instalación, Blender y límites de verificación.

## Procedencia de las fuentes leídas

Rutas relativas a la raíz del prototipo. SHA-256 de los bytes de la fuente al leerla; el commit identifica el repositorio y no sustituye el hash si hay cambios locales. Estas rutas son procedencia textual, no dependencias necesarias para leer este paquete en Mac. No se presupone licencia de redistribución de los juegos ni de su contenido. Los resúmenes son redacción del agente sobre notas internas del proyecto.

| Fuente | Uso | SHA-256 | HEAD de origen | Estado del archivo |
|---|---|---|---|---|
| `../FrankmanGames/04_VISION_Y_DECISIONES.md` | Decisiones | `bdcf4ce5a5c58ddb11e58d5abb3b0599a46081dc4b5e195a4440a5a1acf48191` | `sin revisión Git disponible` | sin cambios locales detectados |
| `../FrankmanGames/07_PROPUESTA_PROTOTIPO_JUGABLE.md` | Propuesta de prototipo | `5e09743f16bb90154a4e77a91a96e7a5b118b66912da7c9312f3090afeb6897d` | `sin revisión Git disponible` | sin cambios locales detectados |
| `../FrankmanGames/08_CONSOLIDADO_ANALISIS.md` | Consolidado | `fb9d5364f311f20e5d0aad091b19f66d00018f4a645e3d670928d29b8043795d` | `sin revisión Git disponible` | sin cambios locales detectados |
| `../Dofus-ReverseEngineering/guia/GUIA_PROYECTO.md` | Arquitectura de referencia | `96274542b85c4fc2bed6043fe082f96d22b5c3cbf833752b971007f34db6ad0f` | `sin revisión Git disponible` | sin cambios locales detectados |
| `../FATE-ReverseEngineering/README.md` | Mapa de investigación | `e316ca8d40923f7d5559fd60349b45deb9bb1651ea41d1336bfcaf0aeddc4b03` | `sin revisión Git disponible` | sin cambios locales detectados |
| `../FATE-ReverseEngineering/REPORT.md` | Arquitectura investigada | `716b53d97bff4a1ba6cbb725c5d1024bab05db987639850ab88b1e956eda773b` | `sin revisión Git disponible` | sin cambios locales detectados |

## Jerarquía y divergencias

AGENTS, respuestas vigentes del creador y documentación mantenida del prototipo gobiernan el trabajo. Las fuentes de octubre describen un experimento anterior: no sustituyen el estado de noviembre. El consolidado aún presenta el fallo aleatorio como abierto, pero DEC-2026-005 ya lo cierra. La guía DOFUS contiene recomendaciones 2D y considera inviable la previa en tiempo real; el proyecto actual es 3D y ya implementa previsualización. No convertir esos pasajes en requisitos ni restaurar pendientes resueltos.

Para actualizar: releer solo las fuentes pertinentes, revisar su autoridad, reescribir la síntesis y recalcular hashes. No sincronizar carpetas out, evidence, fichas completas ni referencias visuales.
