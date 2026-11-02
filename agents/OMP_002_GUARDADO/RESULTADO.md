# OMP 002 — recuperación por el coordinador

Fecha 2026-11-02. Base 6a28bb2. Trabajo directo en master, sin ramas nuevas.

## Diagnóstico del bucle

El registro aportado por el creador muestra ediciones PUT rechazadas por rango/
contenido incorrecto y repetición del mismo intento. Updated 0 paths indica
que no había cambios que restaurar; working tree clean lo confirma.
Un import debe quedar en el nivel superior del módulo, no dentro de SaveData.
No se atribuye este fallo a Git ni se afirma que OMP haya terminado el encargo.
La copia separada de OMP no se modificó ni eliminó desde esta recuperación.

## Implementación del coordinador

- contracts.ts: import type superior y spectral?: SpectralSaveData.
- saveStore.ts: copia saneada del campo antes de la salida temprana por place.
- active debe ser boolean y deaths entero seguro no negativo; se copian solo
  esos campos. El inválido se descarta, el ausente sigue ausente.
- No cambian versión, inventario, equipo, energía ni ubicación.
- No se activa muerte espectral ni se añade todavía persistencia a GameSession.

## Evidencia reproducible

tests/ui/spectralSave.test.ts: 19 casos con guardado de sesión real.
Antes del arreglo: 15 fallos y 4 pasan. Después: 19/19.
Incluye estado activo/inactivo, ausencia, copia sin alias, descarte de campos
extra, valores negativos/fraccionarios/no seguros/no finitos, tipos incorrectos,
place válido y antiguo, ida/vuelta JSON por SaveStore y renombrado de ranura.

- npm test -- tests/ui/spectralSave.test.ts tests/ui/saveStore.test.ts tests/guardadoPresets.test.ts:
  69/69.
- npm test: 75 archivos, 713/713, incluido WebSocket local.
- npm run typecheck y npm run build: correctos. Persiste aviso de chunk grande.
- git diff --check: correcto.

death.json declara radio 3 y Alzadores en (136,120), (180,60), (174,174).
travelDeath.test.ts contiene dos pruebas espectrales de seis totales.

## Regla para futuras tareas locales

Tras dos rechazos equivalentes de una herramienta, detener la edición y dejar
FALLIDO/BLOQUEADO con el error exacto. No repetir indefinidamente, no usar
checkout/reset para reparar un archivo ya limpio y no declarar pruebas no ejecutadas.
Preferir parches por texto exacto frente a rangos de líneas si cambió el contexto.
Hasta recuperar fiabilidad, encargar a OMP inspecciones de solo lectura y pequeñas.
