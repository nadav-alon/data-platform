import { doc, runTransaction } from "firebase/firestore";
import { RECIPES_COLLECTION, ingredientAt, liveRecipeData, recipeSchema, withoutBought, } from "../recipes/recipe.js";
const RECIPE_INGREDIENT_LINK_DEPS = { doc, runTransaction };
/**
 * Links one Unlinked Ingredient of a live Recipe to an Item, clearing its `bought`, which only an
 * Unlinked Ingredient carries. The Ingredient is named by the position and name the caller saw;
 * it throws, writing nothing, when that position no longer holds an Ingredient of that name or when the Ingredient there is already Linked or
 * Assumed. Only the name at the position is compared: a swap of two same-named Ingredients, or an
 * edit that keeps the name, is not detected. Also throws for an unknown or soft-deleted Recipe or a position that is not a
 * non-negative integer. The write is checked by `firestore.rules` as the signed-in Member.
 */
export function linkIngredientToItem(db, id, seen, itemId) {
    return linkIngredientToItemWith(RECIPE_INGREDIENT_LINK_DEPS, db, id, seen, itemId);
}
/** `linkIngredientToItem` with the calls injected; `index.ts` does not export it. */
export async function linkIngredientToItemWith(deps, db, id, seen, itemId) {
    if (!Number.isInteger(seen.position) || seen.position < 0) {
        throw new Error(`Ingredient position must be a non-negative integer, got ${seen.position}`);
    }
    const ref = deps.doc(db, RECIPES_COLLECTION, id);
    await deps.runTransaction(db, async (transaction) => {
        const recipe = recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
        const current = ingredientAt(recipe, id, seen.position);
        if (current.name !== seen.name) {
            throw new Error(`Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is no longer ${JSON.stringify(seen.name)}`);
        }
        if (current.itemId !== undefined || current.assumed === true) {
            throw new Error(`Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is not unlinked`);
        }
        const ingredients = recipeSchema.shape.ingredients.parse(recipe.ingredients.map((existing, index) => index === seen.position ? { ...withoutBought(existing), itemId } : existing));
        transaction.update(ref, { ingredients });
    });
}
