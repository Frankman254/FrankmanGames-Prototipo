# Guía del modo edición y las herramientas de desarrollo

Casi todo lo de esta guía **solo existe con `npm run dev`**. En el juego empaquetado no aparece.
Algunas cosas también se pueden activar con la marca de pruebas (`?pruebas` en la dirección, o
`localStorage['frankmangames.dev'] = '1'`).

## Teclas rápidas

| Tecla | Qué hace |
|---|---|
| F12 | Abre y cierra el editor del mundo (ver abajo). |
| º | Inspector de escena. Con Alt + clic en el mundo dice qué malla es; también permite apagar y encender capas. |
| F2 | Acelera el reloj del día ×40 (pulsa otra vez para volver a la velocidad normal). |
| F3 | Adelanta el reloj 3 horas. |
| Fin | Medidor de daño. |
| Insert | Cambia el clima al siguiente. |

## Piedras Pintadas en desarrollo

- En `npm run dev` el menú de cualquier Piedra **lista todas las piedras de todas las provincias**.
  Al pulsar una te teletransporta allí y la marca como conocida.
- Para ver solo las conocidas, como en una partida normal, escribe en la consola
  `localStorage['frankmangames.devAllStones'] = '0'` y recarga la página. Para volver a verlas todas,
  borra esa clave.
- **Punto de regreso:** se elige a mano. En el menú de la piedra donde estás aparece el botón
  «Guardar «X» como punto de regreso». Tocar o viajar a una piedra no lo cambia.

## Editor del mundo (F12)

- **Cámara:** WASD para moverte, botón derecho arrastrando para girar, la rueda para acercar o
  alejar, y F para centrar la vista en lo seleccionado.
- **1 Seleccionar:** R y Mayús+R giran, `[` y `]` cambian el tamaño, Supr borra, Esc suelta lo
  seleccionado.
- **2 Añadir:** elige un objeto del catálogo y haz clic en el suelo.
- **3 Navegación:** pinta zonas donde se puede caminar o no (Bloquear, Liberar, Automático). Mayús y
  Alt modifican el pincel.
- **Deshacer y rehacer:** Ctrl+Z y Ctrl+Y, hasta 200 pasos.
- **Guardar:** Ctrl+S escribe los cambios en los archivos JSON de `data/` (solo en `npm run dev`).
  «Exportar JSON» descarga una copia del archivo.
- El detalle de qué archivo escribe cada cambio está en
  [historico/handoffs/HANDOFF_EDITOR.md](historico/handoffs/HANDOFF_EDITOR.md).

## Partidas de prueba y ajustes

- **Partidas de prueba:** en la pantalla de personajes hay partidas ya preparadas, sacadas de
  `data/dev/presets.json`. Puedes añadir o cambiar partidas en ese archivo.
- **Opciones → Desarrollo:** perfil de progresión y deslizadores por nivel. Solo afectan a las
  partidas de prueba.
- **Montura y catálogo de pruebas:** en desarrollo se te da una montura y un objeto de cada tipo.
  Para quitarlos: `localStorage['frankmangames.devMount'] = '0'` y recarga.

## Consola (F12 del navegador de Electron / Ctrl+Mayús+I)

- `window.__game` da acceso al estado del juego en desarrollo, para mirar o tocar valores a mano.

## Si sale «Failed to fetch dynamically imported module»

Es la caché de Vite desfasada. Ya está corregido en `vite.config.ts`, pero si vuelve a pasar:
cierra `npm run dev`, borra la carpeta `node_modules/.vite` y arráncalo otra vez.
