import { describe, it, expect } from 'vitest';
import { valueNoise, fbm, type FbmDef } from '../src/world/noise';

describe('valueNoise', () => {
    it('es determinista con la misma semilla', () => {
        const a = valueNoise(10, 20, 42);
        const b = valueNoise(10, 20, 42);
        expect(a).toBe(b);
    });

    it('cambia con distinta semilla', () => {
        const a = valueNoise(10, 20, 42);
        const b = valueNoise(10, 20, 99);
        expect(a).not.toBe(b);
    });

    it('siempre devuelve un valor en [0, 1)', () => {
        for (let s = 0; s < 100; s++) {
            for (let x = -10; x <= 10; x += 3) {
                for (let y = -10; y <= 10; y += 3) {
                    const v = valueNoise(x, y, s);
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThan(1);
                }
            }
        }
    });

    it('los puntos enteros son estables', () => {
        // Un punto entero tiene fx=fy=0, por lo que solo usa hash2(x0,y0,seed).
        // Repetir la llamada da el mismo valor.
        const v1 = valueNoise(5, 7, 123);
        const v2 = valueNoise(5, 0, 123);
        // Los valores en enteros son distintos para coordenadas distintas.
        expect(v1).not.toBe(v2);
    });

    it('los puntos vecinos son similares (continuidad)', () => {
        // Puntos a 0.01 de distancia deben dar valores muy parecidos gracias a smooth().
        const a = valueNoise(10.0, 20.0, 42);
        const b = valueNoise(10.01, 20.0, 42);
        const c = valueNoise(10.0, 20.01, 42);
        expect(Math.abs(a - b)).toBeLessThan(0.05);
        expect(Math.abs(a - c)).toBeLessThan(0.05);
    });

    it('los puntos lejanos no son correlacionados', () => {
        // Puntos muy separados deben dar valores distintos.
        const a = valueNoise(0, 0, 42);
        const b = valueNoise(100, 100, 42);
        expect(a).not.toBe(b);
    });

    it('coordenadas negativas funcionan', () => {
        const v = valueNoise(-5, -10, 42);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        // Determinista con negativos
        expect(v).toBe(valueNoise(-5, -10, 42));
    });

    it('coordenadas fraccionarias son suaves', () => {
        // Interpolar linealmente entre dos puntos enteros debe dar valores
        // cercanos al ruido interpolado.
        const samples: number[] = [];
        for (let i = 0; i <= 20; i++) {
            samples.push(valueNoise(10 + i * 0.05, 20, 42));
        }
        // La diferencia máxima entre muestras consecutivas es pequeña.
        let maxDelta = 0;
        for (let i = 1; i < samples.length; i++) {
            maxDelta = Math.max(maxDelta, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)));
        }
        expect(maxDelta).toBeLessThan(0.1);
    });

    describe('periódico', () => {
        it('se repite cada `period` unidades en X', () => {
            const period = 16;
            const v0 = valueNoise(3, 5, 42, period);
            const v1 = valueNoise(3 + period, 5, 42, period);
            const v2 = valueNoise(3 + 2 * period, 5, 42, period);
            expect(v0).toBe(v1);
            expect(v1).toBe(v2);
        });

        it('se repite cada `period` unidades en Y', () => {
            const period = 8;
            const v0 = valueNoise(3, 5, 42, period);
            const v1 = valueNoise(3, 5 + period, 42, period);
            expect(v0).toBe(v1);
        });

        it('se repite en coordenadas negativas', () => {
            const period = 10;
            const v0 = valueNoise(3, 5, 42, period);
            const v1 = valueNoise(3 - period, 5, 42, period);
            expect(v0).toBe(v1);
        });

        it('period=0 (por defecto) no es periódico', () => {
            const v0 = valueNoise(3, 5, 42);
            const v1 = valueNoise(19, 5, 42); // 3+16, si fuera periódico con period=16
            // Sin periodicidad, no hay razón para que sean iguales.
            expect(v0).not.toBe(v1);
        });
    });
});

describe('fbm', () => {
    const defaultDef: FbmDef = { scale: 64, octaves: 4, persistence: 0.5 };

    it('es determinista con la misma semilla', () => {
        const a = fbm(100, 200, defaultDef, 42);
        const b = fbm(100, 200, defaultDef, 42);
        expect(a).toBe(b);
    });

    it('cambia con distinta semilla', () => {
        const a = fbm(100, 200, defaultDef, 42);
        const b = fbm(100, 200, defaultDef, 99);
        expect(a).not.toBe(b);
    });

    it('siempre devuelve un valor en [0, 1)', () => {
        for (let s = 0; s < 50; s++) {
            for (let x = 0; x < 200; x += 30) {
                for (let y = 0; y < 200; y += 30) {
                    const v = fbm(x, y, defaultDef, s);
                    expect(v).toBeGreaterThanOrEqual(0);
                    expect(v).toBeLessThan(1);
                }
            }
        }
    });

    it('los puntos vecinos son similares', () => {
        const a = fbm(100, 200, defaultDef, 42);
        const b = fbm(100.5, 200, defaultDef, 42);
        const c = fbm(100, 200.5, defaultDef, 42);
        expect(Math.abs(a - b)).toBeLessThan(0.1);
        expect(Math.abs(a - c)).toBeLessThan(0.1);
    });

    it('más octavas = más detalle (varianza mayor a pequeña escala)', () => {
        // Con más octavas, el ruido varía más a pequeña escala.
        const defSimple: FbmDef = { scale: 64, octaves: 1, persistence: 0.5 };
        const defDetail: FbmDef = { scale: 64, octaves: 6, persistence: 0.5 };

        // Muestrea una línea y compara la varianza entre muestras consecutivas.
        function avgDelta(def: FbmDef) {
            let sum = 0;
            const samples: number[] = [];
            for (let i = 0; i < 40; i++) {
                samples.push(fbm(i * 2, 100, def, 42));
            }
            for (let i = 1; i < samples.length; i++) {
                sum += Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0));
            }
            return sum / (samples.length - 1);
        }

        // Con más octavas, el delta promedio entre muestras cercanas es mayor.
        expect(avgDelta(defDetail)).toBeGreaterThan(avgDelta(defSimple));
    });

    it('persistence controla la amplitud de las octavas', () => {
        // Con persistence=0, solo la primera octava contribuye.
        const defZero: FbmDef = { scale: 64, octaves: 4, persistence: 0 };
        const defOne: FbmDef = { scale: 64, octaves: 1, persistence: 0 };
        // Con persistence=0, fbm con 4 octavas debe dar lo mismo que con 1 octava
        // (las demás tienen amplitud 0).
        const v4 = fbm(100, 200, defZero, 42);
        const v1 = fbm(100, 200, defOne, 42);
        expect(v4).toBeCloseTo(v1, 10);
    });

    it('scale controla la frecuencia', () => {
        // Un scale más pequeño = frecuencia más alta = más variación en la misma distancia.
        const defCoarse: FbmDef = { scale: 256, octaves: 4, persistence: 0.5 };
        const defFine: FbmDef = { scale: 32, octaves: 4, persistence: 0.5 };

        function avgDelta(def: FbmDef) {
            let sum = 0;
            const samples: number[] = [];
            for (let i = 0; i < 40; i++) {
                samples.push(fbm(i * 2, 100, def, 42));
            }
            for (let i = 1; i < samples.length; i++) {
                sum += Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0));
            }
            return sum / (samples.length - 1);
        }

        // Scale más fino → más variación entre muestras consecutivas.
        expect(avgDelta(defFine)).toBeGreaterThan(avgDelta(defCoarse));
    });

    it('coordenadas negativas funcionan', () => {
        const v = fbm(-100, -200, defaultDef, 42);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(v).toBe(fbm(-100, -200, defaultDef, 42));
    });

    describe('periódico', () => {
        it('se repite cada `period` unidades', () => {
            const period = 128;
            const def: FbmDef = { scale: 64, octaves: 4, persistence: 0.5 };
            const v0 = fbm(10, 20, def, 42, period);
            const v1 = fbm(10 + period, 20, def, 42, period);
            const v2 = fbm(10, 20 + period, def, 42, period);
            expect(v0).toBeCloseTo(v1, 10);
            expect(v0).toBeCloseTo(v2, 10);
        });
    });
});
