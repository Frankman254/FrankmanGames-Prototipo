import { describe, expect, it } from 'vitest';
import { loadGameData, rpgRawFiles } from '../../src/data';
import { DataError } from '../../src/data/validate';
import { Character } from '../../src/rpg/character';
import { parseRpgContent, type RpgContent } from '../../src/rpg/content';
import type { NpcDef, QuestDef, QuestObjectiveDef, SessionEvent } from '../../src/rpg/contracts';
import { Conversation, createObjective, KillObjective, QuestLog } from '../../src/rpg/quests';
import { GameSession, RpgSessionFactory } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { content } from './helpers';

const ARCHETYPES = Object.keys(loadGameData().enemies.archetypes);

/** Contenido con misiones y PNJ de prueba (además de los de datos). */
function withQuests(quests: QuestDef[], npcs: NpcDef[] = []): RpgContent {
  const c = content();
  return {
    ...c,
    quests: { ...c.quests, ...Object.fromEntries(quests.map((q) => [q.id, q])) },
    npcs: { ...c.npcs, ...Object.fromEntries(npcs.map((n) => [n.id, n])) },
  };
}

function quest(id: string, objectives: QuestObjectiveDef[], extra: Partial<QuestDef> = {}): QuestDef {
  return {
    id,
    name: `Misión ${id}`,
    summary: 'Prueba',
    chain: null,
    giver: 'fisher',
    turnIn: 'fisher',
    minLevel: 1,
    requires: [],
    offerText: 'oferta',
    progressText: 'en curso',
    completeText: 'gracias',
    objectives,
    rewards: { xp: 0, gold: 0, items: [], learnSpell: null },
    ...extra,
  };
}

function setup(c: RpgContent = content(), seed = 1): { s: GameSession; h: Character; log: QuestLog; events: SessionEvent[] } {
  const rng = new Rng(seed);
  const h = Character.create(c, 'ember_vanguard', 'Prueba', rng);
  const s = new GameSession(c, h, rng);
  const events: SessionEvent[] = [];
  s.on((e) => events.push(e));
  return { s, h, log: s.questLog, events };
}

const progressOf = (s: GameSession, id: string): number[] => s.questLog.view(id)!.objectives.map((o) => o.current);

describe('misiones: datos', () => {
  it('cargan npcs.json y quests.json con referencias válidas', () => {
    const c = content();
    expect(Object.keys(c.npcs)).toEqual(expect.arrayContaining(['fisher', 'guard', 'elder', 'smith', 'apothecary']));
    expect(Object.keys(c.quests).length).toBeGreaterThanOrEqual(4);
    // Los mercaderes con diálogo toman nombre y sitio de merchants.json.
    expect(c.npcs['smith']!.merchantId).toBe('smith');
    expect(c.npcs['smith']!.name).toBe(c.merchants['smith']!.name);
    expect(c.npcs['fisher']!.merchantId).toBeNull();
    // La cadena usa todos los tipos de objetivo.
    const types = new Set(Object.values(c.quests).flatMap((q) => q.objectives.map((o) => o.type)));
    expect([...types].sort()).toEqual(['collect', 'fish', 'kill', 'reach', 'talk']);
  });

  it('los PNJ nuevos están en el pueblo, cerca de (128, 128)', () => {
    for (const n of Object.values(content().npcs)) {
      expect(Math.hypot(n.position.x - 128, n.position.y - 128), n.id).toBeLessThan(25);
    }
  });

  it('rechaza referencias rotas, ciclos y openShop en quien no vende', () => {
    const bad = (mut: (raw: { npcs: any; quests: any }) => void): (() => void) => () => {
      const raw = structuredClone(rpgRawFiles()) as any;
      mut(raw);
      parseRpgContent(raw, ARCHETYPES);
    };
    expect(bad((r) => (r.quests.quests.q_wolf_cull.objectives[0].archetypes = ['dragon']))).toThrow(/arquetipo desconocido/);
    expect(bad((r) => (r.quests.quests.q_perch_supper.requires = ['q_east_wind']))).toThrow(/ciclo/);
    expect(bad((r) => (r.quests.quests.q_perch_supper.giver = 'nadie'))).toThrow(DataError);
    expect(bad((r) => (r.npcs.npcs.fisher.dialogue.nodes.hello.options[0].next = 'no_existe'))).toThrow(/nodo desconocido/);
    expect(bad((r) => (r.npcs.npcs.fisher.dialogue.nodes.hello.options[0].actions = [{ type: 'openShop' }]))).toThrow(/sólo vale en un mercader/);
    expect(bad((r) => (r.quests.quests.q_east_wind.rewards.learnSpell = 'meteoro'))).toThrow(/hechizo desconocido/);
  });
});

describe('misiones: tipos de objetivo', () => {
  it('matar: cuenta sólo los arquetipos pedidos y no pasa del total', () => {
    const c = withQuests([quest('t_kill', [{ type: 'kill', archetypes: ['melee', 'alpha_wolf'], count: 2, text: 'Lobos' }])]);
    const { h, log, events } = setup(c);
    expect(log.accept('t_kill').ok).toBe(true);
    h.emit({ type: 'enemyKilled', archetype: 'ranged' });
    expect(log.view('t_kill')!.objectives[0]!.current).toBe(0);
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.emit({ type: 'enemyKilled', archetype: 'alpha_wolf' });
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    expect(log.view('t_kill')!.objectives[0]!.current).toBe(2);
    expect(log.state('t_kill')).toBe('ready');
    expect(events.filter((e) => e.type === 'questProgress')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'questReady')).toHaveLength(1);
    expect(createObjective(c.quests['t_kill']!.objectives[0]!)).toBeInstanceOf(KillObjective);
  });

  it('recoger: se cuenta en la mochila, retrocede si se suelta y se entrega al terminar', () => {
    const c = withQuests([quest('t_collect', [{ type: 'collect', itemId: 'fang', count: 3, consume: true, text: 'Colmillos' }])]);
    const { s, h, log } = setup(c);
    h.give('fang', 1);
    log.accept('t_collect');
    // Lo que ya llevabas cuenta desde el principio.
    expect(progressOf(s, 't_collect')).toEqual([1]);
    h.give('fang', 4);
    h.emit({ type: 'changed' });
    expect(log.state('t_collect')).toBe('ready');
    const fang = h.inventory.slots.find((x) => x?.itemId === 'fang')!;
    h.inventory.remove(fang.uid, 3);
    h.emit({ type: 'changed' });
    expect(log.state('t_collect')).toBe('active');
    h.give('fang', 2);
    expect(log.turnIn('t_collect').ok).toBe(true);
    // Se entregan 3 de los 4.
    expect(h.inventory.count('fang')).toBe(1);
  });

  it('recoger sin consume: sólo hay que enseñarlos', () => {
    const c = withQuests([quest('t_show', [{ type: 'collect', itemId: 'ore', count: 2, consume: false, text: 'Mineral' }])]);
    const { h, log } = setup(c);
    h.give('ore', 2);
    log.accept('t_show');
    expect(log.turnIn('t_show').ok).toBe(true);
    expect(h.inventory.count('ore')).toBe(2);
  });

  it('pescar: cualquier captura con objeto, o sólo las de la lista', () => {
    const c = withQuests([
      quest('t_fish_any', [{ type: 'fish', itemIds: [], count: 2, text: 'Capturas' }]),
      quest('t_fish_eel', [{ type: 'fish', itemIds: ['fish_storm_eel'], count: 1, text: 'Anguila' }]),
    ]);
    const { s, h, log } = setup(c);
    log.accept('t_fish_any');
    log.accept('t_fish_eel');
    h.emit({ type: 'fished', itemId: null }); // sólo monedas: no cuenta
    h.emit({ type: 'fished', itemId: 'old_boot' });
    expect(progressOf(s, 't_fish_any')).toEqual([1]);
    expect(progressOf(s, 't_fish_eel')).toEqual([0]);
    h.emit({ type: 'fished', itemId: 'fish_storm_eel' });
    expect(log.state('t_fish_any')).toBe('ready');
    expect(log.state('t_fish_eel')).toBe('ready');
  });

  it('hablar: cuenta al hablar con ese PNJ, y sólo cuando lo demás está hecho', () => {
    const c = withQuests([
      quest('t_talk', [
        { type: 'kill', archetypes: ['melee'], count: 1, text: 'Un lobo' },
        { type: 'talk', npcId: 'elder', text: 'Cuéntaselo al anciano' },
      ], { turnIn: 'elder' }),
    ]);
    const { s, h, log } = setup(c);
    log.accept('t_talk');
    h.emit({ type: 'talkNpc', npcId: 'elder' });
    expect(progressOf(s, 't_talk')).toEqual([0, 0]);
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.emit({ type: 'talkNpc', npcId: 'guard' });
    expect(progressOf(s, 't_talk')).toEqual([1, 0]);
    h.emit({ type: 'talkNpc', npcId: 'elder' });
    expect(log.state('t_talk')).toBe('ready');
    expect(log.markerFor('elder')).toBe('ready');
  });

  it('llegar a un lugar: la sesión mira la posición del jugador', () => {
    const c = withQuests([quest('t_reach', [{ type: 'reach', x: 50, y: 50, radius: 3, text: 'La colina' }])]);
    const { s, h, log } = setup(c);
    log.accept('t_reach');
    const body = { pos: { x: 10, y: 10 } };
    h.body = body as never;
    // Sin mundo enlazado no se mira.
    s.tick(1);
    s.attach({ effectContext: () => null as never, dropToGround: () => {}, petHealth: () => null, castSlot: () => null, hotbarState: () => [] });
    s.tick(1);
    expect(log.state('t_reach')).toBe('active');
    body.pos = { x: 52, y: 51 };
    s.tick(1);
    expect(log.state('t_reach')).toBe('ready');
  });
});

describe('misiones: cadenas, recompensas y marcas', () => {
  it('una misión está bloqueada hasta completar la anterior y tener el nivel', () => {
    const { h, log } = setup();
    expect(log.state('q_perch_supper')).toBe('available');
    expect(log.state('q_wolf_cull')).toBe('available');
    expect(log.state('q_watchstone')).toBe('locked');
    expect(log.accept('q_watchstone').ok).toBe(false);
    expect(log.markerFor('fisher')).toBe('available');
    expect(log.markerFor('elder')).toBeNull();
    // Forzar la de los lobos.
    log.accept('q_wolf_cull');
    for (let i = 0; i < 3; i++) h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.give('fang', 2);
    expect(log.markerFor('guard')).toBe('ready');
    expect(log.turnIn('q_wolf_cull', 'elder').ok).toBe(false);
    expect(log.turnIn('q_wolf_cull', 'guard').ok).toBe(true);
    expect(log.state('q_watchstone')).toBe('available');
    expect(log.markerFor('guard')).toBe('available');
    // q_elder_remedy pide también la de la pescadora y nivel 2.
    expect(log.state('q_elder_remedy')).toBe('locked');
  });

  it('entregar da XP, monedas, objetos y enseña el hechizo', () => {
    const c = withQuests([
      quest('t_reward', [{ type: 'kill', archetypes: ['melee'], count: 1, text: 'Un lobo' }], {
        rewards: { xp: 60, gold: 17, items: [{ itemId: 'health_potion', quantity: 2 }], learnSpell: 'wolf_spirit' },
      }),
    ]);
    const { h, log, events } = setup(c);
    const gold = h.gold;
    const potions = h.inventory.count('health_potion');
    log.accept('t_reward');
    expect(log.turnIn('t_reward').ok).toBe(false);
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    expect(log.turnIn('t_reward').ok).toBe(true);
    expect(h.level).toBe(2); // 60 XP > 50 del nivel 1
    expect(h.gold).toBe(gold + 17);
    expect(h.inventory.count('health_potion')).toBe(potions + 2);
    expect(h.spellbook.rank('wolf_spirit')).toBe(1);
    expect(log.state('t_reward')).toBe('completed');
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['questCompleted', 'learned', 'levelUp', 'gold', 'loot']));
  });

  it('no deja entregar si la recompensa no cabe en la mochila', () => {
    const c = withQuests([
      quest('t_full', [{ type: 'kill', archetypes: ['melee'], count: 1, text: 'Un lobo' }], {
        rewards: { xp: 0, gold: 0, items: [{ itemId: 'short_sword', quantity: 1 }], learnSpell: null },
      }),
    ]);
    const { h, log } = setup(c);
    while (h.inventory.freeSlots() > 0) h.give('copper_ring', 1);
    log.accept('t_full');
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    expect(log.turnIn('t_full')).toEqual({ ok: false, reason: 'Haz sitio en la mochila para la recompensa' });
    expect(log.state('t_full')).toBe('ready');
  });

  it('abandonar la quita del diario y se puede volver a aceptar; seguir cambia la del HUD', () => {
    const { s, log } = setup();
    log.accept('q_perch_supper');
    log.accept('q_wolf_cull');
    expect(s.trackedQuest()!.id).toBe('q_perch_supper');
    expect(s.trackQuest('q_wolf_cull').ok).toBe(true);
    expect(s.trackedQuest()!.id).toBe('q_wolf_cull');
    expect(s.trackQuest('q_east_wind').ok).toBe(false);
    expect(s.abandonQuest('q_wolf_cull').ok).toBe(true);
    expect(s.trackedQuest()!.id).toBe('q_perch_supper');
    expect(log.state('q_wolf_cull')).toBe('available');
    expect(s.quests().map((q) => q.id)).toEqual(['q_perch_supper']);
  });

  it('aceptar una de matar con spawn pide al mundo los enemigos que faltan', () => {
    const { s, h, log } = setup();
    const calls: unknown[][] = [];
    const world = {
      effectContext: () => null as never,
      dropToGround: () => {},
      petHealth: () => null,
      castSlot: () => null,
      hotbarState: () => [],
      spawnQuestEnemies: (...a: unknown[]) => void calls.push(a),
    };
    s.attach(world);
    log.accept('q_wolf_cull');
    expect(calls).toEqual([['melee', 3, { x: 98, y: 92 }, 5]]);
    h.emit({ type: 'enemyKilled', archetype: 'melee' });
    // Mundo nuevo (reinicio o carga): vuelven los que faltan.
    s.attach(world);
    expect(calls[1]).toEqual(['melee', 2, { x: 98, y: 92 }, 5]);
  });
});

describe('diálogos', () => {
  it('condiciones: nivel, objeto en la mochila, estado de misión y negación', () => {
    const { h, log } = setup();
    expect(log.holds({ type: 'level', min: 1, max: 2 })).toBe(true);
    expect(log.holds({ type: 'level', min: 3, max: 999 })).toBe(false);
    expect(log.holds({ type: 'hasItem', itemId: 'fish_lantern', quantity: 1 })).toBe(false);
    h.give('fish_lantern', 1);
    expect(log.holds({ type: 'hasItem', itemId: 'fish_lantern', quantity: 1 })).toBe(true);
    expect(log.holds({ type: 'hasItem', itemId: 'fish_lantern', quantity: 2 })).toBe(false);
    expect(log.holds({ type: 'quest', questId: 'q_wolf_cull', states: ['available'] })).toBe(true);
    log.accept('q_wolf_cull');
    expect(log.holds({ type: 'quest', questId: 'q_wolf_cull', states: ['active', 'ready'] })).toBe(true);
    expect(log.holds({ type: 'not', condition: { type: 'quest', questId: 'q_wolf_cull', states: ['active'] } })).toBe(false);
  });

  it('las opciones con condiciones aparecen y desaparecen (nivel y objeto)', () => {
    const { s, h } = setup();
    const texts = (): string[] => s.dialogue()!.options.map((o) => o.text);
    s.talk('elder');
    expect(s.dialogue()!.text).toMatch(/Siéntate/);
    // Nivel 1: sale la versión de «vuelve más tarde».
    expect(texts().filter((t) => t.includes('viento del este'))).toHaveLength(1);
    const wind = s.dialogue()!.options.find((o) => o.text.includes('viento'))!;
    expect(s.chooseDialogue(wind.index)!.text).toMatch(/piernas más curtidas/);
    s.talk('fisher');
    expect(texts().some((t) => t.includes('Mira lo que saqué'))).toBe(false);
    h.give('old_boot', 1);
    s.talk('fisher');
    const look = s.dialogue()!.options.find((o) => o.text.includes('Mira lo que saqué'))!;
    expect(s.chooseDialogue(look.index)!.text).toMatch(/bota vieja/i);
  });

  it('la entrada elige el primer nodo cuyas condiciones se cumplen', () => {
    const { h, log } = setup();
    const c = content();
    expect(new Conversation(c, c.npcs['guard']!, log).entry).toBe('hello');
    log.accept('q_wolf_cull');
    for (let i = 0; i < 3; i++) h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.give('fang', 2);
    log.turnIn('q_wolf_cull');
    expect(new Conversation(c, c.npcs['guard']!, log).entry).toBe('thanks');
  });

  it('ofrecer → aceptar desde el diálogo; en curso; entregar; y la siguiente de la cadena', () => {
    const { s, h, log } = setup();
    const kinds = (): string[] => s.dialogue()!.options.map((o) => o.kind);
    const pick = (kind: string): ReturnType<GameSession['chooseDialogue']> => s.chooseDialogue(s.dialogue()!.options.find((o) => o.kind === kind)!.index);
    s.talk('guard');
    expect(kinds()).toContain('offer');
    const offer = pick('offer')!;
    expect(offer.text).toMatch(/manada/);
    expect(offer.quest!.id).toBe('q_wolf_cull');
    expect(offer.quest!.rewards.gold).toBe(25);
    pick('accept');
    expect(log.state('q_wolf_cull')).toBe('active');
    // De vuelta al saludo: ahora sale «Sobre…» en vez de ofrecerla.
    expect(kinds()).toContain('progress');
    expect(kinds()).not.toContain('offer');
    expect(pick('progress')!.text).toMatch(/Se les oye/);
    for (let i = 0; i < 3; i++) h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.give('fang', 2);
    s.talk('guard');
    const done = pick('turnIn')!;
    expect(done.text).toMatch(/bien afilados/);
    expect(log.state('q_wolf_cull')).toBe('completed');
    // Desde el agradecimiento ya se ofrece la siguiente.
    s.talk('guard');
    expect(s.dialogue()!.text).toMatch(/transitable/);
    expect(s.dialogue()!.options.find((o) => o.kind === 'offer')!.text).toBe('La piedra del vigía');
    expect(s.chooseDialogue(s.dialogue()!.options.find((o) => o.kind === 'bye')!.index)).toBeNull();
    expect(s.dialogue()).toBeNull();
  });

  it('un mercader ofrece «Comerciar» y elegirlo abre su tienda', () => {
    const { s, events } = setup();
    const v = s.talk('smith')!;
    expect(v.name).toBe('Brunilda Yunque');
    const trade = v.options.find((o) => o.kind === 'shop')!;
    expect(trade.text).toBe('Comerciar');
    expect(s.chooseDialogue(trade.index)).toBeNull();
    expect(events).toContainEqual({ type: 'openMerchant', merchantId: 'smith' });
    // Los PNJ que no venden no lo tienen.
    expect(s.talk('fisher')!.options.some((o) => o.kind === 'shop')).toBe(false);
  });

  it('una opción con acción openShop (condicionada a una misión) también abre la tienda', () => {
    const { s, log, events } = setup();
    expect(s.talk('apothecary')!.options.some((o) => o.text.includes('anciano Celso'))).toBe(false);
    // Forzar q_elder_remedy activa.
    log.restore({ active: [{ questId: 'q_elder_remedy', progress: [] }], completed: [], tracked: null });
    s.talk('apothecary');
    s.chooseDialogue(s.dialogue()!.options.find((o) => o.text.includes('anciano Celso'))!.index);
    const shop = s.dialogue()!.options.find((o) => o.kind === 'shop')!;
    expect(shop.text).toMatch(/tónicos/);
    s.chooseDialogue(shop.index);
    expect(events).toContainEqual({ type: 'openMerchant', merchantId: 'apothecary' });
  });
});

describe('misiones: guardado', () => {
  it('ida y vuelta: progreso, completadas y seguida', () => {
    const { s, h, log } = setup();
    log.accept('q_perch_supper');
    h.emit({ type: 'fished', itemId: 'fish_moss_carp' });
    h.emit({ type: 'fished', itemId: 'old_boot' });
    log.accept('q_wolf_cull');
    for (let i = 0; i < 3; i++) h.emit({ type: 'enemyKilled', archetype: 'melee' });
    h.give('fang', 2);
    log.turnIn('q_wolf_cull');
    log.accept('q_watchstone');
    h.body = { pos: { x: 180, y: 132 } } as never;
    log.signal({ type: 'position', x: 180, y: 132 });
    s.trackQuest('q_watchstone');
    const save = JSON.parse(JSON.stringify(s.save()));
    expect(save.quests).toEqual({
      active: [
        { questId: 'q_perch_supper', progress: [2, 0] },
        { questId: 'q_watchstone', progress: [1, 0] },
      ],
      completed: ['q_wolf_cull'],
      tracked: 'q_watchstone',
    });
    const back = new RpgSessionFactory(content()).load(save, 7);
    expect(back.questLog.toSave()).toEqual(save.quests);
    expect(back.questLog.state('q_wolf_cull')).toBe('completed');
    expect(back.trackedQuest()!.id).toBe('q_watchstone');
    expect(back.quests().map((q) => [q.id, q.state])).toEqual([
      ['q_perch_supper', 'active'],
      ['q_watchstone', 'active'],
      ['q_wolf_cull', 'completed'],
    ]);
    // Cargar no repite avisos de progreso de lo que ya se tenía.
    const evs: SessionEvent[] = [];
    back.on((e) => evs.push(e));
    back.character.emit({ type: 'changed' });
    expect(evs.filter((e) => e.type === 'questProgress')).toHaveLength(0);
  });

  it('un guardado anterior al Slice 06 (sin quests) carga sin misiones', () => {
    const { s } = setup();
    const old = s.save();
    delete old.quests;
    const back = new RpgSessionFactory(content()).load(old, 1);
    expect(back.quests()).toEqual([]);
    expect(back.questLog.state('q_perch_supper')).toBe('available');
  });

  it('ignora misiones que ya no existen y progreso fuera de rango', () => {
    const { log } = setup();
    log.restore({
      active: [
        { questId: 'q_borrada', progress: [1] },
        { questId: 'q_wolf_cull', progress: [99, 5] },
      ],
      completed: ['otra_borrada'],
      tracked: 'q_borrada',
    });
    expect(log.toSave()).toEqual({ active: [{ questId: 'q_wolf_cull', progress: [3, 0] }], completed: [], tracked: 'q_wolf_cull' });
  });
});
