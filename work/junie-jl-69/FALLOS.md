# JL-69: Fallos visuales detectados

## Fallos pre-existentes (no de JL-59…68)

1. **Chat pisa hud-actionbar** — 45 fallos en escenario `interfaz` (768p y ultra-wide). Problema conocido de JL-05, no resuelto completamente. Afecta todas las resoluciones excepto 1080p por defecto.
2. **Barra: personaje se arrastra por su cuenta** — 1 fallo en escenario `barra`. Las posiciones de las secciones del personaje y de la mascota se solapan. Pre-existente.
3. **Crestalba: timeout** — Escenario `crestalba` no carga el modelo y CDP cae. Fallo conocido de JL-51.
4. **Previa: fantasmas y destino del salto** — 5 fallos en escenario `previa`. Pre-existentes de JL-06.

## Sin fallos nuevos

Las capturas tomadas no revelan fallos específicos de JL-59 a JL-68:
- JL-59: la barra fusionada se ve centrada y del ancho correcto.
- JL-60: el HUD en ultra-wide se ve dentro de la zona segura.
- JL-61: Iguanera carga sin errores de consola.
- JL-65: la cámara sigue al jugador sin bloqueos.
- JL-68: no se pudo verificar (sin escenario dedicado).
