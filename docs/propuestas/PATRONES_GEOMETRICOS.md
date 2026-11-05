# Patrones geométricos

Estado: PROPUESTA del 2026-11-04. Lenguaje visual propio del juego, inspirado en técnicas de artesanía panameña. Nombres, paletas y reparto por zona no están aprobados.

## Qué hay

| Pieza | Dónde |
|---|---|
| Geometría de las seis familias, en código | `src/art/patterns.ts` |
| Paletas y reparto por zona | `data/art/patterns.json` |
| 36 PNG, 36 SVG y catálogo para arte y Blender | `arte/patrones/`, con `npm run patterns` |
| Estandarte con clip `Reposo` | `scripts/blender/estandarte.py` |

El juego los usa en alfombras y cenefas de casa, taller, banco y salón del castillo, hechas en `scripts/blender/interiores.py`; en cuatro estandartes de Blender y en la franja al entrar en cada zona.

## Familias

| Familia | Forma | Técnica que la inspiró | Uso sugerido |
|---|---|---|---|
| `laberinto` | Espiral cuadrada de una línea | Líneas paralelas y contornos de las molas guna | Puertas, bordes, puzles |
| `zigzag` | Franjas de dientes | Cenefas de la nagua ngäbe y buglé | Mangas, capas, brazaletes |
| `rombos` | Malla con rombos y corazón | Entramado del mundillo | Túnicas, alfombras, palacios |
| `anidados` | Triángulos dentro de triángulos | Cestería wounaan y emberá | Escudos, vasijas, mosaicos |
| `escalones` | Bandas, escalera y anillos | Franjas del sombrero pintao | Sombreros, cinturones, monturas |
| `estrella` | Estrella de ocho puntas | Estrellas de la cestería wounaan | Emblemas, talismanes, hechizos |

## Reglas

1. **Se calcula, no se copia.** Ningún patrón reproduce una pieza, una foto ni el trabajo de una artesana. Una imagen de referencia nunca entra en el juego.
2. **Nombres genéricos en el juego.** El jugador ve «Rombos» o «Zigzag». No se presentan como molas, naguas o símbolos de un pueblo.
3. **Sin significados inventados.** La magia de un patrón es ficción del juego y no se atribuye a una tradición.
4. **Nada maligno con lo muy reconocible.** Enemigos y zonas malditas no usan las familias más cercanas a una tradición indígena concreta (`laberinto`, `zigzag`, `anidados`). Una prueba lo comprueba en Cerro Ancón.
5. **Fuera de la biblioteca, figuras tradicionales.** Animales de mola, la pollera entera o el sombrero pintao tal cual necesitarían otra decisión, con quien corresponda.

## Antes de publicar el juego

**Revisión legal pendiente.** Panamá tiene un régimen especial de propiedad intelectual sobre los derechos colectivos de los pueblos indígenas ([Ley 20 de 2000](https://docs.panama.justia.com/federales/leyes/20-de-2000-jun-27-2000.pdf)), y la [Ley 377](https://www.laestrella.com.pa/vida-y-cultura/esther-perez-podriamos-volver-a-la-sencillez-de-las-primeras-polleras-AN5852662) declara patrimonio cultural inmaterial las indumentarias tradicionales y sus técnicas. No se pudo leer el texto de los artículos: los PDF consultados no eran legibles. Nada de esto es asesoría legal. Antes de vender el juego conviene preguntar a un abogado panameño si estos patrones, por ser de inspiración, quedan fuera de esas normas.

**Colaboración.** Para piezas más cercanas a una tradición, lo correcto es trabajar con artesanas y reconocer su autoría.

## Fuentes

- Molas: capas, cortes y origen en la pintura corporal: [Wikipedia](https://en.wikipedia.org/wiki/Mola_(art_form)) y [Museo de Arte de Cleveland](https://www.clevelandart.org/articles/fashioning-identity). No se encontró una fuente fiable sobre el significado de cada motivo geométrico.
- Nagua: los diseños y la serpiente `makata tärän`, los triángulos y el sol: [Ministerio de Cultura de Panamá](https://mipatrimonio.micultura.gob.pa/wp-content/uploads/2023/12/3_Confección-Naon-nagua-.pdf), leído solo en el resumen del buscador. No se encontró una fuente sobre el zigzag en concreto.
- Cestería wounaan y emberá: meandro, damero, espirales y estrellas: [Bowers Museum](https://bowers.org/index.php/collection/collection-blog/coils-and-swamp-oils-baskets-of-the-embera-wounaan).
- Sombrero pintao: patrimonio inmaterial de la UNESCO desde 2017 y fibras teñidas de negro: [TVN](https://www.tvn-2.com/nacionales/unesco-sombrero-patrimonio-inmaterial-humanidad_1_1040260.html) y [La Estrella](https://www.laestrella.com.pa/cafe-estrella/cultura/211215/sombrero-pintao-prenda-peligro-extincion).
- Mundillo y labores de la pollera: [Wikipedia](https://en.wikipedia.org/wiki/Pollera). No se encontró una descripción técnica de sus entramados: `rombos` parte de la propuesta del creador.
