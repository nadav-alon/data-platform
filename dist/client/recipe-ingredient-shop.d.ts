import { type Firestore, type Unsubscribe } from "firebase/firestore";
import { type ShopId } from "../catalogue/shop.ts";
/** Thrown by `setRecipeIngredientShop` for a Shop that is not a live Shop of this Household. */
export declare class UnknownShopError extends Error {
    readonly shopId: ShopId;
    constructor(shopId: ShopId);
}
/**
 * Calls `onChange` with the Household's Shop for Recipe Ingredients now and on every change:
 * `undefined` while none is set, when the stored settings do not parse, or when the Shop it names is
 * no longer live (the Shop does not count the setting as a reference, so it can be soft-deleted).
 * Returns the unsubscribe.
 */
export declare function watchRecipeIngredientShop(db: Firestore, onChange: (shopId: ShopId | undefined) => void, onError?: (error: Error) => void): Unsubscribe;
/**
 * Sets the Shop for Recipe Ingredients, or clears it with `undefined`. A Shop that is missing from
 * the Household or soft-deleted rejects with `UnknownShopError`, before anything is written; the
 * rules refuse it too.
 */
export declare function setRecipeIngredientShop(db: Firestore, shopId: ShopId | undefined): Promise<void>;
