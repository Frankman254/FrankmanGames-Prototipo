import { describe, it, expect } from 'vitest';

/**
 * JL-30: Contraste WCAG 2.1 en los temas de themes.css.
 *
 * Cada variable de texto (--ink, --ink-dim, --ink-faint, --gold, etc.)
 * debe cumplir al menos 4.5:1 sobre los fondos de panel (--paper-0, --paper-1,
 * --paper-2, --bg, --well) para texto normal, y 3:1 para acentos (texto grande).
 *
 * Los valores se leen del análisis estático de themes.css, verificado por
 * scripts/checkContraste.mjs.
 */

type Rgb = [number, number, number];

function relativeLuminance(r: number, g: number, b: number): number {
	const f = (c: number): number => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(c1: Rgb, c2: Rgb): number {
	const l1 = relativeLuminance(c1[0], c1[1], c1[2]);
	const l2 = relativeLuminance(c2[0], c2[1], c2[2]);
	return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

type ThemeColors = Record<string, Rgb | undefined>;
type ThemesMap = Record<string, ThemeColors>;

// Temas con sus colores corregidos (sincronizado con themes.css).
const themes: ThemesMap = {
	pergamino: {
		ink: [245, 224, 208],
		'ink-dim': [168, 153, 138],
		'ink-faint': [168, 153, 138],
		gold: [245, 184, 61],
		paper0: [45, 35, 32],
		paper1: [45, 35, 32],
		paper2: [28, 20, 18],
		bg: [20, 14, 12],
		well: [23, 16, 16],
		'well-hi': [55, 42, 37],
		bandInk: [255, 255, 255],
	},
	fuego: {
		ink: [246, 228, 216],
		'ink-dim': [207, 168, 152],
		'ink-faint': [168, 130, 116],
		gold: [255, 146, 87],
		'gold-dim': [177, 82, 52],
		paper0: [58, 26, 16],
		paper1: [42, 18, 11],
		paper2: [19, 8, 7],
		bg: [14, 6, 5],
		well: [18, 7, 6],
		'well-hi': [52, 25, 15],
		bandInk: [255, 255, 255],
	},
	agua: {
		ink: [227, 238, 249],
		'ink-dim': [162, 185, 210],
		'ink-faint': [116, 140, 169],
		gold: [102, 191, 255],
		'gold-dim': [54, 115, 162],
		paper0: [21, 36, 59],
		paper1: [15, 26, 45],
		paper2: [8, 17, 30],
		bg: [6, 12, 22],
		well: [7, 14, 25],
		'well-hi': [27, 46, 74],
		bandInk: [255, 255, 255],
	},
	viento: {
		ink: [23, 41, 58],
		'ink-dim': [59, 82, 102],
		'ink-faint': [80, 103, 123],
		gold: [21, 93, 153],
		'gold-dim': [89, 133, 169],
		paper0: [245, 249, 253],
		paper1: [231, 240, 248],
		paper2: [214, 229, 241],
		bg: [228, 239, 248],
		well: [219, 232, 243],
		'well-hi': [250, 252, 255],
		good: [43, 122, 42],
		bad: [179, 53, 42],
		bandInk: [23, 41, 58],
	},
	tierra: {
		ink: [241, 227, 203],
		'ink-dim': [196, 170, 136],
		'ink-faint': [162, 136, 106],
		gold: [227, 164, 67],
		paper0: [48, 32, 15],
		paper1: [34, 23, 11],
		paper2: [21, 14, 7],
		bg: [14, 9, 4],
		well: [18, 12, 5],
		'well-hi': [53, 36, 17],
		bandInk: [255, 255, 255],
	},
	naturaleza: {
		ink: [228, 236, 214],
		'ink-dim': [168, 184, 148],
		'ink-faint': [125, 141, 113],
		gold: [168, 210, 122],
		paper0: [27, 36, 24],
		paper1: [19, 26, 17],
		paper2: [11, 16, 10],
		bg: [7, 11, 6],
		well: [9, 13, 8],
		'well-hi': [31, 42, 27],
		bandInk: [255, 255, 255],
	},
	claro: {
		ink: [42, 33, 22],
		'ink-dim': [92, 76, 53],
		'ink-faint': [101, 84, 59],
		gold: [119, 76, 11],
		'gold-dim': [143, 105, 45],
		paper0: [245, 236, 216],
		paper1: [234, 223, 196],
		paper2: [220, 203, 170],
		bg: [240, 230, 208],
		well: [228, 214, 184],
		'well-hi': [247, 239, 222],
		good: [38, 113, 25],
		bad: [176, 57, 43],
		bandInk: [42, 33, 22],
	},
	contraste: {
		ink: [255, 255, 255],
		'ink-dim': [230, 230, 230],
		'ink-faint': [196, 196, 196],
		gold: [255, 212, 0],
		paper0: [0, 0, 0],
		paper1: [0, 0, 0],
		paper2: [0, 0, 0],
		bg: [0, 0, 0],
		well: [0, 0, 0],
		'well-hi': [28, 28, 28],
		good: [108, 255, 108],
		bad: [255, 107, 107],
		bandInk: [255, 255, 255],
	},
};

// Pares [texto, fondo, ratio mínimo]
const pairs: [string, string, number][] = [
	// Texto principal — 4.5:1
	['ink', 'paper0', 4.5],
	['ink', 'paper1', 4.5],
	['ink', 'paper2', 4.5],
	['ink', 'bg', 4.5],
	['ink', 'well', 4.5],
	['ink', 'well-hi', 4.5],
	// Texto secundario — 4.5:1
	['ink-dim', 'paper0', 4.5],
	['ink-dim', 'paper1', 4.5],
	['ink-dim', 'paper2', 4.5],
	['ink-dim', 'bg', 4.5],
	['ink-dim', 'well', 4.5],
	// Texto tenue — 4.5:1
	['ink-faint', 'paper0', 4.5],
	['ink-faint', 'paper1', 4.5],
	['ink-faint', 'paper2', 4.5],
	['ink-faint', 'bg', 4.5],
	// Acento — 3:1 (texto grande)
	['gold', 'paper0', 3.0],
	['gold', 'paper1', 3.0],
	['gold', 'paper2', 3.0],
	['gold', 'bg', 3.0],
	// gold-dim — 3:1
	['gold-dim', 'paper0', 3.0],
	['gold-dim', 'paper2', 3.0],
	// good/bad — 4.5:1
	['good', 'paper0', 4.5],
	['good', 'paper1', 4.5],
	['bad', 'paper0', 4.5],
	['bad', 'paper1', 4.5],
	// bandInk — 4.5:1
	['bandInk', 'paper0', 4.5],
];

describe('contraste WCAG 2.1 — themes.css', () => {
	for (const [themeName, colors] of Object.entries(themes)) {
		it(`${themeName}: todos los pares cumplen el ratio mínimo`, () => {
			const failures: string[] = [];
			for (const [inkKey, bgKey, minRatio] of pairs) {
				const ink = colors[inkKey] as Rgb | undefined;
				const bg = colors[bgKey] as Rgb | undefined;
				if (!ink || !bg) continue;
				const ratio = contrastRatio(ink, bg);
				if (ratio < minRatio) {
					failures.push(
						`${inkKey} sobre ${bgKey}: ${ratio.toFixed(2)}:1 < ${minRatio}:1`,
					);
				}
			}
			expect(failures, `tema ${themeName}`).toEqual([]);
		});
	}

	it('el tema contraste tiene ratios máximos (blanco sobre negro)', () => {
		const c = themes.contraste!;
		const ratio = contrastRatio(c.ink as Rgb, c.paper0 as Rgb);
		expect(ratio).toBeGreaterThan(20); // 21:1 es el máximo posible
	});

	it('los temas claros (viento, claro) usan bandInk oscuro', () => {
		// bandInk debe ser oscuro en temas claros para leerse sobre paper-0 claro.
		for (const name of ['viento', 'claro']) {
			const c = themes[name]!;
			const bgLum = relativeLuminance(
				(c.paper0 as Rgb)[0],
				(c.paper0 as Rgb)[1],
				(c.paper0 as Rgb)[2],
			);
			const inkLum = relativeLuminance(
				(c.bandInk as Rgb)[0],
				(c.bandInk as Rgb)[1],
				(c.bandInk as Rgb)[2],
			);
			expect(
				inkLum < bgLum,
				`${name}: bandInk debe ser más oscuro que paper-0`,
			).toBe(true);
		}
	});

	it('los temas oscuros conservan bandInk claro', () => {
		for (const name of ['fuego', 'agua', 'tierra', 'naturaleza', 'contraste']) {
			const c = themes[name]!;
			const bgLum = relativeLuminance(
				(c.paper0 as Rgb)[0],
				(c.paper0 as Rgb)[1],
				(c.paper0 as Rgb)[2],
			);
			const inkLum = relativeLuminance(
				(c.bandInk as Rgb)[0],
				(c.bandInk as Rgb)[1],
				(c.bandInk as Rgb)[2],
			);
			expect(
				inkLum > bgLum,
				`${name}: bandInk debe ser más claro que paper-0`,
			).toBe(true);
		}
	});
});
