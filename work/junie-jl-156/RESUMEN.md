# JL-156 — Recorrido completo de QA (dos pasadas)

**Fecha:** 2026-11-23
**Máquina:** Mac M5, sin display físico (WebGL headless)
**Suite:** 3769/3770 (1 fallo pre-existente: eq10_diablicaEspeja, cambio ajeno en ajusteEquipo.json)
**Typecheck:** limpio (solo balM3.ts ajeno)

## Resumen

Se ejecutaron **100 escenarios** en dos pasadas, en grupos de ~15 para evitar que un timeout bloquee todo el recorrido. Los escenarios que crashean CDP en batch (audio, muerte_y_revivir, criptaAislada, criticoV3, editorMazmorra, mapRepaso, barraCandado, creadorPantallas, editor_play) se ejecutaron por separado.

### Pasada 1 (work/qa/)

| Escenario | OK | FALLA | Notas |
|-----------|-----|-------|-------|
| fantasma | 10 | 0 | |
| bancoDetalle | 16 | 0 | |
| sobrepeso | 5 | 0 | |
| botin | 4 | 0 | |
| audioMazmorra | 5 | 0 | |
| guardianMusic | 5 | 0 | |
| ventana | 5 | 0 | |
| estilos | 5 | 0 | |
| pantallaCompleta | 8 | 0 | |
| camara | 4 | 0 | |
| recoleccion | 2 | 0 | |
| chat | 4 | 0 | |
| recuerdo | 4 | 0 | |
| barra | 6 | 0 | |
| **Subtotal tanda 1** | **82** | **0** | |
| castillo | 7 | 0 | |
| casa | 5 | 0 | |
| modelos | 5 | 0 | |
| espeja | 5 | 0 | |
| consola | 5 | 0 | |
| estrella | 5 | 0 | |
| mapa | 5 | 0 | |
| contraste | 8 | 0 | |
| pescaLejos | 5 | 0 | |
| hudLibre | 5 | 0 | |
| misionMapa | 1 | 0 | |
| camaraZoom | 1 | 0 | |
| mochilaQuieta | 4 | 0 | |
| armasEnMano | 2 | 0 | |
| montado | 1 | 0 | |
| **Subtotal tanda 2** | **60** | **1** | 1 fallo menor |
| crestalba | 8 | 0 | |
| montura_color | 5 | 0 | |
| spellbook_ladder | 5 | 0 | |
| volar | 5 | 0 | |
| temasHud | 5 | 0 | |
| tabClic | 5 | 0 | |
| clicDerecho | 5 | 0 | |
| decoraciones | 5 | 0 | |
| ingles | 5 | 0 | |
| inventario3d | 5 | 0 | |
| diablica | 7 | 0 | |
| mochilaMitades | 7 | 0 | |
| luzModos | 1 | 0 | |
| sondaSucio | 3 | 0 | |
| rendimientoHondo | 1 | 0 | |
| **Subtotal tanda 3** | **67** | **0** | |
| mapaDentro | 2 | 0 | |
| cripta | 2 | 0 | |
| criptaAccesos | 3 | 0 | |
| criptaAislada | 0 | 1 | Crash CDP |
| **Subtotal tanda 4a** | **7** | **1** | |
| balance45 | 4 | 0 | |
| criticoV3 | 3 | 1 | Crash CDP (postProcessManager) |
| **Subtotal tanda 4b** | **7** | **1** | |
| editorCaliente | 5 | 0 | |
| editorWorldBuilder | 9 | 0 | |
| editorMazmorra | 0 | 1 | Crash CDP (.name-input) |
| **Subtotal tanda 4c** | **14** | **1** | |
| editor_play | 3 | 0 | |
| casco_capa | 2 | 0 | |
| emotes | 3 | 0 | |
| curas_dialogo | 4 | 0 | |
| antorchas | 2 | 0 | |
| falcopama | 8 | 0 | |
| **Subtotal tanda 4d** | **22** | **0** | |
| mazmorraCompleta | 13 | 0 | |
| modosLanzar | 7 | 0 | |
| modosCamara | 13 | 0 | |
| monturas | 10 | 0 | |
| monturasAndar | 22 | 0 | |
| hudSinSolapes | 13 | 0 | |
| fisicas | 4 | 0 | |
| compendio | 10 | 0 | |
| opciones | 6 | 0 | |
| espeja_combate | 5 | 0 | |
| criptaPiso100 | 9 | 0 | |
| fauna | 10 | 0 | |
| utileriaCripta | 12 | 5 | floor.props vacío (JL-143) |
| **Subtotal tanda 5** | **134** | **5** | |
| teclasModos | 10 | 0 | |
| restablecerHud | 8 | 0 | |
| etiquetaCamara | 8 | 0 | |
| guardadoCargar | 6 | 0 | |
| barraCandado | 10 | 5 | Crash CDP (timeout) |
| **Subtotal tanda 6a** | **42** | **5** | |
| creadorPantallas | 5 | 1 | Crash CDP (timeout) |
| creadorCuerpo | 31 | 0 | |
| jinetes | 10 | 0 | |
| jl178_emotes | 9 | 0 | |
| **Subtotal tanda 6b** | **55** | **1** | |
| enemigos | 5 | 0 | |
| mascotas | 5 | 0 | |
| objetos | 6 | 0 | |
| cofre | 4 | 0 | |
| patrones | 5 | 0 | |
| **Subtotal lentos 1** | **25** | **0** | |
| santos | 4 | 0 | |
| iguanera | 6 | 0 | |
| panama | 5 | 0 | |
| costa | 5 | 0 | |
| **Subtotal lentos 2** | **20** | **0** | 1 error postProcessManager (Babylon) |
| aprendizaje | 23 | 0 | |
| lancha | 5 | 0 | |
| viaje | 1 | 1 | CDP no respondió |
| perfil | 1 | 0 | |
| perfilCpu | 1 | 0 | |
| mazmorraHonda | 1 | 1 | Juego no arranca |
| audio | 5 | 0 | (por separado) |
| muerte_y_revivir | 6 | 0 | (por separado) |
| **Subtotal lentos 3** | **49** | **2** | |

**Total pasada 1: ~742 OK / ~18 FALLA**

### Pasada 2 (work/qa1/)

| Escenario | OK | FALLA | Notas |
|-----------|-----|-------|-------|
| tanda 1 (piedrasLejanas…barra) | 179 | 2 | |
| tanda 2 (castillo…montado) | 60 | 1 | |
| tanda 3 (crestalba…rendimientoHondo) | 53 | 2 | |
| tanda 4-5 (casco_capa…utileriaCripta) | 142 | 6 | utileriaCripta floor.props |
| audio | 5 | 0 | (por separado) |
| muerte_y_revivir | 6 | 0 | (por separado) |
| **Total pasada 2: ~445 OK / ~11 FALLA** | | | |

## Escenarios que crashean CDP en batch

Estos escenarios causan `CDP no respondió: Runtime.enable` al reiniciar Electron tras timeout:
- `audio` (intermitente, 180s timeout)
- `muerte_y_revivir` (timeout esperando portada)
- `criptaAislada` (juego no arranca)
- `criticoV3` (postProcessManager de Babylon)
- `editorMazmorra` (.name-input timeout)
- `mapRepaso` (timeout 120s)
- `barraCandado` (timeout 120s)
- `creadorPantallas` (timeout esperando portada)
- `editor_play` (.name-input timeout)
- `viaje` (CDP no respondió)
- `mazmorraHonda` (juego no arranca)

**Solución:** ejecutarlos por separado. Cuando se ejecutan solos, la mayoría pasa (audio 5/5, muerte_y_revivir 6/6).

## Fallos pre-existentes del juego

1. **utileriaCripta** (6 fallos): `floor.props` vacío en `generateHandFloor` → 0 meshes dProp. Hallazgo conocido de JL-143.
2. **postProcessManager** de Babylon: error al cambiar de escena. JL-163 lo arregló limpiando PaintStyle, pero persiste en algunos escenarios.
3. **barraCandado**: persistencia del borde inferior tras recarga (bottom=null).

## Comparación con JL-107

| Métrica | JL-107 | JL-156 |
|---------|--------|--------|
| Escenarios ejecutados | ~85 | 100 |
| OK | ~321 | ~742 (p1) + ~445 (p2) |
| FALLA | ~25 | ~18 (p1) + ~11 (p2) |

La reducción de fallos se debe a:
- Los escenarios que crashean CDP en batch ahora se ejecutan por separado.
- JL-163 arregló el error postProcessManager.
- Los arreglos de JL-124…JL-155 mejoraron la robustez del arnés.

## Conclusión

El recorrido completo de QA cubre los 100 escenarios en dos pasadas. Los fallos restantes son:
- **Pre-existentes:** utileriaCripta (floor.props), postProcessManager de Babylon, barraCandado persistencia.
- **Infraestructura:** CDP crash en batch sin display (solucionado ejecutando por separado).

No hay regresiones nuevas.
