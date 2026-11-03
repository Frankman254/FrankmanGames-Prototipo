# Acciones y respuestas del creador

Actualizado: 2026-11-02. Puedes responder en este archivo o en el chat.
Las decisiones abiertas no impiden corregir errores ni ejecutar pruebas.

## Decisiones que necesito antes de cerrar mecánicas

| ID | Decisión | Tu respuesta |
|---|---|---|
| H01 | Activación de muerte espectral | Solicitada por el creador el 2026-11-02; implementada en cada caída como comportamiento inicial. |
| H02 | Al llegar Pulso a cero: ¿debilitado, espera de resurrección o combate bloqueado? death.json propone weakened; no se considera aprobado. | Pendiente |
| H03 | Muerte espectral dentro de la cripta | Se continúa como espectro en el exterior junto a la Piedra Pintada. No se revive gratis al salir. Comportamiento técnico inicial revisable. |
| H04 | Para balancear: ¿cuánto debería durar un combate normal de tu nivel y uno contra jefe? Si no quieres segundos, compara una partida de prueba que se sienta bien con otra demasiado lenta. | Pendiente |
| H05 | Máscara de Diablico: ¿atacar rompe el disfraz? ¿recibir daño también? ¿hay enemigos que detecten aunque no ataques? | Pendiente |

## Prueba humana corta (sensación y sonido)

Usa Partidas de prueba; no hace falta reemplazar un guardado personal.
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
