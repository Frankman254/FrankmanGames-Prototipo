// Consola oculta (F8): registro de errores, advertencias y avisos del juego para el creador y QA.
import { describe, expect, it } from 'vitest';
import { CONSOLE_MAX, ConsoleLog, formatEntry } from '../../src/ui/devConsole';
import { validateName } from '../../src/ui/menus/screens/creation';

describe('consola oculta', () => {
    it('guarda por nivel y lo enseña con hora', () => {
        const log = new ConsoleLog();
        log.push('error', 'earcut is not defined', 65.4);
        log.push('aviso', 'aviso (warn): Nivel insuficiente', 70);
        expect(log.counts).toEqual({ error: 1, warn: 0, aviso: 1 });
        expect(log.text()).toBe('[01:05] ERROR earcut is not defined\n[01:10] AVISO aviso (warn): Nivel insuficiente');
        expect(log.text(10, ['error'])).toBe('[01:05] ERROR earcut is not defined');
    });

    it('un error repetido cada fotograma se cuenta en una línea', () => {
        const log = new ConsoleLog();
        for (let i = 0; i < 500; i++) log.push('error', 'falla el dibujo', i / 60);
        expect(log.entries).toHaveLength(1);
        expect(log.entries[0]!.text).toBe('falla el dibujo (×500)');
        expect(log.counts.error).toBe(500);
    });

    it('no crece sin límite', () => {
        const log = new ConsoleLog();
        for (let i = 0; i < CONSOLE_MAX + 50; i++) log.push('warn', `w${i}`, i);
        expect(log.entries).toHaveLength(CONSOLE_MAX);
        expect(formatEntry(log.entries[0]!)).toContain('w50');
    });

    it('la regla de nombres: 2–24 letras o dígitos, espacios, apóstrofo o guion (creador, 2026-11-17; NOM-01, 2026-11-18: máx. 24)', () => {
        expect(validateName('QA Estrella')).toBeNull();
        expect(validateName('QA Spellbook Ladder')).toBeNull(); // 19 caracteres: válidos desde NOM-01
        expect(validateName('QA Spellbook Ladder De Prueba')).toMatch(/Máximo/); // 29 > 24
        expect(validateName('OMP O9RT3')).toBeNull();
    });
});
