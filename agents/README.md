# Entregas de agentes

Cada encargo usa una carpeta propia: OMP_002_GUARDADO, OMP_003_..., etc.
No editar .agents ni mezclar estas entregas con instrucciones de herramientas.

- PROMPT.md: alcance autorizado y criterios de aceptación.
- STATUS.md: PENDIENTE, EN_CURSO, COMPLETADO, FALLIDO o BLOQUEADO; incluir fecha,
  rama, base SHA y motivo cuando aplique.
- RESULTADO.md: cambios, evidencia, pruebas ejecutadas, fallos y límites.
- cambios.patch: diff revisable de los archivos permitidos, incluidos tests nuevos.

COMPLETADO indica que el agente terminó su encargo; el coordinador aún debe
revisar el diff y reproducir las pruebas antes de aceptar integración.
No compartir un checkout con cambios simultáneos: usar copia o worktree aislado.
No hacer push ni merge por iniciativa del agente.
