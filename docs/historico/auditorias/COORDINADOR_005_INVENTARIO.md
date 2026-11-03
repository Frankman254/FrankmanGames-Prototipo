# Coordinador 005 — inventario por peso y banco

Fecha: 2026-11-02. Trabajo directo en master, sin nuevas ramas.

Implementado: capacidad configurable por peso SOLO mochila; 123 pesos originales explícitos; posiciones extensibles; conservación de guardados y equipo; recompensas obligatorias con sobrepeso y velocidad50%; BankStorage ilimitado con depósitos/retiradas parciales y persistencia; edificio/interior/NPC/cofre del Cruce; interfaz banco por categorías/selección/doble clic; comercio separado sin equipo; contexto información/conjunto/recetas sin datos inventados.

Evidencia: src/rpg/{items,character,bank,session,quests}.ts, src/sim/world.ts, src/scenes/bankScene.ts, src/main.ts, src/ui/menus/{bankPanel,itemContextMenu,inventory,index,format}.ts, data/rpg/{items,progression}.json.

Pruebas: npm test con permiso de conexiones locales: 82 archivos, 754/754 pruebas aprobadas. Primer intento restringido dio EACCES en WebSocket local; repetición completa con permisos adecuados pasó. Nuevas pruebas verifican peso, equipo excluido, guardado sobrecargado, permisos/persistencia banco, retiro parcial, recompensa obligatoria y mitad de velocidad, geometría/transiciones banco y selección de interfaz.

Compilación: npm run build pasó (incluye TypeScript juego/Electron/servidor). Aviso existente de tamaño de bundle Vite. Ver bitácora para comprobación final tras ajustes menores de presentación.

Límites: sin certificación visual completa en Electron en este cierre. Banco por personaje; cargar desde interior reaparece en puerta. No intercambio entre jugadores ni recetas/fabricación implementados. Pesos/capacidad/nombre de unidad siguen balance propuesto.

OMP: se preserva propuesta de refactor incompatible, antes de retirar los archivos fallidos del código activo, en agents/REVISION_OMP_REFACTOR. No se afirma integrada. Nuevo prompt independiente en agents/OMP_005_PRUEBA_HUMANA/PROMPT.md. Skills y documentos externos del creador no se incluyen automáticamente en este commit.

OMP005 entregó checklist, pero revisión NO APROBADA: inventa kg/pesos/ranuras y límite del banco. Se conserva el informe con advertencia; usar ACCIONES_CREADOR como checklist válida.
