import { describe, expect, it } from 'vitest';
import { setLanguage, tr } from '../src/i18n';
import { startupErrorDetails, startupErrorLanguage } from '../src/ui/startupError';

describe('diagnóstico de arranque', () => {
    it('conserva el archivo opcional que falta en el mensaje visible', () => {
        expect(startupErrorDetails(new Error('No se encontró el archivo opcional data/weather.json.'))).toBe(
            'No se encontró el archivo opcional data/weather.json.',
        );
    });

    it('puede mostrar también rechazos que no sean instancias de Error', () => {
        expect(startupErrorDetails('fallo al iniciar')).toBe('fallo al iniciar');
    });

    it('usa las traducciones del idioma guardado', () => {
        setLanguage(startupErrorLanguage('{"language":"en"}'));
        try {
            expect(tr('No se pudo iniciar el juego')).toBe('The game could not start');
            expect(tr('Revisa que los archivos de data/ estén completos y vuelve a abrir el juego.')).toBe(
                'Check that the files in data/ are complete, then reopen the game.',
            );
            expect(tr('Detalle del error')).toBe('Error details');
        } finally {
            setLanguage('es');
        }
    });

    it('vuelve al español si no puede leer la preferencia', () => {
        expect(startupErrorLanguage(null)).toBe('es');
        expect(startupErrorLanguage('{')).toBe('es');
    });
});