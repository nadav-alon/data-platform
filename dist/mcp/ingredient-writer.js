import { doc, runTransaction } from "firebase/firestore";
import { z } from "zod";
import { itemIdSchema } from "../core/item.js";
import { RECIPES_COLLECTION, ingredientAt, liveRecipeData, recipeId as toRecipeId, recipeIdSchema, recipeSchema, withoutBought, } from "../recipes/recipe.js";
/**
 * What an Ingredient becomes: linked to an Item, assumed (a staple that names no Item), or
 * unlinked (names neither).
 */
export const ingredientLinkSchema = z.union([
    z.strictObject({ itemId: itemIdSchema }),
    z.strictObject({ assumed: z.literal(true) }),
    z.strictObject({}),
]);
/** Which Ingredient of which Recipe changes, and what it becomes. `ingredient` is its 0-based position in the Recipe. */
export const setIngredientLinkSchema = z.strictObject({
    recipeId: recipeIdSchema,
    ingredient: z.number().int().nonnegative(),
    link: ingredientLinkSchema,
});
/**
 * Links one Ingredient of a live Recipe to an Item, marks it assumed, or unlinks it (an empty
 * `link`), leaving its other fields as stored; linking or assuming also clears `bought`, which only an
 * unlinked Ingredient carries. The input is validated by `setIngredientLinkSchema`
 * (a `link` naming both an Item and Assumed is refused there) and the resulting Ingredients by the
 * Recipe schema's `ingredients` shape before anything is sent; a `ZodError` is thrown when either
 * is refused. An unknown or soft-deleted Recipe, or a position past its last Ingredient, throws an `Error`.
 * The write is then checked by `firestore.rules` as the signed-in Member.
 */
export async function setIngredientLink(db, input) {
    const { recipeId, ingredient: position, link } = setIngredientLinkSchema.parse(input);
    const ref = doc(db, RECIPES_COLLECTION, recipeId);
    await runTransaction(db, async (transaction) => {
        const id = toRecipeId(recipeId);
        const recipe = recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
        const current = ingredientAt(recipe, id, position);
        const { itemId: _itemId, assumed: _assumed, ...unlinked } = current;
        const rest = withoutBought(unlinked);
        const base = "itemId" in link || "assumed" in link ? rest : unlinked;
        const ingredients = recipe.ingredients.map((existing, index) => index === position ? { ...base, ...link } : existing);
        transaction.update(ref, { ingredients: recipeSchema.shape.ingredients.parse(ingredients) });
    });
    return toRecipeId(recipeId);
}
