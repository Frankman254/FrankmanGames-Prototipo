# HANDOFF — Cámara v2 (base pura)

## Qué quedó implementado

- Damping exponencial independiente del FPS para valores y ángulos, con giro por el camino corto.
- Encuadres predeterminados (normal, superior, cercano, isométrico y cinematográfico), normalización segura y detección pura de toque frente a pulsación larga.
- Matemática de los cuatro modos: seguimiento, autoencuadre de amenazas, giro inteligente limitado con pausa tras control manual y centro fijo por celdas continuas de 32 m.
- Colisión analítica de cámara contra cajas, sin los saltos del muestreo por pasos.
- Pruebas puras para convergencia, ángulos, encuadres, modos y colisión.

## Cómo probar

```powershell
npx vitest run tests/camera/cameraLogic.test.ts
npm run typecheck
```

## Pendiente de integración visual

Esta entrega conserva el juego actual sin riesgo: todavía falta conectar `src/camera/` con `CameraRig`, las posiciones de enemigos, las opciones y los nuevos atajos. También quedan para una segunda pasada el desenfoque de movimiento (solo calidad alta/ultra), gestos de trackpad configurables y la comprobación visual dentro de la mazmorra. Los módulos puros están preparados para que esa integración no duplique matemática ni dependa de Babylon.

## Preguntas para el creador

- ¿Los cuatro encuadres deben ser globales o guardarse por personaje?
- ¿El modo inteligente puede cambiar inclinación además de yaw, o solo girar horizontalmente?
- En modo por zona, ¿el centro fijo debe respetar la altura media de la celda o la altura actual del personaje?
