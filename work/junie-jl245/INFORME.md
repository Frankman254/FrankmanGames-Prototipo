# JL-245: Cobertura de validadores Blender para GLB

## Resumen

- **135 GLB** en `assets/models/`
- **112 con validador** (directo o grupo): 83 %
- **29 excepciones** documentadas con motivo

## Distribución

| Categoría | Cantidad |
|---|---|
| Validador directo (validar_<nombre>.py) | 26 |
| Validador de grupo (fauna, enemigos, criptas…) | 86 |
| Excepciones documentadas | 29 |

## Excepciones por tipo

- **Héroes base** (6): validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/
- **Héroes anime** (4): sin validador dedicado, pendiente OMP
- **Estructuras** (4): sin contrato de validación
- **Props de mazmorra** (6): validados dentro de mazmorra.glb o sin contrato
- **Modelos especiales** (4): sin contrato de validación
- **Enemigos** (4): sin validador de grupo asignado
- **Props iluminación/interiores** (5): sin contrato de validación

## Prueba

`tests/jl245_glbValidators.test.ts` — 5 tests verdes.
