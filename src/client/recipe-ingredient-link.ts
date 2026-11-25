import { deleteField, doc, runTransaction, type Firestore } from "firebase/firestore";
import type { ItemId } from "../core/item.ts";
import {
  BOUGHT_FIELD,
  RECIPES_COLLECTION,
  ingredientAt,
  isUnlinked,
  liveRecipeData,
  recipeObjectSchema,
  recipeSchema,
  type RecipeId,
} from "../recipes/recipe.ts";

/** The Firestore calls `linkIngredientToItem` makes, injectable so a test can observe them. */
export type RecipeIngredientLinkDeps = {
  readonly doc: typeof doc;
  readonly runTransaction: typeof runTransaction;
};

const RECIPE_INGREDIENT_LINK_DEPS: RecipeIngredientLinkDeps = { doc, runTransaction };

/** The Ingredient the caller saw: its 0-based position in the Recipe and the name it had there. */
export type SeenIngredient = {
  readonly position: number;
  readonly name: string;
};

/**
 * Links one Unlinked Ingredient of a live Recipe to an Item, clearing its Bought (`boughtIngredients`)
 * when no other Unlinked Ingredient of that name remains, since only an Unlinked Ingredient carries one. The Ingredient is named by the position and name the caller saw;
 * it throws, writing nothing, when that position no longer holds an Ingredient of that name or when the Ingredient there is already Linked or
 * Assumed. Only the name at the position is compared: a swap of two same-named Ingredients, or an
 * edit that keeps the name, is not detected. Also throws for an unknown or soft-deleted Recipe or a position that is not a
 * non-negative integer. The write is checked by `firestore.rules` as the signed-in Member.
 */
export function linkIngredientToItem(
  db: Firestore,
  id: RecipeId,
  seen: SeenIngredient,
  itemId: ItemId,
): Promise<void> {
  return linkIngredientToItemWith(RECIPE_INGREDIENT_LINK_DEPS, db, id, seen, itemId);
}

/** `linkIngredientToItem` with the calls injected; `index.ts` does not export it. */
export async function linkIngredientToItemWith(
  deps: RecipeIngredientLinkDeps,
  db: Firestore,
  id: RecipeId,
  seen: SeenIngredient,
  itemId: ItemId,
): Promise<void> {
  if (!Number.isInteger(seen.position) || seen.position < 0) {
    throw new Error(`Ingredient position must be a non-negative integer, got ${seen.position}`);
  }
  const ref = deps.doc(db, RECIPES_COLLECTION, id);
  await deps.runTransaction(db, async (transaction) => {
    const recipe = recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
    const current = ingredientAt(recipe, id, seen.position);
    if (current.name !== seen.name) {
      throw new Error(
        `Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is no longer ${JSON.stringify(seen.name)}`,
      );
    }
    if (current.itemId !== undefined || current.assumed === true) {
      throw new Error(`Ingredient ${seen.position} of Recipe ${JSON.stringify(id)} is not unlinked`);
    }
    const ingredients = recipeObjectSchema.shape.ingredients.parse(
      recipe.ingredients.map((existing, index) => (index === seen.position ? { ...existing, itemId } : existing)),
    );
    const stillUnlinked = (name: string) => ingredients.some((i) => i.name === name && isUnlinked(i));
    const boughtBefore = Object.keys(recipe.boughtIngredients ?? {});
    const bought = boughtBefore.filter(stillUnlinked);
    const update: Record<string, unknown> = { ingredients };
    if (bought.length !== boughtBefore.length) {
      update[BOUGHT_FIELD] =
        bought.length === 0 ? deleteField() : Object.fromEntries(bought.map((name) => [name, true]));
    }
    transaction.update(ref, update);
  });
}
