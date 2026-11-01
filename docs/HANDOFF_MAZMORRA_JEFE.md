# HANDOFF — Mazmorra diseñada y jefe

## Qué quedó funcionando

- La Cripta de la Tulivieja tiene cinco pisos finitos hechos a mano en `data/dungeons/cripta-tulivieja.json`.
- `generateFloor` usa esos planos manuales; el generador por semilla sigue disponible como alternativa con `mode: "seed"`.
- El formato incluye rejilla, escaleras, cofres, puertas, palancas, placas de presión, trampas temporizadas, salas de cierre, atajos y spawns.
- El validador comprueba formato rectangular, símbolos, alcance desde la entrada, activadores y puertas, spawns y guardián.
- El tercer piso contiene el minilaberinto y la llave; el cuarto, una sala que se cierra hasta limpiar; los atajos persisten para el regreso.
- El Silbador de Cal es el encuentro raro de pisos profundos, con probabilidad y señal audiovisual declaradas en datos.
- La Matriarca del Hilo Roto tiene tres fases, umbrales 66/33 %, invocaciones que conceden inmunidad, cambio de arena, rayo entre pilares y furia a los 210 s. El cambio de fase produce una solicitud pura de pausa de cámara de 850 ms.
- En el último piso aparece una barra superior responsiva con nombre, fase y vida; usa el componente reutilizable `ProgressBar`.
- La primera victoria entrega `moonstone_amulet`; las siguientes no repiten el premio.

## Cómo probar

1. `npx vitest run tests/dungeon.test.ts tests/designedDungeon.test.ts`
2. Entrar a la Cripta de la Tulivieja con la llave y bajar los cinco pisos.
3. Revisar a ojo las puertas y placas: el render específico de esos props todavía es geometría provisional; la lógica y los planos ya son definitivos como experimento.

## Pendiente visual

- Conectar la pausa cinematográfica al controlador de cámara final.
- Dar mallas/partículas propias a puertas, placas, pinchos, cambios de arena y señal del Silbador.
- Sustituir el cofre final provisional por el cofre con cerradura visible.

Todo lo anterior sigue siendo `PROPUESTA`; no fija el balance ni la dirección artística.
