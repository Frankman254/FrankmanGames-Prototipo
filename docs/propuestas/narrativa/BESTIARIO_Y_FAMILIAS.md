# BESTIARIO Y FAMILIAS — Las Sabanas de Los Santos

**Estado:** `PROPUESTA`  
**Fecha:** 2026-11-05  
**Autor:** Agente Local de Narrativa y World Building V1.0

---

## INTRODUCCIÓN

Este documento detalla **tres familias originales de criaturas** diseñadas específicamente para las sabanas de Los Santos (panama). Cada familia tiene:
- Personalidad jugable diferenciada
- Mecánicas únicas que no se basan solo en más vida o daño
- Relación ecológica con otras criaturas del ecosistema
- Recompensas con sentido narrativo

**Nota**: Las familias utilizan arquetipos existentes (`data/rpg/enemies.json`) como base, pero cada miembro tiene comportamientos y estilos de combate propios.

---

## FAMILIA 1: «Los Satos Cimarrones»

### ID Propuesto: `sato_cimarron_familia`  
**Nombre de Familia**: Los Satos Cimarrones  
**Región**: Las Sabanas de Azuero / Villa Raspadura  
**Hábitat**: Potreros, cercas vivas, caminos rurales  
**Origen Narrativo**: Criaturas ancestrales de las sabanas panameñas que han sobrevivido siglos de cambios climáticos. Se alimentan de animales pastantes y cazan en manada.

### Comportamiento Fuera de Combate
- **Territorial**: Marcan su territorio con excremento y aleteo fuerte
- **Jerárquicas**: Cada manada tiene un líder (sato alfa) que dirige las cacerías
- **No Agresivas inicialmente**: Se acercan a los viajeros para evaluar amenazas; atacan solo si se sienten amenazados o cuando alimentan a sus cachorros

### Función Ecológica
- **Cazadores de herbívoros**: Controlan las poblaciones de animales pastantes
- **Distribuidores de semillas**: Al excavar en el suelo buscan raíces y tubérculos, dispersando semillas al hacer nidos
- **Purificadores de agua**: Beben de los arroyos y limpien depósitos naturalmente

### Relaciones con Otras Criaturas
- **Aliados naturales**: Águilas harpías cazan satos jóvenes en zonas abiertas
- **Depredadores**: Duendes tirapiedras acechan desde lejos para atacar a las crías
- **Symbiotes**: Los curanderos de huesos usan la carne de sato para crear pociones de fuerza bruta

### Variantes

#### Sato Cimarrón Común
**Nivel Base**: 1-5  
**Estilo de Combate**: Carga frontal con mordisco fuerte  
**Habilidades Exclusivas**: 
- «Zafar»: Se lanza hacia adelante a alta velocidad (cooldown 8s)  
- «Mordisco de Fuego»: Respira fuego al atacar si el clima es soleado (cooldown 12s)

#### Sato Especial: Guardián de la Cuesta
**Nivel Base**: 6-10  
**Estilo de Combate**: Defensivo y resistente, se coloca entre su manada y la amenaza  
**Habilidades Exclusivas**: 
- «Escudo de Cola»: Levanta su cola para bloquear ataques (reducción 30% daño físico, 5s)  
- «Aullido de Alerta»: Avisa a toda la manada de una zona (invoca satos cercanos en 4s)

#### Sato Jefe: Capitán del Potrero
**Nivel Base**: 12-15  
**Estilo de Combate**: Tanque con daño area, lidera a toda su manada al ataque  
**Habilidades Exclusivas**: 
- «Carga de Manada»: Lleva consigo a 3 satos menores que atacan junto (cooldown 20s)  
- «Grito de Dominio»: Aturde y ralentiza a los enemigos cercanos (cooldown 15s)

### Estilo de Combate
**Patrón Típico**: 
1. El sato detecta al jugador desde 40m y lo marca como amenaza potencial
2. Muestra agresión leve: orejas erguidas, roer la tierra con las patas delanteras
3. Si el jugador se acerca sin atacar a otros miembros de la manada, el sato huye

**En Combate**: 
- Ataca frontalmente con mordiscos fuertes
- Usa «Zafar» para cerrar distancia rápidamente
- En grupos, coordinan ataques simultáneos desde diferentes ángulos

### Hechizos Originales
| Nombre | Elemento | Efecto | Cooldown | Recurso |
|---|---|---|---|---|
| **Llama del Sato** | Fuego | Ataque frontal con fuego (5m área) | 12s | 40% |
| **Zafar Brillante** | Neutro | Carga y salta hacia adelante causando daño area | 8s | 35% |

### Mecánica Exclusiva: «Instinto de Manada»
Cada sato tiene un contador oculto que se llena cuando está cerca de otros satos. Cuando está completo, el sato invoca a todos los satos de su manada dentro del radio de 60m para atacar simultáneamente con efecto area.

**Contra-ajuego**: El jugador puede separar a la manada usando hechizos de viento o movimiento rápido antes de que se activen los invocadores.

### Debilidad Aprovechable
- **Viento fuerte**: Los satos no pueden controlar su dirección cuando hay vientos de 30km/h o más
- **Ruido intenso**: Un grito repentino puede confundir a la manada temporalmente

### Señales Visuales y Sonoras de sus Ataques
- **Visual**: Orejas erguidas, pelaje erizado, brillo rojizo en los ojos
- **Sonora**: Gritos roncos antes del ataque, rugidos coordinados entre manadas
- **Sistema**: ¡RUGIDO! cuando se activa instinto de manada

### Respuesta del Jugador o Contrajuego
- Separa a la manada con hechizos de viento o movimiento rápido
- Usa el viento fuerte para desorientarlos temporalmente
- Ataca desde lejos antes de que activen su instinto de manada

### Recompensas con Sentido
| Item | Descripción | Uso Común | Rariedad |
|---|---|---|---|
| Colmillo de Sato | Diente afilado y resistente | Arma básica para cazadores artesanales | Común |
| Piel de Sato | Cuero grueso y resistente | Material para armaduras ligeras | Común |
| Cola del Guardián | Cola completa de sato especial | Hechizos que invocan satos protectores | Raro |

### Posibles Interacciones en Grupo
- Los satos atacan mejor cuando están cerca de otros satos (bonificación 10% daño)
- Pueden ser aliados temporales contra enemigos mayores si son alimentados con carne cruda
- No atacan a otras criaturas amistosas (duendes, curanderos) si no hay comida disponible

### Riesgos de Balance
- En climas fríos o sin comida, los satos pueden volverse más agresivos y atacar sin motivo aparente
- La habilidad «Instinto de Manada» puede saturar zonas con muchos enemigos
- Los sato jefe pueden sobrevivir demasiado tiempo en niveles bajos si el jugador no usa debilidad adecuada

### Requisitos Técnicos para Claude
```json
{
  "archetype": "melee",
  "levelMin": 1, 
  "levelMax": 5,
  "element": "physical",
  "stats": {
    "power": 120,
    "critChance": 0.15,
    "critBonus": 0.8,
    "armor": 5,
    "resist.physical": 10
  },
  "skills": [
    {
      "id": "zafar",
      "name": "Zafar Brillante",
      "cooldown": 8,
      "resourceCost": 35,
      "range": 45,
      "area": true,
      "damageMultiplier": 1.5
    },
    {
      "id": "llama_del_sato", 
      "name": "Llama del Sato",
      "cooldown": 12,
      "resourceCost": 40,
      "range": 6,
      "areaRadius": 5,
      "elementDamage": "fire"
    }
  ],
  "mechanics": {
    "id": "instinto_de_manada",
    "name": "Instinto de Manada",
    "trigger": "companion_count >= 8",
    "effect": "invoke_all_nearby_satos",
    "radius": 60,
    "duration": 5
  },
  "weaknesses": {
    "id": "wind_vulnerable",
    "name": "Vulnerabilidad al Viento",
    "condition": "wind_speed >= 30",
    "effect": "random_direction_chaos"
  }
}
```

---

## FAMILIA 2: «Los Duendes Tirapiedras»

### ID Propuesto: `duende_tirapiedras_familia`  
**Nombre de Familia**: Los Duendes Tirapiedras  
**Región**: Costas cercanas a Villa Raspadura / Charco de la Garza  
**Hábitat**: Zonas rocosas, bordes de caminos, lugares elevados  
**Origen Narrativo**: Criaturas pequeñas y ágiles que han sobrevivido en las zonas costeras áridas de Los Santos. Se especializan en lanzar piedras desde lejos para atacar a sus presas sin exponerse directamente.

### Comportamiento Fuera de Combate
- **Escondidos**: Permanecen camuflados entre rocas y vegetación baja
- **Observadores**: Miran al jugador desde lejos evaluando si representa una amenaza
- **Avisperingos**: Cuando detectan intrusos, hacen ruidos agudos para advertir a otros duendes cercanos

### Función Ecológica
- **Controladores de poblaciones**: Cazan insectos y pequeños reptiles que amenazan las zonas costeras
- **Distribuidores de fertilizante**: Su excremento enriquece naturalmente el suelo rocoso
- **Alerta temprana**: Su sistema de comunicación advierte a otras criaturas sobre peligros cercanos

### Relaciones con Otras Criaturas
- **Aliados naturales**: Duendes tirapiedras trabajan juntos para cazar presas más grandes
- **Depredadores**: Águilas harpías los cazan cuando están cerca del agua
- **Symbiotes**: Los curanderos de huesos usan sus piedras afiladas para crear armas arrojadizas

### Variantes

#### Duende Tirapiedras Común
**Nivel Base**: 2-6  
**Estilo de Combate**: Ataque a distancia con lanzamiento de piedras  
**Habilidades Exclusivas**: 
- «Piedra Afilada»: Lanza piedra con trayectoria curva (cooldown 6s)  
- «Salto de Rocas»: Salta entre rocas para esquivar ataques (cooldown 8s)

#### Duende Especial: Tirapiedras Maestro
**Nivel Base**: 7-12  
**Estilo de Combate**: Ataque preciso con daño crítico elevado  
**Habilidades Exclusivas**: 
- «Piedra Explosiva»: Lanza piedra que explota al impactar (cooldown 10s)  
- «Campo de Piedras»: Crea campo de piedras en el suelo para aturdir enemigos (cooldown 14s)

#### Duende Jefe: Anciano del Acantilado
**Nivel Base**: 13-17  
**Estilo de Combate**: Control de área con invocación de lluvia de piedras  
**Habilidades Exclusivas**: 
- «Tormenta de Piedras»: Invoca tormenta que cae sobre el área (cooldown 25s)  
- «Pared de Rocas»: Crea barrera impenetrable temporalmente (cooldown 18s)

### Estilo de Combate
**Patrón Típico**: 
1. El duende detecta al jugador desde 60m y se esconde detrás de rocas
2. Lanza piedras desde lejos evaluando el daño del jugador
3. Cuando está cerca, salta entre rocas para evitar contraataques

**En Combate**: 
- Prefiere mantener distancia (40-50m) con ataques a distancia
- Usa saltos entre rocas para evadir ataques directos
- En grupo, coordinan ataques desde diferentes posiciones elevadas

### Hechizos Originales
| Nombre | Elemento | Efecto | Cooldown | Recurso |
|---|---|---|---|---|
| **Piedra Afilada** | Físico | Lanza piedra con trayectoria curva | 6s | 30% |
| **Campo de Piedras** | Tierra | Crea campo que aturde enemigos cercanos | 14s | 25% |

### Mecánica Exclusiva: «Red de Tirapiedras»
Los duendes tirapiedras comunican entre sí a través de una red subterránea de piedras afiladas. Cuando un jugador elimina a varios duendes de la misma zona, el resto se retira temporalmente (cooldown 45s) para reorganizar sus fuerzas.

**Contra-ajuego**: El jugador puede seguir atacando mientras el cooldown cuenta; después del cooldown, los duendes vuelven más rápidos y agresivos.

### Debilidad Aprovechable
- **Ruidos intensos**: Un grito o explosión confunde a los duendes temporalmente
- **Movimiento rápido**: Los duendes no pueden seguir al jugador si se mueve demasiado rápido

### Señales Visuales y Sonoras de sus Ataques
- **Visual**: Ojos que brillan cuando cargan una piedra afilada, postura tensa
- **Sonora**: Ruidos agudos tipo silbido antes de lanzar piedras
- **Sistema**: ¡PITIDO! cuando activa «Tormenta de Piedras»

### Respuesta del Jugador o Contrajuego
- Usa ruido intenso (explosiones, gritos) para confundirlos temporalmente
- Mantiene movimiento constante para evitar que los duendes prevean sus movimientos
- Ataca desde el suelo mientras ellos están en posiciones elevadas

### Recompensas con Sentido
| Item | Descripción | Uso Común | Rariedad |
|---|---|---|---|
| Piedra Afilada | Piedra afilada por los duendes | Hechizo básico de ataque a distancia | Común |
| Ojo de Duende | Ojo brillante del anciano | Amuleto que revela posiciones de enemigos invisibles | Raro |

### Posibles Interacciones en Grupo
- Los duendes tirapiedras atacan mejor cuando el jugador mantiene movimiento constante
- Pueden ser aliados temporales contra enemigos que no pueden saltar entre rocas
- No atacan a criaturas acuáticas (duendes tienen miedo del agua)

### Riesgos de Balance
- Las habilidades de área («Tormenta de Piedras») pueden saturar zonas con muchos enemigos
- Los duendes tirapiedras maestro pueden sobreviver demasiado tiempo sin debilidad adecuada
- La mecánica de «Red de Tirapiedras» puede frustrar a jugadores que no entiendan el cooldown

### Requisitos Técnicos para Claude
```json
{
  "archetype": "ranged",
  "levelMin": 2, 
  "levelMax": 6,
  "element": "physical",
  "stats": {
    "power": 90,
    "critChance": 0.18,
    "critBonus": 1.2,
    "armor": 3,
    "resist.storm": 15
  },
  "skills": [
    {
      "id": "piedra_afilada", 
      "name": "Piedra Afilada",
      "cooldown": 6,
      "resourceCost": 30,
      "range": 50,
      "trajectoryCurve": true
    },
    {
      "id": "campo_de_piedras", 
      "name": "Campo de Piedras",
      "cooldown": 14,
      "resourceCost": 25,
      "range": 35,
      "areaRadius": 8,
      "effect": "stun"
    }
  ],
  "mechanics": {
    "id": "red_de_tirapiedras", 
    "name": "Red de Tirapiedras",
    "trigger": "kill_count >= 3",
    "effect": "retreat_nearby_enemies",
    "radius": 100,
    "cooldown": 45
  },
  "weaknesses": {
    "id": "acoustic_vulnerable", 
    "name": "Vulnerabilidad Acústica",
    "condition": "loud_sound_detected",
    "effect": "stun_3_seconds"
  }
}
```

---

## FAMILIA 3: «Los Tramperos del Matorral»

### ID Propuesto: `trampero_del_matorral_familia`  
**Nombre de Familia**: Los Tramperos del Matorral  
**Región**: Zonas secas entre las sabanas y la costa / Cerros cercanos a Villa Raspadura  
**Hábitat**: Matorrales densos, zonas con arbustos espinosos, laderas rocosas  
**Origen Narrativo**: Criaturas que han evolucionado para vivir en el matorral denso de Las Tablas. Se especializan en crear trampas naturales y aturdir a sus presas antes de atacarla.

### Comportamiento Fuera de Combate
- **Constructores**: Pasan horas construyendo trampas usando ramas, piedras y tierra
- **Escondidos**: Permanecen ocultos dentro del matorral esperando que las presas caigan en sus trampas
- **Alertas**: Cuando detectan intrusos, activan múltiples trampas simultáneamente

### Función Ecológica
- **Controladores de poblaciones**: Usan trampas para capturar animales grandes sin riesgo directo
- **Ingenieros del suelo**: Sus trampas remueven naturalmente la tierra creando canales de drenaje
- **Ciclistas de nutrientes**: Al activar trampas, liberan nutrientes del matorral al suelo

### Relaciones con Otras Criaturas
- **Aliados naturales**: Trabajan en grupo para crear redes complejas de trampas
- **Depredadores**: Duendes tirapiedras los acechan desde las zonas elevadas
- **Symbiotes**: Los curanderos usan sus trampas como mecanismos para hechizos area

### Variantes

#### Trampero del Matorral Común
**Nivel Base**: 3-7  
**Estilo de Combate**: Crea trampas y se esconde mientras aturde a la presa  
**Habilidades Exclusivas**: 
- «Trampa de Espinas»: Activa trampas ocultas que aturden enemigos (cooldown 10s)  
- «Disparación Rápida»: Se mueve entre arbustos sin ser detectado (cooldown 8s)

#### Trampero Especial: Arquitecto de Trampas
**Nivel Base**: 8-13  
**Estilo de Combate**: Crea redes complejas de trampas que activan secuencialmente  
**Habilidades Exclusivas**: 
- «Red de Ataduras»: Crea red que restringe movimiento enemigo (cooldown 15s)  
- «Disparación Masiva»: Activa todas las trampas de la zona simultáneamente (cooldown 20s)

#### Trampero Jefe: Maestro del Matorral
**Nivel Base**: 14-18  
**Estilo de Combate**: Control total de área con sistemas complejos de trampas  
**Habilidades Exclusivas**: 
- «Matorral Infinito»: Crea trampas infinitas mientras viva (cooldown 30s)  
- «Cárcel del Matorral»: Encierra enemigos en zona segura donde no pueden escapar (cooldown 25s)

### Estilo de Combate
**Patrón Típico**: 
1. El trampero se esconde dentro del matorral sin ser detectado
2. Espera a que el jugador entre en zonas con trampas activas
3. Activa trampas simultáneamente para aturdir al enemigo

**En Combate**: 
- Permanece oculto mientras activa trampas
- Usa movimiento rápido entre arbustos para evitar ataques directos
- En grupo, coordinan trampas secuenciales desde diferentes puntos del matorral

### Hechizos Originales
| Nombre | Elemento | Efecto | Cooldown | Recurso |
|---|---|---|---|---|
| **Trampa de Espinas** | Tierra | Activa trampas ocultas que aturden (3s) | 10s | 45% |
| **Red de Ataduras** | Físico | Crea red que restringe movimiento (20%) | 15s | 35% |

### Mecánica Exclusiva: «Sistema de Trampas»
El trampero tiene acceso a una red oculta de trampas en el matorral. Cada trampada activa consume energía; cuando está baja, el trampero se refugia para recargar. Los enemigos que activan trampas reciben daño adicional y aturdimiento.

**Contra-ajuego**: El jugador puede usar hechizos de viento para revelar las trampas ocultas antes de entrar en zonas seguras.

### Debilidad Aprovechable
- **Fuego intenso**: Las trampas de madera se queman cuando hay fuego cercano
- **Movimiento errático**: Los tramperos no pueden predecir movimientos impredecibles

### Señales Visuales y Sonoras de sus Ataques
- **Visual**: Trampas brillantes con ojos rojos, matorral vibrante antes de activar
- **Sonora**: Sonidos tipo crujido de madera y ramas rotas antes del ataque
- **Sistema**: ¡CRUJIDO! cuando activa «Disparación Masiva»

### Respuesta del Jugador o Contrajuego
- Usa hechizos de viento para revelar trampas ocultas antes de entrar
- Mantiene movimiento errático para confundir a los tramperos
- Usa fuego en zonas con matorral seco para destruir trampas

### Recompensas con Sentido
| Item | Descripción | Uso Común | Rariedad |
|---|---|---|---|
| Trampa de Espinas | Trampa natural de matorral | Hechizo que revela trampas ocultas | Común |
| Red de Ataduras | Red compleja del arquitecto | Restringe movimiento enemigo temporalmente | Raro |

### Posibles Interacciones en Grupo
- Los tramperos trabajan mejor cuando el jugador evita activar sus trampas
- Pueden ser aliados temporales contra enemigos que no pueden activar trampas
- No atacan a criaturas acuáticas (tramperos tienen miedo del agua)

### Riesgos de Balance
- Las trampas ocultas pueden confundir a jugadores nuevos
- El trampero jefe puede controlar demasiado área con su habilidad «Matorral Infinito»
- La mecánica de recarga de energía puede frustrar a jugadores que no entienden el cooldown

### Requisitos Técnicos para Claude
```json
{
  "archetype": "trapper",
  "levelMin": 3, 
  "levelMax": 7,
  "element": "physical",
  "stats": {
    "power": 85,
    "critChance": 0.12,
    "critBonus": 0.9,
    "armor": 4,
    "resist.earth": 12
  },
  "skills": [
    {
      "id": "trampa_de_espinas", 
      "name": "Trampa de Espinas",
      "cooldown": 10,
      "resourceCost": 45,
      "range": 30,
      "areaRadius": 6,
      "effect": "stun_3s"
    },
    {
      "id": "red_de_ataduras", 
      "name": "Red de Ataduras",
      "cooldown": 15,
      "resourceCost": 35,
      "range": 40,
      "areaRadius": 8,
      "effect": "movement_restriction_20"
    }
  ],
  "mechanics": {
    "id": "sistema_de_trampas", 
    "name": "Sistema de Trampas",
    "trigger": "trap_energy_low",
    "effect": "retreat_to_recharge",
    "rechargeTime": 30,
    "trapsCount": 12
  },
  "weaknesses": {
    "id": "fire_vulnerable", 
    "name": "Vulnerabilidad al Fuego",
    "condition": "fire_nearby",
    "effect": "destroy_traps"
  }
}
```

---

## COMPARATIVA DE LAS TRES FAMILIAS

| Familia | Estilos de Combate | Mecánicas Únicas | Recompensas Principales | Riesgos Técnicos |
|---|---|---|---|---|
| **Satos** | Tanque frontal con carga y área | Instinto de manada | Colmillos, piel para armas/escudos | Saturación de área con instinto de manada |
| **Duendes** | Ataque preciso a distancia, crítico elevado | Red de tirapiedras (retreat) | Piedras afiladas, ojos especiales | Cooldowns que frustran a jugadores nuevos |
| **Tramperos** | Control de área con trampas ocultas | Sistema de trampas con recarga | Trampas naturales, redes complejas | Mecánica de revelación de trampas confunde |

---

## DECISIONES NARRATIVAS PENDIENTES

1. **Nombres finales de las familias**: ¿Usar nombres panameños reales o inventados?
2. **Interacciones con criaturas existentes**: ¿Los satos atacan a duendes y viceversa?
3. **Eventos especiales**: ¿Los tramperos crean trampas que pueden ser usadas por jugadores?

---

## SIGUIENTES PASOS (Después de Aprobación)

1. Crear fichas completas en `data/rpg/enemies.json` siguiendo el patrón existente
2. Diseñar 2-3 variantes especiales para cada familia (niveles intermedios)
3. Escribir diálogos entre PNJ sobre estas criaturas (PNJs de Villa Raspadura)

---

## RELACIÓN CON CONTENIDO EXISTENTE

Las familias se integran con:
- Criaturas existentes en `data/rpg/enemies.json` (arquetipos `melee`, `ranged`, `trapper`)
- PNJ de `data/rpg/npcs.json` (dialogos sobre estas criaturas)
- Zonas de `data/zones.json` (sabanas, costa, cerros)

**No modifica nada**: solo añade variantes con comportamientos propios sin cambiar el contrato existente.

---

## FUENTES CONSULTADAS

1. `data/panama.json`: Biomas de sabana y costa en Los Santos
2. `data/zones.json`: Franja 1-10 con clima hot
3. `../FrankmanGames/04_VISION_Y_DECISIONES.md`: DEC-2026-005 sobre criaturas

---

## RESUMEN DEL DOCUMENTO

Este documento detalla **tres familias de criaturas originales**:
- **Los Satos Cimarrones** (melee): Manadas con instinto coordinado y carga frontal
- **Los Duendes Tirapiedras** (ranged): Ataque preciso desde distancia con redes de comunicación
- **Los Tramperos del Matorral** (trapper): Control de área con trampas ocultas y sistemas complejos

Cada familia tiene:
- Personalidad jugable diferenciada
- Mecánicas únicas que no se basan solo en más vida o daño
- Recompensas con sentido narrativo
- Relación ecológica con otras criaturas

Todo el contenido se integra con las fichas existentes sin modificaciones, siguiendo la regla clean-room de AGENTS.md.

---

**Fin de documento.**  
Próxima: DIALOGOS_PANAMENOS.md — Guía de escritura para PNJ panameños auténticos.
