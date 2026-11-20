import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import type { DialogueAction, SessionEvent } from '../src/rpg/contracts';
import { Conversation, QuestLog } from '../src/rpg/quests';
import { Character } from '../src/rpg/character';
import { GameSession } from '../src/rpg/session';
import { Rng } from '../src/sim/rng';

const rpg = loadGameData().rpg;

function session(): GameSession {
    const h = Character.create(rpg, 'ember_vanguard', 'Prueba', new Rng(1));
    return new GameSession(rpg, h, new Rng(1));
}

describe('DUN-03: Portero de la cripta', () => {
    describe('PNJ crypt_warden existe', () => {
        it('tiene nombre y título', () => {
            const npc = rpg.npcs['crypt_warden'];
            expect(npc).toBeDefined();
            expect(npc!.name).toBe('Berto Candado');
            expect(npc!.title).toBe('Portero de la cripta');
        });

        it('está cerca de la entrada de la cripta', () => {
            const npc = rpg.npcs['crypt_warden'];
            // La entrada está en (141, 156); el PNJ debe estar a menos de 15 m.
            const dist = Math.hypot(npc!.position.x - 141, npc!.position.y - 156);
            expect(dist).toBeLessThan(15);
        });

        it('tiene diálogo con dos nodos', () => {
            const npc = rpg.npcs['crypt_warden'];
            const nodes = npc!.dialogue.nodes;
            expect(Object.keys(nodes)).toContain('noKey');
            expect(Object.keys(nodes)).toContain('hello');
        });
    });

    describe('Diálogo sin llave', () => {
        it('sin crypt_key muestra el nodo noKey', () => {
            const s = session();
            const npc = rpg.npcs['crypt_warden']!;
            const log = s.questLog;
            const conv = new Conversation(rpg, npc, log);
            const view = conv.view();
            expect(view.text).toContain('llave');
            // Una opción + "Adiós"
            expect(view.options).toHaveLength(2);
        });
    });

    describe('Diálogo con llave (nodo hello forzado)', () => {
        it('muestra opciones de piso', () => {
            const s = session();
            const npc = rpg.npcs['crypt_warden']!;
            const log = s.questLog;
            const conv = new Conversation(rpg, npc, log);
            (conv as any).node = 'hello';
            const view = conv.view();
            expect(view.text).toContain('piso');
            // 6 pisos + "Me lo pienso" + "Adiós" = 8
            expect(view.options.length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('Acción enterDungeon', () => {
        it('tipo con floor numérico', () => {
            const action: DialogueAction = { type: 'enterDungeon', floor: 9 };
            expect(action.type).toBe('enterDungeon');
            expect(action.floor).toBe(9);
        });

        it('tipo con floor null (piso 1)', () => {
            const action: DialogueAction = { type: 'enterDungeon', floor: null };
            expect(action.type).toBe('enterDungeon');
            expect(action.floor).toBeNull();
        });
    });

    describe('Conversation.choose con enterDungeon', () => {
        it('elige piso 1 (floor null)', () => {
            const s = session();
            const npc = rpg.npcs['crypt_warden']!;
            const log = s.questLog;
            const conv = new Conversation(rpg, npc, log);
            (conv as any).node = 'hello';
            const step = conv.choose(0);
            expect(step.enterDungeon).toBeNull();
            expect(step.view).toBeNull();
        });

        it('elige piso 10 (floor 9)', () => {
            const s = session();
            const npc = rpg.npcs['crypt_warden']!;
            const log = s.questLog;
            const conv = new Conversation(rpg, npc, log);
            (conv as any).node = 'hello';
            const step = conv.choose(1);
            expect(step.enterDungeon).toBe(9);
        });
    });

    describe('SessionEvent enterDungeon', () => {
        it('evento con floor numérico', () => {
            const event: SessionEvent = { type: 'enterDungeon', floor: 19 };
            expect(event.type).toBe('enterDungeon');
            expect(event.floor).toBe(19);
        });

        it('evento con floor null', () => {
            const event: SessionEvent = { type: 'enterDungeon', floor: null };
            expect(event.type).toBe('enterDungeon');
            expect(event.floor).toBeNull();
        });
    });
});
