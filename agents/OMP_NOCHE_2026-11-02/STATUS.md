# Estado del relevo nocturno — OMP

**Fecha**: 2026-11-02 01:25 EST  
**Estado**: **EN_CURSO**  

---

## Arranque completado

✅ Leído `PROMPT.md` completo  
✅ Leído `AGENTS.md`, `INVENTARIO_BANCO_2026-11-02.md`, `ACCIONES_CREADOR.md`, `COORDINADOR_005_INVENTARIO.md`  
✅ Verificado rama: **master** (commit `26d9d9210768ce8f0e8a0dc958d99799fe70dc82`)  
✅ Ejecutado `npm test`: 754/754 pruebas aprobadas  
✅ Ejecutado `npm run typecheck`: compilación limpia (sin error TS)  
✅ Creado `BASELINE.md` con commit inicial y archivos sucios  

---

## Archivos ya modificados/no seguidos (conservar en commits posteriores)

```
M data/rpg/progression.json
M docs/TAREAS_FALTANTES_2026-11-01.md
A .agents/skills/codebase-design/*
A .agents/skills/domain-modeling/*
A .agents/skills/improve-codebase-architecture/*
A .agents/skills/setup-matt-pocock-skills/*
A .agents/skills/to-spec/*
```

---

## Cola de trabajo nocturna (7 tareas)

| # | Tarea | Descripción breve | Estado |
|---|-------|------------------|--------|
| 1 | Integridad banco al cargar | UID repetidos, guardado sin bank | 🟡 Pendiente |
| 2 | Identidad al apilar/transferir | Mismo itemId, bonus diferentes | 🟡 Pendiente |
| 3 | Acceso banco y mascota | Transferencias prohibidas en ciertos estados | 🟡 Pendiente |
| 4 | Casillas según ventana | Rejilla adaptable sin pérdida de peso | 🟡 Pendiente |
| 5 | Comercio y menú contextual | Tienda sin equipo, doble clic, filtros | 🟡 Pendiente |
| 6 | Recuperación espectral + sobrepeso | No duplicar/recoger como espectro | 🟡 Pendiente |
| 7 | Documentación coherente | TAREAS_FALTANTES, ACCIONES_CREADOR | 🟡 Pendiente |

---

## Reglas confirmadas

- ✅ Solo mochila pesa; equipo y banco fuera
- ✅ Unidad: briznas (capacidad inicial 150)
- ✅ Compras/recogidas normales respetan límite
- ✅ Recompensas sobrepeso → velocidad 50%
- ✅ Banco del Cruce (116,132), ilimitado personal
- ✅ Sin fabricación/recetas implementadas
- ✅ NO retomar equipment.ts ni roll.ts

---

**Tarea siguiente**: 1. Integridad del banco al cargar  
**Próximo commit**: Solo archivos modificados por esta tarea

