> INFORME EXTERNO NO APROBADO: inventa unidades, pesos y límites. Conservado como evidencia; ver STATUS.md.

# Pruebas Manuales — Inventario por Peso

**Fecha**: 2026-11-02  
**Autor**: Coordinador (para Frank verificar)  
**Objetivo**: Verificar que el peso se cuenta SOLO mochila; equipo y banco quedan fuera.  

---

## Instrucciones Generales

- Ejecutar en modo **Partidas de prueba** (no necesario guardar antes)
- No modificar código, datos ni Git
- Para cada prueba: seguir pasos → verificar resultado esperado → registrar PENDIENTE si no funciona

---

## Pruebas Manuales (10 máx.)

### P1. Inventario con objetos ligeros
**Pasos**:
1. Abrir mochila (tecla `I` o botón)
2. Recoger 5 pociones del suelo (cada una peso = 0.2)
3. Verificar: peso total = 1.0 kg

**Resultado esperado**: Muestra "Peso: 1.0 kg / límite X kg" en HUD de mochila  
**Estado**: **PENDIENTE**

---

### P2. Inventario con objetos pesados (armadura)
**Pasos**:
1. Equipar armadura completa (cabeza, torso, piernas, botas)
2. Abrir mochila
3. Verificar: peso visible en HUD = SOLO mochila (sin contar equipo)

**Resultado esperado**: Muestra solo peso de objetos en mochila, NO suma peso de lo equipado  
**Estado**: **PENDIENTE**

---

### P3. Sobrepeso en mochila (debería impedir recoger)
**Pasos**:
1. Llenar mochila hasta límite de peso exacto (ej: 50 kg / 50 kg)
2. Intentar recoger un objeto adicional del suelo (peso = 1 kg)
3. Verificar mensaje de error o advertencia

**Resultado esperado**: Mensaje "Mochila llena por peso" o no recoge el objeto  
**Estado**: **PENDIENTE**

---

### P4. Banco guarda objetos sin contar al personaje
**Pasos**:
1. Guardar 20 pociones en banco (peso total = 4 kg)
2. Abrir mochila del personaje
3. Verificar: peso visible = 0 kg (solo mochila vacía)

**Resultado esperado**: Muestra "Peso: 0.0 kg" porque el banco está separado  
**Estado**: **PENDIENTE**

---

### P5. Banco con límite de capacidad diferente
**Pasos**:
1. Guardar objetos pesados en banco hasta su límite (ej: 100 kg)
2. Verificar: peso visualizado es SOLO del banco, no suma al personaje

**Resultado esperado**: HUD de banco muestra "Peso: X kg / límite Y kg" independiente  
**Estado**: **PENDIENTE**

---

### P6. Equiar arma pesada no afecta movimiento
**Pasos**:
1. Equipar gran espada (peso = 5 kg)
2. Verificar velocidad de movimiento (no debería reducirse por equipo)
3. Mover personaje a máxima velocidad

**Resultado esperado**: Personaje se mueve rápido aunque lleva arma pesada equipada  
**Estado**: **PENDIENTE**

---

### P7. Vender objeto reduce peso de mochila correctamente
**Pasos**:
1. Llenar mochila con 10 pociones (peso = 2 kg)
2. Ir a mercader y vender 5 pociones
3. Verificar: peso visible = 1 kg (solo lo que queda en mochila)

**Resultado esperado**: Peso actualizado solo por objetos en mochila  
**Estado**: **PENDIENTE**

---

### P8. Recoger botín después de combate
**Pasos**:
1. Terminar combate y ver caer 5 pociones
2. Abrir mochila y recoger todas
3. Verificar: peso acumulado se suma correctamente

**Resultado esperado**: Cada objeto recogido aumenta el peso total visible  
**Estado**: **PENDIENTE**

---

### P9. Equiar anillos (poco peso) no afecta mochila
**Pasos**:
1. Equiar 2 anillos (peso total = 0.4 kg cada uno)
2. Abrir mochila y verificar peso visible

**Resultado esperado**: Mochila muestra peso de objetos, NO suma peso de anillos equipados  
**Estado**: **PENDIENTE**

---

### P10. Banco vacío no muestra límite
**Pasos**:
1. Verificar estado inicial del banco (vacío)
2. Abrir ventana de banco

**Resultado esperado**: Muestra "Banco: vacío" sin mostrar peso/limite hasta guardar objetos  
**Estado**: **PENDIENTE**

---

## Formato para Registrar Resultados

Para cada prueba, Frank debe marcar:

```markdown
## P1. Inventario con objetos ligeros
- Pasos: ✅ Completados
- Resultado esperado: ✅ / ❌ No se cumple
- Observación: [Notas aquí]
- Frecuencia del error: [Siempre/A veces/Nunca]
```

---

## Notas para Frank

- **No toques código**: Solo verifica comportamiento visual
- **Guarda después de cada prueba** para poder repetir
- Si falla una prueba, intentar 2 veces antes de reportar
- Captura pantallas si hay problemas visuales (HUD no actualizado)

---

**Generado por**: Coordinador para OMP  
**Base commit**: f6c43e5  
**Validación**: Sin modificar código o datos ✅

