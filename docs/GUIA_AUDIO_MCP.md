# Guía: componer música y sonido con IA por MCP

Para el agente que tenga que generar, revisar o integrar música o efectos con IA (AUDIO-FACTORY-02). Las reglas generales siguen siendo las de [AGENTS](../AGENTS.md) y la [guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md).

**Estado (2026-11-19).**
- El stack está elegido y la configuración del Mac está hecha.
- **El piloto en el PC con Windows no se ha hecho todavía** (AUD-IA-01, §8):
  - no hay ninguna pieza generada;
  - no se ha medido la VRAM;
  - no se ha probado el MCP con el estudio abierto.
- Lo que el piloto contradiga se corrige aquí. Hasta entonces, lo marcado *sin probar* es plan, no hecho.

## 1. Stack elegido y por qué

| Herramienta | Qué aporta | Contras | Veredicto |
|---|---|---|---|
| **ACE-Step Studio 4.0.1** ([timoncool/ACE-Step-Studio](https://github.com/timoncool/ACE-Step-Studio), MIT) | Estudio de escritorio para Windows sobre ACE-Step 1.5 con `acestep.cpp` (GGUF): cabe en 10 GB de VRAM. Trae **MCP propio** (`http://127.0.0.1:8792/mcp`; 224 nombres de herramienta en el código de 4.0.1, aunque su README dice 164): generación, colas de trabajos, stems, repintado, versión, MIDI y biblioteca. Instalador o portable; sin Python ni Node | Estadísticas anónimas activadas por defecto (se apagan); consulta noticias a su autor cada hora; incluye modelos y LoRA de la comunidad con licencias no comerciales, que no se usan | **Motor principal** |
| **ACE-Step 1.5** ([ace-step/ACE-Step-1.5](https://github.com/ace-step/ACE-Step-1.5), MIT) | El modelo base: texto a música, audio de referencia, versión, repintado, separación. API REST en `localhost:8001` y Gradio | Sin MCP: habría que escribir y mantener un envoltorio. Python y PyTorch, con varios GB | **Respaldo**, si el estudio falla en el piloto. Los mismos pesos |
| **LMMS MCP** ([SarutobiSasuke8/lmms-mcp](https://github.com/SarutobiSasuke8/lmms-mcp), MIT) | Arreglos editables `.mmp` y exportación para juegos: bucle, intro, capas, *stingers* y manifiesto | Proyecto de 0 estrellas y sin release publicada; probado solo en Windows con LMMS 1.2.2; los timbres de LMMS no resuelven la queja de «suena a robot» (A5) | **Aparcado.** Se reevalúa para las versiones 8-bit y los arreglos editables cuando madure |
| **Audacity MCP** | Edición por mod-script-pipe con Audacity abierto | No aporta nada que FFmpeg no haga por línea de comandos, y añade una interfaz frágil | **Descartado** |
| **FFmpeg** (8.x en el Mac, Homebrew) | Recortar, fundidos, sonoridad (`loudnorm`), WAV 44,1 kHz/16 bit y OGG | — | **Posproceso** |
| `scripts/audio/render_original_*.py` | Música y ambiente propios, deterministas, sin muestras | Timbre sintético | **Se mantienen**: partituras, 8-bit y respaldo |

**Por qué el estudio y no ACE-Step 1.5 a pelo:**
- el MCP ya existe y está tipado;
- `acestep.cpp` cabe en la 3080;
- las colas de trabajos (`studio_wait`) evitan llamadas MCP de varios minutos.

Los pesos son los mismos de ACE-Step 1.5.

### Licencias comprobadas (2026-11-19)

- **ACE-Step 1.5**:
  - código y pesos MIT ([ficha del modelo](https://huggingface.co/ACE-Step/Ace-Step1.5));
  - la ficha dice que lo generado se puede usar comercialmente;
  - según la ficha, se entrenó con música con licencia profesional, música de dominio público o libre de derechos y audio sintético generado desde MIDI.
- **El estudio**: MIT. Su visualizador lleva audioMotion-analyzer (AGPL-3.0), pero solo afecta a quien redistribuya el estudio. No se redistribuye ni se empaqueta con el juego.
- **Prohibido usar en este proyecto:**
  - el *fine-tune* «Regrind» (CC BY-NC-SA 4.0);
  - los pesos de MuScriptor (CC BY-NC 4.0);
  - cualquier LoRA sin licencia que permita el uso comercial;
  - el asistente de escritura por OpenRouter: servicio externo, AGENTS regla 6.

### Auditoría del código del estudio (v4.0.1, commit `6282158`, 2026-11-19)

- **Puertos**: el servicio (8792) y el motor (8089) se atan a loopback. El motor rechaza `0.0.0.0` (`validate_loopback_host`).
  - El «acceso de red» (`crates/music-server/src/remote.rs`) viene apagado. Encendido, escucha en todas las interfaces con una clave, así que **se deja apagado**.
- **MCP**: rechaza peticiones con un `Origin` que no sea local (`mcp.rs`, `local_origin`) y no pide clave a quien entra por loopback.
- **Red saliente**:
  - noticias cada hora y estadísticas anónimas, a través del crate `studio-hub-client`. Se apagan con `STUDIO_TELEMETRY=0` y `DO_NOT_TRACK=1`, y desmarcando la casilla de la primera pantalla;
  - descargas de modelos y DLL de cuBLAS, solo cuando se piden.

## 2. Arquitectura

```text
Mac (orquesta)                                   PC Windows (RTX 3080, infiere)
──────────────                                   ──────────────────────────────
Claude ── dirige, revisa, integra                ACE-Step Studio 4.0.1
OMP modo Audio ──MCP http──► 127.0.0.1:8792 ═══ SSH (Tailscale) ═══► 127.0.0.1:8792 /mcp
   │                         (túnel local)                          motor 127.0.0.1:8089
   └─ scp ◄──────────────── piezas FLAC/WAV ◄─── biblioteca del estudio
work/omp-audio-<tarea>/ → validar_audio_generado.py → ficha → revisión → creador elige → assets/
```

- **Nada se expone a la red.**
  - El estudio sigue en el loopback de Windows.
  - El Mac llega a él con un túnel SSH (`ssh -L 127.0.0.1:8792:127.0.0.1:8792`) sobre Tailscale.
  - El SSH de Windows solo acepta clave, no contraseña.
- El modelo de lenguaje de OMP sigue siendo Skynet: el Mac no infiere, ni música ni texto.

## 3. Puesta en marcha en Windows (una vez)

La instalación necesita la aprobación del creador (ACCIONES_CREADOR, «Audio IA»). La hace el creador o Claude en Windows, nunca otro agente.

1. **Variables de usuario, antes del primer arranque**: `STUDIO_TELEMETRY=0` y `DO_NOT_TRACK=1`.
   - Configuración → Sistema → Acerca de → Variables de entorno.
   - O en PowerShell: `[Environment]::SetEnvironmentVariable('STUDIO_TELEMETRY','0','User')`, y lo mismo con `DO_NOT_TRACK`.
2. **Descarga** del instalador o el portable de la release **v4.0.1**, desde la página de releases del repositorio.
   - Antes de instalar, anota el SHA-256 en la bitácora (`Get-FileHash`).
   - No uses otra versión sin repetir la auditoría del §1.
3. **Primera pantalla**:
   - conjunto de modelos **Balanced** (XL turbo Q6_K y planificador 1.7B, 6,7 GB), el que el estudio propone para 10 GB;
   - CUDA 13 si el controlador es 580 o posterior;
   - **desmarca las estadísticas anónimas**.
   - No descargues Regrind ni MuScriptor.
4. **Ajustes**:
   - **Acceso de red apagado**;
   - asistente de escritura sin OpenRouter;
   - sin LoRA.
5. **Acceso desde el Mac**:
   - Tailscale en Windows, en la misma red que el Mac;
   - OpenSSH Server (Configuración → Características opcionales);
   - en `C:\ProgramData\ssh\sshd_config`: `PasswordAuthentication no`;
   - la clave pública del Mac en `administrators_authorized_keys` o en `~\.ssh\authorized_keys`, según la cuenta;
   - regla de firewall de OpenSSH limitada a `100.64.0.0/10`, la red de Tailscale.
6. **Comprobación**: `powershell -ExecutionPolicy Bypass -File scripts\windows\check_audio_ia.ps1`. Debe terminar en «todo en orden». *Sin probar en Windows.*

## 4. Mac: túnel y clientes

En `~/.ssh/config` del Mac, con el nombre de Tailscale del PC:

```text
Host pc-audio
  HostName <nombre-tailscale-del-pc>
  User <usuario-windows>
  IdentityFile ~/.ssh/id_ed25519
```

| Agente | Cómo llega al estudio | Papel en audio |
|---|---|---|
| **OMP modo Audio** | `scripts/mac/omp_audio.sh`: abre el túnel si falta, comprueba que el estudio responde y arranca el perfil `audio` | Opera el estudio: genera, espera, recupera, valida y escribe la ficha. No integra |
| **Claude** | `claude mcp add -s local --transport http acestep http://127.0.0.1:8792/mcp` y el túnel abierto (`ssh -f -N -L 127.0.0.1:8792:127.0.0.1:8792 pc-audio`). Ámbito `local`, no de proyecto: así no rompe a quien abra el repo sin el estudio | Dirige: escribe el encargo, revisa las fichas y lo que se oye, integra lo que el creador elija y registra `PROCEDENCIA.md` |
| **Junie** | Sin MCP de audio: su cliente admite como mucho 100 herramientas y el estudio expone más de 160 | Integración en código, con pruebas: cablear una pieza aprobada en `contextMusic.ts` o `data/audio/`, bucles y transiciones |
| **Codex** | Sin MCP de audio | Auditoría independiente: repetir la auditoría del §1 al cambiar de versión y revisar el validador |

**Perfil `audio` de OMP** (`~/.omp/profiles/audio/agent/`, fuera del repo, creado el 2026-11-19):
- `config.yml`: copia del perfil `blender`, con `mcp.enableProjectConfig: false` y `disabledProviders: [claude]`.
- `models.yml`: enlace al compartido.
- `mcp.json`:

```json
{ "mcpServers": { "acestep": { "type": "http", "url": "http://127.0.0.1:8792/mcp" } } }
```

Cómo se usa:
- Los roles van todos a `skynet-qwen/Qwen3.8-Flash-Next`, con `thinking medium`. Las herramientas se llaman `xd://mcp__acestep_<herramienta>`. *Sin probar con el estudio abierto.*
- Sin el estudio, `FMG_AUDIO_SIN_ESTUDIO=1 scripts/mac/omp_audio.sh` arranca para hacer solo posproceso.
- El alias SSH se cambia con `FMG_AUDIO_HOST`.

```sh
scripts/mac/omp_audio.sh "Encargo AUD-IA-02: tres motivos de Iguanera según docs/GUIA_AUDIO_MCP.md §5"
```

## 5. Flujo de una pieza

1. **Encargo** (lo escribe Claude): región o uso, duración, ambiente, tempo y modo orientativos, instrumentos y qué evitar. Iguanera, por ejemplo: costa seca de Azuero, mediodía, pentatónica luminosa.
2. **Caption**: lee `writing_guide` (tema `song`) y `writing_examples`. Describe estilo, instrumentos, ambiente, tempo y estructura.
   - **Nunca**: nombres de artistas, canciones, juegos, bandas sonoras ni compositores; «al estilo de X»; letras.
   - **Sí**: instrumentos y géneros de tradición panameña descritos por sí mismos (mejoránico, tambor repicador, caja, guacharaca, acordeón, flauta de caña), sin imitar ninguna grabación concreta.
3. **Generar**: `song_create` con:
   - `lyrics: "[Instrumental]"`;
   - `duration` con 2–4 s de margen (para 20 s, pide 24);
   - `bpm`, `keyscale` y `seed` explícitos.
   
   Se generan **varias semillas por motivo** (3–5) y se elige la mejor.
4. **Esperar**: `studio_wait` con el `job_id`, repetido hasta que termine. No consultes con otras llamadas.
5. **Ficha reproducible**: `library_song_get` da los ajustes completos (`generation_settings`: semilla, `lm_seed`, pasos, modelo). Se guardan íntegros en `work/omp-audio-<tarea>/<pieza>.json`, con el tiempo de generación y la VRAM si se midió (`nvidia-smi` en Windows).
6. **Traer**: `library_song_files` da la ruta en Windows; `scp "pc-audio:<ruta>" work/omp-audio-<tarea>/`.
7. **Validar**: `python3 scripts/audio/validar_audio_generado.py <pieza> --min-seconds 20 --json work/omp-audio-<tarea>/<pieza>.qc.json`. Una pieza rechazada no se entrega (§6).
8. **Escuchar y describir**: tres frases por pieza: qué se oye, qué funciona y qué falla. El validador no juzga la música.
9. **Entrega de OMP**: carpeta `work/omp-audio-<tarea>/` con los audios, las fichas, los informes del validador y un `LEEME.md`. OMP no toca `assets/`, `data/`, `src/`, documentación activa ni Git.
10. **Revisión de Claude y elección del creador**. Sin elección del creador, nada pasa a `assets/`.
11. **Integración** (Claude o Junie):
    - convertir con `ffmpeg -i in.flac -af loudnorm=I=-16:TP=-1.5 -ar 44100 -ac 2 -sample_fmt s16 out.wav`;
    - si es un bucle, cerrar la costura;
    - copiar a `assets/audio/music/<zona>/`;
    - registrar en `PROCEDENCIA.md` **antes** del commit: autor «ACE-Step 1.5 vía ACE-Step Studio 4.0.1, dirigido por Claude/OMP», licencia del modelo (MIT), conjunto de modelos y ruta de la ficha;
    - cablear con pruebas;
    - comprobar en Electron.

**Edición** (repintar un tramo o cambiar el estilo):
- `song_create` con `source_song_id` y `task_type: repaint` (`repainting_start`/`_end`) o `cover`, **solo sobre piezas propias** de la biblioteca;
- `stems_split` separa voces e instrumentos para remezclar.

**Forma por secciones** (2026-11-19). Toda pieza de más de un minuto se planifica por secciones antes de generarla. Así no suena a bucle.

- **Secciones**: intro → verso → pre-estribillo → estribillo → solo o interludio → verso → pre → estribillo → puente → corte → clímax (último estribillo, un tono arriba) → final.
- **Papel de cada sección**: cada una cambia la densidad, el registro y el instrumento al frente.
- **Variación**: cada vez que vuelve una sección trae algo nuevo, como un doblaje, un contracanto, adornos o una respuesta de otro instrumento.
- **Energía**: el pico va hacia el 75–85 % de la duración.
- **Transiciones**: se marcan con un redoble, una anacrusa o un corte.
- **Implementación de referencia**: `forma.py`, en `work/claude-aud-cripta/real/`. Explica cada papel y la técnica del periodo y del gancho.
- **En ACE-Step**: la forma va en el caption, y en `lyrics` como etiquetas de sección sin texto (`[intro] [verse] [chorus] [bridge] [outro]`). Una alternativa es generar por tramos y unirlos con `repaint`. El piloto (§8) debe comprobar cuál de las dos respeta mejor la forma.

## 6. Contrato de calidad

- **No cuenta como éxito, y el validador lo rechaza**:
  - archivo vacío;
  - casi silencio (RMS < −35 dBFS);
  - más del 10 % en silencio o un hueco interior de más de 1,5 s;
  - silencio de más de 2 s al principio o de más de 3 s al final;
  - recorte;
  - duración menor de la pedida;
  - una pista que repite casi idéntico el mismo fragmento con un periodo de 1–12 s (cuatro compases en bucle).
- **El validador es un suelo, no una aprobación.** Medido el 2026-11-19 sobre las 15 mezclas de `assets/audio/music/`: todas pasan, y su similitud de bucle más alta es 0,94 (`guardian`). Un bucle exacto da 0,995. `--selftest` prueba los siete casos.
- **Originalidad**:
  - ningún audio de otro juego, de `reference_assets/` ni de `assets/dev_dungeon/` entra en el estudio, ni como referencia ni para versionar;
  - el «informe de características» del piloto (§8, punto 2) solo usa audio propio o autorizado por escrito por el creador, y produce texto (tempo, tonalidad, instrumentación, forma), nunca audio derivado;
  - si una pieza recuerda a una melodía conocida, se descarta y se anota en su ficha.
- **Identidad**: respeto a la cultura regional panameña. Los instrumentos y ritmos tradicionales se usan como color, no como caricatura. El creador tiene la última palabra.

## 7. Producción prevista (tras el piloto y con aprobación)

1. **Primera producción (AUD-IA-02)**: tres motivos originales de ~20 s para Iguanera; el creador elige uno.
2. **Después**:
   - exploración regional y pueblos;
   - combate normal, intenso y de jefe;
   - avisos de inicio, victoria, derrota y peligro;
   - versiones orquestal y 8-bit de las piezas principales;
   - ambientes regionales;
   - efectos de habilidad por fases;
   - sonidos por familia de monstruo.

La relación con AUD-02 (muestras reales con licencia libre sobre las partituras actuales) se decide tras escuchar el piloto: son dos caminos para el mismo problema del timbre.

## 8. Piloto obligatorio (AUD-IA-01)

Evidencia en `work/claude-aud-ia-01/`. Cada punto, con su prueba:

| # | Prueba | Cómo se demuestra | Estado |
|---|---|---|---|
| 1 | Instrumental original de 20 s desde un prompt | Audio que pasa el validador y su ficha | Pendiente |
| 2 | Informe de características de una referencia propia o autorizada | `song_understand` sobre una pieza propia (p. ej. `iguanera_mix.wav`, importada con `library_import_audio`) | Pendiente |
| 3 | Composición nueva basada en ese estilo, sin melodía identificable | Caption escrito desde el informe; escucha comparada | Pendiente |
| 4 | Reproducible | `song_replay` o la misma semilla y ajustes dan el mismo audio (hash o diferencia ≤ −60 dB) | Pendiente |
| 5 | El MCP hizo las operaciones de verdad | Registro de llamadas de OMP con los `job_id`, contrastado con la biblioteca del estudio | Pendiente |
| 6 | Medidas | Tiempo por pieza, VRAM máxima (`nvidia-smi -l 1`), RAM, tamaño en disco y estabilidad en 10 generaciones seguidas | Pendiente |
| 7 | Licencias | Conjunto de modelos usado, sin LoRA y sin modelos no comerciales; captura de los ajustes de red y estadísticas | Pendiente |

## 9. Problemas conocidos

- **El MCP solo vive con la ventana del estudio abierta.** Si `omp_audio.sh` dice que no responde: abre el estudio en Windows y comprueba el túnel con `lsof -nP -iTCP:8792 -sTCP:LISTEN` en el Mac.
- **Algo ocupa el 8792 del Mac** (un túnel viejo, por ejemplo): `lsof -nP -iTCP:8792` y cierra ese `ssh`.
- **Una sesión de OMP ya abierta no recarga el MCP**: abre otra.
