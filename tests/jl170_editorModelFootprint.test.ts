// JL-170: getModelFootprint resuelve la huella de un modelo GLB desde data/ambient.json.
import { describe, it, expect } from 'vitest';
import { getModelFootprint } from '../src/editor/doc';

describe('getModelFootprint', () => {
    it('castillo usa huella fija 10×10', () => {
        const fp = getModelFootprint('castillo');
        expect(fp).toEqual({ w: 10, d: 10 });
    });

    it('iglesia usa huella fija 10×10', () => {
        const fp = getModelFootprint('iglesia');
        expect(fp).toEqual({ w: 10, d: 10 });
    });

    it('utileria toma la huella máxima de sus piezas en ambient.json', () => {
        // utileria tiene: prop_banco (1.9×0.52), prop_cajon (1.02×1.05),
        // prop_barril (1.02×0.99), prop_fogata (1.47×1.33)
        // Máximo: w=1.9, d=1.33
        const fp = getModelFootprint('utileria');
        expect(fp.w).toBeCloseTo(1.9);
        expect(fp.d).toBeCloseTo(1.33);
    });

    it('naturaleza_modular toma la huella máxima de sus piezas', () => {
        // natural_tronco_caido (2.37×0.63), natural_roca_alta (0.86×0.72),
        // natural_roca_baja (1.29×0.92), natural_helecho_ancho (1.91×1.95),
        // natural_palma_joven (2.79×2.34)
        // Máximo: w=2.79, d=2.34
        const fp = getModelFootprint('naturaleza_modular');
        expect(fp.w).toBeCloseTo(2.79);
        expect(fp.d).toBeCloseTo(2.34);
    });

    it('escenografia_regional toma la huella máxima de sus piezas', () => {
        // escena_amarradero (0.898×0.32), escena_baliza_costera (1.1×1.1),
        // escena_poste_direcciones (1.64×0.195)
        // Máximo: w=1.64, d=1.1
        const fp = getModelFootprint('escenografia_regional');
        expect(fp.w).toBeCloseTo(1.64);
        expect(fp.d).toBeCloseTo(1.1);
    });

    it('simbolos_istmo toma la huella máxima de sus piezas', () => {
        // simbolo_estatua_arpia (2.345×1.37) es la más ancha
        // simbolo_vestido_festivo (1.72×1.514) es la más profunda
        const fp = getModelFootprint('simbolos_istmo');
        expect(fp.w).toBeCloseTo(2.345);
        expect(fp.d).toBeCloseTo(1.514);
    });

    it('detalle_suelo toma la huella máxima de sus piezas', () => {
        // hojarasca_dispersa (0.76×0.68) es la más ancha
        // madera_arrastre_larga (0.6×0.2) no es la más grande
        // raices_serpenteantes (0.62×0.41)
        // Máximo w: hojarasca_dispersa 0.76, máximo d: hojarasca_dispersa 0.68
        const fp = getModelFootprint('detalle_suelo');
        expect(fp.w).toBeGreaterThan(0);
        expect(fp.d).toBeGreaterThan(0);
    });

    it('caminos_rurales toma la huella máxima de sus piezas', () => {
        // camino_cerca_4m (4×0.11) es la más ancha
        // camino_puente_tablas_4m (4×0.94) comparte w=4
        const fp = getModelFootprint('caminos_rurales');
        expect(fp.w).toBeCloseTo(4);
        expect(fp.d).toBeGreaterThan(0);
    });

    it('costa_modular toma la huella máxima de sus piezas', () => {
        const fp = getModelFootprint('costa_modular');
        expect(fp.w).toBeGreaterThan(0);
        expect(fp.d).toBeGreaterThan(0);
    });

    it('naturaleza_suelo toma la huella máxima de sus piezas', () => {
        // roca_plana_grande (2.42×1.79) es la más ancha y profunda
        const fp = getModelFootprint('naturaleza_suelo');
        expect(fp.w).toBeCloseTo(2.42);
        expect(fp.d).toBeCloseTo(1.79);
    });

    it('modelo desconocido usa huella de respaldo 3×3', () => {
        const fp = getModelFootprint('modelo_que_no_existe');
        expect(fp).toEqual({ w: 3, d: 3 });
    });

    it('personaje (GLB sin piezas en ambient.json) usa huella de respaldo 3×3', () => {
        const fp = getModelFootprint('personaje');
        expect(fp).toEqual({ w: 3, d: 3 });
    });

    it('equipo (GLB sin piezas en ambient.json) usa huella de respaldo 3×3', () => {
        const fp = getModelFootprint('equipo');
        expect(fp).toEqual({ w: 3, d: 3 });
    });
});
