import { doc, runTransaction, type Firestore } from "firebase/firestore";
import type { ItemId } from "../core/item.ts";
import { type RecipeId } from "../recipes/recipe.ts";
/** The Firestore calls `linkIngredientToItem` makes, injectable so a test can observe them. */
export type RecipeIngredientLinkDeps = {
    readonly doc: typeof doc;
    readonly runTransaction: typeof runTransaction;
};
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
export declare function linkIngredientToItem(db: Firestore, id: RecipeId, seen: SeenIngredient, itemId: ItemId): Promise<void>;
/** `linkIngredientToItem` with the calls injected; `index.ts` does not export it. */
export declare function linkIngredientToItemWith(deps: RecipeIngredientLinkDeps, db: Firestore, id: RecipeId, seen: SeenIngredient, itemId: ItemId): Promise<void>;
