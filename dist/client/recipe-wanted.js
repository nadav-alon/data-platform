import { FieldPath, deleteField, doc, runTransaction, updateDoc, } from "firebase/firestore";
import { BOUGHT_FIELD, RECIPES_COLLECTION, liveRecipeData, recipeSchema } from "../recipes/recipe.js";
const RECIPE_WANTED_DEPS = { doc, runTransaction, deleteField, updateDoc, FieldPath };
/**
 * Sets a live Recipe Wanted, or not Wanted. Setting it not Wanted clears every Bought in the
 * same write. Throws an `Error` for an unknown or soft-deleted Recipe; the write
 * is checked by `firestore.rules` as the signed-in Member, so a non-Member's rejects with
 * `permission-denied`.
 */
export function setRecipeWanted(db, id, wanted) {
    return setRecipeWantedWith(RECIPE_WANTED_DEPS, db, id, wanted);
}
/** `setRecipeWanted` with the calls injected; `index.ts` does not export it. */
export async function setRecipeWantedWith(deps, db, id, wanted) {
    const ref = deps.doc(db, RECIPES_COLLECTION, id);
    await deps.runTransaction(db, async (transaction) => {
        recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
        transaction.update(ref, wanted ? { wanted: true } : { wanted: deps.deleteField(), [BOUGHT_FIELD]: deps.deleteField() });
    });
}
/**
 * Sets or clears an Ingredient's Bought, `name` being the Ingredient's name; a Recipe's Ingredients
 * can be reordered between a snapshot and the tick without moving the mark. It is one
 * field write, not a transaction, so it applies to the local cache at once and, offline, reaches
 * the server when the connection returns; the returned promise settles only once the server has
 * answered. Nothing is read first, so nothing is refused here: `firestore.rules` refuse a Bought on a
 * Recipe that is not Wanted, and on the Recipe's first Ingredient when that one is linked or assumed,
 * rejecting with `permission-denied` once online. They do not check a later Ingredient, nor that `name`
 * names an Ingredient at all, so a stale name can be stored; reading tolerates it.
 */
export function setIngredientBought(db, id, name, bought) {
    return setIngredientBoughtWith(RECIPE_WANTED_DEPS, db, id, name, bought);
}
/** `setIngredientBought` with the calls injected; `index.ts` does not export it. */
export async function setIngredientBoughtWith(deps, db, id, name, bought) {
    if (name.length === 0)
        throw new Error("Ingredient name must not be empty");
    await deps.updateDoc(deps.doc(db, RECIPES_COLLECTION, id), new deps.FieldPath(BOUGHT_FIELD, name), bought ? true : deps.deleteField());
}
