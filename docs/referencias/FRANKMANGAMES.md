# Visión y alcance para continuar

Síntesis propia de las tres fuentes FrankmanGames registradas en [procedencia](README.md), consultadas el 2026-11-07.

## Decisiones canónicas del corte 2026-10-28

- DEC-2026-001: combate en tiempo real.
- DEC-2026-002: desplazamiento continuo por zonas, cámara que acompaña al personaje.
- DEC-2026-003: movimiento y ataque mediante clic.
- DEC-2026-004: lanzar exige recurso disponible y enfriamiento terminado.
- DEC-2026-005: el azar puede variar el resultado, pero no provocar un fallo aleatorio; alcance, puntería y posición determinan la ejecución.

No fijan fórmulas, costes, clases, motor ni alcance multijugador. Solo el creador puede aprobar decisiones. El destino Windows y la evaluación Electron/TypeScript/Babylon son instrucciones posteriores presentes en AGENTS. Preparar Mac permite continuar el desarrollo; no declara una nueva plataforma comercial aprobada.

## Hipótesis del prototipo histórico

La propuesta de octubre busca que la intención de los enemigos sea legible y que los objetos cambien decisiones de build. Propone una sesión corta y repetible con combate, conductas diferenciadas, habilidades y equipamiento. Los criterios útiles son reconocer enemigos por conducta, responder manualmente a ataques anunciados, encontrar elecciones situacionales y repetir la sesión sin reiniciar el editor.

Sus cantidades y exclusiones pertenecen a aquella propuesta. El código de noviembre ya contiene más sistemas; revisar ESTADO_ACTUAL y TAREAS antes de implementar. Un test aprobado no valida balance ni diversión.

## Continuidad de implementación

Mantener datos originales separados de presentación, simulación a paso fijo y pruebas de lógica sin DOM ni Babylon. Registrar procedencia antes de incorporar arte/audio. Conservar como propuestas las cifras y diseños sin aprobación explícita. Cooperativo, persistencia online y cambio de motor no se deducen de las referencias.

El consolidado sugiere combinar legibilidad de acción con profundidad de habilidades y equipo. La traducción debe usar nombres, contenido y parámetros propios. La investigación deja de ser necesaria cuando una prueba original ya puede resolver la duda.
