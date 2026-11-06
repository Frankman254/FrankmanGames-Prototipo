# Acciones y respuestas del creador

Actualizado: 2026-11-04. Puedes responder en este archivo o en el chat.
Las decisiones abiertas no impiden corregir errores ni ejecutar pruebas.

## Decisiones que necesito antes de cerrar mecánicas

| ID | Decisión | Tu respuesta |
|---|---|---|
| H01 | Activación de muerte espectral | Solicitada por el creador el 2026-11-02; implementada en cada caída como comportamiento inicial. |
| H02 | Respondido (2026-11-04): cada derrota contra monstruos quita 20 de Pulso y reapareces en tu Piedra Pintada. A 0 mueres: fantasma que no pelea, no habla ni usa casi nada, hasta llegar a un Alzador. Revives con 20 y sube despacio. Sin castigo tras revivir (creador, 2026-11-04). 0,5 por minuto da 160 min de 20 a 100 (PROPUESTA) | Respondido |
| H03 | Muerte espectral dentro de la cripta | Se continúa como espectro en el exterior junto a la Piedra Pintada. No se revive gratis al salir. Comportamiento técnico inicial revisable. |
| H04 | Para balancear: ¿cuánto debería durar un combate normal de tu nivel y uno contra jefe? Si no quieres segundos, compara una partida de prueba que se sienta bien con otra demasiado lenta. | Pendiente |
| H05 | Máscara de Diablico: ¿atacar rompe el disfraz? ¿recibir daño también? ¿hay enemigos que detecten aunque no ataques? | Pendiente |
| H06 | `configInicial` propone +5 característica, +20 vida y +30 de capacidad por nivel (hoy: 3 puntos libres y capacidad fija). ¿Lo aplicamos? Cambia el balance de todas las zonas. | Pendiente |
| H09 | Arcos: el único arco es de nivel 54 y el máximo es 20, así que nadie puede usarlo. ¿Subo un arco a nivel temprano, creo uno nuevo o subes el nivel máximo? | Pendiente |
| H10 | Monturas: ¿se desmonta al entrar en combate o da la velocidad siempre? Hoy la da siempre, también para huir. | Pendiente |
| H11 | Mascotas con efecto al golpear: el mecanismo ya existe. ¿Qué efecto lleva cada una y hasta dónde? (por ejemplo, el zorro quema una vez cada varios segundos). | Pendiente |
| H12 | Oficios: tiempos, recetas y niveles son propuesta mía. Juégalos un rato: ¿va demasiado lento o rápido? ¿Quieres recetas que se encuentren o se aprendan, en vez de saberlas todas? | Pendiente |
| H08 | Letra píxel de verdad: ¿descargo una libre (por ejemplo Press Start 2P, licencia OFL) y la registro en PROCEDENCIA? Hoy «Retro» usa la de terminal del sistema. | Pendiente |
| H07 | Armadura: pediste quitarla como estadística y 48 objetos la usan. ¿La sustituimos por resistencias, por «Vigor» o por otra cosa? Sin sustituto, los personajes de equipo pesado pierden su razón de ser. | Pendiente |
| H13 | Música de Iguanera: escúchala al empezar una partida nueva. Es pentatónica, en sol y lenta. ¿Te gusta para la isla de inicio? ¿Más alegre, más misteriosa o más lenta? | Pendiente |

## Prueba humana corta (sensación y sonido)

Lo mecánico ya lo comprueba la [prueba rápida](PRUEBAS_RAPIDAS.md); aquí queda lo que solo una persona puede juzgar.
Usa Partidas de prueba; no hace falta reemplazar un guardado personal.

- [ ] Escucha un minuto sin tocar nada: ¿sigue el sonido molesto de fondo? Si sigue, baja Música y luego Efectos en Opciones y dime con cuál desaparece.
- [ ] Muere: ¿se reconoce al fantasma, también de noche y lejos de la Piedra?
- [ ] Revisa barras de scroll y campos en las ventanas que uses: ¿queda alguna distinta?
- [ ] Prueba Opciones → Pantalla → Tamaño de ventana en tu monitor de 3440×1440.
Anota nombre del personaje, enemigo, nivel, hechizos y qué sentiste.

- [ ] Brasa pura 5: combate del mismo nivel, ¿hay tiempo para decidir?
- [ ] Tormenta pura 5: misma zona, ¿la diferencia de daño tiene sentido?
- [ ] Curandera 8: escucha la tortuga a vida completa y después de recibir daño;
  ¿hay sonidos repetidos sin curación efectiva?
- [ ] Mueve y apunta un hechizo con indicador: ¿puedes confirmar y cancelar sin
  perder control del personaje?
- [ ] Abre ESC/Opciones: confirma que el mundo sigue vivo y que puedes usar
  controles sin mover al personaje por accidente.
- [ ] Prueba la cripta de entrada y del guardián: indica si puedes reconocer la
  ruta, las escaleras y el objetivo sin instrucciones externas.
- [ ] Con la ballesta, cambia de objetivo entre disparos y comprueba que el
  proyectil visible sigue al enemigo al que disparaste. La regresión de
  trayectorias ya está automatizada; falta confirmar la lectura visual en partida.
- [ ] Muere, pulsa Continuar como espectro, intenta combatir/recoger y sigue
  Guiar al Alzador. Verifica texto, brillo, llegada y regreso a la forma viva.
- [ ] Repite la caída dentro de la cripta y guarda/carga durante el recorrido
  espectral. El botín pendiente debe seguir disponible al resucitar.

Formato útil para cada problema: pasos -> esperado -> observado -> frecuencia.
Una captura o clip corto es útil para fallos visuales o de ritmo; no necesito
contraseñas, claves de servicios ni información privada.

## 2026-11-02 — Prueba humana de mochila y banco

- Confirmado: solo mochila cuenta para el peso.
- En Electron, entra al edificio del banco en el Cruce (116,132), pulsa empleado/cofre y prueba Enviar todo, categoría, Ctrl/Mayús y doble clic. El equipo debe permanecer puesto.
- Llena la mochila: una compra normal debe rechazarse sin cobrar. Cobra una recompensa de combate/misión por encima del límite: debes caminar al 50 %. Deposita hasta quedar bajo el límite: recuperas velocidad.
- Guarda/carga tras depositar: el cofre conserva sus objetos; cargar desde el interior reaparece delante de la puerta.
- Abre tienda: la mochila de venta no debe mostrar equipo. Revisa Información/Conjunto/Recetas con clic derecho.
- Falta tu valoración de claridad de «briznas», capacidad actual 1500 y pesos por objeto; son valores de prueba.
