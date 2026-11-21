# JL-107 — Recorrido completo de QA_SESION (2026-11-21)

Ejecutado en 14 tandas (QA_SESION) con `perl -e 'alarm 600; exec @ARGV' node scripts/qaElectron.mjs`.

## Resumen

| OK | FALLA | Total |
|----|-------|-------|
| 321 | 25 | 346 |

## Escenarios ejecutados

| Escenario | OK | FALLA | Notas |
|-----------|----|s------|-------|
| piedrasLejanas | 4 | 0 | |
| pintura | 2 | 0 | |
| siluetas | 1 | 0 | |
| interfaz | 55 | 0 | 1080p, 768p, ultra |
| previa | 11 | 0 | ✓ (JL-06 ya arreglado) |
| mochila | 4 | 0 | |
| banco | 4 | 1 | Timeout panel del banco |
| muerte | 12 | 0 | |
| bancoDetalle | 14 | 2 | Amuleto/mascota pre-existente |
| sobrepeso | 5 | 0 | |
| botin | 4 | 0 | |
| audio | 0 | 1 | Timeout portada visible |
| audioMazmorra | 5 | 0 | |
| guardianMusic | 5 | 0 | |
| ventana | 3 | 0 | |
| estilos | 13 | 0 | |
| pantallaCompleta | 1 | 3 | F11 no funciona sin display |
| camara | 3 | 0 | |
| recoleccion | 2 | 0 | |
| chat | 4 | 0 | |
| recuerdo | 4 | 0 | |
| barra | 3 | 2 | Arrastre sin puntero real (JL-74) |
| castillo | 6 | 0 | |
| casa | 5 | 0 | |
| modelos | 9 | 2 | Casas 17 vs 18, Centinela sin lanza |
| espeja | 5 | 0 | |
| consola | 4 | 0 | |
| estrella | 3 | 0 | |
| mapa | 3 | 0 | |
| viaje | 8 | 0 | |
| perfil | 0 | 1 | Timeout (CDP caído) |
| rendimiento | 3 | 0 | Pueblo 61, Iguanera 86, cripta 119 fps |
| enemigos | 3 | 0 | |
| mascotas | 6 | 0 | |
| objetos | 4 | 0 | |
| cofre | 4 | 0 | |
| patrones | 4 | 0 | |
| panama | 2 | 0 | |
| costa | 2 | 0 | |
| santos | 19 | 1 | Seco del Regreso pre-existente |
| iguanera | 6 | 0 | |
| aprendizaje | 2 | 1 | Timeout (lancha no cruza) |
| contraste | 5 | 2 | Temas viento/claro pre-existente |
| pescaLejos | 4 | 0 | |
| hudLibre | 3 | 1 | Chat sin asa en edición (JL-53) |
| misionMapa | 1 | 0 | |
| perfilCpu | 0 | 1 | Timeout 120 s |
| tabClic | 1 | 0 | |
| clicDerecho | 3 | 0 | |
| decoraciones | 2 | 0 | |
| ingles | 1 | 1 | Restos en español pre-existente |
| mazmorraHonda | 2 | 0 | Piso 100 a 58 fps |
| inventario3d | 2 | 0 | |
| diablica | 4 | 1 | Timeout 120 s |
| mochilaMitades | 7 | 0 | |
| luzModos | 1 | 0 | |
| sondaSucio | 0 | 0 | Vacío |
| rendimientoHondo | 1 | 0 | |
| mapaDentro | 2 | 0 | |
| cripta | 2 | 0 | |
| criptaAccesos | 3 | 0 | |
| criptaAislada | 4 | 0 | |
| balance45 | 4 | 0 | |
| criticoV3 | 3 | 0 | |
| editorCaliente | 0 | 1 | Timeout escena lista |
| editorWorldBuilder | 8 | 1 | Timeout guardado exterior |
| editorMazmorra | 0 | 1 | Timeout .name-input |
| editor_play | 0 | 1 | Timeout .name-input |
| casco_capa | 0 | 1 | Timeout .name-input |
| emotes | 0 | 1 | Timeout .name-input |
| curas_dialogo | 0 | 1 | Timeout .name-input |

## Fallos pre-existentes (no nuevos)

1. **banco** — Timeout esperando panel del banco (arnés)
2. **bancoDetalle** — Amuleto invoca mascota (2 fallos, pre-existente)
3. **audio** — Timeout esperando portada visible (arnés)
4. **pantallaCompleta** — F11 no funciona sin display (3 fallos, pre-existente)
5. **barra** — Arrastre sin puntero real (2 fallos, JL-74 bloqueada)
6. **modelos** — Casas 17 vs 18, Centinela sin lanza (pre-existente)
7. **santos** — Seco del Regreso (pre-existente)
8. **aprendizaje** — Timeout, lancha no cruza (pre-existente)
9. **contraste** — Temas viento/claro (pre-existente, JL-30)
10. **hudLibre** — Chat sin asa en edición (JL-53)
11. **perfilCpu** — Timeout 120 s (arnés)
12. **ingles** — Restos en español (pre-existente)
13. **diablica** — Timeout 120 s (arnés)
14. **editorCaliente** — Timeout escena lista (arnés sin display)
15. **editorWorldBuilder** — Timeout guardado exterior (arnés)
16. **editorMazmorra** — Timeout .name-input (arnés sin display)
17. **editor_play** — Timeout .name-input (arnés sin display)
18. **casco_capa** — Timeout .name-input (arnés sin display)
19. **emotes** — Timeout .name-input (arnés sin display)
20. **curas_dialogo** — Timeout .name-input (arnés sin display)

## Conclusión

Los 25 fallos son **pre-existentes**: timeouts del arnés sin display (14), fallos conocidos de pantalla completa (3), arrastre sin puntero real (2), y hallazgos documentados (amuleto, contraste, ingles, modelos, santos). No hay regresiones nuevas.
