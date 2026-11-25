import { describe, expect, it } from 'vitest';
import { cryptStairDestination } from '../src/scenes/cryptSceneLogic';

describe('cryptStairDestination', () => {
    it('baja al piso siguiente y llega desde arriba', () => {
        expect(cryptStairDestination(0, 'down')).toEqual({ kind: 'floor', index: 1, from: 'above' });
    });

    it('baja desde un piso profundo y llega desde arriba', () => {
        expect(cryptStairDestination(47, 'down')).toEqual({ kind: 'floor', index: 48, from: 'above' });
    });

    it('sale a la superficie al subir desde el primer piso', () => {
        expect(cryptStairDestination(0, 'up')).toEqual({ kind: 'surface' });
    });

    it('sube al piso anterior y llega desde abajo', () => {
        expect(cryptStairDestination(48, 'up')).toEqual({ kind: 'floor', index: 47, from: 'below' });
    });
});
