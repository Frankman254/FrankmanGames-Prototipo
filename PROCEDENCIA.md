# Registro de procedencia

Cada asset, dependencia con licencia relevante o texto de terceros se anota aquí
**antes** de añadirlo. Nada de FATE, DOFUS Retro o DOFUS 3 puede aparecer.

| Fecha | Archivo / paquete | Origen | Autor | Licencia | Notas |
|---|---|---|---|---|---|
| 2026-11-21 | `assets/models/gotita.glb`, `assets/models/jiron.glb`, `assets/models/brasita.glb`, `assets/models/copito.glb`, `assets/models/alma.glb`, `assets/models/chitra.glb`, `arte/blender/fauna_espiritus.blend`, `scripts/blender/fauna_espiritus.py`, `scripts/blender/validar_fauna_espiritus.py`, `scripts/blender/revisar_fauna_espiritus.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2. Los cinco espiritus comparten literalmente el esqueleto FG_Espiritu (hips/chest/head/armL/armR/tail/tip, cola que barre el suelo); la chitra lleva su rig FG_Chitra (trompa y seis patas). Formas escritas a mano por especie: lagrima goteante, remolino de bruma, ascua con llama de pavesas, bola de nieve con puas de cristal, fantasma de capucha y manto roto, miniatura de zancudo. Lamina `revision_*.png` en `work/omp-fa-12/`, sin material de terceros de referencia | OMP (agente, generadores `scripts/blender/`) | Propiedad de FrankmanGames (original, clean-room) | Espiritus y minions de `boquete_drizzle`, `cerropunta_wisp`, `baru_ember`, `fortuna_flake`, `ancon_soul` y `chame_chitra` segun `work/junie-jl-63/NOMBRE_MODELO.md`; pendientes de decision del creador y de integracion (JL-45). Tonos de `look` en `data/enemies.json` | FrankmanGames | Licencia propia (sin publicar) |
| 2026-11-21 | `assets/models/pirata_bocanas.glb`, `assets/models/capitan_calipso.glb`, `assets/models/marinero_ahogado.glb`, `arte/blender/gente_del_mar.blend`, `scripts/blender/gente_del_mar.py`, `scripts/blender/validar_gente_del_mar.py`, `scripts/blender/revisar_gente_del_mar.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (OMP-FA-13). Tres enemigos de Bocas del Toro sobre el esqueleto humano comun de fg_rig (16 huesos, mismos clips Reposo/Caminar/Correr/Rodar/Golpeado/Morir que arquero y chaman) mas el gesto propio de cada uno. Ropa del Caribe panameno escrita desde cero: pirata flaco de camisa de manta remangada, panuelo rojo anudado y cuchillos de lanza; capitan ancho de levita azul-uva con galones de oro, hombreras con fleco, tricornio, barba entrecana y alfanje; ahogado verdoso jorobado con harapos, rayas de costillas, algas y cabos, gorro calado y anzuelo oxidado prendido al hombro. Ningun asset ni forma copiada de reference_assets/. Autor: OMP (FrankmanGames). Licencia: propia, uso exclusivo del proyecto. |
| 2026-11-21 | `assets/models/buho_chismoso.glb`, `assets/models/quetzal.glb`, `assets/models/pavo_griton.glb`, `arte/blender/fauna_aves.blend`, `scripts/blender/fauna_aves.py`, `scripts/blender/validar_fauna_aves.py`, `scripts/blender/revisar_fauna_aves.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2, sobre el esqueleto de ave de D-17 (huesos homonimos: discos faciales y penachos del buho, cresta y rastreras del quetzal, abanico ocular y papada del pavo; alas modeladas extendidas que el Reposo pliega). Lamina `revision_{buho_chismoso,quetzal,pavo_griton}.png` en `work/omp-fa-11/`, sin material de terceros de referencia | OMP (agente, generadores `scripts/blender/`) | Propiedad de FrankmanGames (original, clean-room) | Criaturas de `boquete_owl`, `boquete_quetzal` y `ancon_pavo` segun `work/junie-jl-63/NOMBRE_MODELO.md`; pendientes de decision del creador y de integracion (JL-45). Tonos de `look` en `data/enemies.json` | FrankmanGames | Licencia propia (sin publicar) |
| 2026-11-21 | `assets/models/medusa.glb`, `assets/models/zancudo.glb`, `arte/blender/fauna_medusa_zancudo.blend`, `scripts/blender/fauna_medusa_zancudo.py`, `scripts/blender/validar_fauna_medusa_zancudo.py`, `scripts/blender/revisar_fauna_medusa_zancudo.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (superficies de revolucion, blobs, tubos y tarjetas; medusa aguamala con campana en domo de faldon abierto, volante, manubrio con boca en cruz, dos brazos orales y ocho tentaculos de punta clara que arrastran por el suelo; zancudo tamano familiar con torax giboso, cabeza compuesta, dos ojos, trompa larga, abdomen estriado de tres segmentos, seis patas de tramo y dos alas de tarjeta venada). Lamina `revision_{medusa,zancudo}.png` en `work/omp-fa-10/`, sin material de terceros de referencia | OMP (agente, generadores `scripts/blender/`) | Propiedad de FrankmanGames (original, clean-room) | Criaturas de `bocas_jelly` y `darien_mosquito` segun `work/junie-jl-63/NOMBRE_MODELO.md`; pendientes de decision del creador y de integracion (JL-45). Tonos de `look` en `data/enemies.json` | FrankmanGames | Licencia propia (sin publicar) |
| 2026-11-21 | `assets/models/tiburon.glb`, `assets/models/calamar.glb`, `arte/blender/fauna_perlas2.blend`, `scripts/blender/fauna_perlas2.py`, `scripts/blender/validar_fauna_perlas2.py`, `scripts/blender/revisar_fauna_perlas2.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs, tubos y polygonadas faceteadas; tiburon martillo con cefalolobo en T y ojos en las puntas, boca ventral con dientes triangulares, cinco branquias, aleta dorsal alta y cola de dos lobulos, apoyado en las puntas de las aletas pectorales y pelvicas; calamar con manto conico y sus aletas, corona de seis brazos ondulados y dos brazos alimentadores con maza de ventosas, pico y ojos enormes de iris dorado); laminas `revision_tiburon.png`/`revision_calamar.png` (5 vistas + 5 pasos) y las 40 vistas sueltas en `work/omp-fa-09/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-09: tiburon martillo patron (`perlas_shark`, elite, 626 triangulos, 1,90 m de punta de martillo a lobulo de cola x 0,88 m de envergadura de aletas x 1,11 m de alto) y calamar gigante madrugada (`perlas_squid`, melee nocturno, 768 triangulos, 1,37 m de los brazos al apice del manto x 0,56 m de ancho x 1,41 m de alto), ambos del Archipielago de las Perlas, que hoy se ven como lobo tenido y diablillo (`work/junie-jl-63/NOMBRE_MODELO.md`, prioridad alta). Rigs `FG_Tiburon` (11 huesos: hips/chest/head/jaw/tail1-3/pecL-R/pelL-R) y `FG_Calamar` (21 huesos: hips/head/jaw/eyeL-R, seis brazos tent1-6 con tip, dos alimentadores fang1-2 con Tip), cinco clips (Reposo, Caminar, Atacar, Golpeado, Morir) sin sufijo y sin salto; el tiburon camina en el sitio ondulando el cuerpo de lado como un pez fuera del agua (las aletas hacen de patas rigidas, convencion de la casa: el juego anda por el suelo, igual que el caiman de FA-02), mandoble de cabeza con la boca abierta y las pectorales abiertas; el calamar ondula la corona de brazos con fase escalonada i/6, clava las dos mazas por delante al atacar y se desploma de brazos al morir. Apoyo z~0 (0,026 y 0,031), materiales tenibles skin/cloth/trim/hair/gear mas ojo propio (ojo_perlas2). Sin lamina REF-01: silueta de campo del martillo y del calamar anotada en el generador. No toca `data/` ni `src/`: integra Junie |
| 2026-11-21 | `assets/models/ostra.glb`, `assets/models/perla.glb`, `arte/blender/fauna_perlas.blend`, `scripts/blender/fauna_perlas.py`, `scripts/blender/validar_fauna_perlas.py`, `scripts/blender/revisar_fauna_perlas.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; bivalvo de dos valvas en abanico con borde festoneado, gozne, siete dientes por valva que engranan al cerrar, cuerpo blando con lengua, manto en fleco, dos ojos en pedúnculo que asoman por el borde delantero y barba de byso para la ostra, y esfera de nácar con ojos de caricatura, cejas de cordel, bocita y nudo del cordel encima para la perla rodante); láminas `revision_ostra.png`/`revision_perla.png` (5 vistas + 5 pasos) y las 40 vistas sueltas en `work/omp-fa-08/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-08: ostra mordelona (`perlas_oyster`, 666 triángulos, 0,72 m de borde a barba × 0,86 m ancho × 0,46 m alto) y perla rodante (`perlas_pearl`, la cría que escupe, 308 triángulos, esfera de ~0,63 m con el cordel). Rigs `FG_Ostra` (hips/lid/body/eyes/byssus: la tapa bate como quijada) y `FG_Perla` (hips/eyes/cordel: Rodar = la esfera da una vuelta completa y los ojos contra-giran mirando al frente; rueda en el sitio, el juego adelanta la entidad). Atacar: batazo de concha / embestida rodando dos vueltas. Apoyo z≈0, materiales tenibles skin/cloth/trim/hair/gear más ojo propio. Sin lámina REF-01: silueta de campo anotada en el generador. No toca `data/` ni `src/`: integra Junie |
| 2026-11-21 | `assets/models/neque.glb`, `assets/models/tapir.glb`, `arte/blender/fauna_darien.blend`, `scripts/blender/fauna_darien.py`, `scripts/blender/validar_fauna_darien.py`, `scripts/blender/revisar_fauna_darien.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; roedor grande de cabeza ancha, oreja corta, crin erizada, bigotes en tarjeta e incisivos que asoman para el ñeque, y cuerpo de barril con trompa corta colgante de dos tramos, crin nucal, manchas claras en carrillo y garganta, calcetines y pezuñas para el tapir); láminas `revision_neque.png`/`revision_tapir.png` (5 vistas + 5 pasos de andar) y las 40 vistas sueltas en `work/omp-fa-06/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-06: ñeque (`darien_neque`, 572 triángulos, 0,58 m de morro a grupa, 0,35 m alto, roedor no espíritu según Q25) y tapir (`darien_tapir`, 620 triángulos, 1,52 m de punta de trompa a grupa, 1,07 m alto con la cruz en ~0,83 m). Rigs `FG_Neque`/`FG_Tapir` (el del tapir añade trunk1/trunk2), clips Reposo/Caminar/Atacar/Golpeado/Morir; Atacar: el ñeque se alza sobre las traseras y muerde, el tapir embiste con trompazo. Apoyo z≈0, materiales tenibles skin/cloth/trim/hair/gear más ojo propio. No hay lámina REF-01 para esta familia: silueta de campo anotada en el generador. No toca `data/` ni `src/`: integra Junie |
| 2026-11-21 | `assets/models/aguila_negra.glb`, `assets/models/aguila_ornada.glb`, `assets/models/aguila_crestada.glb`, `arte/blender/aguilas_darien.blend`, `scripts/blender/aguilas_darien.py`, `scripts/blender/validar_aguilas_darien.py`, `scripts/blender/revisar_aguilas_darien.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; un mismo armazón de rapaz posada con tres variantes: águila negra apagada y lista de cresta corta, águila ornada con cuello castaño, pecho blanco barrado y calzas emplumadas, y la jefa Águila Crestada, gris pizarra, casi el triple de alta, con cresta única en punta echada hacia atrás y garras desmesuradas; ala de tres tiempos con rémiges en hoja y cola en abanico con bandas; láminas `revision_<variante>.png` con las vistas y la tira de salto en `work/omp-fa-21/`) | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-21: familia de águilas de Dariena para `darien_eagle_black`, `darien_eagle_ornate` y la jefa `aguila_crestada` (ids de trabajo hasta BES-02). Rig común `FG_Aguila`: 16 huesos (hips/chest/neck/head/jaw/tail, dos tramos de ala y pata de tres dedos con espolón), clips Reposo/Caminar/Atacar/Golpeado/Morir; Atacar es un salto con las garras clavadas. Triángulos: negra 952, ornada 1.080 (≤1.500), crestada 964 (≤2.500). Alturas 1,07 m y 1,22 m las variantes, 2,87 m la jefa (~3 m pedido), apoyo 0,003 m. Distinta de la montura `aguila_arpia.glb`, que no se toca: la jefa no es una harpía gigante (cresta única, no doble caída). Fantásticas y cómicas; materiales tenibles skin/cloth/trim/hair/gear más ojo y pupila propios. No toca `data/` ni `src/`: integra Junie |
| 2026-11-21 | `assets/models/utileria_cripta.glb`, `arte/blender/utileria_cripta.blend`, `scripts/blender/utileria_cripta.py`, `scripts/blender/validar_utileria_cripta.py`, `scripts/blender/revisar_utileria_cripta.py` | Catálogo original de 12 piezas estáticas de la cripta (OMP-M25), modelado desde cero con primitivas propias en Blender 5.2: sarcofago de piedra y su version dorada con mascara felina, urnas funerarias, raices que revientan el suelo, velas, pila de agua, estalagmitas, telarana de rincon, velon, osario con craneos y canillas, ofrenda de oro y altar de huaca. Materiales procedurales propios (piedra, barro, hueso, oro con emisivo tenue, cera, agua, musgo, hilo de telarana). 2.552 triangulos, 18 materiales, sin rig ni clips, origen al suelo y mirando a -Y como utileria.glb. Tramos segun OMP-POL-02: 1-30 piedra y raices, 31-70 cueva humeda, 71-100 oro y huesos. Clean-room: nada de reference_assets | FrankmanGames (OMP, modo Blender) | Propia del proyecto | OMP-M25; la conecta el programador desde `data/dungeons/` (no toca `data/` ni `src/` aun) |
| 2026-11-21 | `assets/models/rana_venenosa.glb`, `assets/models/rana_ojirroja.glb`, `assets/models/sapo_canaveral.glb`, `assets/models/rana_dorada.glb`, `arte/blender/ranas_cocla.blend`, `scripts/blender/ranas_cocla.py`, `scripts/blender/validar_ranas_cocla.py`, `scripts/blender/revisar_ranas_cocla.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; un mismo armazón de rana bípeda con cuatro variantes: venenosa verdinegra con verrugas asentadas en el lomo, ojirroja delgada de ojos saltones y franja azul en el flanco, sapo del cañaveral ancho y de patas cortas con glándulas parotoides, y la jefa Rana Dorada, el doble de grande, esbelta, de hocico puntiagudo, manchas negras y diadema de tres puntas de oro de Coclá; láminas `revision_<variante>.png` y `revision.png` con las vistas y la tira de ataque en `work/omp-fa-07/`) | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-07: familia de ranas de Coclá para `cocle_frog_poison`, `cocle_frog_redeye`, `cocle_toad` y la jefa `cocle_goldenfrog` (ids de trabajo; los nombres finales los pone BES-02, Junie crea los arquetipos). Rig común `FG_Rana`: 16 huesos (hips/chest/head/jaw, brazos y patas en muslo-espinilla-pie), clips Reposo/Caminar/Salto (llamado Atacar)/Golpeado/Morir. Triángulos: venenosa 1.084, ojirroja 920, sapo 1.084 (≤1.500), dorada 1.060 (≤2.500). Alturas ~1,4–1,7 m las variantes y 3,29 m la jefa, apoyo ≤0,03 m. Fantásticas y cómicas, no una copia de *Atelopus zeteki*; materiales tenibles skin/cloth/trim/hair/gear más ojo y pupila propios. No toca `data/` ni `src/`: integra Junie (JL-72) |
| 2026-11-21 | `assets/models/jaguar.glb`, `assets/models/jaguar_anciano.glb`, `arte/blender/fauna_baru.blend`, `scripts/blender/fauna_baru.py`, `scripts/blender/validar_fauna_baru.py`, `scripts/blender/revisar_fauna_baru.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; rosetas en placa, cola larga de punta clara y biguaríes para el jaguar, y el mismo cuerpo un 22 % mayor con cruz y pescuezo de canas, colmillos que desbordan el hocico cerrado, cicatriz en el morro y collar de presas para el anciano); láminas `revision_jaguar.png`/`revision_jaguar_anciano.png` y las 10 vistas sueltas por especie en `work/omp-fa-05/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-05: jaguar (`baru_jaguar`, 1.048 triángulos, 1,40 m de morro a cola, 0,97 m alto) y su anciano élite (`baru_elder`, 1.164 triángulos, 1,71 m, 1,17 m). Rigs `FG_Jaguar`/`FG_JaguarAnciano` con los mismos nombres de hueso (una sola función de clips; amplitudes ×0,85 en el anciano por peso) y cinco clips sin salto: el Atacar es un salto de emboscada (agacha, acumula, extension delantera, aterrado mordiendo). Materiales teñibles skin/cloth/trim/hair/gear para las paletas doradas de `data/`. Referencias: fichas de campo del jaguar (no hay lámina REF-01 para esta familia). Clean-room. No toca `data/` ni `src/`: integra Junie JL-45. |
| 2026-11-21 | `assets/models/pecari.glb`, `assets/models/jabali.glb`, `arte/blender/fauna_cerropunta.blend`, `scripts/blender/fauna_cerropunta.py`, `scripts/blender/validar_fauna_cerropunta.py`, `scripts/blender/revisar_fauna_cerropunta.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; cerdanas en púa y hocico discoidal para el saíno, colmillos de hoz, lamparona y papada para el jabalí); láminas `revision_pecari.png`/`revision_jabali.png` y las 10 vistas sueltas por especie en `work/omp-fa-04/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-04: saíno (`cerropunta_peccary`, 672 triángulos, 0,82 m de morro a grupa, 0,67 m de alto) y jabalí (`cerropunta_boar`, 704 triángulos, 1,02 m de largo, 0,89 m de alto). Rigs `FG_Pecari`/`FG_Jabali` (comparten nombres de hueso; clips idénticos, amplitudes 0,85 en el jabalí por peso) con Reposo/Caminar/Atacar (embestida)/Golpeado/Morir sin salto; materiales teñibles skin/cloth/trim/hair/gear para las paletas de `data/`. Referencias: fichas de campo del pecari listado y del jabalí europeo (no hay lámina REF-01 para esta familia). Clean-room: sin assets de terceros. No toca `data/` ni `src/`: la integración es JL-45 de Junie. |
| 2026-11-20 | `assets/models/cripta_rata_cueva.glb`, `assets/models/cripta_rata_huaca.glb`, `assets/models/cripta_guardian_cueva.glb`, `assets/models/cripta_guardian_huaca.glb`, `assets/models/cripta_bruto_cueva.glb`, `assets/models/cripta_bruto_huaca.glb`, `arte/blender/cripta_variantes.blend`, `scripts/blender/cripta_variantes.py`, `scripts/blender/validar_criptas_variantes.py`, `scripts/blender/revisar_criptas_variantes.py` | Variantes por tramo generadas desde las bases publicadas `cripta_{rata,guardian,bruto}.glb` (2026-11-13): mismo esqueleto `FG_*`, mismos clips, tinte de materiales y piezas nuevas ancladas al hueso con grupo de vértices; láminas `cripta_{rata,guardian,bruto}.png` (base y dos tramos × 5 vistas) en `work/omp-fa-03/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-03: rata, guardián y bruto para la cueva húmeda (pisos 31–70: limo, musgo, setas, cuernos de hueso, coraza de caparazones, brillo verdoso) y la huaca de oro (71–100: oro batido metálico, máscaras y tocotes, gorgueras de cuentas, corona de puntas, brillo de brasa), adelantando OMP-POL-04. 741–936 triángulos (≤1.500), huesos y clips idénticos a la base (6 rata, 8 humanoides), apoyo z≈0. Tintes PROPUESTA en el generador. Clean-room: sin assets de terceros. No toca `data/` ni `src/`: la integración es JL-45 de Junie. |
| 2026-11-20 | `assets/models/caiman.glb`, `assets/models/garza.glb`, `arte/blender/fauna_chame.blend`, `scripts/blender/fauna_chame.py`, `scripts/blender/validar_fauna_chame.py`, `scripts/blender/revisar_fauna_chame.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (blobs y tubos faceteado; hocico con dientes anclados al maxilar para el caimán, cuello en S y pico de daga para la garza); láminas `revision_caiman.png`/`revision_garza.png` y las 10 vistas sueltas por especie en `work/omp-fa-02/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-02: caimán joven para `chame_caiman` (924 triángulos, 1,36 m de morro a cola, 0,29 m alto) y garza zancuda para `chame_heron` (800 triángulos, 1,10 m de alto, zancas largas). Rigs `FG_Caiman` y `FG_Garza` con clips Reposo/Caminar/Atacar/Golpeado/Morir sin salto; materiales teñibles skin/trim/hair/gear para las paletas de `data/`. No toca `data/` ni `src/`: la integración es JL-45 de Junie. |
| 2026-11-20 | `assets/models/cangrejo.glb`, `arte/blender/cangrejo.blend`, `scripts/blender/cangrejo.py`, `scripts/blender/validar_cangrejo.py`, `scripts/blender/revisar_cangrejo.py` | Modelado, rig y clips originales generados desde cero con primitivas propias en Blender 5.2 (metaball + remesh para el caparazón, tubos y hojas para apéndices); lámina `revision.png` y las 10 vistas sueltas en `work/omp-fa-01/` | FrankmanGames + agente local OMP | Propia del proyecto | OMP-FA-01: cangrejo del manglar para `chame_crab` y `chame_grandcrab` (una malla, dos escalas por `data/`). 1.478 triángulos (≤1.500), caparazón 0,62 m, envergadura con pinzas 1,65 m (tenaza mayor y menor asimétricas, dedos mordiendo), patas puntiagundas apoyadas. Rig `FG_Cangrejo` con pedipalpos, pinzas y tres pares de patas; cinco clips (Reposo, Caminar, Atacar, Golpeado, Morir) con bucles sin salto, materiales teñibles skin/trim/hair/gear para las paletas de `data/`. Clean-room: sin assets de terceros. Aún no enlazado en `data/` (integración JL-45 de Junie) |
| 2026-11-19 | Catálogo completo de `assets/icons/items/<itemId>.png` (1.100 archivos; inventario literal debajo) | Composición determinista clean-room con el repertorio original de `scripts/art/icon_primitives.py` y `scripts/art/render_item_icons.py`; sin imágenes, fuentes ni símbolos externos | FrankmanGames + Codex | Propia del proyecto | Sustituye el contenido visual anterior de los 209 PNG y crea los 891 faltantes. Capas reutilizables de efecto elemental, silueta, material y heráldica; RGBA 256×256, caja segura de 180 px, sin marco ni fondo. Los pergaminos incorporan el emblema propio de su hechizo. Evidencia a 46 px en `work/codex-eq06/pages/` |

<!-- Inventario literal de los 891 archivos añadidos por EQ-06; los 209 sustituidos ya tenían rutas registradas:
assets/icons/items/acero_bracers.png
assets/icons/items/acero_buckler.png
assets/icons/items/acero_helmet.png
assets/icons/items/acero_hood.png
assets/icons/items/acero_robe.png
assets/icons/items/acero_sandals.png
assets/icons/items/ambar_axe.png
assets/icons/items/ambar_belt.png
assets/icons/items/ambar_bow.png
assets/icons/items/ambar_crossbow.png
assets/icons/items/ambar_dagger.png
assets/icons/items/ambar_greatsword.png
assets/icons/items/ambar_hammer.png
assets/icons/items/ambar_mace.png
assets/icons/items/ambar_orb.png
assets/icons/items/ambar_ring.png
assets/icons/items/ambar_shield.png
assets/icons/items/ambar_spear.png
assets/icons/items/ambar_staff.png
assets/icons/items/ambar_sword.png
assets/icons/items/ambar_wand.png
assets/icons/items/bi_bocas_back.png
assets/icons/items/bi_bocas_chest.png
assets/icons/items/bi_bocas_feet.png
assets/icons/items/bi_bocas_hands.png
assets/icons/items/bi_bocas_head.png
assets/icons/items/bi_camino_cruces_back.png
assets/icons/items/bi_camino_cruces_chest.png
assets/icons/items/bi_camino_cruces_feet.png
assets/icons/items/bi_camino_cruces_hands.png
assets/icons/items/bi_camino_cruces_head.png
assets/icons/items/bi_campanas_portobelo_back.png
assets/icons/items/bi_campanas_portobelo_chest.png
assets/icons/items/bi_campanas_portobelo_feet.png
assets/icons/items/bi_campanas_portobelo_hands.png
assets/icons/items/bi_campanas_portobelo_head.png
assets/icons/items/bi_diablico_espejo_back.png
assets/icons/items/bi_diablico_espejo_chest.png
assets/icons/items/bi_diablico_espejo_feet.png
assets/icons/items/bi_diablico_espejo_hands.png
assets/icons/items/bi_diablico_espejo_head.png
assets/icons/items/bi_diablico_sucio_back.png
assets/icons/items/bi_diablico_sucio_chest.png
assets/icons/items/bi_diablico_sucio_feet.png
assets/icons/items/bi_diablico_sucio_hands.png
assets/icons/items/bi_diablico_sucio_head.png
assets/icons/items/bi_mangle_rojo_back.png
assets/icons/items/bi_mangle_rojo_chest.png
assets/icons/items/bi_mangle_rojo_feet.png
assets/icons/items/bi_mangle_rojo_hands.png
assets/icons/items/bi_mangle_rojo_head.png
assets/icons/items/bi_mareas_altas_back.png
assets/icons/items/bi_mareas_altas_chest.png
assets/icons/items/bi_mareas_altas_feet.png
assets/icons/items/bi_mareas_altas_hands.png
assets/icons/items/bi_mareas_altas_head.png
assets/icons/items/bi_nube_baru_back.png
assets/icons/items/bi_nube_baru_chest.png
assets/icons/items/bi_nube_baru_feet.png
assets/icons/items/bi_nube_baru_hands.png
assets/icons/items/bi_nube_baru_head.png
assets/icons/items/bi_perla_coiba_back.png
assets/icons/items/bi_perla_coiba_chest.png
assets/icons/items/bi_perla_coiba_feet.png
assets/icons/items/bi_perla_coiba_hands.png
assets/icons/items/bi_perla_coiba_head.png
assets/icons/items/bi_tulivieja_back.png
assets/icons/items/bi_tulivieja_chest.png
assets/icons/items/bi_tulivieja_feet.png
assets/icons/items/bi_tulivieja_hands.png
assets/icons/items/bi_tulivieja_head.png
assets/icons/items/bone_bracers.png
assets/icons/items/bone_buckler.png
assets/icons/items/bone_helmet.png
assets/icons/items/bone_hood.png
assets/icons/items/bone_robe.png
assets/icons/items/bone_sandals.png
assets/icons/items/carbon_axe.png
assets/icons/items/carbon_belt.png
assets/icons/items/carbon_bow.png
assets/icons/items/carbon_crossbow.png
assets/icons/items/carbon_dagger.png
assets/icons/items/carbon_greatsword.png
assets/icons/items/carbon_hammer.png
assets/icons/items/carbon_mace.png
assets/icons/items/carbon_orb.png
assets/icons/items/carbon_ring.png
assets/icons/items/carbon_shield.png
assets/icons/items/carbon_spear.png
assets/icons/items/carbon_staff.png
assets/icons/items/carbon_sword.png
assets/icons/items/carbon_wand.png
assets/icons/items/cold_mist_staff.png
assets/icons/items/cromo_bracers.png
assets/icons/items/cromo_buckler.png
assets/icons/items/cromo_helmet.png
assets/icons/items/cromo_hood.png
assets/icons/items/cromo_robe.png
assets/icons/items/cromo_sandals.png
assets/icons/items/diablica_espeja_amulet.png
assets/icons/items/diablica_espeja_back.png
assets/icons/items/diablica_espeja_chest.png
assets/icons/items/diablica_espeja_feet.png
assets/icons/items/diablica_espeja_hands.png
assets/icons/items/diablica_espeja_head.png
assets/icons/items/diablica_espeja_staff.png
assets/icons/items/diablica_espeja_waist.png
assets/icons/items/guayacan_bow.png
assets/icons/items/huaca_aguila.png
assets/icons/items/huaca_caiman.png
assets/icons/items/huaca_jaguar.png
assets/icons/items/huaca_murcielago.png
assets/icons/items/huaca_rana.png
assets/icons/items/huaca_tortuga.png
assets/icons/items/istmo_bracers.png
assets/icons/items/istmo_buckler.png
assets/icons/items/istmo_helmet.png
assets/icons/items/istmo_hood.png
assets/icons/items/istmo_robe.png
assets/icons/items/istmo_sandals.png
assets/icons/items/learning_01_amulet.png
assets/icons/items/learning_01_back.png
assets/icons/items/learning_01_chest.png
assets/icons/items/learning_01_head.png
assets/icons/items/learning_02_amulet.png
assets/icons/items/learning_02_back.png
assets/icons/items/learning_02_chest.png
assets/icons/items/learning_02_head.png
assets/icons/items/learning_03_amulet.png
assets/icons/items/learning_03_back.png
assets/icons/items/learning_03_chest.png
assets/icons/items/learning_03_head.png
assets/icons/items/learning_04_amulet.png
assets/icons/items/learning_04_back.png
assets/icons/items/learning_04_chest.png
assets/icons/items/learning_04_head.png
assets/icons/items/learning_05_amulet.png
assets/icons/items/learning_05_back.png
assets/icons/items/learning_05_chest.png
assets/icons/items/learning_05_head.png
assets/icons/items/learning_06_amulet.png
assets/icons/items/learning_06_back.png
assets/icons/items/learning_06_chest.png
assets/icons/items/learning_06_head.png
assets/icons/items/learning_07_amulet.png
assets/icons/items/learning_07_back.png
assets/icons/items/learning_07_chest.png
assets/icons/items/learning_07_head.png
assets/icons/items/learning_08_amulet.png
assets/icons/items/learning_08_back.png
assets/icons/items/learning_08_chest.png
assets/icons/items/learning_08_head.png
assets/icons/items/learning_09_amulet.png
assets/icons/items/learning_09_back.png
assets/icons/items/learning_09_chest.png
assets/icons/items/learning_09_head.png
assets/icons/items/learning_10_amulet.png
assets/icons/items/learning_10_back.png
assets/icons/items/learning_10_chest.png
assets/icons/items/learning_10_head.png
assets/icons/items/marea_axe.png
assets/icons/items/marea_belt.png
assets/icons/items/marea_bow.png
assets/icons/items/marea_crossbow.png
assets/icons/items/marea_dagger.png
assets/icons/items/marea_greatsword.png
assets/icons/items/marea_hammer.png
assets/icons/items/marea_mace.png
assets/icons/items/marea_orb.png
assets/icons/items/marea_ring.png
assets/icons/items/marea_shield.png
assets/icons/items/marea_spear.png
assets/icons/items/marea_staff.png
assets/icons/items/marea_sword.png
assets/icons/items/marea_wand.png
assets/icons/items/mount_dev_falcopama.png
assets/icons/items/mount_falcopama_air.png
assets/icons/items/mount_falcopama_brio.png
assets/icons/items/mount_falcopama_earth.png
assets/icons/items/mount_falcopama_fire.png
assets/icons/items/mount_falcopama_frost.png
assets/icons/items/mount_falcopama_lightning.png
assets/icons/items/mount_falcopama_water.png
assets/icons/items/nazareno_bow.png
assets/icons/items/niquel_axe.png
assets/icons/items/niquel_belt.png
assets/icons/items/niquel_bow.png
assets/icons/items/niquel_crossbow.png
assets/icons/items/niquel_dagger.png
assets/icons/items/niquel_greatsword.png
assets/icons/items/niquel_hammer.png
assets/icons/items/niquel_mace.png
assets/icons/items/niquel_orb.png
assets/icons/items/niquel_ring.png
assets/icons/items/niquel_shield.png
assets/icons/items/niquel_spear.png
assets/icons/items/niquel_staff.png
assets/icons/items/niquel_sword.png
assets/icons/items/niquel_wand.png
assets/icons/items/ovillo_de_regreso.png
assets/icons/items/perlanegra_bracers.png
assets/icons/items/perlanegra_buckler.png
assets/icons/items/perlanegra_helmet.png
assets/icons/items/perlanegra_hood.png
assets/icons/items/perlanegra_robe.png
assets/icons/items/perlanegra_sandals.png
assets/icons/items/renio_axe.png
assets/icons/items/renio_belt.png
assets/icons/items/renio_bow.png
assets/icons/items/renio_crossbow.png
assets/icons/items/renio_dagger.png
assets/icons/items/renio_greatsword.png
assets/icons/items/renio_hammer.png
assets/icons/items/renio_mace.png
assets/icons/items/renio_orb.png
assets/icons/items/renio_ring.png
assets/icons/items/renio_shield.png
assets/icons/items/renio_spear.png
assets/icons/items/renio_staff.png
assets/icons/items/renio_sword.png
assets/icons/items/renio_wand.png
assets/icons/items/route_01_air_amulet.png
assets/icons/items/route_01_air_back.png
assets/icons/items/route_01_air_chest.png
assets/icons/items/route_01_air_feet.png
assets/icons/items/route_01_air_hands.png
assets/icons/items/route_01_air_head.png
assets/icons/items/route_01_air_ring.png
assets/icons/items/route_01_air_waist.png
assets/icons/items/route_01_earth_amulet.png
assets/icons/items/route_01_earth_back.png
assets/icons/items/route_01_earth_chest.png
assets/icons/items/route_01_earth_feet.png
assets/icons/items/route_01_earth_hands.png
assets/icons/items/route_01_earth_head.png
assets/icons/items/route_01_earth_ring.png
assets/icons/items/route_01_earth_waist.png
assets/icons/items/route_01_fire_amulet.png
assets/icons/items/route_01_fire_back.png
assets/icons/items/route_01_fire_chest.png
assets/icons/items/route_01_fire_feet.png
assets/icons/items/route_01_fire_hands.png
assets/icons/items/route_01_fire_head.png
assets/icons/items/route_01_fire_ring.png
assets/icons/items/route_01_fire_waist.png
assets/icons/items/route_01_frost_amulet.png
assets/icons/items/route_01_frost_back.png
assets/icons/items/route_01_frost_chest.png
assets/icons/items/route_01_frost_feet.png
assets/icons/items/route_01_frost_hands.png
assets/icons/items/route_01_frost_head.png
assets/icons/items/route_01_frost_ring.png
assets/icons/items/route_01_frost_waist.png
assets/icons/items/route_01_lightning_amulet.png
assets/icons/items/route_01_lightning_back.png
assets/icons/items/route_01_lightning_chest.png
assets/icons/items/route_01_lightning_feet.png
assets/icons/items/route_01_lightning_hands.png
assets/icons/items/route_01_lightning_head.png
assets/icons/items/route_01_lightning_ring.png
assets/icons/items/route_01_lightning_waist.png
assets/icons/items/route_01_water_amulet.png
assets/icons/items/route_01_water_back.png
assets/icons/items/route_01_water_chest.png
assets/icons/items/route_01_water_feet.png
assets/icons/items/route_01_water_hands.png
assets/icons/items/route_01_water_head.png
assets/icons/items/route_01_water_ring.png
assets/icons/items/route_01_water_waist.png
assets/icons/items/route_02_air_amulet.png
assets/icons/items/route_02_air_back.png
assets/icons/items/route_02_air_chest.png
assets/icons/items/route_02_air_feet.png
assets/icons/items/route_02_air_hands.png
assets/icons/items/route_02_air_head.png
assets/icons/items/route_02_air_ring.png
assets/icons/items/route_02_air_waist.png
assets/icons/items/route_02_earth_amulet.png
assets/icons/items/route_02_earth_back.png
assets/icons/items/route_02_earth_chest.png
assets/icons/items/route_02_earth_feet.png
assets/icons/items/route_02_earth_hands.png
assets/icons/items/route_02_earth_head.png
assets/icons/items/route_02_earth_ring.png
assets/icons/items/route_02_earth_waist.png
assets/icons/items/route_02_fire_amulet.png
assets/icons/items/route_02_fire_back.png
assets/icons/items/route_02_fire_chest.png
assets/icons/items/route_02_fire_feet.png
assets/icons/items/route_02_fire_hands.png
assets/icons/items/route_02_fire_head.png
assets/icons/items/route_02_fire_ring.png
assets/icons/items/route_02_fire_waist.png
assets/icons/items/route_02_frost_amulet.png
assets/icons/items/route_02_frost_back.png
assets/icons/items/route_02_frost_chest.png
assets/icons/items/route_02_frost_feet.png
assets/icons/items/route_02_frost_hands.png
assets/icons/items/route_02_frost_head.png
assets/icons/items/route_02_frost_ring.png
assets/icons/items/route_02_frost_waist.png
assets/icons/items/route_02_lightning_amulet.png
assets/icons/items/route_02_lightning_back.png
assets/icons/items/route_02_lightning_chest.png
assets/icons/items/route_02_lightning_feet.png
assets/icons/items/route_02_lightning_hands.png
assets/icons/items/route_02_lightning_head.png
assets/icons/items/route_02_lightning_ring.png
assets/icons/items/route_02_lightning_waist.png
assets/icons/items/route_02_water_amulet.png
assets/icons/items/route_02_water_back.png
assets/icons/items/route_02_water_chest.png
assets/icons/items/route_02_water_feet.png
assets/icons/items/route_02_water_hands.png
assets/icons/items/route_02_water_head.png
assets/icons/items/route_02_water_ring.png
assets/icons/items/route_02_water_waist.png
assets/icons/items/route_03_air_amulet.png
assets/icons/items/route_03_air_back.png
assets/icons/items/route_03_air_chest.png
assets/icons/items/route_03_air_feet.png
assets/icons/items/route_03_air_hands.png
assets/icons/items/route_03_air_head.png
assets/icons/items/route_03_air_ring.png
assets/icons/items/route_03_air_waist.png
assets/icons/items/route_03_earth_amulet.png
assets/icons/items/route_03_earth_back.png
assets/icons/items/route_03_earth_chest.png
assets/icons/items/route_03_earth_feet.png
assets/icons/items/route_03_earth_hands.png
assets/icons/items/route_03_earth_head.png
assets/icons/items/route_03_earth_ring.png
assets/icons/items/route_03_earth_waist.png
assets/icons/items/route_03_fire_amulet.png
assets/icons/items/route_03_fire_back.png
assets/icons/items/route_03_fire_chest.png
assets/icons/items/route_03_fire_feet.png
assets/icons/items/route_03_fire_hands.png
assets/icons/items/route_03_fire_head.png
assets/icons/items/route_03_fire_ring.png
assets/icons/items/route_03_fire_waist.png
assets/icons/items/route_03_frost_amulet.png
assets/icons/items/route_03_frost_back.png
assets/icons/items/route_03_frost_chest.png
assets/icons/items/route_03_frost_feet.png
assets/icons/items/route_03_frost_hands.png
assets/icons/items/route_03_frost_head.png
assets/icons/items/route_03_frost_ring.png
assets/icons/items/route_03_frost_waist.png
assets/icons/items/route_03_lightning_amulet.png
assets/icons/items/route_03_lightning_back.png
assets/icons/items/route_03_lightning_chest.png
assets/icons/items/route_03_lightning_feet.png
assets/icons/items/route_03_lightning_hands.png
assets/icons/items/route_03_lightning_head.png
assets/icons/items/route_03_lightning_ring.png
assets/icons/items/route_03_lightning_waist.png
assets/icons/items/route_03_water_amulet.png
assets/icons/items/route_03_water_back.png
assets/icons/items/route_03_water_chest.png
assets/icons/items/route_03_water_feet.png
assets/icons/items/route_03_water_hands.png
assets/icons/items/route_03_water_head.png
assets/icons/items/route_03_water_ring.png
assets/icons/items/route_03_water_waist.png
assets/icons/items/route_04_air_amulet.png
assets/icons/items/route_04_air_back.png
assets/icons/items/route_04_air_chest.png
assets/icons/items/route_04_air_feet.png
assets/icons/items/route_04_air_hands.png
assets/icons/items/route_04_air_head.png
assets/icons/items/route_04_air_ring.png
assets/icons/items/route_04_air_waist.png
assets/icons/items/route_04_earth_amulet.png
assets/icons/items/route_04_earth_back.png
assets/icons/items/route_04_earth_chest.png
assets/icons/items/route_04_earth_feet.png
assets/icons/items/route_04_earth_hands.png
assets/icons/items/route_04_earth_head.png
assets/icons/items/route_04_earth_ring.png
assets/icons/items/route_04_earth_waist.png
assets/icons/items/route_04_fire_amulet.png
assets/icons/items/route_04_fire_back.png
assets/icons/items/route_04_fire_chest.png
assets/icons/items/route_04_fire_feet.png
assets/icons/items/route_04_fire_hands.png
assets/icons/items/route_04_fire_head.png
assets/icons/items/route_04_fire_ring.png
assets/icons/items/route_04_fire_waist.png
assets/icons/items/route_04_frost_amulet.png
assets/icons/items/route_04_frost_back.png
assets/icons/items/route_04_frost_chest.png
assets/icons/items/route_04_frost_feet.png
assets/icons/items/route_04_frost_hands.png
assets/icons/items/route_04_frost_head.png
assets/icons/items/route_04_frost_ring.png
assets/icons/items/route_04_frost_waist.png
assets/icons/items/route_04_lightning_amulet.png
assets/icons/items/route_04_lightning_back.png
assets/icons/items/route_04_lightning_chest.png
assets/icons/items/route_04_lightning_feet.png
assets/icons/items/route_04_lightning_hands.png
assets/icons/items/route_04_lightning_head.png
assets/icons/items/route_04_lightning_ring.png
assets/icons/items/route_04_lightning_waist.png
assets/icons/items/route_04_water_amulet.png
assets/icons/items/route_04_water_back.png
assets/icons/items/route_04_water_chest.png
assets/icons/items/route_04_water_feet.png
assets/icons/items/route_04_water_hands.png
assets/icons/items/route_04_water_head.png
assets/icons/items/route_04_water_ring.png
assets/icons/items/route_04_water_waist.png
assets/icons/items/route_05_air_amulet.png
assets/icons/items/route_05_air_back.png
assets/icons/items/route_05_air_chest.png
assets/icons/items/route_05_air_feet.png
assets/icons/items/route_05_air_hands.png
assets/icons/items/route_05_air_head.png
assets/icons/items/route_05_air_ring.png
assets/icons/items/route_05_air_waist.png
assets/icons/items/route_05_earth_amulet.png
assets/icons/items/route_05_earth_back.png
assets/icons/items/route_05_earth_chest.png
assets/icons/items/route_05_earth_feet.png
assets/icons/items/route_05_earth_hands.png
assets/icons/items/route_05_earth_head.png
assets/icons/items/route_05_earth_ring.png
assets/icons/items/route_05_earth_waist.png
assets/icons/items/route_05_fire_amulet.png
assets/icons/items/route_05_fire_back.png
assets/icons/items/route_05_fire_chest.png
assets/icons/items/route_05_fire_feet.png
assets/icons/items/route_05_fire_hands.png
assets/icons/items/route_05_fire_head.png
assets/icons/items/route_05_fire_ring.png
assets/icons/items/route_05_fire_waist.png
assets/icons/items/route_05_frost_amulet.png
assets/icons/items/route_05_frost_back.png
assets/icons/items/route_05_frost_chest.png
assets/icons/items/route_05_frost_feet.png
assets/icons/items/route_05_frost_hands.png
assets/icons/items/route_05_frost_head.png
assets/icons/items/route_05_frost_ring.png
assets/icons/items/route_05_frost_waist.png
assets/icons/items/route_05_lightning_amulet.png
assets/icons/items/route_05_lightning_back.png
assets/icons/items/route_05_lightning_chest.png
assets/icons/items/route_05_lightning_feet.png
assets/icons/items/route_05_lightning_hands.png
assets/icons/items/route_05_lightning_head.png
assets/icons/items/route_05_lightning_ring.png
assets/icons/items/route_05_lightning_waist.png
assets/icons/items/route_05_water_amulet.png
assets/icons/items/route_05_water_back.png
assets/icons/items/route_05_water_chest.png
assets/icons/items/route_05_water_feet.png
assets/icons/items/route_05_water_hands.png
assets/icons/items/route_05_water_head.png
assets/icons/items/route_05_water_ring.png
assets/icons/items/route_05_water_waist.png
assets/icons/items/route_06_air_amulet.png
assets/icons/items/route_06_air_back.png
assets/icons/items/route_06_air_chest.png
assets/icons/items/route_06_air_feet.png
assets/icons/items/route_06_air_hands.png
assets/icons/items/route_06_air_head.png
assets/icons/items/route_06_air_ring.png
assets/icons/items/route_06_air_waist.png
assets/icons/items/route_06_earth_amulet.png
assets/icons/items/route_06_earth_back.png
assets/icons/items/route_06_earth_chest.png
assets/icons/items/route_06_earth_feet.png
assets/icons/items/route_06_earth_hands.png
assets/icons/items/route_06_earth_head.png
assets/icons/items/route_06_earth_ring.png
assets/icons/items/route_06_earth_waist.png
assets/icons/items/route_06_fire_amulet.png
assets/icons/items/route_06_fire_back.png
assets/icons/items/route_06_fire_chest.png
assets/icons/items/route_06_fire_feet.png
assets/icons/items/route_06_fire_hands.png
assets/icons/items/route_06_fire_head.png
assets/icons/items/route_06_fire_ring.png
assets/icons/items/route_06_fire_waist.png
assets/icons/items/route_06_frost_amulet.png
assets/icons/items/route_06_frost_back.png
assets/icons/items/route_06_frost_chest.png
assets/icons/items/route_06_frost_feet.png
assets/icons/items/route_06_frost_hands.png
assets/icons/items/route_06_frost_head.png
assets/icons/items/route_06_frost_ring.png
assets/icons/items/route_06_frost_waist.png
assets/icons/items/route_06_lightning_amulet.png
assets/icons/items/route_06_lightning_back.png
assets/icons/items/route_06_lightning_chest.png
assets/icons/items/route_06_lightning_feet.png
assets/icons/items/route_06_lightning_hands.png
assets/icons/items/route_06_lightning_head.png
assets/icons/items/route_06_lightning_ring.png
assets/icons/items/route_06_lightning_waist.png
assets/icons/items/route_06_water_amulet.png
assets/icons/items/route_06_water_back.png
assets/icons/items/route_06_water_chest.png
assets/icons/items/route_06_water_feet.png
assets/icons/items/route_06_water_hands.png
assets/icons/items/route_06_water_head.png
assets/icons/items/route_06_water_ring.png
assets/icons/items/route_06_water_waist.png
assets/icons/items/route_07_air_amulet.png
assets/icons/items/route_07_air_back.png
assets/icons/items/route_07_air_chest.png
assets/icons/items/route_07_air_feet.png
assets/icons/items/route_07_air_hands.png
assets/icons/items/route_07_air_head.png
assets/icons/items/route_07_air_ring.png
assets/icons/items/route_07_air_waist.png
assets/icons/items/route_07_earth_amulet.png
assets/icons/items/route_07_earth_back.png
assets/icons/items/route_07_earth_chest.png
assets/icons/items/route_07_earth_feet.png
assets/icons/items/route_07_earth_hands.png
assets/icons/items/route_07_earth_head.png
assets/icons/items/route_07_earth_ring.png
assets/icons/items/route_07_earth_waist.png
assets/icons/items/route_07_fire_amulet.png
assets/icons/items/route_07_fire_back.png
assets/icons/items/route_07_fire_chest.png
assets/icons/items/route_07_fire_feet.png
assets/icons/items/route_07_fire_hands.png
assets/icons/items/route_07_fire_head.png
assets/icons/items/route_07_fire_ring.png
assets/icons/items/route_07_fire_waist.png
assets/icons/items/route_07_frost_amulet.png
assets/icons/items/route_07_frost_back.png
assets/icons/items/route_07_frost_chest.png
assets/icons/items/route_07_frost_feet.png
assets/icons/items/route_07_frost_hands.png
assets/icons/items/route_07_frost_head.png
assets/icons/items/route_07_frost_ring.png
assets/icons/items/route_07_frost_waist.png
assets/icons/items/route_07_lightning_amulet.png
assets/icons/items/route_07_lightning_back.png
assets/icons/items/route_07_lightning_chest.png
assets/icons/items/route_07_lightning_feet.png
assets/icons/items/route_07_lightning_hands.png
assets/icons/items/route_07_lightning_head.png
assets/icons/items/route_07_lightning_ring.png
assets/icons/items/route_07_lightning_waist.png
assets/icons/items/route_07_water_amulet.png
assets/icons/items/route_07_water_back.png
assets/icons/items/route_07_water_chest.png
assets/icons/items/route_07_water_feet.png
assets/icons/items/route_07_water_hands.png
assets/icons/items/route_07_water_head.png
assets/icons/items/route_07_water_ring.png
assets/icons/items/route_07_water_waist.png
assets/icons/items/route_08_air_amulet.png
assets/icons/items/route_08_air_back.png
assets/icons/items/route_08_air_chest.png
assets/icons/items/route_08_air_feet.png
assets/icons/items/route_08_air_hands.png
assets/icons/items/route_08_air_head.png
assets/icons/items/route_08_air_ring.png
assets/icons/items/route_08_air_waist.png
assets/icons/items/route_08_earth_amulet.png
assets/icons/items/route_08_earth_back.png
assets/icons/items/route_08_earth_chest.png
assets/icons/items/route_08_earth_feet.png
assets/icons/items/route_08_earth_hands.png
assets/icons/items/route_08_earth_head.png
assets/icons/items/route_08_earth_ring.png
assets/icons/items/route_08_earth_waist.png
assets/icons/items/route_08_fire_amulet.png
assets/icons/items/route_08_fire_back.png
assets/icons/items/route_08_fire_chest.png
assets/icons/items/route_08_fire_feet.png
assets/icons/items/route_08_fire_hands.png
assets/icons/items/route_08_fire_head.png
assets/icons/items/route_08_fire_ring.png
assets/icons/items/route_08_fire_waist.png
assets/icons/items/route_08_frost_amulet.png
assets/icons/items/route_08_frost_back.png
assets/icons/items/route_08_frost_chest.png
assets/icons/items/route_08_frost_feet.png
assets/icons/items/route_08_frost_hands.png
assets/icons/items/route_08_frost_head.png
assets/icons/items/route_08_frost_ring.png
assets/icons/items/route_08_frost_waist.png
assets/icons/items/route_08_lightning_amulet.png
assets/icons/items/route_08_lightning_back.png
assets/icons/items/route_08_lightning_chest.png
assets/icons/items/route_08_lightning_feet.png
assets/icons/items/route_08_lightning_hands.png
assets/icons/items/route_08_lightning_head.png
assets/icons/items/route_08_lightning_ring.png
assets/icons/items/route_08_lightning_waist.png
assets/icons/items/route_08_water_amulet.png
assets/icons/items/route_08_water_back.png
assets/icons/items/route_08_water_chest.png
assets/icons/items/route_08_water_feet.png
assets/icons/items/route_08_water_hands.png
assets/icons/items/route_08_water_head.png
assets/icons/items/route_08_water_ring.png
assets/icons/items/route_08_water_waist.png
assets/icons/items/route_09_air_amulet.png
assets/icons/items/route_09_air_back.png
assets/icons/items/route_09_air_chest.png
assets/icons/items/route_09_air_feet.png
assets/icons/items/route_09_air_hands.png
assets/icons/items/route_09_air_head.png
assets/icons/items/route_09_air_ring.png
assets/icons/items/route_09_air_waist.png
assets/icons/items/route_09_earth_amulet.png
assets/icons/items/route_09_earth_back.png
assets/icons/items/route_09_earth_chest.png
assets/icons/items/route_09_earth_feet.png
assets/icons/items/route_09_earth_hands.png
assets/icons/items/route_09_earth_head.png
assets/icons/items/route_09_earth_ring.png
assets/icons/items/route_09_earth_waist.png
assets/icons/items/route_09_fire_amulet.png
assets/icons/items/route_09_fire_back.png
assets/icons/items/route_09_fire_chest.png
assets/icons/items/route_09_fire_feet.png
assets/icons/items/route_09_fire_hands.png
assets/icons/items/route_09_fire_head.png
assets/icons/items/route_09_fire_ring.png
assets/icons/items/route_09_fire_waist.png
assets/icons/items/route_09_frost_amulet.png
assets/icons/items/route_09_frost_back.png
assets/icons/items/route_09_frost_chest.png
assets/icons/items/route_09_frost_feet.png
assets/icons/items/route_09_frost_hands.png
assets/icons/items/route_09_frost_head.png
assets/icons/items/route_09_frost_ring.png
assets/icons/items/route_09_frost_waist.png
assets/icons/items/route_09_lightning_amulet.png
assets/icons/items/route_09_lightning_back.png
assets/icons/items/route_09_lightning_chest.png
assets/icons/items/route_09_lightning_feet.png
assets/icons/items/route_09_lightning_hands.png
assets/icons/items/route_09_lightning_head.png
assets/icons/items/route_09_lightning_ring.png
assets/icons/items/route_09_lightning_waist.png
assets/icons/items/route_09_water_amulet.png
assets/icons/items/route_09_water_back.png
assets/icons/items/route_09_water_chest.png
assets/icons/items/route_09_water_feet.png
assets/icons/items/route_09_water_hands.png
assets/icons/items/route_09_water_head.png
assets/icons/items/route_09_water_ring.png
assets/icons/items/route_09_water_waist.png
assets/icons/items/route_10_air_amulet.png
assets/icons/items/route_10_air_back.png
assets/icons/items/route_10_air_chest.png
assets/icons/items/route_10_air_feet.png
assets/icons/items/route_10_air_hands.png
assets/icons/items/route_10_air_head.png
assets/icons/items/route_10_air_ring.png
assets/icons/items/route_10_air_waist.png
assets/icons/items/route_10_earth_amulet.png
assets/icons/items/route_10_earth_back.png
assets/icons/items/route_10_earth_chest.png
assets/icons/items/route_10_earth_feet.png
assets/icons/items/route_10_earth_hands.png
assets/icons/items/route_10_earth_head.png
assets/icons/items/route_10_earth_ring.png
assets/icons/items/route_10_earth_waist.png
assets/icons/items/route_10_fire_amulet.png
assets/icons/items/route_10_fire_back.png
assets/icons/items/route_10_fire_chest.png
assets/icons/items/route_10_fire_feet.png
assets/icons/items/route_10_fire_hands.png
assets/icons/items/route_10_fire_head.png
assets/icons/items/route_10_fire_ring.png
assets/icons/items/route_10_fire_waist.png
assets/icons/items/route_10_frost_amulet.png
assets/icons/items/route_10_frost_back.png
assets/icons/items/route_10_frost_chest.png
assets/icons/items/route_10_frost_feet.png
assets/icons/items/route_10_frost_hands.png
assets/icons/items/route_10_frost_head.png
assets/icons/items/route_10_frost_ring.png
assets/icons/items/route_10_frost_waist.png
assets/icons/items/route_10_lightning_amulet.png
assets/icons/items/route_10_lightning_back.png
assets/icons/items/route_10_lightning_chest.png
assets/icons/items/route_10_lightning_feet.png
assets/icons/items/route_10_lightning_hands.png
assets/icons/items/route_10_lightning_head.png
assets/icons/items/route_10_lightning_ring.png
assets/icons/items/route_10_lightning_waist.png
assets/icons/items/route_10_water_amulet.png
assets/icons/items/route_10_water_back.png
assets/icons/items/route_10_water_chest.png
assets/icons/items/route_10_water_feet.png
assets/icons/items/route_10_water_hands.png
assets/icons/items/route_10_water_head.png
assets/icons/items/route_10_water_ring.png
assets/icons/items/route_10_water_waist.png
assets/icons/items/spec_01_endurance_chest.png
assets/icons/items/spec_01_endurance_feet.png
assets/icons/items/spec_01_endurance_hands.png
assets/icons/items/spec_01_endurance_head.png
assets/icons/items/spec_01_precision_chest.png
assets/icons/items/spec_01_precision_feet.png
assets/icons/items/spec_01_precision_hands.png
assets/icons/items/spec_01_precision_head.png
assets/icons/items/spec_01_spirit_chest.png
assets/icons/items/spec_01_spirit_feet.png
assets/icons/items/spec_01_spirit_hands.png
assets/icons/items/spec_01_spirit_head.png
assets/icons/items/spec_01_support_chest.png
assets/icons/items/spec_01_support_feet.png
assets/icons/items/spec_01_support_hands.png
assets/icons/items/spec_01_support_head.png
assets/icons/items/spec_02_endurance_chest.png
assets/icons/items/spec_02_endurance_feet.png
assets/icons/items/spec_02_endurance_hands.png
assets/icons/items/spec_02_endurance_head.png
assets/icons/items/spec_02_precision_chest.png
assets/icons/items/spec_02_precision_feet.png
assets/icons/items/spec_02_precision_hands.png
assets/icons/items/spec_02_precision_head.png
assets/icons/items/spec_02_spirit_chest.png
assets/icons/items/spec_02_spirit_feet.png
assets/icons/items/spec_02_spirit_hands.png
assets/icons/items/spec_02_spirit_head.png
assets/icons/items/spec_02_support_chest.png
assets/icons/items/spec_02_support_feet.png
assets/icons/items/spec_02_support_hands.png
assets/icons/items/spec_02_support_head.png
assets/icons/items/spec_03_endurance_chest.png
assets/icons/items/spec_03_endurance_feet.png
assets/icons/items/spec_03_endurance_hands.png
assets/icons/items/spec_03_endurance_head.png
assets/icons/items/spec_03_precision_chest.png
assets/icons/items/spec_03_precision_feet.png
assets/icons/items/spec_03_precision_hands.png
assets/icons/items/spec_03_precision_head.png
assets/icons/items/spec_03_spirit_chest.png
assets/icons/items/spec_03_spirit_feet.png
assets/icons/items/spec_03_spirit_hands.png
assets/icons/items/spec_03_spirit_head.png
assets/icons/items/spec_03_support_chest.png
assets/icons/items/spec_03_support_feet.png
assets/icons/items/spec_03_support_hands.png
assets/icons/items/spec_03_support_head.png
assets/icons/items/spec_04_endurance_chest.png
assets/icons/items/spec_04_endurance_feet.png
assets/icons/items/spec_04_endurance_hands.png
assets/icons/items/spec_04_endurance_head.png
assets/icons/items/spec_04_precision_chest.png
assets/icons/items/spec_04_precision_feet.png
assets/icons/items/spec_04_precision_hands.png
assets/icons/items/spec_04_precision_head.png
assets/icons/items/spec_04_spirit_chest.png
assets/icons/items/spec_04_spirit_feet.png
assets/icons/items/spec_04_spirit_hands.png
assets/icons/items/spec_04_spirit_head.png
assets/icons/items/spec_04_support_chest.png
assets/icons/items/spec_04_support_feet.png
assets/icons/items/spec_04_support_hands.png
assets/icons/items/spec_04_support_head.png
assets/icons/items/spec_05_endurance_chest.png
assets/icons/items/spec_05_endurance_feet.png
assets/icons/items/spec_05_endurance_hands.png
assets/icons/items/spec_05_endurance_head.png
assets/icons/items/spec_05_precision_chest.png
assets/icons/items/spec_05_precision_feet.png
assets/icons/items/spec_05_precision_hands.png
assets/icons/items/spec_05_precision_head.png
assets/icons/items/spec_05_spirit_chest.png
assets/icons/items/spec_05_spirit_feet.png
assets/icons/items/spec_05_spirit_hands.png
assets/icons/items/spec_05_spirit_head.png
assets/icons/items/spec_05_support_chest.png
assets/icons/items/spec_05_support_feet.png
assets/icons/items/spec_05_support_hands.png
assets/icons/items/spec_05_support_head.png
assets/icons/items/spec_06_endurance_chest.png
assets/icons/items/spec_06_endurance_feet.png
assets/icons/items/spec_06_endurance_hands.png
assets/icons/items/spec_06_endurance_head.png
assets/icons/items/spec_06_precision_chest.png
assets/icons/items/spec_06_precision_feet.png
assets/icons/items/spec_06_precision_hands.png
assets/icons/items/spec_06_precision_head.png
assets/icons/items/spec_06_spirit_chest.png
assets/icons/items/spec_06_spirit_feet.png
assets/icons/items/spec_06_spirit_hands.png
assets/icons/items/spec_06_spirit_head.png
assets/icons/items/spec_06_support_chest.png
assets/icons/items/spec_06_support_feet.png
assets/icons/items/spec_06_support_hands.png
assets/icons/items/spec_06_support_head.png
assets/icons/items/spec_07_endurance_chest.png
assets/icons/items/spec_07_endurance_feet.png
assets/icons/items/spec_07_endurance_hands.png
assets/icons/items/spec_07_endurance_head.png
assets/icons/items/spec_07_precision_chest.png
assets/icons/items/spec_07_precision_feet.png
assets/icons/items/spec_07_precision_hands.png
assets/icons/items/spec_07_precision_head.png
assets/icons/items/spec_07_spirit_chest.png
assets/icons/items/spec_07_spirit_feet.png
assets/icons/items/spec_07_spirit_hands.png
assets/icons/items/spec_07_spirit_head.png
assets/icons/items/spec_07_support_chest.png
assets/icons/items/spec_07_support_feet.png
assets/icons/items/spec_07_support_hands.png
assets/icons/items/spec_07_support_head.png
assets/icons/items/spec_08_endurance_chest.png
assets/icons/items/spec_08_endurance_feet.png
assets/icons/items/spec_08_endurance_hands.png
assets/icons/items/spec_08_endurance_head.png
assets/icons/items/spec_08_precision_chest.png
assets/icons/items/spec_08_precision_feet.png
assets/icons/items/spec_08_precision_hands.png
assets/icons/items/spec_08_precision_head.png
assets/icons/items/spec_08_spirit_chest.png
assets/icons/items/spec_08_spirit_feet.png
assets/icons/items/spec_08_spirit_hands.png
assets/icons/items/spec_08_spirit_head.png
assets/icons/items/spec_08_support_chest.png
assets/icons/items/spec_08_support_feet.png
assets/icons/items/spec_08_support_hands.png
assets/icons/items/spec_08_support_head.png
assets/icons/items/spec_09_endurance_chest.png
assets/icons/items/spec_09_endurance_feet.png
assets/icons/items/spec_09_endurance_hands.png
assets/icons/items/spec_09_endurance_head.png
assets/icons/items/spec_09_precision_chest.png
assets/icons/items/spec_09_precision_feet.png
assets/icons/items/spec_09_precision_hands.png
assets/icons/items/spec_09_precision_head.png
assets/icons/items/spec_09_spirit_chest.png
assets/icons/items/spec_09_spirit_feet.png
assets/icons/items/spec_09_spirit_hands.png
assets/icons/items/spec_09_spirit_head.png
assets/icons/items/spec_09_support_chest.png
assets/icons/items/spec_09_support_feet.png
assets/icons/items/spec_09_support_hands.png
assets/icons/items/spec_09_support_head.png
assets/icons/items/spec_10_endurance_chest.png
assets/icons/items/spec_10_endurance_feet.png
assets/icons/items/spec_10_endurance_hands.png
assets/icons/items/spec_10_endurance_head.png
assets/icons/items/spec_10_precision_chest.png
assets/icons/items/spec_10_precision_feet.png
assets/icons/items/spec_10_precision_hands.png
assets/icons/items/spec_10_precision_head.png
assets/icons/items/spec_10_spirit_chest.png
assets/icons/items/spec_10_spirit_feet.png
assets/icons/items/spec_10_spirit_hands.png
assets/icons/items/spec_10_spirit_head.png
assets/icons/items/spec_10_support_chest.png
assets/icons/items/spec_10_support_feet.png
assets/icons/items/spec_10_support_hands.png
assets/icons/items/spec_10_support_head.png
assets/icons/items/tri_compas_aire_hielo_rayo_back.png
assets/icons/items/tri_compas_aire_hielo_rayo_chest.png
assets/icons/items/tri_compas_aire_hielo_rayo_feet.png
assets/icons/items/tri_compas_aire_hielo_rayo_hands.png
assets/icons/items/tri_compas_aire_hielo_rayo_head.png
assets/icons/items/tri_compas_tierra_aire_rayo_back.png
assets/icons/items/tri_compas_tierra_aire_rayo_chest.png
assets/icons/items/tri_compas_tierra_aire_rayo_feet.png
assets/icons/items/tri_compas_tierra_aire_rayo_hands.png
assets/icons/items/tri_compas_tierra_aire_rayo_head.png
assets/icons/items/tri_compas_tierra_fuego_agua_back.png
assets/icons/items/tri_compas_tierra_fuego_agua_chest.png
assets/icons/items/tri_compas_tierra_fuego_agua_feet.png
assets/icons/items/tri_compas_tierra_fuego_agua_hands.png
assets/icons/items/tri_compas_tierra_fuego_agua_head.png
assets/icons/items/tri_dos_mares_back.png
assets/icons/items/tri_dos_mares_chest.png
assets/icons/items/tri_dos_mares_feet.png
assets/icons/items/tri_dos_mares_hands.png
assets/icons/items/tri_dos_mares_head.png
assets/icons/items/tri_tambor_azuero_back.png
assets/icons/items/tri_tambor_azuero_chest.png
assets/icons/items/tri_tambor_azuero_feet.png
assets/icons/items/tri_tambor_azuero_hands.png
assets/icons/items/tri_tambor_azuero_head.png
assets/icons/items/tri_tres_corrientes_back.png
assets/icons/items/tri_tres_corrientes_chest.png
assets/icons/items/tri_tres_corrientes_feet.png
assets/icons/items/tri_tres_corrientes_hands.png
assets/icons/items/tri_tres_corrientes_head.png
-->
| 2026-11-19 | 53 PNG añadidos a `assets/icons/spells/`: `guarapo_splash`, `night_dew`, `flint_spark`, `smoke_screen`, `bellows`, `salt_crust`, `machete_whirl`, `flood_furrow`, `cold_ash`, `quema_wind`, `river_shoulder`, `frozen_furrow`, `volcanic_fury`, `drizzle_needle`, `rain_stitch`, `spindle_gust`, `loom_roots`, `warp_tide`, `dry_lightning`, `landslip`, `cloudburst`, `thunder_weave`, `tempest_crown`, `cold_snare`, `eel_arrow`, `tar_arrow`, `tide_pull`, `heron_feather`, `charcoal_cloud`, `fog_arrow`, `frozen_estuary`, `final_quiver`, `forge_fervor`, `quarry_pull`, `ash_ward`, `anvil_rhythm`, `numbing_stomp`, `magma_ram`, `woven_power`, `dispel_gust`, `kiln_thread`, `charged_loom`, `gale_tempo`, `null_veil`, `steady_aim`, `mud_cloak`, `mangrove_spike`, `cleansing_arrow`, `macabre_shot`, `kiln_burst`, `tether_feather`, `thunder_flock`, `hunt_drum` | Ilustraciones originales generadas individualmente con OpenAI ImageGen y normalizadas localmente con `scripts/art/normalizar_iconos.py`; sin imágenes de referencia ni material externo | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Cobertura de los 53 hechizos de HZ-04c que carecían de PNG. Cada archivo es RGBA 256×256, caja segura de 176 px, sin marco, texto ni fondo; diseños y composiciones propios. Lámina a 46 px en `work/codex-ico02/hechizos_nuevos_46px.png` |
| 2026-11-20 | `assets/icons/spells/tuna_arrow.png` (Flecha de tuna) | Dibujado por código con un rasterizador propio en Python puro (polígonos, trazos y discos; sin PIL, fuentes ni imágenes de referencia) | FrankmanGames + Claude | Propia del proyecto | Provisional: flecha con rayo enroscado y cuatro chispas crecientes (los saltos de la tuna). RGBA 256×256 dentro de la caja segura. Conviene rehacerlo con el mismo acabado que el resto del catálogo |

Archivos exactos de la entrada ICO-02 anterior:
`assets/icons/spells/anvil_rhythm.png`, `assets/icons/spells/ash_ward.png`, `assets/icons/spells/bellows.png`, `assets/icons/spells/charcoal_cloud.png`, `assets/icons/spells/charged_loom.png`, `assets/icons/spells/cleansing_arrow.png`, `assets/icons/spells/cloudburst.png`, `assets/icons/spells/cold_ash.png`, `assets/icons/spells/cold_snare.png`, `assets/icons/spells/dispel_gust.png`, `assets/icons/spells/drizzle_needle.png`, `assets/icons/spells/dry_lightning.png`, `assets/icons/spells/eel_arrow.png`, `assets/icons/spells/final_quiver.png`, `assets/icons/spells/flint_spark.png`, `assets/icons/spells/flood_furrow.png`, `assets/icons/spells/fog_arrow.png`, `assets/icons/spells/forge_fervor.png`, `assets/icons/spells/frozen_estuary.png`, `assets/icons/spells/frozen_furrow.png`, `assets/icons/spells/gale_tempo.png`, `assets/icons/spells/guarapo_splash.png`, `assets/icons/spells/heron_feather.png`, `assets/icons/spells/hunt_drum.png`, `assets/icons/spells/kiln_burst.png`, `assets/icons/spells/kiln_thread.png`, `assets/icons/spells/landslip.png`, `assets/icons/spells/loom_roots.png`, `assets/icons/spells/macabre_shot.png`, `assets/icons/spells/machete_whirl.png`, `assets/icons/spells/magma_ram.png`, `assets/icons/spells/mangrove_spike.png`, `assets/icons/spells/mud_cloak.png`, `assets/icons/spells/night_dew.png`, `assets/icons/spells/null_veil.png`, `assets/icons/spells/numbing_stomp.png`, `assets/icons/spells/quarry_pull.png`, `assets/icons/spells/quema_wind.png`, `assets/icons/spells/rain_stitch.png`, `assets/icons/spells/river_shoulder.png`, `assets/icons/spells/salt_crust.png`, `assets/icons/spells/smoke_screen.png`, `assets/icons/spells/spindle_gust.png`, `assets/icons/spells/steady_aim.png`, `assets/icons/spells/tar_arrow.png`, `assets/icons/spells/tempest_crown.png`, `assets/icons/spells/tether_feather.png`, `assets/icons/spells/thunder_flock.png`, `assets/icons/spells/thunder_weave.png`, `assets/icons/spells/tide_pull.png`, `assets/icons/spells/volcanic_fury.png`, `assets/icons/spells/warp_tide.png`, `assets/icons/spells/woven_power.png`.
| 2026-11-19 | `assets/textures/pintadas/neutra_palma.png`, `assets/textures/pintadas/neutra_palma_normal.png` | Nodos de Blender horneados con Cycles por `scripts/blender/fg_pintura.py` (receta `neutra_palma`: trama de cestería casi blanca para teñir) | FrankmanGames | Propia del proyecto | 512×512 repetible con su normal. La usa el material `pintado` del sombrero pintado de `personaje.glb` (MOD-08). Sin fotografías ni texturas externas |
| 2026-11-20 | `assets/models/personaje.glb`, `assets/textures/personajes/heroes/personaje_rasgos.png` | Geometría, pesos y materiales originales de `scripts/blender/personaje.py` (MOD-08: pelo en cintas pegadas al cráneo, sombrero pintado en `Banda`, pollera larga en `Tunica`; guard: yelmo con la cara despejada —cejera sobre la ceja, naral, carrilleras a la mandíbula y barboquejo—, escudo con casquete abombado, ribete de cuero remachado y umbón, coraza con remaches y trabillas; boticaria: copa del pintado ensanchada y sellada sobre la coronilla del pelo suelto, ropón con peto hasta los hombros y chal de hombro con franja y fleco, dorso del ropón que traga la caña de la pescadora; default: faja de vueltas al cinto con nudo y dos caídas flecadas y cuello de camisa con solapas en pico, legibles a 8 m; la puntera de la caña, peinada a la altura del hombro: ya no pica la cara); Blender 5.2 | FrankmanGames | Propia del proyecto | 23 882 triángulos (antes 22 402). Mismo rig FG_personaje, mismas 15 piezas y 16 clips: los nombres de parte que consume `modelPartsFor` no cambian |
| 2026-11-19 | `assets/audio/music/cripta/mazmorra_hondo.ogg` | Composición propia escrita en Python (MIDI con semilla fija 6101): `work/claude-aud-mazmorra/componer_mazmorra.py`. Renderizada con sfizz 1.2.3 (BSD-2) y VS Chamber Orchestra 2 Community Edition (CC0 1.0); órgano, coro y parte de la percusión con GeneralUser GS 2.0.3 de S. Christian Collins (uso sin restricción de la música creada, también comercial). Salas de convolución propias; volumen −16 LUFS y Ogg/Opus 160 kb/s con `work/claude-aud-juego-musica/exportar.py` | FrankmanGames + Claude | Propia del proyecto | Sustituye a `cripta_descenso` como música de la cripta (creador 2026-11-19: «la idea es que sea musica de cavernas y misterio»). Frigio en la, bajo de lamento, pedal de órgano y contrabajos, coro en racimos y latido de timbal (4:48). De la pista de estudio solo se midieron rasgos globales (duración, curva de energía, color espectral), como en `cripta_descenso`; ninguna nota, melodía, armonía ni ritmo. Sin melodías tradicionales ni de otros juegos. Nombre provisional |
| 2026-11-19 | `assets/audio/music/pueblo/fiesta_en_el_atrio.ogg`, `assets/audio/music/pueblo_pelea/choque_en_la_plaza.ogg`, `assets/audio/music/cripta/cripta_descenso.ogg`, `assets/audio/music/guardian/musica1_propia.ogg` | Composiciones propias escritas en Python (MIDI con semilla fija): `work/claude-aud-cripta/real/fiesta_v3.py`, `work/audio-study/combate-propio/combate_propio.py`, `work/claude-aud-cripta/real/componer_real.py` y `work/claude-aud-musica1/musica1_propia.py`. Renderizadas con sfizz 1.2.3 (BSD-2) y VS Chamber Orchestra 2 Community Edition (CC0 1.0, github.com/sgossner/VSCO-2-CE); acordeón, guitarra, coro y parte de la percusión con GeneralUser GS 2.0.3 de S. Christian Collins (licencia que permite usar sin restricción la música creada con el banco, también comercial). Salas de convolución propias; volumen y Ogg/Opus 160 kb/s con `work/claude-aud-juego-musica/exportar.py` | FrankmanGames + Claude | Propia del proyecto | Música por contexto pedida por el creador el 2026-11-19: pueblo (tamborito, 3:09), pelea en pueblo (3:12), mazmorra (4:49) y jefe de mazmorra (4:06). `musica1_propia` toma la forma medida y dos contornos de `musica1`, una pieza generada con IA por el creador; lo demás está escrito en el script. Sin melodías tradicionales ni de otros juegos. Nombres provisionales |
| 2026-11-19 | `assets/models/equipo.glb` (8 nodos `obj_diablica_espeja_*`, EQ-10) y `data/art/ajusteEquipo.json` | Piezas separadas de La Diablica Espeja (`scripts/blender/diablica_espejo.py`, modelo propio) por `scripts/blender/equipo_diablica.py`, con su atlas de paleta; Blender 5.2 | FrankmanGames | Propia del proyecto | Tocado y careta, blusa, cuello, falda, guantes, medias y zapatos, lazo y bastón: 7 a medida (una malla por hueso, 12.377 triángulos) y el bastón como arma de mano (924). La tabla de ajuste se mide sobre los 6 héroes del repositorio. Sin modelos externos |
| 2026-11-19 | `assets/icons/reactions/mark_fire.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Marca de fuego: llama envolvente y ascua central; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/mark_water.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Marca de agua: gota y cresta de ola; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/mark_frost.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Marca de escarcha: cristal de seis brazos; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/mark_lightning.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Marca de rayo: descarga angular con lazo de energía; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/mark_earth.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Marca de tierra: roca facetada y raíces; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/vapor.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Vaho: espiral de vapor producida por gota y ascua; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/frozen_reaction.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Congelado: gota atrapada en un cristal; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/cramp.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Calambre: descarga sobre anillos de agua; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/mud.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Barrial: salpicadura de barro con corrientes de agua; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/squall.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Chubasco: lluvia diagonal envuelta por viento; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/thermal_shock.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Choque térmico: llama y hielo chocan en una grieta blanca; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/explosion.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Estallido: explosión ígnea atravesada por rayos; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/lava.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Lava: roca oscura abierta por material fundido; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/firestorm.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Incendio: llama extendida por una espiral de viento; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/fracture.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Quiebre: placa de hielo rota por una descarga; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/hard_frost.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Helada dura: placa pétrea trabada por hielo grueso; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/blizzard.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Ventisca: vórtice helado con cristal central; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/grounding.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Toma de tierra: rayo descargado sobre una roca; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/storm.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Tormenta: nube giratoria con tres descargas; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-19 | `assets/icons/reactions/dust_storm.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py`; sin referencias externas | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Polvareda: vórtice de polvo con fragmentos pétreos; PNG RGBA 46×46, caja segura de 34 px, sin marco, texto ni fondo |
| 2026-11-18 | `assets/models/falcopama.glb`, `arte/blender/falcopama.blend`, `scripts/blender/falcopama/*.py`, `scripts/blender/validar_falcopama.py` | Esculpido procedural original (metabolas y remallado sobre el desglose modular de la lámina propia del creador), UV de atlas, horneado de color y normales, rig con 32 huesos y siete clips, todo generado por los scripts en Blender 5.2.3 sin interfaz (MOD-02a). Diseño de las piezas: MOD-01 (`work/claude-falcolomba/`, Claude) | FrankmanGames + agente local OMP | Propia del proyecto | Falcopama montable chibi (nombre elegido por el creador el 2026-11-18; sustituye al provisional «Falcolomba»): 16 524 triángulos, atlas de color y normales de 2048 px, anclajes `mount_seat` y `rider_root` (silla z=1,37, altura 2,01 m), regiones `montura_<region>` del contrato de paletas. La lámina del creador solo se miró; no se carga ni se distribuye. Evidencia en `work/omp-mod02/` |
| 2026-11-17 | `assets/models/aguila_arpia.glb`, `arte/blender/aguila_arpia.blend`, `scripts/blender/aguila_arpia/*.py`, `scripts/blender/validar_aguila_arpia.py` | Esculpido procedural original (metabolas, remallado de vóxel, plumas por loft), reducción, UV, horneado de color y normales y rig con siete clips, todo generado por los scripts en Blender 5.2.3 sin interfaz (MOD-01) | FrankmanGames + Claude | Propia del proyecto | Águila arpía gigante montable, estilo anime, a partir de la anatomía de la especie real (doble cresta, disco facial, banda pectoral, tarsos gruesos); 17 680 triángulos, 35 huesos, atlas de color y normales de 2048 px, anclajes `mount_seat` y `rider_root`. Sustituye a `montura_arpia.glb` en `mount_dev_harpy` por decisión del creador (2026-11-17); el modelo anterior queda en el repositorio sin usar. Sin modelos, texturas ni animaciones externas |
| 2026-11-17 | `prettier` 3.10.1, `eslint` 10.15.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.73.0, `eslint-config-prettier` 10.1.8 | npm | Prettier, ESLint y TypeScript ESLint contributors | MIT | Herramientas de formato y lint (dev). Indentación de 4 espacios (`tabWidth: 4`). No se empaquetan con Electron |
| 2026-11-16 | `assets/models/crestalba.glb`, `arte/blender/crestalba.blend`, `scripts/blender/crestalba.py` | Rediseño procedural original v2 sobre el contrato clean-room existente; la lámina aportada se usó sólo para requisitos funcionales de montura aviar, sin copiar nombre, silueta, paleta, silla ni detalles | FrankmanGames + Codex | Propia del proyecto | 4 960 triángulos, plumaje geométrico en capas, cara/ojos, alas, cola y silla rehechos; conserva once piezas, siete clips, anclajes y diez variantes. Evidencia en `work/codex-mcp-calidad/crestalba_final.png` |
| 2026-11-16 | `assets/models/moneda_exposicion_1915.glb`, `arte/blender/moneda_exposicion_1915.blend`, `scripts/blender/moneda_exposicion_1915.py` | Modelado procedural desde cero guiado por la fotografía `2458-original.jpg` aportada por el creador de una moneda histórica Panamá–Pacífico de 1915; la imagen no se carga, copia, texturiza ni distribuye | FrankmanGames + Codex; diseño histórico del objeto real | Modelo propio del proyecto; referencia histórica/fotográfica sólo visual | Prop de exhibición: una malla, tres materiales, 69 852 triángulos, relieve de búho, piñas, rama, cuentas y leyendas. No es moneda de curso ni contenido económico. Evidencia en `work/codex-mcp-calidad/moneda_exposicion_1915_final.png` |
| 2026-11-16 | `blender-mcp-ultra==3.2.0` (gateway MCP y extensión de Blender) | [`carlosh7/blender-mcp`](https://github.com/carlosh7/blender-mcp), commit `7a1538c432e8382732ade4db65cadb8999918805`; distribución aislada por `uvx`, sin copiar el código al juego | CarlosH y contribuidores | MIT (gateway); GPL-3.0-or-later declarada por la extensión | Herramienta local de autoría, no se empaqueta con Electron ni aporta assets al juego. Se prohíben sus integraciones de assets/generación externos por clean-room. Tarball auditado: SHA-256 `8819f829c8a32034052ae61b80da35a5f6ba8c91e7747365f493425a5504d869` |
| 2026-11-16 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py`, `assets/textures/personajes/heroes/cara_diablica_espejo.png`, `assets/textures/personajes/heroes/diablica_espejo_cuerpo.jpg`, `assets/textures/personajes/heroes/diablica_espejo_falda.jpg`, `assets/textures/personajes/heroes/diablica_espejo_tocado.jpg`, `assets/textures/personajes/heroes/diablica_espejo_pelo.jpg`, `assets/textures/personajes/heroes/diablica_espejo_mascara.jpg` y `assets/textures/personajes/heroes/diablica_espejo_baston.jpg` | Modelado, rig y 20 clips originales en Blender 5.2 (`fg_heroe`/`fg_rig`, primitivas propias); rostro y piezas pintados desde cero con numpy y horneados por el propio script; paleta y rostro guiados por el paquete de referencias del creador en `work/omp-diablica-espejo/` (v2), que no se distribuye ni se carga | FrankmanGames + agente local OMP | Propia del proyecto | NPC folklórica original inspirada en la danza del Diablo de Espejo (interpretación respetuosa, sin estética demoníaca occidental ni copias): seis piezas estables (Cuerpo, Falda, Tocado, Baston, Mascara, Pelo), 17 411 triángulos; clips propios `MascaraOn`/`MascaraOff` para mostrar u ocultar la careta desde el juego y `Baston`/`Reaccion` para su gesto. Revisión visual por MCP con láminas en `work/omp-diablica-espejo/` |
| 2026-11-17 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (rehechos) | Malla y esqueleto de `assets/models/oraculo_f_anime.glb` (base de héroes ya registrada); vestuario, tocado, bastón, careta, paleta y los 20 clips propios (12 de combate y diálogo y 8 gestos) generados por el script; iris recoloreados por código. Las texturas JPG sueltas de la fila anterior ya no las usa este modelo (van dentro del GLB) | FrankmanGames + Claude (coordinador) | Propia del proyecto (y la licencia de la base anime) | F36-POL: 17 360 triángulos, 6 piezas, 20 clips; guiado por la lámina del creador en `work/omp-diablica-espejo/`, que no se distribuye ni se carga |
| 2026-11-17 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (v6) | Misma malla y esqueleto de `assets/models/oraculo_f_anime.glb`; vestuario, tocado, bastón, careta, paleta plana por pieza y los 20 clips propios generados por el script | FrankmanGames + Claude (coordinador) | Propia del proyecto (y la licencia de la base anime) | F36-POL v6: 17 881 triángulos, 6 piezas, 20 clips; guiado por la lámina de modelo y la lámina modular del creador en `work/claude-diablica/ref2/`, que no se distribuyen ni se cargan. La v5 queda en `work/claude-diablica/v5_anterior/` |
| 2026-11-17 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (rostro v6) | Ojos de la base anime recolocados y recoloreados por código; rubor, pecas y labios pintados por el script sobre la textura de piel de la base | FrankmanGames + Claude (coordinador) | Propia del proyecto (y la licencia de la base anime) | F36-POL v6, rostro según la lámina del creador en `work/claude-diablica/ref2/` (no se distribuye ni se carga): 17 868 triángulos |
| 2026-11-17 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (tocado v6) | Geometría propia generada por el script: espejos reducidos, tres espejitos en la banda y cola arqueada de pompones con cintas | FrankmanGames + Claude (coordinador) | Propia del proyecto (y la licencia de la base anime) | F36-POL v6, según una imagen del creador que no se distribuye ni se carga: 17 956 triángulos |
| 2026-11-17 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (física y danzas) | Mismo modelo v6; añade siete huesos de vaivén con movimiento secundario horneado y los clips `Danza_Reflejo` y `Danza_Brinco`, generados por el script | FrankmanGames + Claude (coordinador) | Propia del proyecto (y la licencia de la base anime) | F36-DANZA: coreografía propia inspirada en la tradición del diablo espejo de Colón (fuentes públicas sin pasos descritos); nada copiado ni transcrito |
| 2026-11-19 | `assets/models/diablica_espejo.glb`, `arte/blender/diablica_espejo.blend`, `scripts/blender/diablica_espejo.py` (danza del giro y hueso de careta) | Mismo modelo v6; el script añade el clip `Danza_Giro` (tercera coreografía propia), reescribe `Danza_Reflejo` y `Danza_Brinco` más lentos y largos, y crea el hueso `careta` (hijo de `head`) que lleva la máscara de la cara a la mano en `MascaraOff`/`MascaraOn`; 17 663 triángulos, 15 clips, altura 1,82 | FrankmanGames + agente local OMP (encargo directo del creador) | Propia del proyecto (y la licencia de la base anime) | F36-DANZA ampliada: coreografía del giro propia, sin pasos copiados. El motor (`gltfCharacter`) quita la pista de `careta` de todos los clips salvo `MascaraOn/Off` para que la máscara se quede en la mano sin «pop»; no se carga ni distribuye nada externo. Evidencia en `work/omp-espejo-danzas/` (renders del gesto) y escenario Electron `espeja` |
| 2026-11-15 | `assets/icons/items/scroll_weapon_mastery.png` | Composición determinista original con `scripts/art/render_item_icons.py` (Pillow); sin imágenes externas ni fuentes | FrankmanGames | Propia del proyecto | Pergamino de Dominio de arma, 256×256 RGBA; conserva el lenguaje propio de pergaminos y usa el acento elemental del hechizo |
| 2026-11-15 | `assets/icons/spells/weapon_mastery.png` | Ilustración original generada individualmente con OpenAI ImageGen y normalizada localmente con `scripts/art/normalizar_iconos.py` | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Dominio de arma: lanza y espada originales cruzadas con pulso dorado, acento turquesa y silueta legible. PNG RGBA 256×256, caja segura 176 px, sin marco, texto ni fondo |
| 2026-11-15 | `assets/icons/spells/double_monsoon.png`, `assets/icons/spells/gale_star.png` | Ilustraciones originales generadas individualmente con OpenAI ImageGen y normalizadas localmente con `scripts/art/normalizar_iconos.py` | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Doble Diluvio comunica explícitamente sus dos líneas, agua+rayo; Estrella de vendaval, un área de ocho brazos de aire. PNG RGBA 256×256, caja segura 176 px, sin marco, texto ni fondo; diseños originales sin símbolos de terceros |
| 2026-11-15 | `assets/icons/spells/firebreak.png`, `assets/icons/spells/mist_veil.png`, `assets/icons/spells/reed_call.png` | Ilustraciones originales generadas individualmente con OpenAI ImageGen y normalizadas localmente con `scripts/art/normalizar_iconos.py` | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Primer desbloqueo de la línea ampliada: Vanguardia, Tejedora y Cazador. PNG RGBA 256×256, caja segura de 176 px, sin marco, texto ni fondo. Las capturas externas solo informaron densidad y legibilidad general; no se copiaron objetos, símbolos, nombres, cifras ni composiciones |
| 2026-11-14 | `assets/models/ave_gallote.glb`, `assets/models/ave_tijereta.glb`, `scripts/blender/ave.py`, `scripts/blender/validar_ave.py`, `scripts/blender/revisar_ave.py`, `arte/blender/ave.blend` | Un esqueleto de ave con alas (fg_rig) y dos variantes de malla originales, generados desde cero con primitivas propias en Blender 5.2; lámina `revision.png` y tiras de fotogramas en `work/omp-d17/` | FrankmanGames + agente local OMP | Propia del proyecto | Gallote (gallinazo carroñero, 564 tri, ~0,9 m posado, calva de piel, papada y alas plegadas) y tijereta (aves marina de costa, 524 tri, ~1,6 m de envergadura en el planeo, cola ahorquillada y bolsa gular). Seis clips compartidos (Reposo, Aleteo, Planear, Picada, Golpeado, Morir) con los bucles sin salto; plumas como prismas (sin tarjetas transparentes), misma regla que crestalba. **Pendiente de revisión humana; NO enlazado en data/ ni integrado.** Clean-room: sin assets de terceros |
| 2026-11-13 | `assets/models/cripta_rata.glb`, `assets/models/cripta_guardian.glb`, `assets/models/cripta_bruto.glb` y las tres plantillas `cripta_*` de `data/assets.json` | Modelos, rig y clips originales de la familia «Cripta» generados con Blender 5.2 (primitivas propias, `scripts/blender/fg_rig.py`); prototipo, lámina `revision.png` y reels `criatura_*.mp4` revisados en `work/omp-enemigos-cripta/` | FrankmanGames + agente local OMP | Propia del proyecto | Cuadrúpeda baja (rata de calavera, 636 tri), bípedo delgado con capa y lanza (guardián, 660 tri) y bípedo macizo con martillo (bruto, 780 tri); clips con los nombres de los héroes y ojos/runa emisivos. Clean-room: sin assets de terceros. Enlazados como `enemy.cripta_*` en `data/assets.json`; un spawn propio en `data/dungeons/` queda pendiente de decisión de contenido |
| 2026-11-12 | `assets/models/cazador_anime.glb` y `assets/models/cazador_f_anime.glb` (v2, regenerados), `scripts/blender/cazador_anime_fix.py`, `scripts/blender/diagnostico.py`, `scripts/blender/validar_cazador_anime.py`, `arte/blender/cazador_anime_fix.blend`, `arte/blender/cazador_f_anime_fix.blend` | Regrabación propia de los clips «Disparar» y «Lanzar» de la v1 (2026-11-09) con IK horneada por fotograma en Blender 5.2; prototipado y verificado en `work/omp-cazador-animacion/` (REPORTE.md, `revision.png`, vídeos `vid/`) | FrankmanGames + agente local OMP | Propia del proyecto | Tracción con ancla en la barbilla (manoR→cabeza 31 cm estable; antes 49→59 cm huyendo de la cuerda) y lanzamiento con recorrido completo (65/70 cm; antes 35 cm); 17 clips, skin de 16 joints y nombres de nodo idénticos a la v1; Caminar/Correr confirmados walk-in-place sin deslizamiento real de suela (0,0 cm/f); evento «cast» re-sincronizado a t=0,44. Sin modelos ni archivos externos |
| 2026-11-10 | `assets/icons/items/cobre_sword.png`, `assets/icons/items/laton_axe.png`, `assets/icons/items/oroviejo_axe.png`, `assets/icons/items/granito_axe.png`, `assets/icons/items/estano_mace.png`, `assets/icons/items/acero_mace.png`, `assets/icons/items/titan_mace.png`, `assets/icons/items/relampago_mace.png`, `assets/icons/items/bronce_greatsword.png`, `assets/icons/items/verdin_greatsword.png`, `assets/icons/items/obsidiana_greatsword.png`, `assets/icons/items/crepusculo_greatsword.png`, `assets/icons/items/totuma_hammer.png`, `assets/icons/items/forja_hammer.png`, `assets/icons/items/nacar2_hammer.png`, `assets/icons/items/acero_spear.png`, `assets/icons/items/crepusculo_spear.png`, `assets/icons/items/corindon_dagger.png`, `assets/icons/items/eclipse_dagger.png`, `assets/icons/items/estano_bow.png`, `assets/icons/items/obsidiana_bow.png`, `assets/icons/items/crepusculo_bow.png`, `assets/icons/items/plata_crossbow.png`, `assets/icons/items/granito_crossbow.png`, `assets/icons/items/abismo_crossbow.png`, `assets/icons/items/cobre_staff.png`, `assets/icons/items/cobalto_staff.png`, `assets/icons/items/corindon_staff.png`, `assets/icons/items/bronce_wand.png`, `assets/icons/items/verdin_wand.png`, `assets/icons/items/obsidiana_wand.png`, `assets/icons/items/crepusculo_wand.png`, `assets/icons/items/oroviejo_orb.png`, `assets/icons/items/granito_orb.png`, `assets/icons/items/verdin_shield.png`, `assets/icons/items/perlanegra_shield.png`, `assets/icons/items/cobalto_cuirass.png`, `assets/icons/items/relampago_boots.png`, `assets/icons/items/bronce_cape.png`, `assets/icons/items/nacar2_cape.png`, `assets/icons/items/perlanegra_cape.png`, `assets/icons/items/cobalto_belt.png`, `assets/icons/items/plata_ring.png`, `assets/icons/items/forja_amulet.png`, `assets/icons/items/bocas_gale_helm.png`, `assets/icons/items/bocas_gale_cuirass.png`, `assets/icons/items/bocas_gale_gauntlets.png`, `assets/icons/items/bocas_gale_ring.png`, `assets/icons/items/bocas_gale_cape.png`, `assets/icons/items/istmo_tideplate_shield.png`, `assets/icons/items/istmo_tideplate_cuirass.png`, `assets/icons/items/istmo_tideplate_boots.png`, `assets/icons/items/istmo_tideplate_belt.png`, `assets/icons/items/istmo_tideplate_amulet.png` | Composiciones deterministas originales con `scripts/t05/renderNewItemIcons.py` (envoltura de `scripts/art/render_item_icons.py`, Pillow); sin imágenes externas ni fuentes | FrankmanGames | Propia del proyecto | Matriz categoría × franja H09: relleno + refuerzos + sets `bocas_gale` y `istmo_tideplate`; cifras PROPUESTA |
| 2026-11-12 | `assets/models/mazmorra.glb` (regenerado), `assets/textures/barro.png`, `assets/textures/duela.png` y `scripts/blender/mazmorra.py` | Catálogo de rompibles prototipado y revisado en `work/omp-rompibles-cripta/` (lámina `revision.png`): 3 jarras nuevas (común intacta), barril bajo, caja de tablones y astillas de duela; texturas procedurales en color generadas por el propio script | FrankmanGames + agente local OMP | Propia del proyecto | Barro cocido con goteado y duela con veta y nudos: los rompibles viajan sin tinte de tema; mazmorra.glb 2.366 → 3.484 triángulos (tope ≤500 por objeto, ≤120 por fragmento), sin archivos externos |
| 2026-11-12 | `assets/models/mazmorra.glb` (regenerado) y `scripts/blender/mazmorra.py` | Corrección de geometría auditada por el agente local OMP (work/omp-cripta-geometria/REPORTE.md); mismos materiales y texturas propios | FrankmanGames + agente local OMP | Propia del proyecto | Muros y remates dentro de la huella TILE, boca de entrada recortada al montículo, bases apoyadas hundidas 5 mm contra z-fighting con la losa; 2.286 triángulos, sin archivos externos |
| 2026-11-10 | `assets/icons/spells/salt_temper.png`, `assets/icons/spells/thunder_maul.png`, `assets/icons/spells/midday_cinder.png`, `assets/icons/spells/clay_spire.png`, `assets/icons/spells/dew_arrow.png`, `assets/icons/spells/lightning_arrow.png`, `assets/icons/spells/tide_cleave.png`, `assets/icons/spells/waterspout.png`, `assets/icons/spells/estuary_arrow.png` | Ilustraciones originales generadas individualmente con OpenAI ImageGen y normalizadas localmente con `scripts/art/normalizar_iconos.py` | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Nueve símbolos nuevos de hechizo, incluidos los tres de agua. Masas de color sólidas, contorno oscuro y alto contraste; PNG RGBA 256×256, caja segura de 176 px, sin marco, texto ni fondo. Las referencias de Dofus se usaron sólo para estudiar legibilidad a tamaño pequeño; no se copiaron archivos, símbolos ni composiciones |
| 2026-11-10 | `assets/dev_dungeon/dungeon1.ogg`, `assets/dev_dungeon/dungeon2.ogg`, `assets/dev_dungeon/dungeon3.ogg`, `assets/dev_dungeon/README.md` | Archivos aportados por el creador; corresponden a otro juego y se incorporan sólo como experimento de audio de mazmorra | No identificado | No identificada; no asumir permiso de redistribución | **EXPERIMENTO DE AUDIO, NO ORIGINAL Y NO APTO PARA PUBLICACIÓN** hasta identificar autor y licencia o reemplazarlo. Reproducción de desarrollo mediante bolsa aleatoria: las tres pistas suenan una vez por ciclo, sin repetición inmediata |
| 2026-11-09 | `assets/models/detalle_suelo.glb`, `arte/blender/detalle_suelo.blend`, `scripts/blender/detalle_suelo.py` | Geometría y materiales procedurales originales creados localmente con Blender 5.2; catálogo encargado al agente local OMP, revisado y validado en el repositorio | FrankmanGames + agente local OMP | Propia del proyecto | 18 ramas, raíces, hojarascas, piedritas, madera de arrastre, conchas, semillas y hojas caídas; 2.310 triángulos. Todo mide menos de 0,20 m y su contrato exige no añadir colisión. Sin texturas ni archivos externos |
| 2026-11-20 | `assets/models/caminos_rurales.glb`, `arte/blender/caminos_rurales.blend`, `scripts/blender/caminos_rurales.py` | Geometría y materiales procedurales originales creados localmente con Blender 5.2; catálogo encargado al agente local OMP, revisado y validado en el repositorio | FrankmanGames + agente local OMP | Propia del proyecto | 18 piezas modulares de cerca, portón, señal, pasos de agua y utilería rural; 2.666 triángulos, diez materiales planos, sin texturas ni archivos externos. ENV-02 (2026-11-20): listones partidos en junta vista, postes a dos tonos con pie húmedo, tablillas chaflanadas y cuerdas amarradas a la usanza de Azuero; ninguna pieza pasa del doble de su presupuesto anterior. Formas genéricas de finca, sin marcas ni lugares reales |
| 2026-11-09 | `assets/models/costa_modular.glb`, `arte/blender/costa_modular.blend`, `scripts/blender/costa_modular.py` | Geometría y materiales procedurales originales creados localmente con Blender 5.2; catálogo encargado al agente local OMP, revisado y validado en el repositorio | FrankmanGames + agente local OMP | Propia del proyecto | 18 rocas, maderas de arrastre, raíces, arena, borde de poza y detalles de costa; 2.052 triángulos, seis materiales, sin texturas ni archivos externos. Formas fantásticas genéricas, sin afirmar playas o especies concretas |
| 2026-11-09 | `assets/models/naturaleza_suelo.glb`, `arte/blender/naturaleza_suelo.blend`, `scripts/blender/naturaleza_suelo.py` | Geometría y materiales procedurales originales creados localmente con Blender 5.2; catálogo encargado al agente local OMP y revisado, regenerado y validado en el repositorio | FrankmanGames + agente local OMP | Propia del proyecto | 18 nodos estáticos: doce rocas redondas, puntiagudas, planas, partidas o musgosas; cuatro troncos caídos; dos tocones. 1.320 triángulos totales, sin texturas, modelos ni referencias externas. Seis variantes ya sustituyen los props provisionales del mapa |
| 2026-11-09 | `assets/models/centinela_anime.glb`, `assets/models/oraculo_anime.glb`, `assets/models/cazador_anime.glb`, `assets/textures/personajes/heroes/centinela_anime_piel.jpg`, `assets/textures/personajes/heroes/centinela_anime_ropa.jpg`, `assets/textures/personajes/heroes/centinela_anime_ropa2.jpg`, `assets/textures/personajes/heroes/centinela_anime_calzado.jpg`, `assets/textures/personajes/heroes/centinela_anime_cara.jpg`, `assets/textures/personajes/heroes/centinela_anime_ojos.jpg`, `assets/textures/personajes/heroes/centinela_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/centinela_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/centinela_anime_pelo_bun.jpg`, `assets/textures/personajes/heroes/oraculo_anime_piel.jpg`, `assets/textures/personajes/heroes/oraculo_anime_ropa.jpg`, `assets/textures/personajes/heroes/oraculo_anime_ropa2.jpg`, `assets/textures/personajes/heroes/oraculo_anime_calzado.jpg`, `assets/textures/personajes/heroes/oraculo_anime_cara.jpg`, `assets/textures/personajes/heroes/oraculo_anime_ojos.jpg`, `assets/textures/personajes/heroes/oraculo_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/oraculo_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/oraculo_anime_pelo_bun.jpg`, `assets/textures/personajes/heroes/cazador_anime_piel.jpg`, `assets/textures/personajes/heroes/cazador_anime_ropa.jpg`, `assets/textures/personajes/heroes/cazador_anime_ropa2.jpg`, `assets/textures/personajes/heroes/cazador_anime_calzado.jpg`, `assets/textures/personajes/heroes/cazador_anime_cara.jpg`, `assets/textures/personajes/heroes/cazador_anime_ojos.jpg`, `assets/textures/personajes/heroes/cazador_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/cazador_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/cazador_anime_pelo_bun.jpg`, `scripts/blender/heroe_anime.py`, `scripts/blender/heroe_piezas.py` | Malla, UV y texturas de piel, cara, ojos y pelo corto de «Base Rigged Stylized Humanoid Character (YW)», https://opengameart.org/content/base-rigged-stylized-humanoid-character-yw ; peinados largo y moño de «Blender-chan» (fila siguiente) encajados en esta cabeza; esqueleto, pesos reducidos, ropa por zonas, variantes de cara pintadas (pecas, cicatriz, líneas de jagua), clips y horneado propios con Blender 5.2 | Base: Girush; adaptación: FrankmanGames | CC0 1.0 (base); propia (adaptación) | El `.blend` de la base no se guarda en el repositorio: se descarga aparte y se pasa con `--fuente`. Telas de `assets/textures/pintadas/`. Piezas teñibles (`skin`, `cloth`, `trim`, `hair`) horneadas neutras en JPEG dentro de cada GLB |
| 2026-11-09 | `assets/models/centinela_f_anime.glb`, `assets/models/oraculo_f_anime.glb`, `assets/models/cazador_f_anime.glb`, `assets/textures/personajes/heroes/centinela_f_anime_piel.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_ropa.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_ropa2.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_calzado.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_cara.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/centinela_f_anime_pelo_bun.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_piel.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_ropa.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_ropa2.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_calzado.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_cara.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/oraculo_f_anime_pelo_bun.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_piel.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_ropa.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_ropa2.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_calzado.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_cara.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_pelo_short.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_pelo_long.jpg`, `assets/textures/personajes/heroes/cazador_f_anime_pelo_bun.jpg`, `scripts/blender/heroe_bchan.py` | Malla, UV, ojos, cejas, pestañas, formas de la cara y pelo largo y moño de «Blender-chan (B-chan)», https://opengameart.org/content/b-chan (original en https://amarilloarts.itch.io/blender-chan); pelo corto de la base YW; sin los adornos con su marca; esqueleto común, brazos bajados, falda recogida, clips y horneado propios con Blender 5.2 | Base: AmarilloArts (subida a OpenGameArt por hardboileduser); adaptación: FrankmanGames | CC0 1.0 (base); propia (adaptación) | El `.blend` no se guarda en el repositorio: se pasa con `--fuente`. Mismas piezas teñibles que los masculinos |
| 2026-11-09 | 32 PNG de armas en `assets/icons/items/` (todos los objetos con `slot: weapon`) y los nuevos `assets/icons/items/cane_bow.png`, `assets/icons/items/reed_bow.png`, `assets/icons/items/mangrove_bow.png`, `assets/icons/items/cotton_bandana.png`, `assets/icons/items/hide_vest.png`, `assets/icons/items/hunter_boots.png`, `assets/icons/items/hunter_gloves.png`, `assets/icons/items/leather_cap.png`, `assets/icons/items/mangrove_jerkin.png`, `assets/icons/items/palm_cap.png`, `assets/icons/items/palm_cape.png`, `assets/icons/items/rope_belt.png`, `assets/icons/items/rope_sandals.png`, `assets/icons/items/seed_ring.png`, `assets/icons/items/shell_amulet.png`, `assets/icons/items/work_gloves.png`, `assets/icons/items/worker_shirt.png` | Ilustraciones originales generadas individualmente con OpenAI ImageGen; recortadas, centradas y normalizadas localmente con `scripts/art/normalizar_iconos.py` | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Anime fantástico artesanal de inspiración tropical panameña: madera, fibra, cuero, cobre, turquesa y coral. PNG RGBA 256×256, caja segura de 176 px, sin marco, texto ni fondo horneado. Completa el catálogo actual de 154 objetos; no reutiliza archivos ni composiciones de referencias externas |
| 2026-11-09 | `assets/models/equipo.glb` y `scripts/blender/equipo.py` | Geometría procedural original y materiales pintados propios; reconstruidos con Blender 5.2 a partir de las siluetas, paletas y materiales definidos por los iconos originales del proyecto | FrankmanGames | Propia del proyecto | Las 32 armas conservan su nodo `obj_<itemId>`, origen de agarre y orientación +Z. Se añadieron firmas visuales por arma (fibra, turquesa/coral, hojas, bruma, lava, ámbar, nácar y cobre); 57 nodos totales, 16.260 triángulos, validación exacta correcta. Sin modelos externos |
| 2026-11-08 | `assets/icons/ui/split_bar.png`, `assets/icons/ui/split_bar_pressed.png`, `assets/icons/ui/unlock_bar.png`, `assets/icons/ui/unlock_bar_pressed.png` | Símbolos y variantes de estado originales generados individualmente con OpenAI ImageGen; transparencia, centrado y caja segura normalizados con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Separar/unir en tres secciones; barra fija con candado cerrado y barra suelta con candado abierto e iluminado. Sin botón, panel, marco, texto ni fondo horneado |
| 2026-11-08 | Catálogo de 41 hechizos: los 31 archivos registrados el 2026-11-06 más `assets/icons/spells/arrow_downpour.png`, `assets/icons/spells/hawk_eye.png`, `assets/icons/spells/heron_leap.png`, `assets/icons/spells/hunter_arrow.png`, `assets/icons/spells/piercing_shot.png`, `assets/icons/spells/powder_arrow.png`, `assets/icons/spells/powder_dash.png`, `assets/icons/spells/reed_cross.png`, `assets/icons/spells/thorn_ward.png`, `assets/icons/spells/vine_arrow.png`; también `assets/icons/ui/professions.png` | Composiciones originales generadas individualmente con OpenAI ImageGen; recorte, centrado y caja segura normalizados con Pillow. Martillo, formón y brote de oficios se generaron por separado y se compusieron localmente | FrankmanGames + OpenAI ImageGen | Propia del proyecto | PNG RGBA 256×256 sin marco ni fondo horneado; ilustración dentro de caja segura de 176 px. Marcos, teclas, cantidades y estados pertenecen al CSS. Reemplaza visualmente el lote vectorial de hechizos del 2026-11-06 sin reutilizar imágenes externas |
| 2026-11-08 | `assets/textures/pintadas/bronce_pintado.png`, `assets/textures/pintadas/bronce_pintado_normal.png`, `assets/textures/pintadas/cuero_castano.png`, `assets/textures/pintadas/cuero_castano_normal.png`, `assets/textures/pintadas/cuero_oscuro.png`, `assets/textures/pintadas/cuero_oscuro_normal.png`, `assets/textures/pintadas/hierro_pintado.png`, `assets/textures/pintadas/hierro_pintado_normal.png`, `assets/textures/pintadas/madera_asta.png`, `assets/textures/pintadas/madera_asta_normal.png`, `assets/textures/pintadas/madera_clara.png`, `assets/textures/pintadas/madera_clara_normal.png`, `assets/textures/pintadas/mola_bruma_rombos.png`, `assets/textures/pintadas/mola_bruma_rombos_normal.png`, `assets/textures/pintadas/mola_coral_zigzag.png`, `assets/textures/pintadas/mola_coral_zigzag_normal.png`, `assets/textures/pintadas/mola_musgo_zigzag.png`, `assets/textures/pintadas/mola_musgo_zigzag_normal.png`, `assets/textures/pintadas/mola_turquesa_escalones.png`, `assets/textures/pintadas/mola_turquesa_escalones_normal.png`, `assets/textures/pintadas/mola_violeta_rombos.png`, `assets/textures/pintadas/mola_violeta_rombos_normal.png`, `assets/textures/pintadas/oro_pintado.png`, `assets/textures/pintadas/oro_pintado_normal.png`, `assets/textures/pintadas/pelo_castano.png`, `assets/textures/pintadas/pelo_castano_normal.png`, `assets/textures/pintadas/pelo_negro.png`, `assets/textures/pintadas/pelo_negro_normal.png`, `assets/textures/pintadas/piel_cacao.png`, `assets/textures/pintadas/piel_canela.png`, `assets/textures/pintadas/piel_trigo.png`, `assets/textures/pintadas/plumas_garza.png`, `assets/textures/pintadas/plumas_garza_normal.png`, `assets/textures/pintadas/plumas_guacamaya.png`, `assets/textures/pintadas/plumas_guacamaya_normal.png`, `assets/textures/pintadas/tela_arena.png`, `assets/textures/pintadas/tela_arena_normal.png`, `assets/textures/pintadas/tela_blanca.png`, `assets/textures/pintadas/tela_blanca_normal.png`, `assets/textures/pintadas/tela_bruma.png`, `assets/textures/pintadas/tela_bruma_normal.png`, `assets/textures/pintadas/tela_carbon.png`, `assets/textures/pintadas/tela_carbon_normal.png`, `assets/textures/pintadas/tela_coral.png`, `assets/textures/pintadas/tela_coral_normal.png`, `assets/textures/pintadas/tela_lino.png`, `assets/textures/pintadas/tela_lino_normal.png`, `assets/textures/pintadas/tela_musgo.png`, `assets/textures/pintadas/tela_musgo_normal.png`, `assets/textures/pintadas/tela_noche.png`, `assets/textures/pintadas/tela_noche_normal.png`, `assets/textures/pintadas/tela_oliva.png`, `assets/textures/pintadas/tela_oliva_normal.png`, `assets/textures/pintadas/tela_turquesa.png`, `assets/textures/pintadas/tela_turquesa_normal.png`, `assets/textures/pintadas/tela_violeta.png`, `assets/textures/pintadas/tela_violeta_normal.png` | Nodos de Blender (ruido periódico, Voronoi, ondas y rampas) horneados con Cycles por `scripts/blender/fg_pintura.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Texturas de pintura repetibles de 512×512 con su normal (salvo pieles): telas, cueros, maderas, metales, pieles, pelo, plumas y cenefas geométricas tipo mola propias. Colores planos, sin fotografías, muestras ni texturas externas |
| 2026-11-08 | `assets/textures/personajes/heroes/cara_cazador.png`, `assets/textures/personajes/heroes/cara_cazador_f.png`, `assets/textures/personajes/heroes/cara_centinela.png`, `assets/textures/personajes/heroes/cara_centinela_f.png`, `assets/textures/personajes/heroes/cara_oraculo.png`, `assets/textures/personajes/heroes/cara_oraculo_f.png`, `assets/textures/personajes/heroes/cazador_arma_arco.jpg`, `assets/textures/personajes/heroes/cazador_cuerpo.jpg`, `assets/textures/personajes/heroes/cazador_f_arma_arco.jpg`, `assets/textures/personajes/heroes/cazador_f_cuerpo.jpg`, `assets/textures/personajes/heroes/cazador_f_pelo.jpg`, `assets/textures/personajes/heroes/cazador_pelo.jpg`, `assets/textures/personajes/heroes/centinela_cuerpo.jpg`, `assets/textures/personajes/heroes/centinela_escudo.jpg`, `assets/textures/personajes/heroes/centinela_f_cuerpo.jpg`, `assets/textures/personajes/heroes/centinela_f_escudo.jpg`, `assets/textures/personajes/heroes/centinela_f_lanza.jpg`, `assets/textures/personajes/heroes/centinela_f_pelo.jpg`, `assets/textures/personajes/heroes/centinela_lanza.jpg`, `assets/textures/personajes/heroes/centinela_pelo.jpg`, `assets/textures/personajes/heroes/oraculo_arma_baston.jpg`, `assets/textures/personajes/heroes/oraculo_cuerpo.jpg`, `assets/textures/personajes/heroes/oraculo_f_arma_baston.jpg`, `assets/textures/personajes/heroes/oraculo_f_cuerpo.jpg`, `assets/textures/personajes/heroes/oraculo_f_pelo.jpg`, `assets/textures/personajes/heroes/oraculo_pelo.jpg` | Horneado por pieza (color + oclusión) de los materiales pintados en `scripts/blender/fg_heroe.py`; caras pintadas con numpy en el mismo módulo | FrankmanGames | Propia del proyecto | Una textura por pieza de cada héroe; embebidas en sus GLB. Reproducibles con `centinela.py`, `oraculo.py` y `cazador.py` |
| 2026-11-08 | `assets/models/centinela.glb`, `assets/models/centinela_f.glb`, `work/capturas/centinela/` | Geometría, rig, pesos y clips originales de `scripts/blender/centinela.py` con `fg_heroe.py`, `fg_figura.py` y `fg_rig.py`; Blender 5.2 | FrankmanGames; diseño de la lámina «Centinela del Istmo» del creador | Propia del proyecto | Rehecho masculino y nuevo femenino: piezas `Cuerpo`, `Pelo`, `Lanza`, `Escudo`; mismos clips. Texturas de `assets/textures/pintadas/` horneadas, en JPEG dentro del GLB |
| 2026-11-08 | `assets/models/oraculo.glb`, `assets/models/oraculo_f.glb`, `work/capturas/oraculo/` | Geometría, rig, pesos y clips originales de `scripts/blender/oraculo.py` con `fg_heroe.py`; Blender 5.2 | FrankmanGames; diseño de la lámina «Oráculo de Bruma» del creador | Propia del proyecto | Piezas `Cuerpo`, `Pelo`, `Arma_baston`; clips comunes con golpe de bastón y conjuro propios |
| 2026-11-08 | `assets/models/cazador.glb`, `assets/models/cazador_f.glb`, `work/capturas/cazador/` | Geometría, rig, pesos y clips originales de `scripts/blender/cazador.py` con `fg_heroe.py`; Blender 5.2 | FrankmanGames; diseño de la lámina «Cazador del Manglar» del creador | Propia del proyecto | Piezas `Cuerpo`, `Pelo`, `Arma_arco`; clips comunes más `Disparar` (suelta en el fotograma 16 de 26) |
| 2026-11-08 | `assets/textures/pintadas/madera_oscura.png`, `assets/textures/pintadas/madera_oscura_normal.png`, `assets/textures/pintadas/palma_tejida.png`, `assets/textures/pintadas/palma_tejida_normal.png`, `assets/textures/pintadas/neutra_cuero.png`, `assets/textures/pintadas/neutra_cuero_normal.png`, `assets/textures/pintadas/neutra_metal.png`, `assets/textures/pintadas/neutra_metal_normal.png`, `assets/textures/pintadas/neutra_pelo.png`, `assets/textures/pintadas/neutra_pelo_normal.png`, `assets/textures/pintadas/neutra_piel.png`, `assets/textures/pintadas/neutra_tela.png`, `assets/textures/pintadas/neutra_tela_normal.png` | Nodos de Blender horneados con Cycles por `scripts/blender/fg_pintura.py` (recetas `madera_oscura`, `palma_tejida` con trama de cestería propia y la serie `neutra_*` casi blanca para teñir por paleta); Blender 5.2 | FrankmanGames | Propia del proyecto | 512×512 repetibles con su normal (salvo `neutra_piel`). Sin fotografías ni texturas externas |
| 2026-11-08 | `assets/textures/personajes/heroes/personaje_rasgos.png` | Pintado con numpy por `H.pintar_cara` de `scripts/blender/fg_heroe.py`, separado en color y alfa por `scripts/blender/personaje.py` | FrankmanGames | Propia del proyecto | Ojos, cejas y boca del personaje base como calcomanía con alfa; embebida en `personaje.glb` |
| 2026-11-08 | `assets/models/personaje.glb`, `work/capturas/personaje/` | Geometría, pesos y materiales originales de `scripts/blender/personaje.py` (rehecho con `fg_heroe.py`); mismo esqueleto, clips y 15 piezas; Blender 5.2 | FrankmanGames | Propia del proyecto | Tercer pase (P02): cuerpo continuo, rasgos pintados y texturas `neutra_*` multiplicadas por los canales `skin`, `cloth`, `trim`, `hair` y `gear` que tiñe la paleta |
| 2026-11-08 | `assets/models/equipo.glb` (57 nodos `obj_<itemId>`), `work/capturas/equipo/equipo_nuevos.png` | Geometría original de `scripts/blender/equipo.py` con texturas de `assets/textures/pintadas/` en JPEG dentro del GLB; Blender 5.2 | FrankmanGames | Propia del proyecto | P03: arcos de caña, carrizo, manglar y Darién rehechos con agarre en el origen y cuerda hacia −Y; nuevos `palm_cap`, `cotton_bandana`, `leather_cap` y `palm_cape` |
| 2026-11-07 | `assets/models/crestalba.glb`, `arte/blender/crestalba.blend`, `assets/icons/items/mount_dev_crestalba.png`, `assets/icons/items/mount_dev_diostede.png`, `work/capturas/crestalba/` | Geometría, rig, animación, materiales, iconos y renders originales reproducibles con `scripts/blender/crestalba.py`, `scripts/blender/capturas_montura.py` y `scripts/art/render_item_icons.py`; Blender 5.2 y Pillow | FrankmanGames | Propia del proyecto | Crestalba: ave montable original de cuerpo erguido, pico corto, cresta bifurcada, alas redondeadas y cola en abanico; 2 884 triángulos, once piezas, una armadura, siete clips y diez paletas por siete regiones. El icono pendiente del Diostedé se regeneró con el mismo catálogo determinista. La lámina de referencia se usó sólo para requisitos funcionales generales; no se incorporó, recortó, texturizó ni reprodujo su nombre, silueta, paleta, silla o detalles |
| 2026-11-07 | `assets/audio/music/guardian/guardian_mix.wav`, `assets/audio/music/guardian/guardian_harmony.wav`, `assets/audio/music/guardian/guardian_melody.wav`, `assets/audio/music/guardian/guardian_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems, 84 BPM y 34,286 s; tema de combate fantástico con motivo angular y percusión activa. Sin samples, grabaciones, melodías tradicionales ni archivos externos |
| 2026-11-07 | `assets/audio/music/titulo/titulo_mix.wav`, `assets/audio/music/titulo/titulo_harmony.wav`, `assets/audio/music/titulo/titulo_melody.wav`, `assets/audio/music/titulo/titulo_percussion.wav`, `assets/audio/music/cripta/cripta_mix.wav`, `assets/audio/music/cripta/cripta_harmony.wav`, `assets/audio/music/cripta/cripta_melody.wav`, `assets/audio/music/cripta/cripta_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems por contexto. Portada: 68 BPM, 42,353 s, apertura fantástica; cripta: 54 BPM, 53,333 s, tensión grave. Sin samples, grabaciones, melodías tradicionales ni archivos externos |
| 2026-11-07 | `assets/models/vegetacion_lod.glb` | Geometría distante original generada por `scripts/blender/vegetacion_lod.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | 19 nodos compatibles con `vegetacion.glb` para nueve familias arbóreas y roca; 996 triángulos, sin modelos, texturas ni archivos externos |
| 2026-11-07 | `assets/textures/surfaces/madera_tropical.png`, `assets/textures/surfaces/madera_tropical_normal.png`, `assets/textures/surfaces/madera_tropical_roughness.png`, `assets/textures/surfaces/arena_costera.png`, `assets/textures/surfaces/arena_costera_normal.png`, `assets/textures/surfaces/arena_costera_roughness.png`, `assets/textures/surfaces/corteza_fantastica.png`, `assets/textures/surfaces/corteza_fantastica_normal.png`, `assets/textures/surfaces/corteza_fantastica_roughness.png`, `assets/textures/surfaces/hoja_tropical.png`, `assets/textures/surfaces/hoja_tropical_normal.png`, `assets/textures/surfaces/hoja_tropical_roughness.png`, `assets/textures/surfaces/tela_tejida.png`, `assets/textures/surfaces/tela_tejida_normal.png`, `assets/textures/surfaces/tela_tejida_roughness.png` | Ruido periódico, vetas, ondas, costillas, follaje y trama originales calculados por `scripts/blender/utileria.py` | FrankmanGames | Propia del proyecto | Cinco juegos PBR repetibles de 512×512; materiales fantásticos genéricos sin fotografías, muestras, especies, tejidos tradicionales ni texturas externas |
| 2026-11-06 | `assets/audio/music/panama/panama_mix.wav`, `assets/audio/music/panama/panama_harmony.wav`, `assets/audio/music/panama/panama_melody.wav`, `assets/audio/music/panama/panama_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems, 76 BPM y 37,895 s; propuesta urbana fantástica de escala hexatónica y pulso firme. Sin samples, grabaciones, melodías tradicionales ni archivos externos |
| 2026-11-06 | `assets/textures/personajes/atlas/centinela_cuerpo_base.png`, `assets/textures/personajes/atlas/centinela_cuerpo_roughness.png`, `assets/textures/personajes/atlas/centinela_cuerpo_metallic.png`, `assets/textures/personajes/atlas/centinela_pelo_base.png`, `assets/textures/personajes/atlas/centinela_pelo_roughness.png`, `assets/textures/personajes/atlas/centinela_pelo_metallic.png`, `assets/textures/personajes/atlas/centinela_lanza_base.png`, `assets/textures/personajes/atlas/centinela_lanza_roughness.png`, `assets/textures/personajes/atlas/centinela_lanza_metallic.png`, `assets/textures/personajes/atlas/centinela_escudo_base.png`, `assets/textures/personajes/atlas/centinela_escudo_roughness.png`, `assets/textures/personajes/atlas/centinela_escudo_metallic.png` | Consolidación determinista con `scripts/blender/fg_atlas.py` de las texturas propias ya registradas del Centinela; sin iluminación ni fuentes nuevas | FrankmanGames | Propia del proyecto | Cuatro atlas PBR (base, rugosidad y metal) que reducen `assets/models/centinela.glb` de 33 a cuatro primitivas. Fuentes reproducibles; el GLB lleva los mapas embebidos |
| 2026-11-06 | `assets/audio/music/bocas/bocas_mix.wav`, `assets/audio/music/bocas/bocas_harmony.wav`, `assets/audio/music/bocas/bocas_melody.wav`, `assets/audio/music/bocas/bocas_percussion.wav`, `assets/audio/music/perlas/perlas_mix.wav`, `assets/audio/music/perlas/perlas_harmony.wav`, `assets/audio/music/perlas/perlas_melody.wav`, `assets/audio/music/perlas/perlas_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems por región insular futura. Bocas: 74 BPM, pentatónica abierta y pulso móvil; Las Perlas: 80 BPM, hexatónica brillante y textura ligera. Atmósferas ficticias sin samples, melodías tradicionales ni archivos externos |
| 2026-11-06 | `assets/icons/statuses/body_lock.png`, `assets/icons/statuses/burn.png`, `assets/icons/statuses/chilled.png`, `assets/icons/statuses/dazed.png`, `assets/icons/statuses/disoriented.png`, `assets/icons/statuses/haste.png`, `assets/icons/statuses/iron_shout.png`, `assets/icons/statuses/regeneration.png`, `assets/icons/statuses/retaliation.png`, `assets/icons/statuses/rooted.png`, `assets/icons/statuses/shield.png`, `assets/icons/statuses/static_charge.png`, `assets/icons/statuses/still_aegis.png`, `assets/icons/statuses/stone_skin.png`, `assets/icons/statuses/storm_focus.png`, `assets/icons/statuses/storm_mirror.png`, `assets/icons/statuses/stunned.png`, `assets/icons/statuses/tackled.png`, `assets/icons/statuses/time_echo.png`, `assets/icons/statuses/weariness.png` | Insignias vectoriales rasterizadas y deterministas con Pillow por `scripts/art/render_status_icons.py`, reutilizando el lenguaje propio de los hechizos | FrankmanGames | Propia del proyecto | 20 PNG RGBA 256×256, uno por ID de `data/rpg/statuses.json`; hexágono verde para mejora y rojo para perjuicio, sin fuentes ni imágenes externas |
| 2026-11-06 | `assets/icons/items/ancon_moon_gem.png`, `assets/icons/items/ancon_orb.png`, `assets/icons/items/apprentice_cowl.png`, `assets/icons/items/apprentice_robe.png`, `assets/icons/items/apprentice_sandals.png`, `assets/icons/items/bajareque_coffee.png`, `assets/icons/items/baru_cloud_cape.png`, `assets/icons/items/basalt_helm.png`, `assets/icons/items/black_pearl_necklace.png`, `assets/icons/items/buccaneer_sabre.png`, `assets/icons/items/cabuya_belt.png`, `assets/icons/items/cane_crossbow.png`, `assets/icons/items/charm_archivist_owl.png`, `assets/icons/items/charm_ash_fox.png`, `assets/icons/items/charm_moss_turtle.png`, `assets/icons/items/chonta_spike.png`, `assets/icons/items/coconut_ring.png`, `assets/icons/items/coffee_mill_hammer.png`, `assets/icons/items/cold_ash_ring.png`, `assets/icons/items/copper_ring.png`, `assets/icons/items/copper_wand.png`, `assets/icons/items/corn_bollo.png`, `assets/icons/items/cotton_boll.png`, `assets/icons/items/coyote_belt.png`, `assets/icons/items/crab_eye_gem.png`, `assets/icons/items/crypt_key.png`, `assets/icons/items/darien_boots.png`, `assets/icons/items/darien_bow.png`, `assets/icons/items/darien_cape.png`, `assets/icons/items/darien_gloves.png`, `assets/icons/items/darien_hood.png`, `assets/icons/items/diablo_bells.png`, `assets/icons/items/diablo_knife.png`, `assets/icons/items/diablo_mask.png`, `assets/icons/items/diablo_suit.png`, `assets/icons/items/doubloon_ring.png`, `assets/icons/items/essence.png`, `assets/icons/items/explorer_boots.png`, `assets/icons/items/explorer_gloves.png`, `assets/icons/items/explorer_hood.png`, `assets/icons/items/explorer_jerkin.png`, `assets/icons/items/fang.png`, `assets/icons/items/fiber_bijao.png`, `assets/icons/items/fish_lantern.png`, `assets/icons/items/fish_moon_snook.png`, `assets/icons/items/fish_moss_carp.png`, `assets/icons/items/fish_night_snapper.png`, `assets/icons/items/fish_silver_perch.png`, `assets/icons/items/fish_storm_eel.png`, `assets/icons/items/fortuna_gauntlets.png`, `assets/icons/items/fortuna_hood.png`, `assets/icons/items/gale_axe.png`, `assets/icons/items/gourd_buckler.png`, `assets/icons/items/greater_health_potion.png`, `assets/icons/items/guayacan_club.png`, `assets/icons/items/haste_elixir.png`, `assets/icons/items/health_potion.png`, `assets/icons/items/hide.png`, `assets/icons/items/iron_helm.png`, `assets/icons/items/iron_nugget.png`, `assets/icons/items/jade_ring.png`, `assets/icons/items/last_bus_blade.png`, `assets/icons/items/leather_bracers.png`, `assets/icons/items/locks_belt.png`, `assets/icons/items/locks_boots.png`, `assets/icons/items/locks_helm.png`, `assets/icons/items/locks_plate.png`, `assets/icons/items/locks_shield.png`, `assets/icons/items/lookout_crossbow.png`, `assets/icons/items/machetero_blade.png`, `assets/icons/items/machetero_cutarras.png`, `assets/icons/items/machetero_hat.png`, `assets/icons/items/machetero_shirt.png`, `assets/icons/items/mangrove_root_wand.png`, `assets/icons/items/minor_health_potion.png`, `assets/icons/items/mist_orb.png`, `assets/icons/items/moonstone_amulet.png`, `assets/icons/items/mount_dev_harpy.png`, `assets/icons/items/mount_horse.png`, `assets/icons/items/mount_mule.png`, `assets/icons/items/mount_tapir.png`, `assets/icons/items/nacre_buckler.png`, `assets/icons/items/oak_buckler.png`, `assets/icons/items/oak_staff.png`, `assets/icons/items/old_boot.png`, `assets/icons/items/ore.png`, `assets/icons/items/padded_vest.png`, `assets/icons/items/pearl_diver_harpoon.png`, `assets/icons/items/peeling_knife.png`, `assets/icons/items/picker_gloves.png`, `assets/icons/items/pollera_chain.png`, `assets/icons/items/pollera_gown.png`, `assets/icons/items/pollera_slippers.png`, `assets/icons/items/pollera_tembleques.png`, `assets/icons/items/pot_lid_shield.png`, `assets/icons/items/potato_farmer_boots.png`, `assets/icons/items/pulse_draught.png`, `assets/icons/items/quetzal_spear.png`, `assets/icons/items/raspadura_block.png`, `assets/icons/items/red_mangrove_axe.png`, `assets/icons/items/reed_anklets.png`, `assets/icons/items/reed_hat.png`, `assets/icons/items/reef_bracers.png`, `assets/icons/items/resource_tonic.png`, `assets/icons/items/rozador_machete.png`, `assets/icons/items/scroll_bramble_snare.png`, `assets/icons/items/scroll_gust.png`, `assets/icons/items/scroll_light_bandage.png`, `assets/icons/items/scroll_rime_shard.png`, `assets/icons/items/scroll_seer_dust.png`, `assets/icons/items/scroll_still_aegis.png`, `assets/icons/items/scroll_stone_skin.png`, `assets/icons/items/scroll_time_echo.png`, `assets/icons/items/scroll_wolf_spirit.png`, `assets/icons/items/seco_del_regreso.png`, `assets/icons/items/sentinel_shield.png`, `assets/icons/items/sentinel_spear.png`, `assets/icons/items/shell_bracers.png`, `assets/icons/items/short_sword.png`, `assets/icons/items/smith_mace.png`, `assets/icons/items/storm_orb.png`, `assets/icons/items/straw_cape.png`, `assets/icons/items/supreme_health_potion.png`, `assets/icons/items/titan_maul.png`, `assets/icons/items/traveler_boots.png`, `assets/icons/items/tulivieja_amulet.png`, `assets/icons/items/tulivieja_ring.png`, `assets/icons/items/tulivieja_robe.png`, `assets/icons/items/tulivieja_staff.png`, `assets/icons/items/tulivieja_veil.png`, `assets/icons/items/volcano_sword.png`, `assets/icons/items/wolf_tooth_amulet.png`, `assets/icons/items/wood_cedar.png`, `assets/icons/items/wood_guayacan.png`, `assets/icons/items/woodcutter_axe.png` | Ilustración vectorial rasterizada y determinista con Pillow por `scripts/art/render_item_icons.py`; sin fuentes ni imágenes externas | FrankmanGames | Propia del proyecto | 135 PNG RGBA 256×256, uno por ID de `data/rpg/items.json`; familias propias para equipo, consumibles, joyería, materiales, mascotas y pergaminos |
| 2026-11-06 | `assets/icons/spells/bramble_snare.png`, `assets/icons/spells/bulwark.png`, `assets/icons/spells/charge.png`, `assets/icons/spells/ember_chain.png`, `assets/icons/spells/ember_mine.png`, `assets/icons/spells/ember_whirl.png`, `assets/icons/spells/fiery_slash.png`, `assets/icons/spells/frost_nova.png`, `assets/icons/spells/frost_recoil.png`, `assets/icons/spells/glacial_lance.png`, `assets/icons/spells/gust.png`, `assets/icons/spells/iron_shout.png`, `assets/icons/spells/leaden_gale.png`, `assets/icons/spells/light_bandage.png`, `assets/icons/spells/lightning_step.png`, `assets/icons/spells/retaliation.png`, `assets/icons/spells/rime_shard.png`, `assets/icons/spells/searing_mark.png`, `assets/icons/spells/seer_dust.png`, `assets/icons/spells/spark.png`, `assets/icons/spells/static_field.png`, `assets/icons/spells/still_aegis.png`, `assets/icons/spells/stone_skin.png`, `assets/icons/spells/storm_focus.png`, `assets/icons/spells/storm_mirror.png`, `assets/icons/spells/storm_swap.png`, `assets/icons/spells/stunning_pommel.png`, `assets/icons/spells/time_echo.png`, `assets/icons/spells/vertigo_whistle.png`, `assets/icons/spells/voltaic_arc.png`, `assets/icons/spells/wolf_spirit.png` | Ilustración vectorial rasterizada y determinista con Pillow por `scripts/art/render_spell_icons.py`; sin fuentes ni imágenes externas | FrankmanGames | Propia del proyecto | 31 PNG RGBA 256×256, uno por ID de `data/rpg/spells.json`; símbolos originales y paleta elemental común, sustitutos propuestos para los emojis del sistema |
| 2026-11-06 | `assets/audio/music/colon/colon_mix.wav`, `assets/audio/music/colon/colon_harmony.wav`, `assets/audio/music/colon/colon_melody.wav`, `assets/audio/music/colon/colon_percussion.wav`, `assets/audio/music/darien/darien_mix.wav`, `assets/audio/music/darien/darien_harmony.wav`, `assets/audio/music/darien/darien_melody.wav`, `assets/audio/music/darien/darien_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems por región futura. Colón: 72 BPM, modo abierto y pulso activo; Darién: 58 BPM, pentatónica menor y espacio profundo. Atmósferas ficticias sin samples, melodías tradicionales ni archivos externos |
| 2026-11-20 | `assets/models/escenografia_regional.glb` (12 nodos `escena_<id>`) | Geometría y materiales procedurales originales de `scripts/blender/escenografia_regional.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Almacén, caseta, puesto de mercado, muelles, amarradero, tres embarcaciones, poste, estandarte y baliza; 1.724 triángulos. ENV-02 (2026-11-20): el puesto de mercado lleva postes a dos tonos con pie húmedo, mostrador de tres tablas, faldón de tela y dosel de franjas en los colores vino y turquesa de las polleras. Diseños fantásticos funcionales; sin edificios, barcos, marcas, banderas ni texturas externas |
| 2026-11-06 | `assets/models/naturaleza_modular.glb` (12 nodos `natural_<id>`) | Geometría y materiales procedurales originales de `scripts/blender/naturaleza_modular.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Formas ambientales genéricas: árbol de sombra, palma joven, arbustos verde/seco, helecho, flores, pasto, tronco caído y cuatro composiciones de roca. No representan ni certifican especies reales; sin modelos ni texturas externas |
| 2026-11-06 | `assets/audio/music/panama_oeste/panama_oeste_mix.wav`, `assets/audio/music/panama_oeste/panama_oeste_harmony.wav`, `assets/audio/music/panama_oeste/panama_oeste_melody.wav`, `assets/audio/music/panama_oeste/panama_oeste_percussion.wav`, `assets/audio/music/chiriqui/chiriqui_mix.wav`, `assets/audio/music/chiriqui/chiriqui_harmony.wav`, `assets/audio/music/chiriqui/chiriqui_melody.wav`, `assets/audio/music/chiriqui/chiriqui_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems por región futura. Panamá Oeste: 68 BPM, pentatónica abierta y pulso costero; Chiriquí: 64 BPM, hexatónica menor y aire de montaña. Sin samples, melodías tradicionales ni archivos externos |
| 2026-11-06 | `assets/models/simbolos_istmo.glb` (6 nodos `simbolo_<id>`) | Geometría y materiales procedurales originales de `scripts/blender/simbolos_istmo.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Estatua fantástica de arpía, monedas ficticias, sombrero trenzado, vestido festivo propuesto, aretes de oro y machete ceremonial. No incluye bandera, escudo nacional, moneda real, marca deportiva ni archivos externos; requiere revisión cultural antes de tratar una pieza como representación tradicional |
| 2026-11-06 | `assets/audio/ambience/costa_dia.wav`, `assets/audio/ambience/sabana_seca.wav`, `assets/audio/ambience/bosque_nuboso.wav` | Síntesis original determinista con `scripts/audio/render_original_ambience.py`; ruido periódico filtrado, tonos y envolventes calculados | FrankmanGames | Propia del proyecto | Tres bucles estéreo de 24 s, 44,1 kHz/16 bit, pico 0,72 y empalme 0. Sin grabaciones, samples ni cantos de animales reales |
| 2026-11-06 | `assets/portraits/adventurer_default.png` | Generado con OpenAI ImageGen a partir de un encargo original; transparencia conservada | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Retrato predeterminado de aventurera original, 1312×1199 RGBA; paleta cacao/vino/turquesa/oro. No sustituye el futuro retrato dinámico del aspecto elegido |
| 2026-11-06 | `assets/icons/stats/strength.png`, `assets/icons/stats/agility.png`, `assets/icons/stats/intellect.png`, `assets/icons/stats/vitality.png`, `assets/icons/stats/spirit.png` | Generados individualmente con OpenAI ImageGen a partir de símbolos originales; recortados y optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Guantelete de piedra, pluma con veleta, astrolabio, escudo vegetal y caracola de aliento; RGBA transparente, sin copiar iconografía de otros juegos |
| 2026-11-06 | `assets/audio/music/veraguas/veraguas_mix.wav`, `assets/audio/music/veraguas/veraguas_harmony.wav`, `assets/audio/music/veraguas/veraguas_melody.wav`, `assets/audio/music/veraguas/veraguas_percussion.wav`, `assets/audio/music/cocle/cocle_mix.wav`, `assets/audio/music/cocle/cocle_harmony.wav`, `assets/audio/music/cocle/cocle_melody.wav`, `assets/audio/music/cocle/cocle_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia del proyecto | Mezcla + tres stems por región. Veraguas: 62 BPM, pentatónica menor abierta y aire presente; Coclé: 70 BPM, hexatónica luminosa y pulso de madera. Sin samples ni melodías externas |
| 2026-11-06 | `assets/models/caballo_azuero.glb` | Modelo, rig y clips procedurales originales de `scripts/blender/caballo_azuero.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Caballo alazán original con lucero, calcetines, crin, cola, silla, manta, brida y estribos. Clips `Reposo`, `Paso` y `Trotar`; sin modelos, mocap ni texturas externas |
| 2026-11-06 | `work/capturas/estilo/mismo_lugar_cel.png`, `work/capturas/estilo/mismo_lugar_naturalista.png` | Render original y reproducible de `scripts/blender/comparar_estilos.py`; usa sólo `assets/models/utileria.glb` y geometría propia | FrankmanGames | Propia del proyecto | Comparación de idéntica cámara/composición: cel saturado y naturalista con paleta apagada, biseles y luz cálida/fría. No son assets finales del juego |
| 2026-11-20 | `assets/models/utileria.glb` (18 nodos `prop_<id>`) | Geometría y materiales procedurales originales de `scripts/blender/utileria.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Carreta, tinajas, silla, mesas, escalera, farol, poste, fogata, chimenea, rancho de paja, barril, cajón, banco, cerca, amarradero y bebedero; 5.012 triángulos, ocho superficies PBR. ENV-02 (2026-11-20): cerca y poste de camino con listones partidos en junta vista, pie húmedo a dos tonos, cuerdas amarradas y tablillas chaflanadas; barril con duvas alternas; banco con tabla central clara; bebedero con duvas al talud; rancho con postes reforzados; ninguna pieza pasa del doble de su presupuesto anterior. Sin modelos externos |
| 2026-11-06 | `assets/textures/surfaces/tierra_seca.png`, `assets/textures/surfaces/tierra_seca_normal.png`, `assets/textures/surfaces/tierra_seca_roughness.png`, `assets/textures/surfaces/piedra_clara.png`, `assets/textures/surfaces/piedra_clara_normal.png`, `assets/textures/surfaces/piedra_clara_roughness.png`, `assets/textures/surfaces/cesped_tropical.png`, `assets/textures/surfaces/cesped_tropical_normal.png`, `assets/textures/surfaces/cesped_tropical_roughness.png` | Ruido periódico, grietas, vetas, haces, normales y rugosidad originales y deterministas de `scripts/blender/utileria.py` | FrankmanGames | Propia del proyecto | Tres juegos PBR repetibles de 512×512; sin fotografías, muestras ni texturas externas |
| 2026-11-07 | `assets/models/diostede.glb` | Modelo, rig y siete clips procedurales originales de `scripts/blender/diostede.py` (Blender 5.2, por MCP); editable en `arte/blender/diostede.blend` | FrankmanGames | Propia del proyecto | Diostedé, montura voladora: tucán rechoncho del Darién con pico enorme en tres bandas, piel de color alrededor del ojo, babero, alas cortas plegadas al flanco, cola larga levantada, patas zigodáctilas y manta de silla en capas con borde en zigzag. Diseño propio (PROPUESTA), sin referencias de otros juegos. Una sola malla; diez variantes de color por región de material (`data/art/diostede_variantes.json`). Clips `idle_ground`, `walk`, `run`, `takeoff`, `fly_idle`, `fly_forward` y `land`; anclajes `mount_seat` y `rider_root`. Sin modelos, texturas ni animaciones externas |
| 2026-11-06 | `assets/models/montura_arpia.glb` | Modelo, rig y clips procedurales originales de `scripts/blender/montura_arpia.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Pichón de arpía montable original: proporción redonda, ojos grandes, penacho/cola ascendentes y paleta pizarra suave, marfil, turquesa y coral. Clips `Reposo`, `Trotar`, `Volar` y `Planear`; sin modelos, animaciones ni texturas externas y sin copiar la referencia de Dofus |
| 2026-11-06 | `assets/models/equipo.glb` (50 nodos `obj_<itemId>`: armas, escudos, cabeza y capas) | Geometría y materiales procedurales originales de `scripts/blender/equipo.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Biblioteca original a escala real: 35 piezas de mano, 12 de cabeza y 3 capas. Incluye lanza y escudo del Centinela; sin modelos externos |
| 2026-11-06 | Clips `Caminar` y `Correr` de `assets/models/personaje.glb` y `assets/models/centinela.glb` | Animación procedural original en `scripts/blender/fg_rig.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Ciclos humanoides propios con apoyo, descenso, paso y elevación; contrapeso de pelvis, torso, cabeza y brazos. Sin mocap ni animaciones externas |
| 2026-11-06 | Clips `Emote_wave`, `Emote_laugh`, `Emote_dance`, `Emote_cry`, `Emote_angry`, `Emote_love`, `Emote_sleep`, `Emote_doubt` en `assets/models/personaje.glb` y `centinela.glb` | Animación procedural original en `scripts/blender/fg_rig.py`; Blender 5.2 | FrankmanGames | Propia del proyecto | Gestos construidos sobre el rig humanoide propio, sin mocap ni animaciones externas |
| 2026-11-06 | `assets/icons/ui/options.png`, `assets/icons/ui/chat.png`, `assets/icons/ui/camera.png`, `assets/icons/ui/characteristics.png` | Generados con OpenAI ImageGen a partir de símbolos originales definidos para el proyecto; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Engranaje-brújula, placas de conversación, cámara de explorador y tablero de atributos; continúan la familia cacao/vino/turquesa/oro sin copiar composiciones externas |
| 2026-11-06 | `assets/emotes/wave.png`, `assets/emotes/laugh.png`, `assets/emotes/dance.png`, `assets/emotes/cry.png`, `assets/emotes/angry.png`, `assets/emotes/love.png`, `assets/emotes/sleep.png`, `assets/emotes/doubt.png` | Generados con OpenAI ImageGen a partir de símbolos originales definidos para el proyecto; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Sustitutos propios de los ocho emojis provisionales: mano, máscaras, botas, máscara llorando, puño, hojas, hamaca y brújula. Sin archivos ni composiciones de Dofus |
| 2026-11-06 | `assets/audio/music/iguanera/iguanera_mix.wav`, `assets/audio/music/iguanera/iguanera_harmony.wav`, `assets/audio/music/iguanera/iguanera_melody.wav`, `assets/audio/music/iguanera/iguanera_percussion.wav`, `assets/audio/music/herrera/herrera_mix.wav`, `assets/audio/music/herrera/herrera_harmony.wav`, `assets/audio/music/herrera/herrera_melody.wav`, `assets/audio/music/herrera/herrera_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia | Mezcla + tres stems por región; Iguanera 56 BPM pentatónica luminosa, Herrera 66 BPM dórica grave. Sin samples ni melodías externas |
| 2026-11-06 | `assets/audio/music/los_santos/los_santos_mix.wav`, `assets/audio/music/los_santos/los_santos_harmony.wav`, `assets/audio/music/los_santos/los_santos_melody.wav`, `assets/audio/music/los_santos/los_santos_percussion.wav` | Composición y síntesis original determinista con `scripts/audio/render_original_music.py` | FrankmanGames | Propia | Bucle estéreo de 16 compases a 74 BPM; stems de armonía, melodía y percusión. Sin samples ni melodías externas |
| 2026-11-06 | `assets/icons/map/casa.png`, `assets/icons/map/mercader.png`, `assets/icons/map/mazmorra.png`, `assets/icons/map/muelle.png`, `assets/icons/map/lancha.png` | Generados con OpenAI ImageGen a partir de un encargo original del creador; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Segundo lote de marcadores: casa tropical, cesta mercante, cueva, muelle y lancha, con fondo transparente y composición original |
| 2026-11-06 | `assets/icons/map/piedra_pintada.png`, `assets/icons/map/taller.png`, `assets/icons/map/banco.png`, `assets/icons/map/castillo.png`, `assets/icons/map/mision.png` | Generados con OpenAI ImageGen a partir de un encargo original del creador; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Primer lote de marcadores de mapa, fondo transparente y silueta simplificada. Piedra, banco, fortín, puesto artesanal y camino-estelar originales |
| 2026-11-06 | `assets/icons/ui/journal.png`, `assets/icons/ui/compendium.png`, `assets/icons/ui/professions.png`, `assets/icons/ui/pause.png` | Generados con OpenAI ImageGen a partir de un encargo original del creador; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Diario de campo, folio naturalista, herramientas de oficio y menú de placas. Mismo contrato visual del lote 01; sin copiar símbolos ni composiciones de la referencia |
| 2026-11-08 | `assets/icons/ui/professions.png` | Corregido con OpenAI ImageGen a partir del símbolo original del proyecto; optimizado a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Martillo de mango recto, formón y brote; fondo transparente, composición compacta y sin referencias externas |
| 2026-11-06 | `assets/icons/ui/inventory.png`, `assets/icons/ui/character.png`, `assets/icons/ui/spellbook.png`, `assets/icons/ui/map.png` | Generados con OpenAI ImageGen a partir de un encargo original del creador; optimizados a 256×256 con Pillow | FrankmanGames + OpenAI ImageGen | Propia del proyecto | Mochila de cuero y fibra, medallón de personaje, diario de hechizos y mapa tropical. Paleta cacao/vino/turquesa/oro; sin copiar símbolos ni composiciones de la referencia. Prompts y contrato en `docs/GUIA_INTEGRACION_ARTE_AUDIO.md` |
| 2026-11-05 | `assets/models/iglesia.glb` | Generado por `scripts/blender/pueblo.py` en Blender 5.2 | Proyecto | Propia | Iglesia de cal y teja de inspiración colonial, sin reproducir ningún edificio; clip `Reposo`: la campana se balancea |
| 2026-11-05 | `assets/models/trapiche.glb` | Generado por `scripts/blender/pueblo.py` en Blender 5.2 | Proyecto | Propia | Trapiche de buey; clip `Reposo`: la yunta da vueltas |
| 2026-11-05 | `assets/models/vegetacion.glb` | Generado por `scripts/blender/vegetacion.py` en Blender 5.2 | Proyecto | Propia | Flora de Panamá de geometría propia: palma, guayacán, corotú, mangle, roble, ciprés, plátano, cafeto, caña, arbusto, roca, hierba y flor. Se mueve con el viento del juego; árbol Panamá, cuipo, indio desnudo y platanillo |
| 2026-11-05 | `assets/textures/suelo_pasto.png` | Generado por `scripts/blender/vegetacion.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/textures/suelo_tierra.png` | Generado por `scripts/blender/vegetacion.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/textures/suelo_camino.png` | Generado por `scripts/blender/vegetacion.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-09 | `data/panama.json` → `coast` y `regions[].polygons` | Natural Earth 1:10m Admin 0 – Countries y Admin 1 – States, Provinces (naturalearthdata.com, vía github.com/nvkelso/natural-earth-vector), extraído con `scripts/geografiaNaturalEarth.mjs` | Natural Earth (Tom Patterson, Nathaniel Vaughn Kelso y colaboradores) | Dominio público | Sustituye la costa 1:50m y los contornos de provincia a mano. Recortado al atlas y simplificado a 0,0018°. Panamá Oeste se separa por una línea aproximada en el Canal. Los GeoJSON originales no se guardan en el repo. Descarga autorizada por el creador el 2026-11-09 |
| 2026-11-09 | `data/relieve.json` | Terrain Tiles on AWS (registry.opendata.aws/terrain-tiles), teselas Terrarium de zoom 9, convertidas con `scripts/relieveTerrarium.py` a una rejilla de 0,01° | Mapzen/Tilezen y sus fuentes: SRTM y GMTED (USGS), ETOPO1 (NOAA) y otras listadas en github.com/tilezen/joerd/blob/master/docs/attribution.md | Datos abiertos con atribución (las fuentes de Panamá son de dominio público del Gobierno de EE. UU.) | Solo alturas sobre el mar, cuantizadas a un byte. Atribución: «Terrain Tiles: Mapzen; SRTM, GMTED2010 (USGS), ETOPO1 (NOAA)». Las teselas no se guardan en el repo. Descarga autorizada por el creador el 2026-11-09 |
| 2026-11-06 | `data/panama.json` → `coast` | Natural Earth 1:50m Admin 0 – Countries (naturalearthdata.com), extraído con `scripts/costaNaturalEarth.mjs` | Natural Earth (Tom Patterson, Nathaniel Vaughn Kelso y colaboradores) | Dominio público | Solo la costa de Panamá, Costa Rica y Colombia, recortada al atlas y simplificada a 0,004°. El GeoJSON original no se guarda en el repo |
| 2026-11-05 | `data/panama.json` | Contorno dibujado a mano para el juego | Proyecto | Propia | Hechos geográficos aproximados (longitud y latitud) y simplificados, sin copiar ningún mapa. Falta contrastar los nombres de las comarcas con sus comunidades |
| 2026-11-07 | `assets/models/zorro.glb` | Generado por `scripts/blender/mascotas.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: gorguera, mejillas, orejas, rostro, patas y garras; 732 triángulos, mismos rig y clips, sin archivos externos |
| 2026-11-07 | `assets/models/buho.glb` | Generado por `scripts/blender/mascotas.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: discos faciales, anteojos, libro, dedos y plumas escalonadas; 820 triángulos, mismos rig y clips, sin archivos externos |
| 2026-11-07 | `assets/models/tortuga.glb` | Generado por `scripts/blender/mascotas.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: placas, musgo, seta luminosa, rostro, patas y garras; 968 triángulos, mismos rig y clips, sin archivos externos |
| 2026-11-05 | `assets/models/fantasma.glb` | Generado por `scripts/blender/mascotas.py` en Blender 5.2, por MCP | Proyecto | Propia | Geometría, esqueleto y clips propios, sin archivos externos |
| 2026-11-05 | `assets/models/objetos.glb` | Generado por `scripts/blender/objetos.py` en Blender 5.2, por MCP | Proyecto | Propia | Recursos, talleres, Piedras Pintadas, Alzador y botín, sin archivos externos |
| 2026-11-05 | `assets/models/montura.glb` | Generado por `scripts/blender/objetos.py` en Blender 5.2, por MCP | Proyecto | Propia | Geometría, esqueleto y clips propios, sin archivos externos |
| 2026-11-05 | `assets/models/interiores.glb` | Generado por `scripts/blender/interiores.py` en Blender 5.2, por MCP | Proyecto | Propia | Casa, taller, salón y banco, sin archivos externos |
| 2026-11-05 | `assets/textures/patron_zigzag_tierra.png`, `assets/textures/patron_escalones_tierra.png`, `assets/textures/patron_rombos_dorado.png`, `assets/textures/patron_rombos_tierra.png`, `assets/textures/patron_anidados_dorado.png`, `assets/textures/patron_estrella_dorado.png` | Copiados de `arte/patrones/` por `scripts/blender/interiores.py` | Proyecto | Propia | Geometría propia: ver `docs/propuestas/PATRONES_GEOMETRICOS.md` |
| 2026-11-05 | `assets/models/lancha.glb` | Generado por `scripts/blender/lancha.py` en Blender 5.2 | Proyecto | Propia | Con clip `Reposo` |
| 2026-11-05 | `assets/textures/mar.png`, `assets/textures/mar_relieve.png` | Generados por `scripts/blender/mar.py` | Proyecto | Propia | Ondas calculadas, sin imágenes externas |
| 2026-11-05 | `assets/textures/tablas.png` | Generado por `scripts/blender/interiores.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/textures/yeso.png` | Generado por `scripts/blender/interiores.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/textures/madera.png` | Generado por `scripts/blender/interiores.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/models/mazmorra.glb` | Generado por `scripts/blender/mazmorra.py` en Blender 5.2, por MCP | Proyecto | Propia | Baldosa, muro, antorcha, escaleras y entrada de la cripta, sin archivos externos |
| 2026-11-05 | `assets/textures/muro.png` | Generado por `scripts/blender/mazmorra.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-05 | `assets/textures/baldosa.png` | Generado por `scripts/blender/mazmorra.py` | Proyecto | Propia | Ruido propio, sin imágenes externas |
| 2026-11-07 | `assets/models/bestia.glb` | Generado por `scripts/blender/enemigos.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: morro, orejas, colmillos, melena, cresta, garras y cola; 876 triángulos, mismo esqueleto y clips, sin archivos externos |
| 2026-11-07 | `assets/models/arquero.glb` | Generado por `scripts/blender/enemigos.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: capucha, hombreras, bandolera, carcaj, bolsa y vendas; 892 triángulos, mismo esqueleto y clips, sin archivos externos |
| 2026-11-07 | `assets/models/chaman.glb` | Generado por `scripts/blender/enemigos.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: rostro ritual, chal, cinturón, bolsas y amuletos; 988 triángulos, mismo esqueleto y clips, sin archivos externos |
| 2026-11-07 | `assets/models/diablillo.glb` | Generado por `scripts/blender/enemigos.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original: hocico, cejas, vientre, faldellín, garras, alas articuladas y cola; 860 triángulos, mismo esqueleto y clips, sin archivos externos |
| 2026-11-07 | `assets/models/personaje.glb` | Generado por `scripts/blender/personaje.py` en Blender 5.2 | FrankmanGames | Propia del proyecto | Segundo pase original de rostro, pelo, manos, botas y 10 capas opcionales de vestuario/equipo; 15 piezas, 2 060 triángulos, rig y 16 clips propios, sin archivos externos |
| 2026-11-05 | `assets/models/centinela.glb` | Generado por `scripts/blender/centinela.py` (con `scripts/blender/fg_figura.py`) en Blender 5.2 | Proyecto; diseño de la ficha «Centinela del Istmo» del creador | Propia | Geometría, esqueleto y siete clips propios; texturas incrustadas de `assets/textures/personajes/` (ver su tabla) |
| 2026-11-04 | `assets/models/casa.glb` | Generado por `scripts/blender/casa.py` en Blender 5.2 | Proyecto | Propia | Geometría y puerta animada propias, sin archivos externos |
| 2026-11-04 | `assets/models/casa_dorada.glb` | Generado por `scripts/blender/casa.py` en Blender 5.2 | Proyecto | Propia | Variante de la casa, sin archivos externos |
| 2026-11-04 | `assets/models/farola.glb` | Generado por `scripts/blender/mapa.py` en Blender 5.2 | Proyecto | Propia | Geometría y farol que se mece, propios, sin archivos externos |
| 2026-11-04 | `assets/models/pozo.glb` | Generado por `scripts/blender/mapa.py` en Blender 5.2 | Proyecto | Propia | Geometría y cubo que se mece, propios, sin archivos externos |
| 2026-11-04 | `assets/models/cofre.glb` | Generado por `scripts/blender/cofre.py` en Blender 5.2 | Proyecto | Propia | Geometría, materiales y clips `Abrir` y `Cerrar` del script, sin archivos externos |
| 2026-11-04 | `assets/models/castillo.glb` | Generado por `scripts/blender/castillo.py` en Blender 5.2 | Proyecto | Propia | Geometría y materiales del script, sin archivos externos |
| 2026-11-04 | `arte/patrones/` (36 PNG, 36 SVG y catálogo) | Calculados por `src/art/patterns.ts` con `npm run patterns` | Proyecto | Propia | Geometría original inspirada en técnicas panameñas, sin copiar piezas: ver `docs/propuestas/PATRONES_GEOMETRICOS.md` |
| 2026-11-04 | `assets/models/estandarte.glb`, `assets/models/estandarte_castillo.glb` | Generados por `scripts/blender/estandarte.py` en Blender 5.2 | Proyecto | Propia | Con clip `Reposo` y patrones de `arte/patrones/` |
| 2026-10-28 | (geometría del Slice 01) | Generada por código | Proyecto | Propia | Formas grises sin assets externos |
| 2026-10-28 | `@babylonjs/core` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | Render de evaluación (`PEND-TECH-001`), sólo primitivas |
| 2026-10-28 | `vite` 5.4.21 | npm | Evan You y colaboradores | MIT | Servidor de desarrollo y empaquetado (dev) |
| 2026-10-28 | `typescript` 5.9.3 | npm | Microsoft | Apache-2.0 | Compilador (dev) |
| 2026-10-28 | `vitest` 2.1.9 | npm | Vitest contributors | MIT | Tests de lógica pura (dev) |
| 2026-10-29 | `electron` 33.2.1 | npm | OpenJS Foundation y colaboradores | MIT (Chromium y dependencias: ver `LICENSES.chromium.html` en el paquete) | Contenedor de escritorio Windows |
| 2026-10-29 | `electron-builder` 25.1.8 | npm | electron-userland | MIT | Empaquetado portable (dev); descarga NSIS 3.0.4.1 (zlib/libpng) al empaquetar |
| 2026-10-29 | `esbuild` 0.21.5 | npm | Evan Wallace | MIT | Compila el proceso principal (dev) |
| 2026-10-29 | `@types/node` 20 | npm | DefinitelyTyped | MIT | Tipos del proceso principal (dev) |
| 2026-10-29 | Iconos de la interfaz (`src/ui/menus/icons.ts`) | Generados por código (SVG en línea) | Proyecto | Propia | Provisionales; sin assets externos ni fuentes descargadas |
| 2026-10-31 | Iconos de objeto por tipo (`src/ui/menus/itemIcons.ts`) y piezas 3D de armas y escudos (`heroModel.ts`) | Generados por código (SVG en línea y primitivas de Babylon) | Proyecto | Propia | Rama `equipo-objetos`; sin assets externos |
| 2026-11-20 | Iconos de la creación de personaje: sexo, peinados, cejas y silueta de reserva (`src/ui/menus/screens/creation.ts`) | Generados por código (SVG en línea) | Proyecto | Propia | Sin assets externos |
| 2026-10-31 | `assets/quaternius/ual1/UAL1_Standard.glb` | [Universal Animation Library (Standard), descarga oficial](https://quaternius.itch.io/universal-animation-library) · SHA-256 del ZIP `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724` | Quaternius | CC0-1.0 | GLB sin root motion; locomoción, combate, magia, impacto y muerte. Archivo de 7.3 MiB, sin texturas enormes. |
| 2026-10-31 | `assets/quaternius/ual1/LICENSE.txt` | Incluida en el ZIP oficial anterior | Quaternius | CC0-1.0 | Copia local de la licencia del paquete. |
| 2026-10-29 | `playwright` (preinstalado en la máquina de la nube, no es dependencia) | — | Microsoft | Apache-2.0 | Sólo para `scripts/capturasMenus.cjs` (capturas headless) |
| 2026-10-29 | `@babylonjs/loaders` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | Cargador glTF/GLB (Slice 02) |
| 2026-10-29 | `@babylonjs/materials` 7.54.3 | npm | Babylon.js contributors | Apache-2.0 | `TerrainMaterial` (splatmap) del Slice 02 |
| 2026-10-30 | Partículas de lluvia y nieve (`src/render/weatherView.ts`) | Texturas dibujadas por código (DynamicTexture) | Proyecto | Propia | Sin assets externos; las Piedras Pintadas siguen siendo geometría por código |
| 2026-10-30 | `ws` 8.18.0 | npm | Einar Otto Stangvik y colaboradores | MIT | Servidor y cliente WebSocket de la prueba de concepto online (`server/`, dev); sólo en 127.0.0.1 |
| 2026-10-30 | `@types/ws` 8.5.13 | npm | DefinitelyTyped | MIT | Tipos de `ws` (dev) |
| 2026-10-31; pase 2026-11-09; pase 2026-11-18 | Efectos `src/audio/sfx/generated_original/*.wav` (27: impactos, lanzamientos elementales, curación, seis barridos de arma, aire, agua y rayo canónico; lista exacta comprobada por `tests/audio.test.ts`) | Sintetizados por código con `scripts/generateSfx.mjs` (osciladores, ruido con semilla fija, filtros biquad, eliminación de DC y saturación suave; determinista) | Proyecto | Propia | PCM 16 bits mono 44 100 Hz con bloque LIST/INFO (`ISFT = FrankmanGames scripts/generateSfx.mjs`). El pase de 2026-11-09 añade muestras propias para cada barrido, esquiva, preparación física e impacto de escarcha. El pase de 2026-11-18 añade aire (ráfaga filtrada con barrido), agua (burbuja y chapoteo) y los ids canónicos `cast_lightning`/`impact_lightning` (storm queda como respaldo). `sfxElement` ya no traduce lightning→storm. Se incrustan en el build como data URL. Respaldo: recetas de `data/audio/sfx.json` |
| 2026-10-31 | `src/audio/music/` | — | — | — | **Excluida** del repositorio (`.gitignore`): contenía música del juego FATE original. Nada del código la carga |
| 2026-10-31 | `src/audio/music/` (rama `guardado-presets`) | Archivos locales del creador, en su equipo | — | — | Sigue **excluida** (`.gitignore`). A petición del creador, `src/audio/localMusic.ts` la puede reproducir **sólo con `npm run dev`** (Vite la sirve desde el disco del creador) si existe `src/audio/music/local.json`; el módulo se importa tras `import.meta.env.DEV` y el build no lo incluye (comprobado con `grep` en `dist/`). Ninguna canción entra en el repositorio ni en el ejecutable |
| 2026-11-02 | Alzadores en src/render/resurrectorView.ts | Cilindros y anillos generados por codigo | Proyecto | Propia | Sin modelos, texturas ni assets externos |
| 2026-11-02 | Banco del Cruce (`src/scenes/bankScene.ts`) | Primitivas generadas por código | Proyecto | Propia | Edificio, interior, empleado y cofre originales; sin modelos ni texturas externos |

## Geometría de la interfaz (2026-11-04)

Motivos de `src/ui/styles/ventanas.css` (`--geo-mola`, `--geo-chaquira`): SVG escritos a mano para este juego, autor FrankmanGames. Inspirados en el lenguaje geométrico de las molas gunas y las chaquiras ngäbe de Panamá; no reproducen ninguna pieza concreta. Sin recursos externos.

<!-- texturas-personajes: generado por scripts/art/recortarLaminas.py -->

## Texturas de personaje recortadas de las láminas del creador

Autor: el creador (Frankman254), generadas con ChatGPT el 2026-11-05 a partir de su propio encargo. Originales en `docs/texturas_diseño_personajes/`. Recorte reproducible con `scripts/art/recortarLaminas.py` (modo `superficie` = repetible en dos ejes por fundido de bordes; `tira_x`/`tira_y` = repetible en un eje; `pieza` = una vez, con transparencia; `lamina` = una vez).

| Fecha | Archivo | Origen | Autor | Licencia | Uso en el juego |
|---|---|---|---|---|---|
| 2026-11-05 | `assets/textures/personajes/tela_beige.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 13,301–224,493, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Camisa del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/tela_azul.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 229,301–460,493, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Capa del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/tela_roja.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 465,301–691,492, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Faja del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/tela_beige_drapeada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 13,14–326,295, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela con caída pintada |
| 2026-11-05 | `assets/textures/personajes/tela_azul_drapeada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 331,14–649,295, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela con caída pintada |
| 2026-11-05 | `assets/textures/personajes/tela_roja_drapeada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 654,14–954,296, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Faldón de la faja del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cuero_marron.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 13,500–277,676, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Botas, bolsas y brazales del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cuero_costura.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 282,500–457,676, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuero con pespunte |
| 2026-11-05 | `assets/textures/personajes/cuero_costura_cruz.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 460,499–691,676, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuero con pespunte en cruz |
| 2026-11-05 | `assets/textures/personajes/escudo_rombos.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 702,298–947,682, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Cara del escudo del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cenefa_azul_triangulos.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 962,14–1241,139, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_azul_triangulos_fina.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 962,147–1241,250, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Ribete de la capa del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cenefa_roja_zigzag.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 960,260–1241,375, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Cintas de la lanza del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cenefa_roja_greca.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 961,384–1241,518, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Faldón de la faja del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/cenefa_roja_espiral.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 961,529–1241,683, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Mangas de la camisa del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/correa_hebilla.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 16,684–482,776, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa con hebilla |
| 2026-11-05 | `assets/textures/personajes/correa_hebilla_2.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 16,777–482,864, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa con hebilla |
| 2026-11-05 | `assets/textures/personajes/correa_costura_cruz.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 17,870–481,947, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa con remates |
| 2026-11-05 | `assets/textures/personajes/correa_marron.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 109,876–378,940, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Cinturones y correas del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/tachuela_piramide.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 497,688–582,773, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: tachuela |
| 2026-11-05 | `assets/textures/personajes/tachuela_redonda.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 498,781–582,858, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: tachuela |
| 2026-11-05 | `assets/textures/personajes/parche_cuero_cruz.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 499,864–581,947, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: parche de cuero |
| 2026-11-05 | `assets/textures/personajes/metal_dorado.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 608,694–921,752, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Hebillas, punta y virolas del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/barra_dorada_triangulos.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 597,771–934,843, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: barra de metal |
| 2026-11-05 | `assets/textures/personajes/barra_dorada_lisa.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 595,852–936,896, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: barra de metal |
| 2026-11-05 | `assets/textures/personajes/barra_dorada_trenzada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 596,904–935,948, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Aros de la lanza del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/medallon_sol.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 943,688–1106,845, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Broche de la capa del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/placa_dorada_rombo.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 948,850–1241,949, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: placa de metal |
| 2026-11-05 | `assets/textures/personajes/cuerda_trenzada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 13,957–230,1119, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/tela_roja_vendaje.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 234,956–444,1119, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Vendas de los antebrazos del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/empunadura_cuerda.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 460,988–520,1086, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: empuñadura |
| 2026-11-05 | `assets/textures/personajes/empunadura_lino.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 532,988–592,1086, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Puño de la lanza del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/empunadura_roja.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 605,988–664,1086, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: empuñadura |
| 2026-11-05 | `assets/textures/personajes/empunadura_marron.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 677,988–738,1086, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Asta de la lanza del Centinela del Istmo |
| 2026-11-05 | `assets/textures/personajes/empunadura_azul.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 750,988–810,1086, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: empuñadura |
| 2026-11-05 | `assets/textures/personajes/empunadura_trenzada.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 821,972–886,1102, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: empuñadura |
| 2026-11-05 | `assets/textures/personajes/cenefa_marron_espiral.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 13,1134–625,1243, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_azul_espiral.png` | Lámina «centinela» (Imagen de ChatGPT 5 nov 2026, 16_10_02-5.png), recorte 637,1133–1241,1243, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/tela_turquesa_drapeada.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 287,7–527,289, modo `lamina` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela pintada con caída |
| 2026-11-05 | `assets/textures/personajes/tela_violeta_drapeada.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 746,7–951,288, modo `lamina` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela pintada con caída |
| 2026-11-05 | `assets/textures/personajes/tela_violeta_hojas.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 246,297–480,545, modo `lamina` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela pintada |
| 2026-11-05 | `assets/textures/personajes/cenefa_azul_rombos.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 488,298–864,368, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_turquesa_olas.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 488,375–863,419, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_violeta_lunas.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 488,425–863,477, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_plata_hojas.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 488,482–863,511, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/agua_turquesa.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 1090,417–1248,546, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: agua |
| 2026-11-05 | `assets/textures/personajes/panel_greca_violeta.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 8,558–175,727, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/panel_ave.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 183,558–359,728, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/panel_estrella.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 367,558–541,728, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/borla_lino.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 443,751–497,853, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: amuleto |
| 2026-11-05 | `assets/textures/personajes/borla_turquesa.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 505,745–557,861, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: amuleto |
| 2026-11-05 | `assets/textures/personajes/borla_violeta.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 570,750–633,860, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: amuleto |
| 2026-11-05 | `assets/textures/personajes/perla.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 13,749–68,801, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: gema |
| 2026-11-05 | `assets/textures/personajes/gema_turquesa.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 76,747–127,799, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: gema |
| 2026-11-05 | `assets/textures/personajes/gema_azul.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 134,748–180,797, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: gema |
| 2026-11-05 | `assets/textures/personajes/piedra_turquesa.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 243,745–295,798, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: gema |
| 2026-11-05 | `assets/textures/personajes/flor_hibisco.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 1033,742–1245,879, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: adorno de pelo |
| 2026-11-05 | `assets/textures/personajes/corteza_musgo.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 8,873–328,1137, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: corteza |
| 2026-11-05 | `assets/textures/personajes/cenefa_turquesa_olas_ancha.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 10,1151–322,1239, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_violeta_rombos.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 333,1151–610,1239, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_azul_escalones.png` | Lámina «oraculo» (Imagen de ChatGPT 5 nov 2026, 16_10_03-6.png), recorte 618,1151–907,1239, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cuero_oscuro.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 553,20–753,284, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuero |
| 2026-11-05 | `assets/textures/personajes/tela_azul_olas.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 792,7–1033,300, modo `lamina` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela pintada |
| 2026-11-05 | `assets/textures/personajes/cuerda_gruesa.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 1039,12–1251,65, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/cuerda_fina.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 1039,73–1252,109, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/red_cuerda.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 1039,120–1252,299, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: red |
| 2026-11-05 | `assets/textures/personajes/madera_musgo.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 9,321–291,529, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: madera |
| 2026-11-05 | `assets/textures/personajes/madera_tablas.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 312,322–554,530, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: madera |
| 2026-11-05 | `assets/textures/personajes/madera_vertical.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 574,318–673,531, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: madera |
| 2026-11-05 | `assets/textures/personajes/camuflaje.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 5,549–264,818, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela |
| 2026-11-05 | `assets/textures/personajes/hojarasca.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 272,549–534,818, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: follaje |
| 2026-11-05 | `assets/textures/personajes/raices_manglar.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 543,549–808,817, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: raíces |
| 2026-11-05 | `assets/textures/personajes/cenefa_tejida_espiral.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 6,827–391,1028, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/panel_colibri.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 400,828–772,1025, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/cenefa_tejida_greca_azul.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 781,828–1074,1023, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/panel_tejido_cruz.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 1084,829–1247,1020, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/correa_oscura.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 4,1045–303,1125, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa |
| 2026-11-05 | `assets/textures/personajes/correa_oscura_ancha.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 5,1144–529,1231, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa |
| 2026-11-05 | `assets/textures/personajes/cuero_cordon.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 649,1041–760,1236, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuero con cordón |
| 2026-11-05 | `assets/textures/personajes/empunadura_verde.png` | Lámina «cazador» (Imagen de ChatGPT 5 nov 2026, 16_10_04-7.png), recorte 1007,1059–1088,1212, modo `tira_y` | El creador, con ChatGPT | Propia del proyecto | Reserva: empuñadura |
| 2026-11-05 | `assets/textures/personajes/hierro_martillado.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 858,8–1060,254, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: metal |
| 2026-11-05 | `assets/textures/personajes/lava.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1065,8–1248,254, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: magma |
| 2026-11-05 | `assets/textures/personajes/cenefa_greca_naranja.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,260–264,396, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/panel_rana.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 269,260–483,396, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: panel tejido |
| 2026-11-05 | `assets/textures/personajes/cenefa_zigzag_naranja.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 677,260–887,396, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/tela_carbon.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 893,260–1008,396, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela |
| 2026-11-05 | `assets/textures/personajes/tela_gris.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1011,260–1128,396, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela |
| 2026-11-05 | `assets/textures/personajes/tela_naranja.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1131,260–1248,396, modo `superficie` | El creador, con ChatGPT | Propia del proyecto | Reserva: tela |
| 2026-11-05 | `assets/textures/personajes/correa_marron_lisa.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,404–495,468, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa |
| 2026-11-05 | `assets/textures/personajes/correa_tachas.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,475–496,530, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: correa |
| 2026-11-05 | `assets/textures/personajes/bronce_remaches.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 504,405–686,594, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: placa de metal |
| 2026-11-05 | `assets/textures/personajes/hierro_remaches.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 694,405–864,592, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: placa de metal |
| 2026-11-05 | `assets/textures/personajes/cuerda_lino.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1076,409–1247,450, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/cuerda_negra.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1076,462–1247,514, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/cuerda_naranja.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 1076,525–1247,576, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cuerda |
| 2026-11-05 | `assets/textures/personajes/runa_rayo.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,613–203,804, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: runa |
| 2026-11-05 | `assets/textures/personajes/runa_nube.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 211,613–402,804, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: runa |
| 2026-11-05 | `assets/textures/personajes/runa_espiral.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 409,613–595,804, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: runa |
| 2026-11-05 | `assets/textures/personajes/runa_sol.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 602,613–791,804, modo `pieza` | El creador, con ChatGPT | Propia del proyecto | Reserva: runa |
| 2026-11-05 | `assets/textures/personajes/grietas_rayo.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,816–387,906, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_cadena_cian.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 395,817–711,902, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_greca_crema.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 976,918–1247,977, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_rombos_naranja.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 976,984–1247,1042, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/cenefa_olas_crema.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 976,1050–1247,1115, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: cenefa |
| 2026-11-05 | `assets/textures/personajes/barra_bronce_greca.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 8,1136–401,1225, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: barra de metal |
| 2026-11-05 | `assets/textures/personajes/barra_bronce_rayo.png` | Lámina «forjador» (Imagen de ChatGPT 5 nov 2026, 16_10_05-8.png), recorte 410,1135–842,1228, modo `tira_x` | El creador, con ChatGPT | Propia del proyecto | Reserva: barra de metal |
| 2026-11-05 | `assets/textures/personajes/tela_oliva.png` | `assets/textures/personajes/tela_beige.png` teñida por el script (misma trama, otro color) | El creador, con ChatGPT | Propia del proyecto | Pantalón cargo del Centinela del Istmo |

<!-- /texturas-personajes -->
