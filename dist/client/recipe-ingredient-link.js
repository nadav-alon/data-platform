import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { BOUGHT_FIELD, RECIPES_COLLECTION, ingredientAt, isUnlinked, liveRecipeData, recipeObjectSchema, recipeSchema, } from "../recipes/recipe.js";
const RECIPE_INGREDIENT_LINK_DEPS = { doc, getDoc, updateDoc };
/**
 * Links one Unlinked Ingredient of a live Recipe to an Item, dropping its Bought
 * (`boughtIngredients`) when no other Unlinked Ingredient of that name remains, since only an
 * Unlinked Ingredient carries one. The Ingredient is named by the position and name the caller saw;
 * it throws, writing nothing, when that position no longer holds an Ingredient of that name or when
 * the Ingredient there is already Linked or Assumed. Only the name at the position is compared: a
 * swap of two same-named Ingredients, or an edit that keeps the name, is not detected. Also throws
 * for an unknown or soft-deleted Recipe or a position that is not a non-negative integer.
 *
 * It reads the Recipe (the cache when offline), then writes the Ingredients in one field write, not
 * a transaction, so the write applies to the local cache at once and, offline, reaches the server
 * when the connection returns; the returned promise settles only once the server has answered, so
 * do not wait on it to update the screen. Offline, the read rejects with code `unavailable` when the
 * Recipe is not in the local cache, and nothing is queued. The checks above are made against what
 * was read, so an edit that landed in between is overwritten, and a Recipe soft-deleted in between
 * is still linked. `firestore.rules` check the write as the signed-in Member, rejecting with
 * `permission-denied` once online; they cannot repeat the position and name check.
 */
export function linkIngredientToItem(db, id, seen, itemId) {
    return linkIngredientToItemWith(RECIPE_INGREDIENT_LINK_DEPS, db, id, seen, itemId);
}
/** `linkIngredientToItem` with the calls injected; `index.ts` does not export it. */
export async function linkIngredientToItemWith(deps, db, id, seen, itemId) {
    if (!Number.isInteger(seen.position) || seen.position < 0) {
        throw new Error(`Ingredient position must be a non-negative integer, got ${seen.position}`);
    }
    const { ref, recipe } = await readLiveRecipe(deps, db, id);
    const current = ingredientAt(recipe, id, seen.position);
    if (current.name !== seen.name) {
        throw new Error(`Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is no longer ${JSON.stringify(seen.name)}`);
    }
    if (!isUnlinked(current)) {
        throw new Error(`Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is not unlinked`);
    }
    await deps.updateDoc(ref, linkUpdate(recipe, [seen.position], itemId));
}
/** The reference to a Recipe and its live data; throws for an unknown or soft-deleted Recipe. */
async function readLiveRecipe(deps, db, id) {
    const ref = deps.doc(db, RECIPES_COLLECTION, id);
    const recipe = recipeSchema.parse(liveRecipeData(await deps.getDoc(ref), id));
    return { ref, recipe };
}
/**
 * The field write that links the Ingredients at `positions` to `itemId`, dropping the Bought
 * (`boughtIngredients`) of every name that no longer has an Unlinked Ingredient.
 */
function linkUpdate(recipe, positions, itemId) {
    const ingredients = recipeObjectSchema.shape.ingredients.parse(recipe.ingredients.map((existing, index) => (positions.includes(index) ? { ...existing, itemId } : existing)));
    const stillUnlinked = (name) => ingredients.some((i) => i.name === name && isUnlinked(i));
    const boughtBefore = Object.keys(recipe.boughtIngredients ?? {});
    const bought = boughtBefore.filter(stillUnlinked);
    const update = { ingredients };
    if (bought.length !== boughtBefore.length) {
        update[BOUGHT_FIELD] =
            bought.length === 0 ? deleteField() : Object.fromEntries(bought.map((name) => [name, true]));
    }
    return update;
}
/**
 * Links several Unlinked Ingredients of one live Recipe to an Item in a single field write, all or
 * nothing, with the Bought of each name dropped as `linkIngredientToItem` does. Each Ingredient is
 * named by the position and name the caller saw. It throws, writing nothing, naming every stale
 * position: one that no longer holds an Ingredient of that name, or whose Ingredient is already
 * Linked or Assumed. It also throws for a position repeated or not a non-negative integer, and for
 * an unknown or soft-deleted Recipe. An empty list writes nothing. Only the name at each position
 * is compared: a swap of two same-named Ingredients, or an edit that keeps the name, is not
 * detected, which matters here because same-named Ingredients are what it is for. Reading, offline
 * behaviour and the checks the write cannot make are those of `linkIngredientToItem`.
 */
export function linkIngredientsToItem(db, id, seen, itemId) {
    return linkIngredientsToItemWith(RECIPE_INGREDIENT_LINK_DEPS, db, id, seen, itemId);
}
/** `linkIngredientsToItem` with the calls injected; `index.ts` does not export it. */
export async function linkIngredientsToItemWith(deps, db, id, seen, itemId) {
    const positions = seen.map((s) => s.position);
    for (const position of positions) {
        if (!Number.isInteger(position) || position < 0) {
            throw new Error(`Ingredient position must be a non-negative integer, got ${position}`);
        }
    }
    if (new Set(positions).size !== positions.length) {
        throw new Error(`Ingredient positions must be distinct, got ${positions.join(", ")}`);
    }
    if (seen.length === 0)
        return;
    const { ref, recipe } = await readLiveRecipe(deps, db, id);
    const stale = seen.filter((s) => {
        const current = recipe.ingredients[s.position];
        return current === undefined || current.name !== s.name || !isUnlinked(current);
    });
    if (stale.length > 0) {
        throw new Error(`Recipe ${JSON.stringify(id)} has stale Ingredient positions: ${stale.map((s) => s.position).join(", ")}`);
    }
    await deps.updateDoc(ref, linkUpdate(recipe, positions, itemId));
}
