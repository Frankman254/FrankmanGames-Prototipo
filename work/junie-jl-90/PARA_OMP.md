# Clips faltantes en fantasma.glb

**Modelo:** `assets/models/fantasma.glb` (generado por `scripts/blender/mascotas.py`)
**Uso actual:** cuerpo espectral del jugador (`src/render/characters/ghostBody.ts`)
**Uso futuro:** posible enemigo si se añade un arquetipo de fantasma

## Clips existentes

| Clip | Uso |
|---|---|
| `Reposo` | Idle del fantasma espectral |
| `Avanzar` | Movimiento del fantasma espectral |

## Clips de enemigo estándar que faltan

El sistema de enemigos (`src/render/characters/gltfCharacter.ts`) espera estos clips:

| Clip | Prioridad | Descripción |
|---|---|---|
| `Caminar` | Alta | Equivalente a `Avanzar` con el nombre estándar de enemigo |
| `Atacar` | Alta | Golpe básico del enemigo |
| `Golpeado` | Alta | Reacción al recibir daño |
| `Morir` | Alta | Animación de muerte |
| `Correr` | Media | Opcional — el sistema usa `Caminar` como fallback |

## Notas

- `ghostBody.ts` ya es defensivo (JL-90): si un clip falta, el fantasma flota quieto sin lanzar error.
- Si el fantasma se usa como enemigo en el futuro, necesita al menos `Reposo`, `Caminar`, `Atacar`, `Golpeado` y `Morir`.
- Los nombres de clip deben coincidir exactamente con los del sistema de enemigos (sin prefijos).
