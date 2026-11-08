# CATÁLOGO DE MISIONES — Los Santos

**Estado:** `PROPUESTA`  
**Fecha:** 2026-11-05  
**Autor:** Agente Local de Narrativa y World Building V1.0

---

## INTRODUCCIÓN

Este catálogo compila todas las misiones para el primer arco narrativo en Los Santos (Villa Raspadura). Incluye:
- **8 misiones principales** (cadena principal «Encargos del pueblo» + arcu)
- **3 misiones opcionales** (side quests)
- **1 misión epílogo** (conclusión del arco)

Todas las misiones se integran con el sistema existente en `data/rpg/quests.json` sin modificaciones.

---

## MISIONES PRINCIPALES (Cadena Central)

### Q0: «La Bienvenida»
- **Tipo**: Introducción al mundo
- **Nivel**: 1-2
- **Ofrecida por**: Celso Musgo (anciano del pueblo)
- **Encadenamiento**: Inicial (sin requisitos)
- **Resumen**: Tu primera lección como aventurero en Los Santos. Aprende las tradiciones locales y la historia del pueblo.
- **Objetivos**:
  - Visitar la piedra del vigía (al este, coordenadas: x=180, y=132)
  - Escuchar las historias locales de Celso Musgo en su cabaña
- **Texto Oferta**: "Bienvenido a Villa Raspadura. Soy Celso Musgo, el anciano del pueblo. Antes de irte explorando, déjame contarte algo sobre estas tierras. Ve al este, hay una piedra donde antes se vigilaba el llano."
- **Texto Progreso**: "La piedra del vigía está al este... No te pierdas."
- **Texto Completado**: "Bienvenido a Villa Raspadura. Este es tu hogar temporal mientras exploras Los Santos. Las sabanas son bellas pero peligrosas... Aprende de los locales antes de irte a las zonas externas."
- **Recompensas**: XP 40, Oro 15, Item: «Gorra de Sabano» (raro)
- **Duración estimada**: 10 minutos

---

### Q1: «Percas para la Cena»
- **Tipo**: Introducción a la pesca
- **Nivel**: 1-3
- **Ofrecida por**: Marina Junco (pescadora)
- **Encadenamiento**: Sin requisitos
- **Resumen**: Pesca tres peces del Charco de la Garza y llévale dos percas plateadas para la posada.
- **Objetivos**:
  - Capturar 3 peces en el estanque (mecánica pesca existente)
  - Traer 2 percas plateadas (`fish_silver_perch`) a Marina
- **Texto Oferta**: "Me he torcido la muñeca y la posada me pide percas para la cena. ¿Te animas? El estanque está al suroeste. Tres capturas, y tráeme dos percas."
- **Texto Progreso**: "¿Ya pican? Las percas son las plateadas, de aleta corta."
- **Texto Completado**: "¡Qué buenas! Toma, por las molestias. Y quédate con lo demás que saques: el estanque es de todos."
- **Recompensas**: XP 40, Oro 12, x3 Poción Menor de Vida (`minor_health_potion`)
- **Duración estimada**: 15 minutos

---

### Q2: «Satos Junto al Camino»
- **Tipo**: Introducción al combate contra criaturas hostiles
- **Nivel**: 3-5
- **Ofrecida por**: Odila Brezo (sargento de guardia)
- **Encadenamiento**: Sin requisitos
- **Resumen**: Una manada ronda el camino del noroeste. La sargento Odila Brezo pide abatir tres satos y traer dos colmillos como prueba.
- **Objetivos**:
  - Matar 3 satos cimarrones (archetypes: `melee`, `alpha_wolf`)
  - Traer 2 colmillos de sato (`fang`) como prueba
- **Texto Oferta**: "Una manada se ha instalado junto al camino del noroeste y los carreteros ya no pasan. Abate tres satos y tráeme dos colmillos, que el alcalde no se fía de nadie."
- **Texto Progreso**: "Los satos siguen ahí, ¿no? Se les oye de noche."
- **Texto Completado**: "Dos colmillos, bien afilados. Buen trabajo. Esto es de la guardia, que no se diga que no pagamos."
- **Recompensas**: XP 70, Oro 25, Item: `wolf_tooth_amulet` (raro)
- **Duración estimada**: 20 minutos

---

### Q3: «La Piedra del Vigía»
- **Tipo**: Investigación y viaje
- **Nivel**: 4-6
- **Ofrecida por**: Odila Brezo
- **Entregada a**: Celso Musgo (turnIn)
- **Encadenamiento**: `requires`: ["q_wolf_cull"]
- **Resumen**: Odila quiere saber si la vieja piedra del vigía, al este del pueblo, sigue en pie. Ve a verla y cuéntaselo al anciano Celso Musgo, que fue vigía de joven.
- **Objetivos**:
  - Visitar la piedra del vigía (al este, coordenadas: x=180, y=132)
  - Contárselo a Celso Musgo (talk elder)
- **Texto Oferta**: "Ya que tienes buenas piernas: al este hay una piedra donde antes se vigilaba el llano. Mira si sigue en pie y cuéntaselo al viejo Celso. Él la plantó."
- **Texto Progreso**: "La piedra del vigía, al este. No tiene pérdida."
- **Texto Completado**: "¿Sigue en pie? Ja, como yo. Gracias por venir a contármelo: a mí ya no me llegan las piernas hasta allí."
- **Recompensas**: XP 50, Oro 10
- **Duración estimada**: 15 minutos

---

### Q4: «Un Tónico para el Anciano»
- **Tipo**: Recolección de recursos
- **Nivel**: 5-7
- **Ofrecida por**: Celso Musgo
- **Encadenamiento**: `requires`: ["q_watchstone", "q_perch_supper"]
- **Resumen**: A Celso Musgo le duelen las rodillas. Consíguele un tónico de recurso (el boticario Tobías Cardo los vende) y un trozo de cuero para su rodillera.
- **Objetivos**:
  - Recoger 1 tónico de recurso (`resource_tonic`) del boticario Tobías
  - Conseguir 1 cuero de sato (`hide`, drop de satos)
- **Texto Oferta**: "Las rodillas, ya sabes. Tobías tiene un tónico que me alivia, y si me traes un trozo de cuero me apaño una rodillera. Los satos lo sueltan."
- **Texto Progreso**: "El tónico lo vende Tobías, el boticario. El cuero, cualquier sato."
- **Texto Completado**: "Ah, mucho mejor. Te has portado. Vuelve a verme: hay algo que quiero enseñarte."
- **Recompensas**: XP 60, Oro 20, x2 Tónico de Recurso (`resource_tonic`)
- **Duración estimada**: 25 minutos

---

### Q5: «La Lección del Viento»
- **Tipo**: Introducción a los hechizos
- **Nivel**: 7-9
- **Ofrecida por**: Celso Musgo
- **Encadenamiento**: `requires`: ["q_elder_remedy"]
- **Resumen**: Celso Musgo te enseñará a doblar el viento si demuestras que puedes plantar cara a los duendes del este.
- **Objetivos**:
  - Matar 3 duendes tirapiedras del este (archetypes: `ranged`, `goblin_veteran`) en zona x=172, y=150, radio=5m
- **Texto Oferta**: "El viento del este trae duendes. Si quieres que te enseñe a apartarlos de tu camino, primero demuéstrame que no les tienes miedo. Tres bastarán."
- **Texto Progreso**: "Tres duendes. No te pido más."
- **Texto Completado**: "Bien. Ahora escucha y mira mis manos: el viento no se empuja, se acompaña... Así. Ya es tuyo."
- **Recompensas**: XP 120, Oro 30, learnSpell: `gust` (viento básico)
- **Duración estimada**: 30 minutos

---

### Q6: «Rastros en el Matorral»
- **Tipo**: Introducción a las mazmorras
- **Nivel**: 8-12
- **Ofrecida por**: Celso Musgo / Odila Brezo
- **Encadenamiento**: `requires`: ["q_east_wind"]
- **Resumen**: Rastrea las señales de una Cristal antigua que ha despertado. Esta es la clave para entrar a La Torre del Resplandor.
- **Objetivos**:
  - Encontrar la Cristal de los Sabanos (escondida al noroeste, coordenadas: x=95, y=85)
  - Reportar su despertar a Celso Musgo
- **Texto Oferta**: "Siento una presencia antigua... Una cristal ha despertado en las alturas del norte. Es Lúmina, la guardiana de las sabanas. Si puedes encontrarla sin perder el camino..."
- **Texto Progreso**: "Sigue los rastros... Las cristales brillan cuando hay peligro cerca."
- **Texto Completado**: "¡Sí! La cristal está ahí. Ahora puedo abrir la puerta a la Torre del Resplandor."
- **Recompensas**: XP 180, Oro 50, Item: `gem_crystal` (muy raro)
- **Duración estimada**: 40 minutos

---

### Q7: «El Equilibrio de las Tierras»
- **Tipo**: Culminación del arco inicial
- **Nivel**: 10-12
- **Ofrecida por**: Celso Musgo (Culminación)
- **Encadenamiento**: `requires`: ["q_watchstone", "q_perch_supper", "q_elder_remedy"]
- **Resumen**: Ayuda a restaurar el equilibrio entre caza, pesca y vida natural en las sabanas de Los Santos.
- **Objetivos**:
  - Matar 5 criaturas hostiles de Las Sabanas (melee, ranged, trapper, summoner)
  - Recolectar 3 Cristales debilitados (`resource_crystal`)
  - Pescar 1 banco agotado hasta que se repobla (`fishing:restock`)
- **Texto Oferta**: "Las tierras de Las Tablas están desequilibradas. Los satos atropellan los potreros, los peces no pican en el estanque... Ayúdame a restaurar el equilibrio antes de seguir explorando."
- **Texto Progreso**: "Los satos siguen su camino, pero no atacan sin motivo. Las percas vuelven a picar en el estanque. Los cristales brillan más fuerte..."
- **Texto Completado**: "¡El equilibrio se restaura! Gracias por ayudar al pueblo de Villa Raspadura. Ahora puedes seguir hacia Chame... ¿Estás listo?"
- **Recompensas**: XP 200, Oro 75, Item: `amulet_equilibrio` (legendario), learnSpell: `harmonia`
- **Duración estimada**: 60 minutos

---

## MISIONES OPCIONALES (Side Quests)

### DQ1: «El Refugio de la Vieja Sirena»
- **Tipo**: Exploración costera
- **Nivel**: 5-8
- **Ubicación**: Costa cercana a Playa Venao
- **Ofrecida por**: Marina Junco (opcional)
- **Resumen**: Una vieja sirena ha dejado abandonada su concha en la playa. Llévale un canto de agradecimiento y ayuda a reparar su concha.
- **Objetivos**:
  - Encontrar la concha de la sirena (coordenadas: x=280, y=150, zona costera)
  - Recoger coral blanco del mar (`resource_coral`) para reparar
- **Texto Oferta**: "Vieja sirena... ¿verdad? Ella nos cuida desde el mar. La concha está rota en la playa, al suroeste. ¿Le traes un canto de agradecimiento?"
- **Texto Progreso**: "La concha brilla cuando la tocas..."
- **Texto Completado**: "¡Gracias! La vieja sirena nos cuidará mientras exploramos las costas."
- **Recompensas**: XP 80, Oro 30, Item: `concha_sirena` (raro), acceso a pesca costera
- **Duración estimada**: 45 minutos

---

### DQ2: «Las Leyendas del Trapiche»
- **Tipo**: Exploración cultural
- **Nivel**: 6-10
- **Ubicación**: Zona del trapiche en Villa Raspadura
- **Ofrecida por**: Celso Musgo (opcional)
- **Resumen**: Descubre las leyendas sobre el antiguo trapiche de caña. Encuentra la piedra ritual perdida.
- **Objetivos**:
  - Hablar con los cañeros del trapiche (`npc:canero_1`, `npc:canero_2`)
  - Encontrar la piedra ritual (`artifact_piedra_trapiche`) en el interior del trapiche
- **Texto Oferta**: "El trapiche es más que una fábrica. Es parte de nuestra historia. Encuentra la piedra ritual dentro y cuéntame todo."
- **Texto Progreso**: "Las leyendas dicen que el trapiche fue construido por los primeros pobladores..."
- **Texto Completado**: "¡Qué historia tan vieja! La piedra brilla cuando se activa con luz de vela."
- **Recompensas**: XP 100, Oro 40, Item: `piedra_trapiche` (raro), historia adicional del mundo
- **Duración estimada**: 50 minutos

---

### DQ3: «La Cueva del Curandero»
- **Tipo**: Misterio opcional / decisión narrativa
- **Nivel**: 8-12
- **Ubicación**: Colinas al sur de Villa Raspadura
- **Ofrecida por**: Celso Musgo (opcional)
- **Resumen**: Un curandero local busca un talismán perdido en una cueva. Puedes devolverlo o robarlo para investigación.
- **Objetivos**:
  - Encontrar la entrada a la cueva (coordenadas: x=200, y=160)
  - Buscar el talismán (`item_talismán_curandero`) dentro de la cueva
- **Texto Oferta**: "Hay un curandero viejo que perdió su talismán en esa cueva... Puedes devolverlo o investigar."
- **Texto Progreso**: "La cueva es húmeda... Ten cuidado con las grietas del suelo."
- **Texto Completado (si devuelves)**: "¡Gracias! El curandero te agradecerá. Él tiene remedios para tu herida."
- **Texto Completado (si robas)**: "El talismán brilla... Podrías necesitar sus poderes especiales."
- **Recompensas**: XP 120, Oro 50, Item: `talisman_curandero` (muy raro), decisión narrativa con consecuencias acotadas
- **Duración estimada**: 60 minutos

---

## MISIÓN DE EPÍLOGO

### Q8: «La Torre del Resplandor»
- **Tipo**: Mazmorra final del arco
- **Nivel**: 12-15
- **Ofrecida por**: Celso Musgo (después de Q7)
- **Encadenamiento**: `requires`: ["q_equilibrio"] + Item: `gem_crystal` (Q6)
- **Resumen**: Entra a La Torre del Resplandor, una antigua estructura donde los Cristales alimentaban su energía. Restaura el Resplandor Central y enfrenta a la Sombra del Resplandor.
- **Objetivos**:
  - Activar los 3 cristales estabilizadores (pisos 1, 2, 4)
  - Defeatir al jefe final: «Sombra del Resplandor» (Nivel 20) en el Piso 4
- **Texto Oferta**: "La Torre del Resplandor está activa. Lleva la Gema de Cristal y entra por las alturas del norte. Restaura el equilibrio completo."
- **Texto Progreso**: "La torre brilla... Las sombras se retiran gradualmente."
- **Texto Completado**: "¡El Resplandor Central ha sido estabilizado! Las cristales brillan más fuerte que nunca. ¡Gracias por todo!"
- **Recompensas**: XP 300, Oro 100, x3 Gema del Resplandor (muy raro), x5 Cristal Estabilizador, learnSpell: `resplandor_central`
- **Duración estimada**: 90 minutos

---

## TABLA RESUMEN DE TODAS LAS MISIONES

| ID | Nombre | Tipo | Nivel | Ofrecida por | Encadenamiento | Recompensa XP | Recompensa Oro | Duración (min) |
|---|---|---|---|---|---|---|---|---|
| Q0 | La Bienvenida | Introducción | 1-2 | Celso Musgo | Inicial | 40 | 15 | 10 |
| Q1 | Percas para la Cena | Pesca | 1-3 | Marina Junco | Sin requisitos | 40 | 12 | 15 |
| Q2 | Satos Junto al Camino | Combate | 3-5 | Odila Brezo | Sin requisitos | 70 | 25 | 20 |
| Q3 | La Piedra del Vigía | Investigación | 4-6 | Odila Brezo | Q2 | 50 | 10 | 15 |
| Q4 | Un Tónico para el Anciano | Recursos | 5-7 | Celso Musgo | Q3, Q1 | 60 | 20 | 25 |
| Q5 | La Lección del Viento | Hechizos | 7-9 | Celso Musgo | Q4 | 120 | 30 | 30 |
| Q6 | Rastros en el Matorral | Mazmorra | 8-12 | Celso/Odila | Q5 | 180 | 50 | 40 |
| DQ1 | Refugio de la Vieja Sirena | Side Quest | 5-8 | Marina Junco | Opcional | 80 | 30 | 45 |
| DQ2 | Leyendas del Trapiche | Side Quest | 6-10 | Celso Musgo | Opcional | 100 | 40 | 50 |
| DQ3 | Cueva del Curandero | Side Quest | 8-12 | Celso Musgo | Opcional | 120 | 50 | 60 |
| Q7 | El Equilibrio de las Tierras | Culminación | 10-12 | Celso Musgo | Q0, Q1, Q3, Q4 | 200 | 75 | 60 |
| Q8 | La Torre del Resplandor | Epílogo | 12-15 | Celso Musgo | Q7 + Gema Cristal | 300 | 100 | 90 |

**Total**: 
- **Misiones principales**: 8 (Q0-Q7)
- **Side quests**: 3 (DQ1-DQ3)
- **Epílogo**: 1 (Q8)
- **XP total principal**: ~1,140 XP
- **Oro total principal**: ~287 Oro
- **Nivel máximo alcanzado**: 15 (epílogo)

---

## INTEGRACIÓN CON SISTEMA EXISTENTE

### Mapeo a `data/rpg/quests.json`

Las misiones se integran con las fichas existentes:

| Misión | Ficha existente | Modificación requerida |
|---|---|---|
| Q1 «Percas para la cena» | `q_perch_supper` (existe) | ✓ Ya existe, usar tal cual |
| Q2 «Satos junto al camino» | `q_wolf_cull` (existe) | ✓ Ya existe, usar tal cual |
| Q3 «La piedra del vigía» | `q_watchstone` (existe) | ✓ Ya existe, usar tal cual |
| Q4 «Un tónico para el anciano» | `q_elder_remedy` (existe) | ✓ Ya existe, usar tal cual |
| Q5 «La lección del viento» | `q_east_wind` (existe) | ✓ Ya existe, usar tal cual |

Las misiones adicionales (Q0, Q6, Q7, DQ1-DQ3, Q8) son nuevas y deben añadirse a `data/rpg/quests.json`.

### Mapeo a `data/rpg/npcs.json`

Los PNJ existentes se usan como dar/turnIn:
- `fisher` = Marina Junco (Q1, DQ1)
- `guard` = Odila Brezo (Q2, Q3)
- `elder` = Celso Musgo (Q0, Q4-Q8)
- `smith/apothecary` = Tobías Cardo (Q4 - ya existe en datos)

### Mapeo a `data/rpg/enemies.json`

Los arquetipos de criaturas se usan para objetivos de kill:
- `melee` = Sato Cimarrón (Q2)
- `ranged` = Duende Tirapiedras (Q5)
- `trapper` = Trampero del Matorral (Q7)
- `summoner` = Curandero de Huesos (Q7)
- `alpha_wolf` = Sato Alfa (Q2, Q7)

### Mapeo a `data/rpg/items.json`

Items drop/recursos:
- `fang` = Colmillo de sato (Q2)
- `resource_tonic` = Tónico de recurso (Q4)
- `hide` = Cuero de sato (Q4)
- `gem_crystal` = Gema de Cristal (Q6)
- `fish_silver_perch` = Perca plateada (Q1)
- `amulet_equilibrio` = Amuleto del Equilibrio (Q7)
- `concha_sirena` = Concha de sirena (DQ1)
- `piedra_trapiche` = Piedra ritual (DQ2)
- `talisman_curandero` = Talismán del curandero (DQ3)

### Mapeo a `data/rpg/spells.json`

Hechizos aprendidos:
- `gust` = Gusto de viento (Q5)
- `harmonia` = Armónica elemental (Q7)
- `resplandor_central` = Resplandor central (Q8)

---

## FORMATO DE MISIÓN EN JSON

Ejemplo de ficha completa para añadir a `data/rpg/quests.json`:

```json
{
  "id": "q0_bienvenida",
  "name": "La Bienvenida",
  "chain": "Encargos del pueblo",
  "summary": "Tu primera lección como aventurero en Los Santos.",
  "giver": "elder",
  "turnIn": "elder",
  "requires": [],
  "minLevel": 1,
  "objectives": [
    { "type": "reach", "x": 180, "y": 132, "radius": 7, "text": "Visita la piedra del vigía (al este)" },
    { "type": "talk", "npcId": "elder", "text": "Escucha las historias locales" }
  ],
  "offerText": "Bienvenido a Villa Raspadura. Soy Celso Musgo, el anciano del pueblo. Antes de irte explorando, déjame contarte algo sobre estas tierras. Ve al este, hay una piedra donde antes se vigilaba el llano.",
  "progressText": "La piedra del vigía está al este... No te pierdas.",
  "completeText": "Bienvenido a Villa Raspadura. Este es tu hogar temporal mientras exploras Los Santos. Las sabanas son bellas pero peligrosas... Aprende de los locales antes de irte a las zonas externas.",
  "rewards": { "xp": 40, "gold": 15, "items": [ { "itemId": "gorra_sabano", "quantity": 1 } ] }
}
```

---

## CRITERIOS DE ACEPTACIÓN

1. **Funcionamiento técnico**: Todas las misiones deben ser completables con el sistema existente (pesca, combate, botín)
2. **Narrativa coherente**: Deben revelar gradualmente el misterio central sin spoilers prematuros
3. **Balance de niveles**: Los niveles de los enemigos y recompensas deben escalar adecuadamente (1-15)
4. **Reutilización**: No modificar fichas existentes, solo añadir misiones nuevas
5. **Pruebas completas**: Debe existir una ruta jugable completa desde Q0 hasta Q8

---

## DECISIONES PENDIENTES PARA EL CREADOR

1. **¿Incluir todas las misiones o seleccionar 6-7 principales?** (Tecnico: espacio en JSON)
2. **¿Nivel máximo inicial**: ¿Hasta nivel 15 o más alto para el siguiente arco?
3. **¿Estilo visual de los Cristales**: ¿Brillantes y etéreas, o oscuras y misteriosas?

---

## SIGUIENTES PASOS (Después de Aprobación)

1. Añadir fichas de misiones a `data/rpg/quests.json` (solo nuevas, no modificar existentes)
2. Crear items faltantes en `data/rpg/items.json` (`gorra_sabano`, `gem_crystal`, etc.)
3. Crear hechizos aprendidos en `data/rpg/spells.json` (`gust`, `harmonia`, etc.)
4. Escribir diálogos adicionales para los PNJ en `data/rpg/npcs.json`

---

## RELACIÓN CON CONTENIDO EXISTENTE

Este catálogo se integra con:
- Misiones existentes en `data/rpg/quests.json` (5 fichas reutilizadas tal cual)
- PNJ en `data/rpg/npcs.json` (4 fichas reutilizados para dar/turnIn)
- Enemigos en `data/rpg/enemies.json` (7 arquetipos reutilizados)
- Items y hechizos existentes (`fish_silver_perch`, `resource_tonic`, etc.)

**No modifica nada**: las 5 fichas existentes se usan tal cual. Las nuevas misiones se añaden sin cambios en código.

---

## FUENTES CONSULTADAS

1. `data/rpg/quests.json`: Fichas de misiones existentes (reutilizadas)
2. `data/rpg/npcs.json`: PNJ existentes (reutilizados)
3. `../FrankmanGames/04_VISION_Y_DECISIONES.md`: DEC-2026-001..005 sobre tono y estética
4. `docs/PREGUNTAS_CREADOR.md`: Respuestas del creador sobre mecánicas

---

## RESUMEN DEL DOCUMENTO

Este documento detalla:
- **8 misiones principales** (Q0-Q7) con encadenamiento completo
- **3 misiones opcionales** (DQ1-DQ3) para contenido adicional
- **1 misión epílogo** (Q8) que culmina el arco y abre el siguiente capítulo
- **Tabla resumen** con todas las misiones, niveles, recompensas y duración
- **Formato JSON completo** para integrar en `data/rpg/quests.json`

Todo el contenido se integra con las fichas existentes sin modificaciones, siguiendo la regla clean-room de AGENTS.md. Las 5 misiones base se reutilizan tal cual; las nuevas misiones se añaden a la estructura existente.

---

**Fin de documento.**  
Propuestas completadas según orden de trabajo del AGENTS.md:

1. ✓ `docs/propuestas/narrativa/BIBLIA_DEL_UNIVERSO.md` — Tres premisas narrativas
2. ✓ `docs/propuestas/narrativa/HISTORIA_LOS_SANTOS.md` — Primer arco inicial jugable
3. ✓ `docs/propuestas/narrativa/BESTIARIO_Y_FAMILIAS.md` — Diseño de 3 familias originales
4. ✓ `docs/propuestas/narrativa/DIALOGOS_PANAMENOS.md` — Guía de escritura y diálogos
5. ✓ `docs/propuestas/narrativa/CATALOGO_DE_MISIONES.md` — Catálogo completo de misiones

**Pendientes**: `ATLAS_CULTURAL.md` (documentación regional por provincia), `PROCEDENCIA.md` (assets).

---

**Fin de la primera entrega del agente local.**  
Próxima ronda: `ATLAS_CULTURAL.md` para documentar todas las provincias de Panamá.
