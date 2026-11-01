# HANDOFF — Gráficos y arte

## Incorporado

- Biblioteca de animaciones humanoides Quaternius UAL1 Standard, descargada desde itch.io oficial y verificada por SHA-256.
- El GLB sin movimiento de raíz y su licencia están en `assets/quaternius/ual1/` y registrados individualmente en `PROCEDENCIA.md`.
- El manifiesto expone los clips `idle`, `run`, `attack`, `cast`, `evade`, `hit` y `death`; los personajes procedurales siguen siendo el fallback.
- Banco dorado en el pueblo, declarado como una casa con `style: "golden"`. El estilo es reutilizable por cualquier prop y usa PBR metálico con tres acabados, no un color plano.
- Los tests de assets verifican que todos los binarios tienen procedencia y existen; los tests de vegetación validan el acabado dorado.

## Licencia y origen

- Autor: Quaternius.
- Fuente: <https://quaternius.itch.io/universal-animation-library>
- Licencia: CC0-1.0, copia local incluida.
- ZIP oficial: `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`.

## Qué revisar a ojo

- Reflejo y rugosidad del banco en mañana, mediodía, lluvia y noche.
- Que el banco no invada el camino y su escala sea coherente con el personaje.
- Importación de UAL1 en la galería de personajes antes de activarla por clase; el rig del personaje procedural no se retargetea automáticamente.

## Pendiente de la siguiente pasada de arte

- Descargar modelos CC0 de personajes, tres familias de monstruos, árboles, rocas y casas. No se añadieron modelos desde mirrors de terceros: se prefirió no incorporar un binario cuya cadena de origen no pudiera verificarse.
- Medición visual/FPS en Electron con el hardware del creador y capturas antes/después.
- Texturas PBR finales de terreno, agua y fachadas. El banco es la prueba solicitada para decidir el lenguaje material.
