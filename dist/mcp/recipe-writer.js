import { addDoc, collection } from "firebase/firestore";
import { z } from "zod";
import { RECIPES_COLLECTION, recipeId, recipeSchema } from "../recipes/recipe.js";
/**
 * What a caller supplies to add a Recipe: a live Recipe, so never a `deletedAt`, and no key the
 * schema does not name (the stored Recipe schema is loose; this input is strict).
 */
export const newRecipeSchema = recipeSchema.omit({ deletedAt: true }).strict();
/**
 * Adds a live Recipe with its Ingredients and returns its id. The input is validated by the
 * Recipe zod schema before anything is sent, and throws a `ZodError` when it is refused; the write
 * is then checked by `firestore.rules` as the signed-in Member, so a non-Member's write rejects
 * with Firestore's `permission-denied`.
 */
export async function addRecipe(db, input) {
    const recipe = newRecipeSchema.parse(input);
    const created = await addDoc(collection(db, RECIPES_COLLECTION), recipe);
    return recipeId(created.id);
}
