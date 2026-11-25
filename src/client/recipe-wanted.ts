import {
  FieldPath,
  deleteField,
  doc,
  runTransaction,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { BOUGHT_FIELD, RECIPES_COLLECTION, liveRecipeData, recipeSchema, type RecipeId } from "../recipes/recipe.ts";

/** The Firestore calls the Wanted functions make, injectable so a test can observe them. */
export type RecipeWantedDeps = {
  readonly doc: typeof doc;
  readonly runTransaction: typeof runTransaction;
  readonly deleteField: typeof deleteField;
  readonly updateDoc: typeof updateDoc;
  readonly FieldPath: typeof FieldPath;
};

const RECIPE_WANTED_DEPS: RecipeWantedDeps = { doc, runTransaction, deleteField, updateDoc, FieldPath };

/**
 * Sets a live Recipe Wanted, or not Wanted. Setting it not Wanted clears every Bought in the
 * same write. Throws an `Error` for an unknown or soft-deleted Recipe; the write
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
    recipeSchema.parse(liveRecipeData(await transaction.get(ref), id));
    transaction.update(
      ref,
      wanted ? { wanted: true } : { wanted: deps.deleteField(), [BOUGHT_FIELD]: deps.deleteField() },
    );
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
export function setIngredientBought(
  db: Firestore,
  id: RecipeId,
  name: string,
  bought: boolean,
): Promise<void> {
  return setIngredientBoughtWith(RECIPE_WANTED_DEPS, db, id, name, bought);
}

/** `setIngredientBought` with the calls injected; `index.ts` does not export it. */
export async function setIngredientBoughtWith(
  deps: RecipeWantedDeps,
  db: Firestore,
  id: RecipeId,
  name: string,
  bought: boolean,
): Promise<void> {
  if (name.length === 0) throw new Error("Ingredient name must not be empty");
  await deps.updateDoc(
    deps.doc(db, RECIPES_COLLECTION, id),
    new deps.FieldPath(BOUGHT_FIELD, name),
    bought ? true : deps.deleteField(),
  );
}
