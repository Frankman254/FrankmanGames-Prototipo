# Exportaciones sin uso en src/

- **Total:** 131 exportaciones de valor (funciones, clases, const/enum) sin importar por nombre en otro archivo.
- **9** candidatas reales: no se usan en el mismo archivo ni se importan desde otro.
- **122** se usan solo en el mismo archivo (auto-referencia): exportadas pero solo consumidas localmente.

## Candidatas reales (no usadas en el mismo archivo, no importadas desde otro)

| Archivo | Línea | Símbolo |
|---|---|---|
src/audio/localMusic.ts | 53 | LocalMusicPlayer |
src/editor/files.ts | 27 | WATCH_IGNORED_FILES |
src/sim/vec2.ts | 9 | vec2 |
src/sim/vec2.ts | 14 | dot |
src/sim/vec2.ts | 18 | lerp |
src/sim/vec2.ts | 20 | normalize |
src/sim/vec2.ts | 26 | moveTowards |
src/ui/editor/panel.ts | 83 | EditorPanel |
src/ui/menus/itemFilters.ts | 34 | elementLabel |

## Auto-usadas (exportadas pero solo usadas en el mismo archivo)

| Archivo | Línea | Símbolo |
|---|---|---|
src/art/patterns.ts | 133 | paletteColors |
src/audio/contextMusic.ts | 148 | DUCK_LEVEL |
src/audio/data.ts | 10 | WAVES |
src/audio/data.ts | 12 | FILTERS |
src/audio/data.ts | 180 | parseMix |
src/audio/data.ts | 293 | parseAmbience |
src/audio/director.ts | 69 | AudioDirector |
src/audio/localMusic.ts | 15 | LOCAL_MUSIC_BASE |
src/audio/musicCheck.ts | 17 | MUSIC_LIMITS |
src/audio/score.ts | 61 | degreeMidi |
src/audio/stingers.ts | 15 | STINGER_COOLDOWN |
src/camera/damping.ts | 15 | shortestAngleDelta |
src/camera/framing.ts | 36 | ZONE_SAFE_AREA |
src/camera/framing.ts | 110 | normalizePose |
src/data/dungeonSchema.ts | 136 | parseDeep |
src/data/fxSchema.ts | 8 | STATUS_VISUALS |
src/data/mapScopes.ts | 7 | PROVINCE_DATA_KINDS |
src/data/mapScopes.ts | 95 | provinceScopeId |
src/data/mapScopes.ts | 99 | dungeonFloorScopeId |
src/data/schema.ts | 150 | parseShape |
src/data/schema.ts | 169 | parseDamage |
src/data/worldSchema.ts | 385 | WEAR_SLOTS |
src/data/zonesSchema.ts | 13 | SPAWN_TIMES |
src/dev/presets.ts | 30 | presetPointCosts |
src/dev/presets.ts | 36 | PRESET_GROUPS |
src/dev/presets.ts | 309 | presetPlace |
src/editor/jsonFormat.ts | 131 | deepEqual |
src/editor/prefabRegistry.ts | 50 | PrefabRegistry |
src/i18nTexts.ts | 6 | TEXT_KEYS |
src/render/characters/heldGear.ts | 28 | HAND_JOINT |
src/render/characters/playerLook.ts | 79 | lookSpecFor |
src/render/dungeonView.ts | 96 | torchPosition |
src/render/enemyView.ts | 538 | flatMaterial |
src/render/fx/spellProfile.ts | 150 | ringBurst |
src/render/fx/spellProfile.ts | 184 | decalDisc |
src/render/fx/spellProfile.ts | 205 | coneMesh |
src/render/fx/spellProfile.ts | 235 | slashLinesFx |
src/render/fx/spellProfile.ts | 264 | profileProjectile |
src/render/mountView.ts | 89 | mountVariantColor |
src/render/occlusion.ts | 19 | MAX_OCCLUSION_CIRCLES |
src/render/pageSource.ts | 11 | pageWorkerCount |
src/render/paintStyle.ts | 33 | PAINT_STYLE |
src/render/staticModels.ts | 39 | parseStaticGlb |
src/render/waterView.ts | 26 | pondColor |
src/render/windDepthMaterials.ts | 57 | windDepthFragmentSource |
src/rpg/content.ts | 123 | DEFAULT_TACTICS |
src/rpg/effects.ts | 16 | SHIELD_STATUS |
src/rpg/items.ts | 24 | rollValue |
src/rpg/items.ts | 439 | isItemKind |
src/rpg/items.ts | 566 | isOffhandWeapon |
src/rpg/progression.ts | 25 | GROUP_SIZE_MULTIPLIERS |
src/rpg/progressionConfig.ts | 19 | validProgressionGains |
src/rpg/quests.ts | 79 | CollectObjective |
src/rpg/quests.ts | 91 | FishObjective |
src/rpg/quests.ts | 102 | TalkObjective |
src/rpg/quests.ts | 111 | ReachObjective |
src/rpg/statCapital.ts | 18 | TIERED_100 |
src/rpg/stats.ts | 50 | ELEMENT_STATS |
src/sim/bossPhases.ts | 42 | bossIsImmune |
src/sim/pathfinder.ts | 247 | smoothPath |
src/sim/vec2.ts | 11 | add |
src/sim/vec2.ts | 12 | sub |
src/sim/vec2.ts | 13 | scale |
src/sim/vec2.ts | 15 | len |
src/sim/zones.ts | 30 | levelRatio |
src/sim/zones.ts | 205 | spawnAllowed |
src/ui/dev/damageMeterView.ts | 94 | meterText |
src/ui/map/mapLogic.ts | 18 | MAP_COLOR_KEYS |
src/ui/map/mapLogic.ts | 486 | HUNT_AREA_MIN |
src/ui/map/mapLogic.ts | 487 | HUNT_AREA_FACTOR |
src/ui/map/mapState.ts | 101 | INSIDE_REVEAL_RADIUS |
src/ui/map/panamaMap.ts | 92 | regionGrid |
src/ui/map/worldMap.ts | 36 | MAP_LAYERS |
src/ui/menus/bagView.ts | 64 | matchesBagFilter |
src/ui/menus/bankPanel.ts | 51 | marqueeRect |
src/ui/menus/bankPanel.ts | 61 | bankColumns |
src/ui/menus/context.ts | 63 | findItem |
src/ui/menus/fake/fakeSession.ts | 38 | STAT_ORDER |
src/ui/menus/format.ts | 155 | statColor |
src/ui/menus/format.ts | 444 | effectText |
src/ui/menus/format.ts | 528 | statusDetailLines |
src/ui/menus/format.ts | 548 | areaText |
src/ui/menus/itemFilters.ts | 8 | ITEM_FOCUSES |
src/ui/menus/itemFilters.ts | 12 | FOCUS_LABEL_RAW |
src/ui/menus/itemFilters.ts | 24 | ELEMENT_LABEL_RAW |
src/ui/menus/keybindings.ts | 43 | ITEMBAR_ACTIONS |
src/ui/menus/questFormat.ts | 6 | QUEST_STATE_LABEL_RAW |
src/ui/menus/saveStore.ts | 115 | cleanLabel |
src/ui/menus/screens/creation.ts | 35 | NAME_MIN |
src/ui/menus/screens/creation.ts | 36 | NAME_MAX |
src/ui/menus/screens/modals.ts | 99 | DEV_INFO_NAMES |
src/ui/menus/screens/modals.ts | 123 | DECOR_NAMES |
src/ui/menus/screens/modals.ts | 131 | THEME_NAMES |
src/ui/menus/screens/modals.ts | 541 | playTimeText |
src/world/ambient.ts | 119 | AMBIENT_DRY_MARGIN |
src/world/ambient.ts | 127 | rotateLocal |
src/world/anim.ts | 73 | quatMul |
src/world/anim.ts | 82 | quatRotate |
src/world/anim.ts | 148 | blendPose |
src/world/atlas.ts | 208 | regionAtLonLat |
src/world/casaCreador.ts | 56 | CASA_MARGIN |
src/world/casaCreador.ts | 61 | CASA_MODELS |
src/world/casaCreador.ts | 90 | puertaPrincipal |
src/world/dungeon.ts | 163 | floorSeed |
src/world/dungeon.ts | 168 | tileCenter |
src/world/dungeon.ts | 370 | mergeRects |
src/world/dungeon.ts | 1164 | doorRect |
src/world/look.ts | 26 | ONE_HAND_LOOKS |
src/world/look.ts | 66 | isShieldLook |
src/world/pages.ts | 95 | packInstances |
src/world/rigs.ts | 65 | humanoidRig |
src/world/rigs.ts | 96 | humanoidClips |
src/world/rigs.ts | 574 | wolfRig |
src/world/rigs.ts | 595 | owlRig |
src/world/rigs.ts | 607 | owlClips |
src/world/rigs.ts | 667 | wolfClips |
src/world/rigs.ts | 672 | quadrupedClips |
src/world/scatter.ts | 181 | EXCLUSION_TOLERANCE |
src/world/stream.ts | 32 | MAX_SCAN_PAGES |
src/world/terrain.ts | 81 | smoothstep |
src/world/urbanizacion.ts | 36 | calleAncho |
src/world/urbanizacion.ts | 55 | loteCasa |

## Notas

- Esta lista solo busca `import { X }` por nombre. Los accesos dinámicos (`obj[X]`), los usos en HTML/JS del renderer, o las referencias vía barrel imports pueden no detectarse.
- Las clases que se instancian en el mismo archivo donde se definen aparecen como "auto-usadas".
- **No se borra nada**: el coordinador decide qué exportaciones quitar.
