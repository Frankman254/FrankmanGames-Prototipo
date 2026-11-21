// Auditoría nombre ↔ modelo de criaturas (JL-99).
// Cruza data/rpg/enemies.json (nombres) con data/assets.json (templates → GLB).
// Clasifica las discordancias y escribe la tabla en work/junie-jl-99/.
//
// Ejecución: npx vite-node scripts/audit/nombreModelo.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import assetsJson from '../../data/assets.json';
import enemiesJson from '../../data/rpg/enemies.json';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'work', 'junie-jl-99');
mkdirSync(OUT, { recursive: true });

// --- Tipos ---

interface EnemyEntry {
    template?: string;
    model?: string;
    scale?: number;
}

interface TemplateDef {
    kind?: string;
    file?: string;
    clips?: Record<string, string>;
}

interface EnemyDef {
    name?: string;
    level?: number;
}

interface Mismatch {
    id: string;
    name: string;
    template: string;
    glb: string;
    category: string;
    severity: 'alta' | 'media' | 'baja' | 'ok';
}

// --- Lectura de datos ---

const assets = assetsJson.assets as Record<string, EnemyEntry>;
const templates = assetsJson.templates as Record<string, TemplateDef>;
const enemies = enemiesJson.enemies as Record<string, EnemyDef>;

// Templates genéricos (procedurales) que son fuente de discordancias
const GENERIC_TEMPLATES = new Set(['bestia', 'arquero', 'chaman', 'diablillo', 'personaje']);

// Palabras clave que indican qué tipo de criatura es por nombre
const ANIMAL_KEYWORDS: Record<string, string[]> = {
    'perro': ['sato', 'wolf', 'lobo', 'can', 'cimarrón', 'jauría', 'aullador'],
    'felino': ['jaguar', 'tigre', 'tigrillo', 'gato', 'león', 'onza'],
    'ave': ['águila', 'aguila', 'harpy', 'harpía', 'búho', 'buho', 'quetzal', 'pavo', 'garza', 'ave'],
    'roedor': ['ratón', 'rata', 'ñeque', 'neque', 'agutí', 'roedor'],
    'mono': ['mono', 'titi', 'simio'],
    'insecto': ['mosquito', 'chitra', 'insecto', 'zancudo'],
    'anfibio': ['rana', 'sapo', 'anfibio'],
    'reptil': ['caimán', 'caiman', 'tortuga', 'lagarto', 'serpiente'],
    'crustaceo': ['cangrejo', 'ostra', 'crustáceo'],
    'pez': ['tiburón', 'shark', 'pez', 'sirena'],
    'mamifero_marino': ['calamar', 'squid', 'medusa', 'jelly'],
    'cerdino': ['jabalí', 'jabali', 'saíno', 'pecarí', 'pecari', 'cerdo'],
    'tapir': ['tapir', 'macho de monte'],
    'canino': ['coyote', 'zorro', 'lobo'],
    'humanoide': ['duende', 'goblin', 'trampero', 'curandero', 'brujo', 'bruja', 'chamán', 'capataz', 'recolector', 'vigía', 'hechicero', 'cerbatanero', 'pirata', 'capitán', 'marinero', 'diablo', 'coloso', 'gigante', 'yeti', 'abominable', 'arquero', 'escarchado', 'ventisca', 'fresero', 'francotirador', 'chofer', 'matón', 'sacristán', 'llamador', 'tulivieja', 'bailarín', 'cascabelero', 'diablico'],
    'espíritu': ['alma', 'soul', 'espíritu', 'espanto', 'wraith', 'neblina', 'wisp', 'fantasma', 'ghost', 'brasita', 'ember', 'copo', 'flake', 'gota', 'drizzle', 'copito'],
    'esfera': ['rodante', 'esfera'],
};

// Clasifica una criatura por su nombre
function classifyByName(name: string): string {
    const lower = name.toLowerCase();
    for (const [type, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) return type;
        }
    }
    return 'desconocido';
}

// Qué tipo de criatura espera un template genérico
function expectedTypeForTemplate(template: string): string {
    switch (template) {
        case 'bestia': return 'animal_genérico';
        case 'arquero': return 'humanoide_arquero';
        case 'chaman': return 'humanoide_magista';
        case 'diablillo': return 'criatura_pequeña';
        case 'personaje': return 'humanoide_genérico';
        default: return 'específico';
    }
}

// Evalúa si hay discordancia entre nombre y template
function evaluateMismatch(id: string, name: string, template: string, glb: string): Mismatch {
    const classification = classifyByName(name);
    const templateType = expectedTypeForTemplate(template);

    // Si el template no es genérico, es específico → OK
    if (!GENERIC_TEMPLATES.has(template)) {
        return { id, name, template, glb, category: 'GLB propio', severity: 'ok' };
    }

    // Evaluar compatibilidad
    const isAnimal = ['perro', 'felino', 'roedor', 'mono', 'insecto', 'anfibio', 'reptil', 'crustaceo', 'pez', 'mamifero_marino', 'cerdino', 'tapir', 'canino', 'ave'].includes(classification);
    const isHumanoid = classification === 'humanoide';
    const isSpirit = classification === 'espíritu';
    const isSphere = classification === 'esfera';

    switch (template) {
        case 'bestia': {
            // bestia = animal genérico (bestia.glb)
            if (isAnimal) {
                // Perro con bestia = OK
                if (classification === 'perro') return { id, name, template, glb, category: 'Correcto', severity: 'ok' };
                // Otros animales con bestia = discordancia
                return { id, name, template, glb, category: 'Animal ≠ bestia genérica', severity: 'alta' };
            }
            if (isHumanoid || isSpirit || isSphere) {
                return { id, name, template, glb, category: 'No animal ≠ bestia', severity: 'alta' };
            }
            return { id, name, template, glb, category: 'Desconocido en bestia', severity: 'media' };
        }
        case 'arquero': {
            // arquero = humanoide con arco
            if (isHumanoid) return { id, name, template, glb, category: 'Correcto', severity: 'ok' };
            if (isAnimal) {
                // Ave con arquero = discordancia media
                if (classification === 'ave') return { id, name, template, glb, category: 'Ave ≠ humanoide', severity: 'media' };
                return { id, name, template, glb, category: 'Animal ≠ humanoide', severity: 'alta' };
            }
            if (isSpirit) return { id, name, template, glb, category: 'Espíritu ≈ humanoide', severity: 'baja' };
            return { id, name, template, glb, category: 'No humanoide en arquero', severity: 'media' };
        }
        case 'chaman': {
            // chaman = humanoide magista
            if (isHumanoid) return { id, name, template, glb, category: 'Correcto', severity: 'ok' };
            if (isAnimal) return { id, name, template, glb, category: 'Animal ≠ humanoide', severity: 'alta' };
            return { id, name, template, glb, category: 'Aceptable en chaman', severity: 'baja' };
        }
        case 'diablillo': {
            // diablillo = criatura pequeña genérica
            if (classification === 'diablillo' || classification === 'desconocido') {
                return { id, name, template, glb, category: 'Correcto', severity: 'ok' };
            }
            if (isAnimal) return { id, name, template, glb, category: 'Animal ≠ diablillo', severity: 'media' };
            if (isSpirit) return { id, name, template, glb, category: 'Espíritu ≈ diablillo', severity: 'baja' };
            if (isSphere) return { id, name, template, glb, category: 'Esfera ≠ diablillo', severity: 'media' };
            return { id, name, template, glb, category: 'No diablillo', severity: 'media' };
        }
        case 'personaje': {
            // personaje = humanoide genérico
            if (isHumanoid) return { id, name, template, glb, category: 'Correcto', severity: 'ok' };
            if (isSpirit) return { id, name, template, glb, category: 'Espíritu ≈ humanoide', severity: 'baja' };
            if (isAnimal) return { id, name, template, glb, category: 'Animal ≠ humanoide', severity: 'alta' };
            return { id, name, template, glb, category: 'No humanoide en personaje', severity: 'media' };
        }
        default:
            return { id, name, template, glb, category: 'Template específico', severity: 'ok' };
    }
}

// --- Recorrer todos los enemigos ---

const mismatches: Mismatch[] = [];
const enemyKeys = Object.keys(assets).filter(k => k.startsWith('enemy.'));

for (const key of enemyKeys) {
    const entry = assets[key]!;
    const archId = key.replace('enemy.', '');
    const enemyDef = enemies[archId];
    const name = enemyDef?.name ?? archId;
    const template = entry.template ?? 'sin_template';
    const tmplDef = templates[template];
    const glb = tmplDef?.file ?? 'sin_archivo';

    const result = evaluateMismatch(archId, name, template, glb);
    mismatches.push(result);
}

// --- Conteo por severidad ---

const sevCount = { alta: 0, media: 0, baja: 0, ok: 0 };
for (const m of mismatches) sevCount[m.severity]++;

// --- Generar NOMBRE_MODELO.md ---

let md = '# Auditoría: Nombre vs. Modelo de criaturas\n\n';
md += `Generado: ${new Date().toISOString()} por scripts/audit/nombreModelo.ts\n`;
md += `Fuentes: data/rpg/enemies.json (nombres), data/assets.json (plantillas y modelos)\n\n`;

md += '## Resumen\n\n';
md += `- **${mismatches.length} arquetipos** en total.\n`;
md += `- **${sevCount.alta} discordancias altas**: nombre y modelo son completamente distintos.\n`;
md += `- **${sevCount.media} discordancias medias**: nombre y modelo no coinciden pero son cercanos.\n`;
md += `- **${sevCount.baja} discordancias bajas**: aceptable pero mejorable.\n`;
md += `- **${sevCount.ok} correctos**: nombre y modelo coinciden o son similares.\n\n`;

// Agrupar por template genérico
const byGenericTemplate: Record<string, number> = {};
for (const m of mismatches) {
    if (GENERIC_TEMPLATES.has(m.template)) {
        byGenericTemplate[m.template] = (byGenericTemplate[m.template] || 0) + 1;
    }
}
if (Object.keys(byGenericTemplate).length > 0) {
    md += '### Uso de templates genéricos\n\n';
    md += '| Template | Cantidad |\n|---|---|\n';
    for (const [t, c] of Object.entries(byGenericTemplate).sort((a, b) => b[1] - a[1])) {
        md += `| ${t} | ${c} |\n`;
    }
    md += '\n';
}

// Tabla de discordancias (no-ok)
const nonOk = mismatches.filter(m => m.severity !== 'ok');
if (nonOk.length > 0) {
    md += '## Discordancias (ordenadas por gravedad)\n\n';

    for (const sev of ['alta', 'media', 'baja'] as const) {
        const group = nonOk.filter(m => m.severity === sev);
        if (group.length === 0) continue;
        md += `### ${sev.toUpperCase()} — ${group.length}\n\n`;
        md += '| ID | Nombre | Template | Modelo | Problema |\n';
        md += '|---|---|---|---|---|\n';
        for (const m of group.sort((a, b) => a.id.localeCompare(b.id))) {
            md += `| \`${m.id}\` | ${m.name} | ${m.template} | ${m.glb} | ${m.category} |\n`;
        }
        md += '\n';
    }
}

// Tabla de correctos
const ok = mismatches.filter(m => m.severity === 'ok');
if (ok.length > 0) {
    md += `## Correctos (${ok.length})\n\n`;
    md += '| ID | Nombre | Template | Modelo |\n';
    md += '|---|---|---|---|\n';
    for (const m of ok.sort((a, b) => a.id.localeCompare(b.id))) {
        md += `| \`${m.id}\` | ${m.name} | ${m.template} | ${m.glb} |\n`;
    }
    md += '\n';
}

writeFileSync(path.join(OUT, 'NOMBRE_MODELO.md'), md);

// --- JSON crudo ---

const rawOutput = {
    timestamp: new Date().toISOString(),
    total: mismatches.length,
    bySeverity: sevCount,
    byTemplate: byGenericTemplate,
    mismatches: mismatches.map(m => ({
        id: m.id,
        name: m.name,
        template: m.template,
        glb: m.glb,
        category: m.category,
        severity: m.severity
    }))
};
writeFileSync(path.join(OUT, 'nombre_modelo.json'), JSON.stringify(rawOutput, null, 2));

// --- Resumen en stdout ---

console.log(`JL-99: ${mismatches.length} arquetipos auditados`);
console.log(`  Alta: ${sevCount.alta}, Media: ${sevCount.media}, Baja: ${sevCount.baja}, OK: ${sevCount.ok}`);
console.log(`Evidencia en ${OUT}/`);

// Exportar para pruebas
if (typeof globalThis !== 'undefined') {
    (globalThis as any).__nombreModeloResult = { mismatches, sevCount, byGenericTemplate };
}
