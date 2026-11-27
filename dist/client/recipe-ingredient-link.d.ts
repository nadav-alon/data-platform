import { doc, getDoc, updateDoc, type Firestore } from "firebase/firestore";
import type { ItemId } from "../core/item.ts";
import { type RecipeId } from "../recipes/recipe.ts";
/** The Firestore calls `linkIngredientToItem` makes, injectable so a test can observe them. */
export type RecipeIngredientLinkDeps = {
    readonly doc: typeof doc;
    readonly getDoc: typeof getDoc;
    readonly updateDoc: typeof updateDoc;
};
/** The Ingredient the caller saw: its 0-based position in the Recipe and the name it had there. */
export type SeenIngredient = {
    readonly position: number;
    readonly name: string;
};
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
export declare function linkIngredientToItem(db: Firestore, id: RecipeId, seen: SeenIngredient, itemId: ItemId): Promise<void>;
/** `linkIngredientToItem` with the calls injected; `index.ts` does not export it. */
export declare function linkIngredientToItemWith(deps: RecipeIngredientLinkDeps, db: Firestore, id: RecipeId, seen: SeenIngredient, itemId: ItemId): Promise<void>;
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
export declare function linkIngredientsToItem(db: Firestore, id: RecipeId, seen: readonly SeenIngredient[], itemId: ItemId): Promise<void>;
/** `linkIngredientsToItem` with the calls injected; `index.ts` does not export it. */
export declare function linkIngredientsToItemWith(deps: RecipeIngredientLinkDeps, db: Firestore, id: RecipeId, seen: readonly SeenIngredient[], itemId: ItemId): Promise<void>;
