import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { CombatLog } from '../src/ui/combatLog';
import { Rng } from '../src/sim/rng';
import type { GameEvent } from '../src/sim/events';
import type { ChatPart } from '../src/ui/chatLog';

describe('DW-01: dos armas distintas', () => {
    const content = loadGameData().rpg;

    function makeChar() {
        const ch = new Character(content, 'ember_vanguard', 'Prueba', new Rng(42));
        // Equipar short_sword en weapon y woodcutter_axe en offhand (ambas son armas de una mano).
        const sword = ch.items.create('short_sword', 1);
        const axe = ch.items.create('woodcutter_axe', 1);
        ch.equipment.put('weapon', sword);
        ch.equipment.put('offhand', axe);
        return ch;
    }

    describe('basicSwing y swung', () => {
        it('sin dos armas: siempre weapon', () => {
            const ch = new Character(content, 'ember_vanguard', 'x', new Rng(1));
            const s = ch.basicSwing();
            expect(s.hand).toBe('weapon');
            expect(s.damage).toBe(1);
            expect(s.speed).toBe(1);
            ch.swung();
            expect(ch.basicSwing().hand).toBe('weapon');
        });

        it('con dos armas: alterna weapon → offhand → weapon', () => {
            const ch = makeChar();
            expect(ch.dualWielding()).toBe(true);

            const s1 = ch.basicSwing();
            expect(s1.hand).toBe('weapon');
            expect(s1.def).toBeDefined();
            expect(s1.def!.id).toBe('short_sword');
            expect(s1.damage).toBe(1);
            expect(s1.speed).toBe(content.rules.dualWield.attackSpeed);

            ch.swung();
            const s2 = ch.basicSwing();
            expect(s2.hand).toBe('offhand');
            expect(s2.def).toBeDefined();
            expect(s2.def!.id).toBe('woodcutter_axe');
            expect(s2.damage).toBe(content.rules.dualWield.offhandDamage);
            expect(s2.speed).toBe(content.rules.dualWield.attackSpeed);

            ch.swung();
            const s3 = ch.basicSwing();
            expect(s3.hand).toBe('weapon');
        });

        it('sin arma en offhand: no alterna aunque haya arma en weapon', () => {
            const ch = new Character(content, 'ember_vanguard', 'x', new Rng(1));
            const sword = ch.items.create('short_sword', 1);
            ch.equipment.put('weapon', sword);
            expect(ch.dualWielding()).toBe(false);
            expect(ch.basicSwing().hand).toBe('weapon');
            ch.swung();
            expect(ch.basicSwing().hand).toBe('weapon');
        });

        it('solo offhand (sin weapon): golpea con offhand, no alterna', () => {
            const ch = new Character(content, 'ember_vanguard', 'x', new Rng(1));
            const axe = ch.items.create('woodcutter_axe', 1);
            ch.equipment.put('offhand', axe);
            expect(ch.dualWielding()).toBe(false);
            const s = ch.basicSwing();
            expect(s.hand).toBe('offhand');
            expect(s.def).toBeDefined();
            expect(s.def!.id).toBe('woodcutter_axe');
            ch.swung();
            expect(ch.basicSwing().hand).toBe('offhand');
        });
    });

    describe('CombatLog: mano izquierda en el registro', () => {
        it('cast básico offhand → damage muestra etiqueta', () => {
            const parts: { channel: string; parts: ChatPart[] }[] = [];
            const log = new CombatLog((_ch, p) => parts.push({ channel: _ch, parts: p }));

            // Simular: cast básico con offhand, luego damage.
            const events: GameEvent[] = [
                { type: 'cast', ability: 'basic', hand: 'offhand' },
                {
                    type: 'damage',
                    sourceId: -1,
                    targetId: 1,
                    amount: 12,
                    crit: false,
                    toPlayer: false,
                    ability: 'basic',
                },
            ];
            // Sin world real, describe funciona con lo que tiene.
            log.handle(null as any, events);
            expect(parts.length).toBe(1);
            const text = parts[0]!.parts.map((p) => p.text).join('');
            expect(text).toContain('mano izquierda');
        });

        it('cast básico weapon → damage sin etiqueta', () => {
            const parts: { channel: string; parts: ChatPart[] }[] = [];
            const log = new CombatLog((_ch, p) => parts.push({ channel: _ch, parts: p }));

            const events: GameEvent[] = [
                { type: 'cast', ability: 'basic', hand: 'weapon' },
                {
                    type: 'damage',
                    sourceId: -1,
                    targetId: 1,
                    amount: 15,
                    crit: false,
                    toPlayer: false,
                    ability: 'basic',
                },
            ];
            log.handle(null as any, events);
            expect(parts.length).toBe(1);
            const text = parts[0]!.parts.map((p) => p.text).join('');
            expect(text).not.toContain('mano izquierda');
        });

        it('dos golpes seguidos: solo el offhand etiqueta', () => {
            const parts: { channel: string; parts: ChatPart[] }[] = [];
            const log = new CombatLog((_ch, p) => parts.push({ channel: _ch, parts: p }));

            const events: GameEvent[] = [
                { type: 'cast', ability: 'basic', hand: 'weapon' },
                {
                    type: 'damage',
                    sourceId: -1,
                    targetId: 1,
                    amount: 15,
                    crit: false,
                    toPlayer: false,
                    ability: 'basic',
                },
                { type: 'cast', ability: 'basic', hand: 'offhand' },
                {
                    type: 'damage',
                    sourceId: -1,
                    targetId: 1,
                    amount: 10,
                    crit: false,
                    toPlayer: false,
                    ability: 'basic',
                },
            ];
            log.handle(null as any, events);
            expect(parts.length).toBe(2);
            const t1 = parts[0]!.parts.map((p) => p.text).join('');
            const t2 = parts[1]!.parts.map((p) => p.text).join('');
            expect(t1).not.toContain('mano izquierda');
            expect(t2).toContain('mano izquierda');
        });
    });
});
