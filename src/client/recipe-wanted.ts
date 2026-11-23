import { deleteField, doc, runTransaction, type Firestore } from "firebase/firestore";
import { RECIPES_COLLECTION, recipeSchema, type RecipeId } from "../recipes/recipe.ts";

/** The Firestore calls the Wanted functions make, injectable so a test can observe them. */
export type RecipeWantedDeps = {
  readonly doc: typeof doc;
  readonly runTransaction: typeof runTransaction;
  readonly deleteField: typeof deleteField;
};

const RECIPE_WANTED_DEPS: RecipeWantedDeps = { doc, runTransaction, deleteField };

/**
 * Sets a live Recipe Wanted, or not Wanted. Setting it not Wanted clears `bought` from every
 * Ingredient in the same write. Throws an `Error` for an unknown or soft-deleted Recipe; the write
 * is checked by `firestore.rules` as the signed-in Member, so a non-Member's rejects with
 * `permission-denied`.
 */
export function setRecipeWanted(db: Firestore, id: RecipeId, wanted: boolean): Promise<void> {
  return setRecipeWantedWith(RECIPE_WANTED_DEPS, db, id, wanted);
}

/** `setRecipeWanted` with the calls injected; `index.ts` does not export it. */
export async function setRecipeWantedWith(
  deps: RecipeWantedDeps,
  db: Firestore,
  id: RecipeId,
  wanted: boolean,
): Promise<void> {
  const ref = deps.doc(db, RECIPES_COLLECTION, id);
  await deps.runTransaction(db, async (transaction) => {
    const recipe = recipeSchema.parse(liveData(await transaction.get(ref), id));
    if (wanted) {
      transaction.update(ref, { wanted: true });
      return;
    }
    const ingredients = recipe.ingredients.map(({ bought: _bought, ...rest }) => rest);
    transaction.update(ref, { wanted: deps.deleteField(), ingredients });
  });
}

/**
 * Sets or clears one Ingredient's `bought`, `ingredient` being its 0-based position in the Recipe.
 * Throws an `Error` for an unknown or soft-deleted Recipe, a Recipe that is not Wanted, a position
 * past its last Ingredient, or an Ingredient that is Linked or Assumed. The write is checked by
 * `firestore.rules` as the signed-in Member.
 */
export function setIngredientBought(
  db: Firestore,
  id: RecipeId,
  ingredient: number,
  bought: boolean,
): Promise<void> {
  return setIngredientBoughtWith(RECIPE_WANTED_DEPS, db, id, ingredient, bought);
}

/** `setIngredientBought` with the calls injected; `index.ts` does not export it. */
export async function setIngredientBoughtWith(
  deps: RecipeWantedDeps,
  db: Firestore,
  id: RecipeId,
  position: number,
  bought: boolean,
): Promise<void> {
  const ref = deps.doc(db, RECIPES_COLLECTION, id);
  await deps.runTransaction(db, async (transaction) => {
    const recipe = recipeSchema.parse(liveData(await transaction.get(ref), id));
    if (recipe.wanted !== true) {
      throw new Error(`Recipe ${JSON.stringify(id)} is not Wanted, so nothing in it can be bought`);
    }
    const current = recipe.ingredients[position];
    if (current === undefined) {
      throw new Error(`Recipe ${JSON.stringify(id)} has no Ingredient ${position}`);
    }
    if (current.itemId !== undefined || current.assumed === true) {
      throw new Error(`Ingredient ${position} of Recipe ${JSON.stringify(id)} is not Unlinked`);
    }
    const { bought: _bought, ...rest } = current;
    const ingredients = recipe.ingredients.map((existing, index) =>
      index === position ? (bought ? { ...rest, bought: true as const } : rest) : existing,
    );
    transaction.update(ref, { ingredients });
  });
}

/** The data of a live Recipe's snapshot; throws when there is none. */
function liveData(snapshot: { data(): unknown }, id: RecipeId): unknown {
  const data = snapshot.data() as { deletedAt?: unknown } | undefined;
  if (data === undefined || data.deletedAt !== undefined) {
    throw new Error(`No live Recipe ${JSON.stringify(id)}`);
  }
  return data;
}
