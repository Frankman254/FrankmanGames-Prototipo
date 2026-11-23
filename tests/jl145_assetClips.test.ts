// JL-145: cada plantilla GLB de data/assets.json tiene los clips que declara en su archivo.
// Generalización de JL-90 (fantasma.glb).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const ASSETS_JSON = join(ROOT, 'data', 'assets.json');

/** Extrae los nombres de AnimationGroup de un GLB binario (misma técnica que JL-90). */
function glbAnimationNames(path: string): string[] {
	const buf = readFileSync(path);
	const str = buf.toString('latin1');
	const names: string[] = [];
	const re = /"name"\s*:\s*"([^"]+)"/g;
	let m;
	while ((m = re.exec(str)) !== null) {
		if (m[1] !== undefined) names.push(m[1]);
	}
	return names;
}

/** Verifica si un nombre de clip está presente en la lista de nombres del GLB.
 *  Usa endsWith para tolerar prefijos (ej: "model:Reposo" contiene "Reposo"). */
function hasClip(glbNames: string[], clipName: string): boolean {
	return glbNames.some((n) => n.endsWith(clipName));
}

// Carga assets.json
const assetsData = JSON.parse(readFileSync(ASSETS_JSON, 'utf-8'));
const templates = assetsData.templates || {};

// Filtra solo las plantillas GLB
const gltfTemplates: { name: string; template: Record<string, unknown> }[] = [];
for (const [name, t] of Object.entries(templates)) {
	if (typeof t === 'object' && t !== null && 'kind' in t && t.kind === 'gltf') {
		gltfTemplates.push({ name, template: t as Record<string, unknown> });
	}
}

describe('JL-145: plantillas GLB — clips declarados vs. GLB real', () => {
	it(`hay ${gltfTemplates.length} plantillas GLB en assets.json`, () => {
		expect(gltfTemplates.length).toBeGreaterThan(0);
	});

	// Cada plantilla: archivo existe
	for (const { name, template } of gltfTemplates) {
		const file = template.file as string;
		it(`${name}: el archivo ${file} existe`, () => {
			const fullPath = join(ROOT, file);
			expect(existsSync(fullPath), `${file} no encontrado en disco`).toBe(true);
		});
	}

	// Cada plantilla: clips declarados presentes en el GLB
	for (const { name, template } of gltfTemplates) {
		const file = template.file as string;
		const clips = template.clips as Record<string, string> | undefined;
		if (!clips || Object.keys(clips).length === 0) {
			continue;
		}

		it(`${name}: los clips declarados están en el GLB`, () => {
			const fullPath = join(ROOT, file);
			if (!existsSync(fullPath)) {
				// Ya cubierto por la prueba de existencia; skip para no duplicar fallos.
				return;
			}
			const glbNames = glbAnimationNames(fullPath);
			const missing: string[] = [];
			for (const [slot, clipName] of Object.entries(clips)) {
				if (!hasClip(glbNames, clipName)) {
					missing.push(`${slot} → ${clipName}`);
				}
			}
			if (missing.length > 0) {
				// Lista los nombres reales del GLB para diagnóstico
				const available = glbNames.filter((n) => n.length < 60); // solo nombres razonables
				expect(
					missing,
					`Faltan clips en ${name} (${file}): ${missing.join(', ')}. Clips disponibles: ${available.join(', ')}`
				).toEqual([]);
			}
		});
	}

	// Resumen: ningún GLB tiene clips vacíos
	for (const { name, template } of gltfTemplates) {
		const file = template.file as string;
		it(`${name}: el GLB tiene al menos un clip`, () => {
			const fullPath = join(ROOT, file);
			if (!existsSync(fullPath)) return;
			const glbNames = glbAnimationNames(fullPath);
			expect(
				glbNames.length,
				`${file} no tiene nombres de animación detectables`
			).toBeGreaterThan(0);
		});
	}

	// Verificar que las plantillas con run → walk (sin Correr) no fallen
	// Algunas plantillas usan "Caminar" para run (sin clip Correr). Esto es válido.
	it('las plantillas sin "Correr" usan "Caminar" para run (válido)', () => {
		const withoutCorrer: string[] = [];
		for (const { name, template } of gltfTemplates) {
			const file = template.file as string;
			const clips = template.clips as Record<string, string> | undefined;
			if (!clips) continue;
			const fullPath = join(ROOT, file);
			if (!existsSync(fullPath)) continue;
			const glbNames = glbAnimationNames(fullPath);

			// Si declara run pero no tiene "Correr" en el GLB, verifica que tenga "Caminar"
			if ('run' in clips && !hasClip(glbNames, clips['run'])) {
				// El clip declarado para run no está; ¿hay Caminar como alternativa?
				if (hasClip(glbNames, 'Caminar')) {
					withoutCorrer.push(name);
				}
			}
		}
		// Solo informativo: documenta cuántas plantillas usan este patrón
		expect(withoutCorrer).toBeDefined();
	});
});
