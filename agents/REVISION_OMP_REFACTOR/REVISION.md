# Revisión del coordinador — reorganización OMP

La propuesta original se conserva íntegra en los archivos `.propuesta.ts.txt` y el diff adjunto. No está integrada: introducía nombres inexistentes (`defId`, `rolledMods`, `EquipMap` en contracts), omitía exportaciones utilizadas (`Equipment`, `equipmentSources`, `isTwoHanded`) y la validación rechazaba objetos actuales como `short_sword`.

La integración de peso mantiene las funciones probadas en `items.ts`. La extracción de módulos queda pendiente para una tarea aislada, con equivalencia de comportamiento y todas las pruebas verdes. El handoff del agente no sustituye una verificación ejecutada por el coordinador.
