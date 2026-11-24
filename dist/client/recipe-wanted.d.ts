import { deleteField, doc, runTransaction, type Firestore } from "firebase/firestore";
import { type RecipeId } from "../recipes/recipe.ts";
/** The Firestore calls the Wanted functions make, injectable so a test can observe them. */
export type RecipeWantedDeps = {
    readonly doc: typeof doc;
    readonly runTransaction: typeof runTransaction;
    readonly deleteField: typeof deleteField;
};
/**
 * Sets a live Recipe Wanted, or not Wanted. Setting it not Wanted clears `bought` from every
 * Ingredient in the same write. Throws an `Error` for an unknown or soft-deleted Recipe; the write
 * is checked by `firestore.rules` as the signed-in Member, so a non-Member's rejects with
 * `permission-denied`.
 */
export declare function setRecipeWanted(db: Firestore, id: RecipeId, wanted: boolean): Promise<void>;
/** `setRecipeWanted` with the calls injected; `index.ts` does not export it. */
export declare function setRecipeWantedWith(deps: RecipeWantedDeps, db: Firestore, id: RecipeId, wanted: boolean): Promise<void>;
/**
 * Sets or clears one Ingredient's `bought`, `position` being its 0-based position in the Recipe.
 * Throws an `Error` for an unknown or soft-deleted Recipe, a Recipe that is not Wanted, a position
 * that is not a non-negative integer or is past its last Ingredient, or an Ingredient that is
 * linked to an Item or assumed. The write is checked by
 * `firestore.rules` as the signed-in Member.
 */
export declare function setIngredientBought(db: Firestore, id: RecipeId, position: number, bought: boolean): Promise<void>;
/** `setIngredientBought` with the calls injected; `index.ts` does not export it. */
export declare function setIngredientBoughtWith(deps: RecipeWantedDeps, db: Firestore, id: RecipeId, position: number, bought: boolean): Promise<void>;
