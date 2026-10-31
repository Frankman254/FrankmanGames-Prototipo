# Hoja de ruta — FrankmanGames

**Biblia del proyecto:** `docs/FrankmanGames_Vision_Creador_Pulida_v0.4.md`.
- Las respuestas literales del creador están en `docs/FrankmanGames_Respuestas_Originales_Intactas.md` y en el Anexo A de la visión.
- Si algo choca, manda la palabra del creador.
- Las secciones «Laboratorio de propuestas» **no** están aprobadas. Se implementan como experimentos conmutables y marcados (`EXPERIMENTO` / `PROPUESTA`), nunca como reglas fijas.

**Reglas para todo agente:**
- No copiar nombres, reglas ni assets de DOFUS o FATE.
- Todo número va en `data/` y se marca como PROPUESTA.
- La lógica de combate y progreso es independiente del render, porque habrá un servidor autoritativo.
- Assets de terceros solo con licencia verificable y registrados en `PROCEDENCIA.md`.
- Cada rama entrega su handoff y una entrada en `docs/BITACORA.md`, y la une el orquestador tras revisarla.

Orden de prioridad del creador (§17): **1) gráficos, 2) mapa y minimapa, 3) zonas y criaturas por nivel, 4) mazmorra con jefe, 5) interfaz, 6) historia, 7) oficios, 8) más clases**.

## Estado frente a la biblia (2026-10-31, `master` b0341a9)

| § | Exigencia | Estado | Siguiente paso |
|---|---|---|---|
| 1 | Online y cooperativo | Diseño y PoC en `docs/ARQUITECTURA_ONLINE.md` y `server/` | Primer hito: dos clientes que se ven moverse (fase posterior) |
| 2 | Mundo continuo con carga progresiva y transportes | Una zona de 256 × 256 m con franjas, clima, día y noche | **Plan geográfico** y prototipo de streaming por sectores |
| 2 | Mazmorra por región, con llave, pisos y jefe; nada al azar obligatorio | Cripta con llave, 3 pisos generados y guardián | **Pisos diseñados a mano, laberintos y jefe con fases** |
| 3 | Minimapa y mapa con niebla, capas, marcas y brújula; coordenadas 32 × 32 m | Hecho, con coordenadas de 16 m | Celdas de 32 m con altura y nomenclatura propia |
| 4 | HUD movible con perfiles, tamaño automático, críticos legibles, estimación de daño | Hecho, en su mayoría | Temas «finales y propios», fuentes futurista y pixel, modos Exploración/Encuentro |
| 5 | Gráficos por preajustes y avanzados; opciones; confirmaciones; idiomas | Gráficos y confirmaciones hechos | Español/inglés (i18n), diagnóstico de CPU/GPU, FPS de menú aparte |
| 6 | Cámara suave, encuadres por tecla, retorno, enfoque automático, cámara inteligente y por zonas | Solo giro y zoom | **Rehacer la cámara** |
| 7 | Combate táctico: equivalentes a PA/PM, sinergias, geometrías nuevas, defensas, sin armadura | Defensas, trampas, controles y resistencias hechos | **Laboratorio con 3 sistemas** (cadencia, ímpetu, posicionamiento), **sinergias y reacciones**, nuevas geometrías |
| 7/18 | Muerte: energía, fantasma y resucitador | Pulso y reaparición en piedra | Estado espectral y resucitador |
| 8 | 7 clases tras definir la ambientación; repertorio comprable; trampas | Diseño propuesto (`DISENO_ELEMENTOS_CLASES.md`), progresión por nivel | Esperar la ambientación del creador |
| 9 | Atributos propios, reinicio, curva lenta, algo tras el máximo | Reinicio hecho | Curva lenta y atributo de «hallazgo/sabiduría» |
| 10 | Huecos de equipo (botas por pie como experimento), drop directo, objetos dorados x2 como prueba, peso, banco y cofre | Dos armas, iconos, 40 objetos y sets | Peso, banco 3D dorado, objetos dorados experimentales, botas por pie |
| 11 | Oficios: leñador, pescador, campesino, minero, «forjatodo», «confeccionatodo»; minijuego opcional; pesca con bancos de peces | Solo pesca (con fallos) | Prioridad 7 |
| 12 | Mascotas híbridas, combos geométricos, monturas que vuelan | Mascotas básicas | Posterior |
| 13 | Moneda propia («bibuyo», por validar), mercado con el más barato primero | Monedas genéricas | Posterior |
| 14 | Historia panameña, cadenas largas, diarias, compendio | Misiones de prueba | Prioridad 6 |
| 15 | Familias por región, jefes con fases, raros con pistas, conductas (huir, pedir ayuda) | Familias por franja | Conductas y raros |
| 16 | **Modelos y animaciones libres (CC0) aprobados para probar**, texturas mejores, música por zona, voces con IA (investigar) | Todo procedural | **Descargar CC0 con procedencia y mejorar texturas** (prioridad 1) |
| 17 | Windows, macOS y Linux | Windows probado | Builds de macOS y Linux |
| 18 | Viaje con coste por distancia y elección de reaparición; aviso de peligro a +20 niveles configurable; colisión ajustada; editor solo para el creador; mazmorras finitas y configurables | Piedras, aviso a +5, editor F12 y colisión ajustada | Coste, elección de punto, umbral de 20 en datos |

## Ronda actual (agentes en la nube)

1. `graficos-arte`: modelos y animaciones CC0, texturas, agua, vegetación, edificios, banco dorado.
2. `camara-v2`: suavizado, encuadres, enfoque automático, cámara inteligente y por zonas.
3. `combate-laboratorio`: 3 sistemas equivalentes a PA/PM, sinergias y reacciones, nuevas geometrías y sala de pruebas con métricas.
4. `viaje-muerte`: coste por distancia, elección de reaparición, fantasma y resucitador, umbral de peligro en datos, celdas de 32 m y plan geográfico.
5. `mazmorra-jefe`: pisos diseñados a mano, laberintos y mecánicas, jefe con fases.
