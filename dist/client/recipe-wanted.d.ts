import { FieldPath, deleteField, doc, runTransaction, updateDoc, type Firestore } from "firebase/firestore";
import { type RecipeId } from "../recipes/recipe.ts";
/** The Firestore calls the Wanted functions make, injectable so a test can observe them. */
export type RecipeWantedDeps = {
    readonly doc: typeof doc;
    readonly runTransaction: typeof runTransaction;
    readonly deleteField: typeof deleteField;
    readonly updateDoc: typeof updateDoc;
    readonly FieldPath: typeof FieldPath;
};
/**
 * Sets a live Recipe Wanted, or not Wanted. Setting it not Wanted clears every Bought in the
 * same write. Throws an `Error` for an unknown or soft-deleted Recipe; the write
 * is checked by `firestore.rules` as the signed-in Member, so a non-Member's rejects with
 * `permission-denied`.
 */
export declare function setRecipeWanted(db: Firestore, id: RecipeId, wanted: boolean): Promise<void>;
/** `setRecipeWanted` with the calls injected; `index.ts` does not export it. */
export declare function setRecipeWantedWith(deps: RecipeWantedDeps, db: Firestore, id: RecipeId, wanted: boolean): Promise<void>;
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
export declare function setIngredientBought(db: Firestore, id: RecipeId, name: string, bought: boolean): Promise<void>;
/** `setIngredientBought` with the calls injected; `index.ts` does not export it. */
export declare function setIngredientBoughtWith(deps: RecipeWantedDeps, db: Firestore, id: RecipeId, name: string, bought: boolean): Promise<void>;
