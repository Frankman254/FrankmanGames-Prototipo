// Recorrido completo de la cadena de ejemplo con la simulación: mundo de 256 m
// con el pueblo, PNJ colocados por el mundo, caminar con clic, pescar en el
// estanque, enemigos de misión que aparecen y mueren en la simulación, comprar
// en la tienda desde el diálogo y aprender el hechizo al final.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { loadWorldData } from '../../src/data/worldData';
import { Character } from '../../src/rpg/character';
import type { DialogueOptionKind, SessionEvent } from '../../src/rpg/contracts';
import { GameSession, RpgSessionFactory } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { buildOverworld, withOverworldZone } from '../../src/world/overworld';

const DT = 1 / 60;

describe('cadena de misiones con la simulación', () => {
  it('de la pescadora al hechizo del anciano', () => {
    const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
    const rng = new Rng(11);
    let s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng), rng);
    let w = new World(data, { encounter: false, character: s.character, seed: 11 });
    s.attach(w);
    let events: SessionEvent[] = [];
    let unsub = s.on((e) => events.push(e));

    const step = (): void => {
      w.player.invulnerable = 1; // el recorrido prueba las misiones, no el combate
      w.tick(DT);
      s.tick(DT);
      w.drainEvents();
    };
    const run = (until: () => boolean, seconds: number): boolean => {
      for (let i = 0; i < seconds / DT; i++) {
        if (until()) return true;
        step();
      }
      return until();
    };
    /** Clic en el PNJ: camina hasta él; al llegar la interfaz abriría el diálogo. */
    const talkTo = (npcId: string): void => {
      events = [];
      w.commandTalk(npcId);
      expect(run(() => events.some((e) => e.type === 'talkNpc' && e.npcId === npcId), 60), `llegar a ${npcId}`).toBe(true);
      expect(s.talk(npcId)).not.toBeNull();
    };
    const pick = (kind: DialogueOptionKind, text?: string): void => {
      const o = s.dialogue()!.options.find((x) => x.kind === kind && (text === undefined || x.text.includes(text)));
      expect(o, `opción ${kind} ${text ?? ''} en «${s.dialogue()!.text}»`).toBeDefined();
      s.chooseDialogue(o!.index);
    };
    const acceptFrom = (npcId: string, questId: string): void => {
      talkTo(npcId);
      pick('offer', data.rpg.quests[questId]!.name);
      pick('accept');
      // 'ready' si ya llevabas lo que pide (el kit inicial trae tónicos, por ejemplo).
      expect(['active', 'ready']).toContain(s.questLog.state(questId));
      s.endDialogue();
    };
    const turnInTo = (npcId: string, questId: string): void => {
      talkTo(npcId);
      pick('turnIn', data.rpg.quests[questId]!.name);
      expect(s.questLog.state(questId)).toBe('completed');
      s.endDialogue();
    };
    /** Mata en la simulación a los enemigos vivos de esos arquetipos y recoge su botín. */
    const slay = (archetypes: string[]): number => {
      const targets = w.enemies.list.filter((e) => e.state !== 'dead' && archetypes.includes(e.def.id));
      for (const e of targets) w.enemies.damage(e, 1e6, () => {});
      step();
      for (const l of [...w.loot]) {
        w.commandPickup(l.id);
        run(() => !w.loot.includes(l), 30);
      }
      return targets.length;
    };

    // Todos los PNJ están en el mundo, en suelo libre, y los que tienen misión lo marcan.
    for (const id of ['fisher', 'guard', 'elder', 'smith', 'apothecary']) {
      const n = w.npcs.find((x) => x.npcId === id);
      expect(n, id).toBeDefined();
      expect(w.grid.walkable(n!.pos)).toBe(true);
    }
    expect(s.npcMarker('fisher')).toBe('available');
    expect(s.npcMarker('guard')).toBe('available');
    expect(s.npcMarker('elder')).toBeNull();
    expect(s.npcMarker('smith')).toBeNull();

    // 1. La pescadora: pescar en el estanque y entregar dos percas.
    acceptFrom('fisher', 'q_perch_supper');
    expect(s.npcMarker('fisher')).toBeNull();
    const spot = Object.values(data.rpg.fishing.spots)[0]!;
    for (let cast = 0; cast < 60 && s.questLog.state('q_perch_supper') !== 'ready'; cast++) {
      expect(w.commandFish({ x: spot.x, y: spot.y })).toBe(true);
      expect(run(() => w.fishing?.state === 'bite', 60)).toBe(true);
      w.commandFish(null); // clic a tiempo
      step();
    }
    expect(s.questLog.state('q_perch_supper')).toBe('ready');
    expect(s.npcMarker('fisher')).toBe('ready');
    const perch = s.character.inventory.count('fish_silver_perch');
    const xp0 = s.character.xp;
    turnInTo('fisher', 'q_perch_supper');
    expect(s.character.inventory.count('fish_silver_perch')).toBe(perch - 2);
    expect(s.character.xp).toBe(xp0 + 40);

    // 2. La sargento: los lobos aparecen al aceptar y se cazan en la simulación.
    const wolvesBefore = w.enemies.list.filter((e) => e.def.id === 'melee').length;
    acceptFrom('guard', 'q_wolf_cull');
    const wolves = w.enemies.list.filter((e) => e.def.id === 'melee' && e.state !== 'dead');
    expect(wolves.length - wolvesBefore).toBe(3);
    for (const e of wolves) expect(Math.hypot(e.pos.x - 98, e.pos.y - 92)).toBeLessThan(10);
    // Guardar y cargar a mitad: los lobos que faltan vuelven en el mundo nuevo.
    const save = JSON.parse(JSON.stringify(s.save()));
    unsub();
    s = new RpgSessionFactory(data.rpg).load(save, 12);
    w = new World(data, { encounter: false, character: s.character, seed: 12 });
    s.attach(w);
    unsub = s.on((e) => events.push(e));
    expect(s.questLog.state('q_wolf_cull')).toBe('active');
    expect(w.enemies.list.filter((e) => e.def.id === 'melee')).toHaveLength(3);
    w.player.pos = { x: 100, y: 96 };
    expect(slay(['melee'])).toBe(3);
    expect(s.questLog.view('q_wolf_cull')!.objectives[0]!.current).toBe(3);
    // Los colmillos salen del botín; si el azar no dio dos, se completan a mano.
    const fangs = s.character.inventory.count('fang');
    if (fangs < 2) s.character.give('fang', 2 - fangs);
    s.character.emit({ type: 'changed' });
    expect(s.npcMarker('guard')).toBe('ready');
    turnInTo('guard', 'q_wolf_cull');
    expect(s.character.inventory.count('wolf_tooth_amulet')).toBeGreaterThanOrEqual(1);

    // 3. La piedra del vigía: caminar hasta el este y contárselo al anciano.
    acceptFrom('guard', 'q_watchstone');
    w.commandMove({ x: 180, y: 132 });
    expect(run(() => s.questLog.view('q_watchstone')!.objectives[0]!.done, 60)).toBe(true);
    expect(s.npcMarker('elder')).toBeNull(); // aún falta hablarle
    talkTo('elder');
    // Hablarle cuenta el objetivo antes de abrir el diálogo, así que ya se puede entregar.
    pick('turnIn', 'La piedra del vigía');
    expect(s.questLog.state('q_watchstone')).toBe('completed');
    s.endDialogue();
    expect(s.character.level).toBeGreaterThanOrEqual(2);

    // 4. Un tónico de la tienda (comprado desde el diálogo) y cuero.
    expect(s.npcMarker('elder')).toBe('available');
    acceptFrom('elder', 'q_elder_remedy');
    talkTo('apothecary');
    pick('talk', 'anciano Celso');
    events = [];
    pick('shop');
    expect(events).toContainEqual({ type: 'openMerchant', merchantId: 'apothecary' });
    const tonic = s.merchant('apothecary')!.stock.find((o) => o.item.itemId === 'resource_tonic')!;
    s.character.addGold(tonic.price);
    // El kit inicial ya trae tónicos: se venden para probar la compra.
    while (s.character.inventory.count('resource_tonic') > 0) {
      const it = s.character.inventory.slots.find((x) => x?.itemId === 'resource_tonic')!;
      expect(s.sell('apothecary', it.uid, it.quantity).ok).toBe(true);
    }
    expect(s.questLog.view('q_elder_remedy')!.objectives[0]!.current).toBe(0);
    expect(s.buy('apothecary', tonic.index, 1).ok).toBe(true);
    expect(s.questLog.view('q_elder_remedy')!.objectives[0]!.done).toBe(true);
    if (s.character.inventory.count('hide') < 1) s.character.give('hide', 1);
    s.character.emit({ type: 'changed' });
    turnInTo('elder', 'q_elder_remedy');

    // 5. La lección del viento: nivel 3, goblins del este y el hechizo.
    expect(s.character.level).toBeGreaterThanOrEqual(3);
    acceptFrom('elder', 'q_east_wind');
    w.player.pos = { x: 170, y: 146 };
    expect(slay(['ranged'])).toBe(3);
    expect(s.questLog.state('q_east_wind')).toBe('ready');
    expect(s.character.spellbook.rank('gust')).toBe(0);
    turnInTo('elder', 'q_east_wind');
    expect(s.character.spellbook.rank('gust')).toBe(1);

    // Cadena terminada: nadie tiene ya misiones que dar ni que recibir.
    for (const id of ['fisher', 'guard', 'elder']) expect(s.npcMarker(id)).toBeNull();
    expect(s.quests().every((q) => q.state === 'completed')).toBe(true);
    expect(s.quests()).toHaveLength(Object.keys(data.rpg.quests).length);
    unsub();
  });
});
