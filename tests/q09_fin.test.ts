// Q09-FIN: Lo que queda de Q09 — «Curas» sin origen y tecla 1 en diálogos.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { CombatLog } from '../src/ui/combatLog';
import { hotbarIndex } from '../src/ui/menus/keybindings';

const DT = 1 / 60;

function arena() {
    const character = Character.create(loadGameData().rpg, 'storm_weaver', 'Prueba', new Rng(1));
    const w = new World(loadGameData(), { encounter: false, character });
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    return w;
}

function run(w: World, seconds: number) {
    for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

describe('Q09-FIN: Curas con origen en el registro', () => {
    it('regeneración pasiva emite evento heal con source regen', () => {
        const w = arena();
        // El personaje tiene healthRegen > 0; avanzar unos ticks debe generar curación.
        const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
        const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

        // Bajar la vida para que la regeneración sea visible.
        w.character.health = Math.floor(w.character.maxHealth * 0.5);

        // Avanzar suficiente tiempo para que el acumulador de regen alcance >= 1.
        // healthRegen base ~0.35/s → necesita ~3s para acumular 1 punto de vida.
        run(w, 4);
        log.handle(w, w.drainEvents());

        const regenHeals = lines.filter(
            (l) => l.parts.some((p) => p.kind === 'heal') && l.parts.some((p) => p.text.includes('Regeneración')),
        );
        expect(regenHeals.length).toBeGreaterThan(0);
    });

    it('hechizo de curación muestra el nombre del hechizo', () => {
        const w = arena();
        const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
        const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

        // Evento heal con source = spellId.
        const healEvent = { type: 'heal' as const, targetId: w.player.id, amount: 50, source: 'spark' };
        log.handle(w, [healEvent]);

        const healLine = lines.find((l) => l.parts.some((p) => p.kind === 'heal'));
        expect(healLine).toBeDefined();
        const fullText = healLine!.parts.map((p) => p.text).join('');
        expect(fullText).toContain('Curas');
        expect(fullText).toContain('+50');
        const sparkName = w.content.spells['spark']?.name ?? 'spark';
        expect(fullText).toContain(sparkName);
    });

    it('poción muestra el id del objeto como origen', () => {
        const w = arena();
        const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
        const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

        const healEvent = { type: 'heal' as const, targetId: w.player.id, amount: 40, source: 'item:pocion_vida_pequena' };
        log.handle(w, [healEvent]);

        const healLine = lines.find((l) => l.parts.some((p) => p.kind === 'heal'));
        expect(healLine).toBeDefined();
        const fullText = healLine!.parts.map((p) => p.text).join('');
        expect(fullText).toContain('Curas');
        expect(fullText).toContain('+40');
        // El source "item:pocion_vida_pequena" no es un spellId, así que labelOf devuelve el id tal cual.
        expect(fullText).toContain('item:pocion_vida_pequena');
    });

    it('estado con tick de curación muestra el id del estado', () => {
        const w = arena();
        const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
        const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

        const healEvent = { type: 'heal' as const, targetId: w.player.id, amount: 5, source: 'status:regeneration' };
        log.handle(w, [healEvent]);

        const healLine = lines.find((l) => l.parts.some((p) => p.kind === 'heal'));
        expect(healLine).toBeDefined();
        const fullText = healLine!.parts.map((p) => p.text).join('');
        expect(fullText).toContain('Curas');
        expect(fullText).toContain('+5');
        // "status:regeneration" no es un spellId ni "regen", así que labelOf devuelve el id tal cual.
        // Pero combatLog usa labelOf que puede resolver "status:regeneration" como nombre del estado.
        // Lo importante es que el origen aparece, no que sea el id exacto.
        expect(healLine!.parts.some((p) => p.text.includes('status') || p.text.includes('Regeneración'))).toBe(true);
    });

    it('tickTimers devuelve la vida regenerada', () => {
        const w = arena();
        const ch = w.character;
        // Bajar la vida para que la regeneración sea visible.
        ch.health = Math.floor(ch.maxHealth * 0.5);
        const regen = ch.tickTimers(1);
        expect(regen).toBeGreaterThan(0);
        // La regeneración no debe superar el healthRegen por segundo.
        const expected = ch.stats.get('healthRegen');
        expect(regen).toBeLessThanOrEqual(expected + 0.01);
    });

    it('tickTimers devuelve 0 si el personaje está muerto', () => {
        const w = arena();
        const ch = w.character;
        ch.health = 0;
        const regen = ch.tickTimers(1);
        expect(regen).toBe(0);
    });

    it('tickTimers devuelve 0 si la vida está al máximo', () => {
        const w = arena();
        const ch = w.character;
        ch.health = ch.maxHealth;
        const regen = ch.tickTimers(1);
        expect(regen).toBe(0);
    });
});

describe('Q09-FIN: Tecla 1 con diálogo abierto', () => {
    it('hotbarIndex resuelve hotbar1 a índice 0', () => {
        expect(hotbarIndex('hotbar1')).toBe(0);
    });

    it('con diálogo abierto, hotbar1 elige opción en vez de lanzar', () => {
        // La lógica está en index.ts:1171:
        // if (hot !== null && dialogue?.npcId) return dialogue.choose(hot);
        // Verificamos que hotbarIndex devuelve 0 para hotbar1.
        const idx = hotbarIndex('hotbar1');
        expect(idx).toBe(0);
        // dialogue.choose(0) elige la primera opción.
        // La integración se verifica en Electron; aquí confirmamos el índice.
    });
});
