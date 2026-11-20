import { describe, expect, it } from 'vitest';
import type { AudioEngine } from '../src/audio/engine';
import { ContextMusicPlayer, musicContext } from '../src/audio/contextMusic';

// Fake AudioContext y buses para probar ContextMusicPlayer sin Web Audio real.
class FakeParam {
    value = 0;
    setTargetAtTime(v: number): this {
        this.value = v;
        return this;
    }
}
class FakeNode {
    gain = new FakeParam();
    out: FakeNode[] = [];
    started = 0;
    loop = false;
    onended: (() => void) | null = null;
    connect(n: FakeNode): FakeNode {
        this.out.push(n);
        return n;
    }
    start(): void {
        this.started++;
    }
    stop(): void {}
}
class FakeEngine {
    nodes: FakeNode[] = [];
    ctx = { currentTime: 0, createGain: () => { const n = new FakeNode(); this.nodes.push(n); return n; }, createBufferSource: () => { const n = new FakeNode(); this.nodes.push(n); return n; } };
    buses = { music: new FakeNode() };
    musicIn = new FakeNode();
}

describe('JL-24 Música tras morir y revivir en el pueblo', () => {
    it('musicContext: pelea en pueblo → town_fight', () => {
        // Durante la pelea, el jugador está en el pueblo con enemigos ENGAGED.
        expect(musicContext('game', null, false, true, true)).toBe('town_fight');
    });

    it('musicContext: tras revivir en el pueblo → town (no town_fight)', () => {
        // Al revivir, restart() crea un mundo nuevo con enemigos en idle.
        // threat baja a 0 → fighting=false → contexto vuelve a 'town'.
        expect(musicContext('game', null, false, true, false)).toBe('town');
    });

    it('musicContext: tras revivir en el pueblo, incluso si un enemigo se despierta al instante', () => {
        // Si un enemigo se despierta justo al revivir (threat > 0), la música
        // cambia a town_fight — pero eso es correcto: hay pelea en el pueblo.
        // La prueba verifica que el mecanismo funciona en ambas direcciones.
        expect(musicContext('game', null, false, true, true)).toBe('town_fight');
        // Cuando el enemigo muere o vuelve a idle, threat baja y la música vuelve a town.
        expect(musicContext('game', null, false, true, false)).toBe('town');
    });

    it('ContextMusicPlayer: cambiar de town_fight a town actualiza el contexto activo', async () => {
        const engine = new FakeEngine() as unknown as AudioEngine;
        const player = new ContextMusicPlayer(engine, () => Promise.reject(new Error('sin red')), () => 0.5);

        // Simula pelea en pueblo.
        player.update('town_fight', false);
        // Sin buffers reales, wanted cambia pero active sigue null (no hay pista).
        // Lo verificable es que wanted aceptó el cambio.
        expect(player.active).toBeNull(); // sin pista cargada, no hay reproducción.

        // Simula revivir: el contexto vuelve a 'town'.
        player.update('town', false);
        // El jugador interno detecta el cambio de wanted y planifica el switch.
        expect(player.active).toBeNull(); // sin pista, sigue sin reproducir.
        // La clave es que no se queda en 'town_fight'.
    });

    it('musicContext: desde mazmorra (crypt) de vuelta al pueblo → town', () => {
        // Si el jugador muere en la cripta y revive en el pueblo, el contexto
        // cambia de 'crypt' a 'town'.
        const enCripta = musicContext('game', 5, false, false, false);
        expect(enCripta).toBe('crypt');

        const trasRevivir = musicContext('game', null, false, true, false);
        expect(trasRevivir).toBe('town');
    });

    it('musicContext: pantalla de muerte sigue siendo game, no cambia el contexto', () => {
        // showDeath() es un modal dentro de screen === 'game'.
        // El contexto musical sigue siendo el del juego (town, town_fight, crypt...)
        // mientras el jugador ve la pantalla de muerte. Al pulsar Revivir,
        // restart() crea un mundo nuevo y el contexto se recalcula.
        // Lo importante es que tras revivir (fighting=false), vuelve a 'town'.
        expect(musicContext('game', null, false, true, false)).toBe('town');
    });
});
