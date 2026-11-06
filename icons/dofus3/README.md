# Intento detenido: iconos de Dofus 3

## Resultado verificado

No se extrajo ningún PNG. Las carpetas de categorías están vacías y no son una
fuente de assets para el juego.

El intento terminó antes de abrir un bundle: `dofus3_icon_extractor.py` llamó a
`os.walk()` sin importar `os`, según `extraction_log.txt`. Corregir ese error no
bastaría para obtener imágenes fiables. Un AssetBundle de Unity es un contenedor
binario con metadatos, bloques comprimidos y objetos serializados; no es un ZIP
ni garantiza que una textura exista dentro como un PNG contiguo.

## Métodos que se habían preparado

Los borradores de investigación viven en el repositorio vecino
`../Dofus-ReverseEngineering/tools/`:

- `dofus3_icon_extractor.py`: recorrido de bundles y búsqueda directa de la
  firma PNG. Es un prototipo incompleto: además del `import os` ausente, no
  interpreta `UnityFS`, bloques LZ4/LZMA ni objetos `Texture2D`, y su manejo de
  nombres temporales no coincide con los archivos que genera.
- `install_unitytools_and_extract.py`: intentaba instalar `unitytools` y caer en
  un parseador manual. La instalación registrada falló y el fallback tampoco es
  un lector completo de AssetBundles.
- `d3_icon_extraction.md`: documenta como posibilidades UnityPy/unity-tools,
  parseo manual y FFDec. FFDec corresponde a SWF/DOFUS Retro, no a los bundles
  de Unity de Dofus 3.

Por tanto, no hay una extracción parcial pendiente de ordenar: el proceso no
produjo archivos válidos.

## Por qué no se continúa dentro de este prototipo

`AGENTS.md` y `PROCEDENCIA.md` establecen una implementación clean-room:

- no se lee el cliente instalado de Ankama para cargar datos en el juego;
- no se copian assets, textos, nombres, enums ni tablas de Dofus;
- todo asset incorporado debe tener autor y licencia registrados.

La extracción solicitada apuntaba directamente al cliente instalado y al árbol
de este repositorio, así que contradice esas reglas. La afirmación anterior de
que el uso personal o educativo estaba permitido no estaba respaldada por una
licencia y se retira.

## Siguiente paso correcto

Las tareas activas son `F06` y `F09` en `docs/TAREAS.md`: crear un juego de
iconos propio y coherente para interfaz, mapa y minimapa. Su destino es
`assets/icons/ui/` y `assets/icons/map/`, con procedencia registrada antes de
integrarlo. Las referencias externas sólo pueden servir para estudiar categorías
o necesidades funcionales; el diseño final se crea desde cero.
