# Verificación del coordinador — ronda 001

Fecha: 2026-11-01. Base: cbb9fcc (informe OMP sobre d7d3d7c).
Rama de trabajo: codex/pulido-verificacion-01.
Se conservan los cambios de auditoría y validación de sectores de la ronda anterior.

## Revisión de OMP

Se confirma el hallazgo principal: no hay conexión SpectralState con la sesión,
el mundo ni el guardado de partida. El informe original se conserva sin alterarlo.
Correcciones de evidencia:

- death.json declara radio 3 y Alzadores en (136,120), (180,60), (174,174);
  no radio 5 ni coordenadas (560,-3).
- tests/travelDeath.test.ts contiene seis pruebas totales, solo dos espectrales.
- resurrectByAlly no estaba probado allí. La cobertura no era completa.
- No se necesita inventar una zona de efecto/render como condición técnica
  obligatoria; falta definir cómo se representa e interactúa con el Alzador.

## Error reproducido y corregido

SpectralState.resurrectAt aceptaba NaN: Math.hypot devuelve NaN y la condición
distancia > radio resulta falsa. Se rechazaron coordenadas no finitas antes
de evaluar distancia. Sin cambio de cifras ni activación de la mecánica.

Prueba antes del arreglo: tests/spectral.test.ts, 2 fallos / 5 casos.
Después: 5/5. Incluye límite exacto, fuera del radio, id desconocido,
repetición y conservación de estado al rechazar la posición.

## Pruebas ejecutadas

- Focalizadas: spectral, travelDeath y rpg/session: 19/19.
- Typecheck: renderer, Electron y servidor correctos.
- Build correcto; persiste aviso de Vite por chunk principal grande (~6,77 MB).
- Regresión completa: 73 archivos, 689/689 tras habilitar loopback.
  Primer intento restringido: 688 pasan, WebSocket EACCES; repetición autorizada
  pasa incluyendo WebSocket.

## Juego real en Electron

Se abrió con --user-data-dir apuntando a work/qa-electron-profile para separar
guardados y opciones. Menú inicial sin partidas personales; se seleccionó
Partidas de prueba -> Brasa pura 5. Se observaron nivel 5, 189/189 de vida,
Vigor 68/68, Pulso 100/100, mascota y minimapa.

Clic en suelo: pasos pasaron de 0 a 3; telemetría informó clic->mov 24,5 ms.
Es una observación puntual, no benchmark ni garantía de latencia/FPS.
Intento de menú/ESC no concluyente: otra ventana ocupó el destino de entrada
y Computer Use rechazó el clic. No se registra como fallo del juego.
No se certificó en esta ronda combate completo, muerte, cripta, guardado/carga
ni sonido percibido. Las pruebas automatizadas no sustituyen esos recorridos.

## Próximas tareas

1. OMP 002: almacenamiento opcional spectral, sin activación.
2. Coordinador: revisar entrega y añadir persistencia en sesión con compatibilidad.
3. Con respuestas H01–H03: cerrar flujo muerte -> espectro -> restricciones ->
   Alzador -> recuperación, incluyendo mazmorra, UI y prueba de partida real.
4. Continuar balance con escenarios obtenibles, luego arcos y vertical Diablicos.

Información humana pendiente en docs/ACCIONES_CREADOR.md.
