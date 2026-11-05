# Prueba rápida del juego

`scripts/qaElectron.mjs` juega solo en la ventana real de Electron, con clics y teclas de verdad. Un recorrido completo tarda unos 3 minutos. Sirve para comprobar que algo funciona antes de que una persona lo juegue.

```bash
npm run qa:electron
```

Para repetir solo una parte, nombra los escenarios:

```bash
node scripts/qaElectron.mjs muerte audio
```

| Escenario | Qué comprueba |
|---|---|
| `mochila` | Casillas según el tamaño de ventana, sin desbordes ni cifras cortadas |
| `banco` | Empleado, Enviar todo, equipo intacto, reaparecer en la puerta |
| `bancoDetalle` | Cofre, selección con Ctrl y Mayús, doble clic, categoría, guardar y cargar |
| `sobrepeso` | Caminar al 50 %, compra rechazada sin cobrar, tienda y mochila de venta lado a lado |
| `muerte` | Derrota que quita 20 sin matar, Pulso a 0, modelo de fantasma, Alzador, Pulso a 20 al revivir |
| `recuerdo` | Poción de recuerdo desde el campo y desde el banco |
| `barra` | Separar, arrastrar, fijar y unir la barra |
| `castillo` | Modelo de Blender cargado, obstáculo, zona, portón, subir al estrado por las gradas y salir |
| `mapa` | Capturas por zona y del horizonte; vértices del terreno y plantas dibujadas según la distancia |
| `casa` | Entrar por la puerta, muebles que bloquean, salir delante de ella |
| `pantallaCompleta`, `camara`, `recoleccion`, `chat` | Esc y F11, encuadre por casilla, clic largo en recursos, emotes |
| `botin` | Botín pendiente tras morir, guardar y cargar; se cobra una sola vez |
| `rendimiento` | FPS y coste de animación, mallas y sombras en pueblo, campo y al saltar a un grupo; guarda `rendimiento-*.json` |
| `enemigos` | Bestia, arquero, chamán y bruto de Blender cerca del jugador; fluidez con todos cargados |
| `modelos` | Casas, farolas, pozo, trapiche, jugador y PNJ de Blender; puerta que se abre al acercarse, yunta que gira |
| `cofre` | Modelo con clips: cerrado, clic, tapa animada hasta 100°, sigue abierto al volver |
| `cripta` | Morir en la cripta y seguir como espectro fuera |
| `audio` | Nivel de cada canal de sonido durante 20 s sin tocar nada |
| `ventana` | 1080p al abrir, otros tamaños de la lista, rechazo de los demás |
| `estilos` | Controles sin estilo y barras de scroll distintas en cada ventana |

Con otra sesión usando la ventana de pruebas, `QA_SESION=2` da a este recorrido otro puerto, perfil y carpeta (`work/qa2/`).

## Cómo funciona

1. Arranca Vite y Electron con el puerto de depuración 9333 y un perfil propio en `work/qa-electron-profile/`. Tus partidas y opciones no se tocan.
2. Se conecta por el protocolo de depuración de Chromium (CDP) y envía clics y teclas como eventos reales.
3. Lee el estado desde `window.__game` y `window.__audio`, que solo existen en desarrollo y no llegan al juego empaquetado.
4. Para no esperar caminatas, coloca al personaje cerca del objetivo o usa `__game.bank.enter()`. El resto del recorrido usa los menús normales.
5. Deja capturas y `resultado.json` en `work/qa/`, que git ignora. El proceso termina con código 1 si algo falla.

Si el juego no arranca, se detiene enseguida, muestra el error de la consola y cierra la ventana.

## Añadir una comprobación

Añade una función al objeto `scenarios`. Las ayudas son `newGame`, `button`, `clickMesh`, `key`, `until`, `js`, `shot`, `resize`, `saveAndLoad` y `check`.

## Qué no sustituye

- **Sensación:** no juzga ritmo, diversión, legibilidad ni si un sonido molesta. Eso sigue en [Acciones del creador](ACCIONES_CREADOR.md).
- **Ojos:** mira siempre las capturas. Tres defectos de esta ronda se vieron en ellas con todas las comprobaciones en verde.
- **Tamaños de ventana:** `resize` emula el área de dibujo, sin mover el marco real. El escenario `ventana` sí usa la ventana real, recortada al monitor.
