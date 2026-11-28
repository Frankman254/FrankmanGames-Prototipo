import { describe, expect, it } from 'vitest';
import itemsRaw from '../data/rpg/items.json' with { type: 'json' };
import professionsRaw from '../data/rpg/professions.json' with { type: 'json' };

type RecipeReferences = {
    output: string;
    inputs: Record<string, number>;
};

function missingItemReferences(recipes: Record<string, RecipeReferences>, itemIds: ReadonlySet<string>): string[] {
    const missing: string[] = [];
    for (const [recipeId, recipe] of Object.entries(recipes)) {
        if (!itemIds.has(recipe.output)) missing.push(`${recipeId}: producto "${recipe.output}"`);
        for (const itemId of Object.keys(recipe.inputs)) {
            if (!itemIds.has(itemId)) missing.push(`${recipeId}: ingrediente "${itemId}"`);
        }
    }
    return missing;
}

describe('JL-440: referencias de recetas de oficio', () => {
    it('cada producto e ingrediente de receta existe en items.json', () => {
        const missing = missingItemReferences(professionsRaw.recipes, new Set(Object.keys(itemsRaw.items)));

        expect(missing, `referencias a objetos inexistentes:\n${missing.join('\n')}`).toEqual([]);
    });

    it('detecta productos e ingredientes que no existen', () => {
        const missing = missingItemReferences(
            {
                receta_rota: {
                    output: 'objeto_inexistente',
                    inputs: { material_valido: 1, ingrediente_inexistente: 2 },
                },
            },
            new Set(['material_valido']),
        );

        expect(missing).toEqual([
            'receta_rota: producto "objeto_inexistente"',
            'receta_rota: ingrediente "ingrediente_inexistente"',
        ]);
    });
});
