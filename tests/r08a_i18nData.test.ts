import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage, trf } from '../src/i18n';

afterEach(() => setLanguage('es'));

describe('R08-A: textos con datos dentro, traducibles', () => {
    describe('combatLog', () => {
        it('nivel enemigo en español e inglés', () => {
            expect(trf('(niv. {level})', { level: 10 })).toBe('(niv. 10)');
            setLanguage('en');
            expect(trf('(niv. {level})', { level: 10 })).toBe('(lv. 10)');
        });

        it('daño al jugador: " te hace " traducible', () => {
            expect(trf(' te hace ', {})).toBe(' te hace ');
            setLanguage('en');
            expect(trf(' te hace ', {})).toBe(' deals ');
        });

        it('curas traducible', () => {
            expect(trf('Curas ', {})).toBe('Curas ');
            setLanguage('en');
            expect(trf('Curas ', {})).toBe('You heal ');
        });

        it('XP ganada', () => {
            expect(trf('+{amount} XP', { amount: 50 })).toBe('+50 XP');
            setLanguage('en');
            expect(trf('+{amount} XP', { amount: 50 })).toBe('+50 XP');
        });

        it('subida de nivel', () => {
            expect(trf('¡Nivel {level}!', { level: 5 })).toBe('¡Nivel 5!');
            setLanguage('en');
            expect(trf('¡Nivel {level}!', { level: 5 })).toBe('Level 5!');
        });

        it('invocación y aturdimiento', () => {
            expect(trf(' invoca {count}', { count: 3 })).toBe(' invoca 3');
            expect(trf(' queda aturdido', {})).toBe(' queda aturdido');
            setLanguage('en');
            expect(trf(' invoca {count}', { count: 3 })).toBe(' summons 3');
            expect(trf(' queda aturdido', {})).toBe(' is stunned');
        });

        it('enemigo derrotado', () => {
            expect(trf('Derrotado: ', {})).toBe('Derrotado: ');
            setLanguage('en');
            expect(trf('Derrotado: ', {})).toBe('Defeated: ');
        });

        it('entrada en zona con franja', () => {
            expect(trf('Entras en: ', {})).toBe('Entras en: ');
            expect(trf(' · {band}', { band: 'niv. 5–12' })).toBe(' · niv. 5–12');
            setLanguage('en');
            expect(trf('Entras en: ', {})).toBe('Entering: ');
            expect(trf(' · {band}', { band: 'lv. 5–12' })).toBe(' · lv. 5–12');
        });
    });

    describe('HUD', () => {
        it('vida y recurso', () => {
            expect(trf('{health} / {maxHealth}', { health: 80, maxHealth: 100 })).toBe('80 / 100');
            setLanguage('en');
            expect(trf('{health} / {maxHealth}', { health: 80, maxHealth: 100 })).toBe('80 / 100');
        });

        it('recurso con nombre', () => {
            expect(
                trf('{resource} {value} / {max}', { resource: 'Briznas', value: 30, max: 50 }),
            ).toBe('Briznas 30 / 50');
            setLanguage('en');
            expect(
                trf('{resource} {value} / {max}', { resource: 'Sparks', value: 30, max: 50 }),
            ).toBe('Sparks 30 / 50');
        });

        it('barra de XP', () => {
            expect(
                trf('Nivel {level} · {xp} / {xpToNext} XP', { level: 3, xp: 120, xpToNext: 200 }),
            ).toBe('Nivel 3 · 120 / 200 XP');
            setLanguage('en');
            expect(
                trf('Nivel {level} · {xp} / {xpToNext} XP', { level: 3, xp: 120, xpToNext: 200 }),
            ).toBe('Level 3 · 120 / 200 XP');
        });

        it('espectro', () => {
            expect(trf('Espectro · ', {})).toBe('Espectro · ');
            setLanguage('en');
            expect(trf('Espectro · ', {})).toBe('Specter · ');
        });

        it('estado con tiempo restante', () => {
            expect(trf('Quedan {time} s', { time: '3.5' })).toBe('Quedan 3.5 s');
            setLanguage('en');
            expect(trf('Quedan {time} s', { time: '3.5' })).toBe('3.5 s remaining');
        });

        it('hueco sin objeto', () => {
            expect(trf('Hueco {key}: sin objeto utilizable', { key: 'R' })).toBe('Hueco R: sin objeto utilizable');
            setLanguage('en');
            expect(trf('Hueco {key}: sin objeto utilizable', { key: 'R' })).toBe('Slot R: no usable item');
        });
    });

    describe('banners', () => {
        it('subida de nivel con puntos', () => {
            expect(
                trf('+{pts} puntos · +{hp} vida · +{briznas} Briznas ({key})', {
                    pts: 3,
                    hp: 10,
                    briznas: 5,
                    key: 'P',
                }),
            ).toBe('+3 puntos · +10 vida · +5 Briznas (P)');
            setLanguage('en');
            expect(
                trf('+{pts} puntos · +{hp} vida · +{briznas} Briznas ({key})', {
                    pts: 3,
                    hp: 10,
                    briznas: 5,
                    key: 'P',
                }),
            ).toBe('+3 points · +10 health · +5 Sparks (P)');
        });

        it('franja de zona', () => {
            expect(trf('niv. {min}–{max}', { min: 5, max: 12 })).toBe('niv. 5–12');
            setLanguage('en');
            expect(trf('niv. {min}–{max}', { min: 5, max: 12 })).toBe('lv. 5–12');
        });
    });

    describe('ventana de Personaje', () => {
        it('clase y nivel', () => {
            expect(trf('{name} · nivel {level}', { name: 'Ember', level: 7 })).toBe('Ember · nivel 7');
            setLanguage('en');
            expect(trf('{name} · nivel {level}', { name: 'Ember', level: 7 })).toBe('Ember · level 7');
        });

        it('progreso de XP', () => {
            expect(
                trf('{xp} / {xpToNext} XP para el nivel {next}', { xp: 120, xpToNext: 200, next: 8 }),
            ).toBe('120 / 200 XP para el nivel 8');
            setLanguage('en');
            expect(
                trf('{xp} / {xpToNext} XP para el nivel {next}', { xp: 120, xpToNext: 200, next: 8 }),
            ).toBe('120 / 200 XP to level 8');
        });

        it('puntos por repartir', () => {
            expect(trf('Puntos por repartir: {pts}', { pts: 5 })).toBe('Puntos por repartir: 5');
            setLanguage('en');
            expect(trf('Puntos por repartir: {pts}', { pts: 5 })).toBe('Points to spend: 5');
        });

        it('tope de resistencia', () => {
            expect(trf('Tope: {cap} %', { cap: 50 })).toBe('Tope: 50 %');
            setLanguage('en');
            expect(trf('Tope: {cap} %', { cap: 50 })).toBe('Cap: 50 %');
        });

        it('conjunto de equipo', () => {
            expect(trf('{set} ({count}/{total})', { set: 'Azuero', count: 2, total: 4 })).toBe('Azuero (2/4)');
            setLanguage('en');
            expect(trf('{set} ({count}/{total})', { set: 'Azuero', count: 2, total: 4 })).toBe('Azuero (2/4)');
        });

        it('total de estadística', () => {
            expect(trf('Total: {value}', { value: '150' })).toBe('Total: 150');
            setLanguage('en');
            expect(trf('Total: {value}', { value: '150' })).toBe('Total: 150');
        });
    });

    describe('libro de hechizos', () => {
        it('nivel de desbloqueo', () => {
            expect(trf('Nivel {level}', { level: 10 })).toBe('Nivel 10');
            setLanguage('en');
            expect(trf('Nivel {level}', { level: 10 })).toBe('Level 10');
        });
    });

    describe('coordenadas y mapa', () => {
        it('coordenadas', () => {
            expect(trf('[{x}, {y}]', { x: 120, y: 340 })).toBe('[120, 340]');
            setLanguage('en');
            expect(trf('[{x}, {y}]', { x: 120, y: 340 })).toBe('[120, 340]');
        });
    });
});
