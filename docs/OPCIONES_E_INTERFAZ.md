# Opciones, interfaz y enemigos: consenso FATE + DOFUS (2026-10-30)

Todo es **PROPUESTA**: la elección de cada opción y cada número los decide el creador.
Solo se tomaron *qué ajustes existen* en cada referencia. No se copiaron textos,
código ni recursos.

## De dónde sale cada opción

| Opción en el prototipo | FATE (`config.dat`) | DOFUS 3 (textos del cliente) | Decisión |
|---|---|---|---|
| Pantalla completa | `FULLSCREEN` | «Activar/Desactivar el modo pantalla completa» | Se incluye. Casilla en Opciones y `F11`, que se puede reasignar |
| Mostrar FPS | `SHOWFPS` | — | Se incluye (ya existía) |
| Límite de FPS | `VSYNC` (sincronía vertical) | Opciones de rendimiento | Se incluye: sin límite, 30, 60 o 120. Cuida el equipo |
| Volumen general, música y efectos | `MASTERVOLUME`, `MUSICVOLUME`, `SFXVOLUME` | Activar/desactivar sonido, música y sonido ambiental | Se incluyen tres barras. «Efectos» también mueve el ambiente y la interfaz |
| Tema de la interfaz | — | `UiOptionTheme`, `FigmaThemeScriptable` | Se incluyen 5 temas: Pergamino, Noche arcana, Bosque, Claro y Alto contraste |
| Letra | — | Juego de fuentes en los temas (`FigmaStylesScriptableObject`) | Se incluyen 4, todas del sistema (nada que descargar) |
| Tamaño de la interfaz | — | «Escala de la interfaz» | Se incluye, de 75 % a 150 % |
| Ventanas que se mueven y bloquearlas | — | «Bloquear la posición de todas las interfaces» | Las ventanas se arrastran por el título y recuerdan su sitio. Hay opción para bloquearlas y botón para restablecer posiciones |
| Mostrar cuadrícula | — | «Mostrar la cuadrícula en el mapa de juego» | Se incluye: la malla de movimiento alrededor del jugador, con las celdas bloqueadas en rojo. Tecla `F1` |
| Mostrar trayectoria | — | — | Propia: la línea del camino que va a seguir el personaje. Tecla `F4` |
| Sensibilidad e invertir ejes de cámara | Asignación de controles | — | Se incluye: sensibilidad, invertir horizontal y vertical, y velocidad de giro con teclas |
| Atajos de teclado | Asignación de controles | «Atajos de teclado», «Atajo ya usado» | Ya existía. Ahora incluye cámara, pantalla completa, trayectoria y cuadrícula |
| Sombras, reflejos, partículas, gamma | `SHADOWDETAIL`, `PARTICLEDETAIL`, `GAMMARAMP`… | «Calidad gráfica» | **Pendiente**: hace falta un menú de calidad gráfica (decisión del creador) |
| Sangre roja, consejos, cursor propio | `REDBLOOD`, `SHOWTIPS`, `CUSTOMCURSOR` | Ayuda contextual | Pendiente, no bloquea |
| Barras de vida, nombres, números de daño | — | «Mostrar barras de vida», «Mostrar el nombre de los jugadores» | Pendiente: hoy siempre visibles |

Evidencia (en las carpetas de ingeniería inversa, fuera de este repo):
- **FATE**
  - Claves de configuración: `FATE-ReverseEngineering/evidence/ghidra/FATE-DATA-SAVE-XREFS.md`. Son las llamadas `FUN_00401450` y `FUN_00401670` con el nombre de cada clave.
  - Resumen: `FATE-ReverseEngineering/REPORT.md`, apartado «Persistence and cache».
- **DOFUS 3**
  - Textos de las opciones: `Dofus-ReverseEngineering/out/dofus3/i18n_es.json`.
  - Nombres de las clases de opciones: `Dofus-ReverseEngineering/out/dofus3/` (`OptionTabUi`, `UiOptionTheme`, `SettingsPanel`…).
  - Temas como datos: `Dofus-ReverseEngineering/guia/GUIA_PROYECTO.md`, apartado 6.

## Cámara sin rueda de ratón (Mac con trackpad)

Hay cuatro formas de girar la cámara. Todas valen a la vez y las teclas se cambian en Atajos:
1. Rueda pulsada y arrastrar (como antes).
2. **Clic derecho y arrastrar.** En el trackpad del Mac es el clic con dos dedos.
3. **Mantener `X` y mover el cursor.** No hace falta pulsar nada más.
4. **`,` y `.`** giran a izquierda y derecha. La velocidad se ajusta en Opciones → Cámara.

El zoom sigue en la rueda, que en el trackpad es el gesto de pellizcar o el desplazamiento con dos dedos.

`C` sigue abriendo la hoja del personaje, como en DOFUS. Si prefieres `C` para la cámara, cámbiala en Atajos: las dos teclas se intercambian solas.

## Enemigos que pegan

**Por qué no pegaban.** La armadura restaba puntos fijos a cada golpe y el mínimo de daño era 1. La Vanguardia llega a unos 12 de armadura y los lobos pegaban 8–12, así que casi todos los golpes se quedaban en 1. El simulador de la nube llegó a lo mismo.

**Cambios** (números en `data/`):
- **Armadura con rendimiento decreciente.** El daño físico se multiplica por `armorHalf / (armorHalf + armadura)`. Con `armorHalf = 20` (en `data/rpg/progression.json`), 20 de armadura deja el golpe a la mitad, 12 lo deja en el 62 % y 4 en el 83 %. Acumular armadura sigue protegiendo, pero los golpes no se quedan en 1.
- **Golpes básicos +25 %:** es la propuesta «amenaza» del simulador de equilibrio, ya aplicada.
- **Hechizos propios por enemigo** (`spells` en `data/enemies.json`):
  - Cada hechizo tiene nombre, aviso en el suelo, enfriamiento, alcance mínimo y máximo, y elemento.
  - Puede dejar un estado al golpear.
  - Puede caer **a los pies del jugador**: el área queda fijada al empezar el aviso, así que moverse la esquiva.
  - El enemigo usa el primer hechizo listo y a su alcance; si no hay ninguno, su ataque básico.

| Enemigo | Hechizos |
|---|---|
| Lobo de pradera | Embestida (línea a media distancia) · Mordisco a la pata (ralentiza 2 s) |
| Hostigador goblin | Lluvia de flechas (círculo en el jugador) · Flecha de brea (ralentiza) |
| Chamán de hueso | Pulso de hueso (tierra, alrededor de sí) · Raíces de tumba (inmoviliza 1,5 s, en el jugador) · invoca diablillos |
| Diablillo de hueso | Mordisco ardiente (quemadura) |
| Lobo alfa | Aullido aterrador (aturde 0,8 s) · Zarpazo giratorio · Embestida |
| Hostigador veterano | Lluvia de flechas (más grande) · Flecha incendiaria (quemadura) |

- **Estadísticas de ataque por enemigo** (`data/rpg/enemies.json`): potencia, probabilidad y bonus de crítico.
- **Registro de combate.** Avisa de lo que va a lanzar el enemigo y dice quién te golpeó y con qué. Por ejemplo, «Lobo alfa prepara Aullido aterrador» y «Hostigador goblin · Lluvia de flechas: 12».

**Medición** (`npm run balance`, informe en `docs/EQUILIBRIO_2026-10.md`):
- Sin esquivar, la Vanguardia pierde 24,6 de vida por combate (antes 5,3) y la Tejedora 54,5 (antes 40,6).
- La Tejedora muere en el 6 % de los grupos y jefes.
- Quien esquiva el 90 % casi no pierde vida. Esquivar ya importa.
- El contenido sigue siendo fácil con habilidad media. Subir más el daño o la vida de los enemigos lo decide el creador.

## Lo que queda para el creador

1. ¿Qué tema y qué letra van por defecto? Hoy son Pergamino y Clásica.
2. ¿Quieres un menú de calidad gráfica (sombras, partículas, distancia de visión), como el de FATE?
3. ¿La cámara se gira con `X` o con `C`? Hoy `C` abre el personaje.
4. ¿Cuánto más difícil tiene que ser? El informe de equilibrio propone números, pero con habilidad media nadie muere todavía.
