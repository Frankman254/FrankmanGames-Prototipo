# HANDOFF — Viaje, mundo continuo y muerte

## Qué quedó implementado

- Una proyección cartográfica única (`worldCoordinate`) para HUD, mapa y guardado: celdas de 32 m, sectores llamados **Pliegos** y cota de altura. Los números viven en `data/cartography.json` como `PROPUESTA`.
- El modelo puro de streaming por sectores: sector bajo el jugador, vecindad activa, diferencias de carga/descarga y agrupación de contenido. No crea ni destruye Babylon; el render conserva esa responsabilidad.
- El estado de muerte espectral: al caer, el personaje no combate ni recoge botín, los enemigos lo ignoran y camina más lento hasta llegar a un **Alzador** o ser auxiliado. Se serializan estado y cantidad de muertes.
- Tres Alzadores iniciales y la alternativa para Pulso 0 en `data/death.json`, todavía marcada como propuesta.
- Pruebas de coordenadas negativas, fronteras, streaming determinista, validación, muerte, guardado y resurrección.

## Cómo probar

```powershell
npx vitest run tests/travelDeath.test.ts
npm run typecheck
```

## Integración pendiente

- Conectar `SectorStream` al ciclo de vida visual de terreno, vegetación, NPC y enemigos; medir tirones antes de fijar radios.
- Hacer crecer `SaveData` con el bloque espectral y montar la ventana de muerte. Esta entrega no cambia guardados existentes.
- Dibujar el estado espectral y los Alzadores, reproducir su señal audiovisual y ofrecer resurrección de grupo cuando exista red.
- Sustituir las coordenadas antiguas del HUD mediante `worldCoordinate` en una pasada aislada; el nombre y la escala aún son propuesta.

## Preguntas para el creador

- ¿**Pliego** y **Alzador** conservan el tono deseado?
- ¿Al llegar a Pulso 0 se mantiene la debilidad elegida en datos o se prefiere resurrección larga/bloqueo de combate?
- ¿Los viajes largos entre regiones deben consumir un objeto, monedas o sólo tiempo de canalización?
