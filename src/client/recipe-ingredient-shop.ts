import {
  doc,
  getDoc,
  onSnapshot,
  deleteField,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { isLive } from "../core/deleted-at.ts";
import { SHOPS_COLLECTION, type ShopId } from "../catalogue/shop.ts";
import {
  HOUSEHOLD_SETTINGS_DOC_PATH,
  householdSettingsSchema,
} from "../recipes/household-settings.ts";

/** Thrown by `setRecipeIngredientShop` for a Shop that is not a live Shop of this Household. */
export class UnknownShopError extends Error {
  readonly shopId: ShopId;

  constructor(shopId: ShopId) {
    super(`No live Shop ${JSON.stringify(shopId)} in this Household`);
    this.name = "UnknownShopError";
    this.shopId = shopId;
  }
}

/**
 * Calls `onChange` with the Household's Shop for Recipe Ingredients now and on every change:
 * `undefined` while none is set, when the stored settings do not parse, or when the Shop it names is
 * no longer live (the Shop does not count the setting as a reference, so it can be soft-deleted).
 * Returns the unsubscribe.
 */
export function watchRecipeIngredientShop(
  db: Firestore,
  onChange: (shopId: ShopId | undefined) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let stopShop = () => {};
  const stopSettings = onSnapshot(
    doc(db, HOUSEHOLD_SETTINGS_DOC_PATH),
    (snapshot) => {
      stopShop();
      stopShop = () => {};
      const parsed = householdSettingsSchema.safeParse(snapshot.data() ?? {});
      const named = parsed.success ? parsed.data.recipeIngredientShopId : undefined;
      if (named === undefined) {
        onChange(undefined);
        return;
      }
      stopShop = onSnapshot(
        doc(db, SHOPS_COLLECTION, named),
        (shop) => onChange(shop.exists() && isLive(shop.data()) ? named : undefined),
        onError,
      );
    },
    onError,
  );
  return () => {
    stopSettings();
    stopShop();
  };
}

/**
 * Sets the Shop for Recipe Ingredients, or clears it with `undefined`. A Shop that is missing from
 * the Household or soft-deleted rejects with `UnknownShopError`, before anything is written; the
 * rules refuse it too.
 */
export async function setRecipeIngredientShop(
  db: Firestore,
  shopId: ShopId | undefined,
): Promise<void> {
  if (shopId !== undefined) {
    const shop = await getDoc(doc(db, SHOPS_COLLECTION, shopId));
    if (!shop.exists() || !isLive(shop.data())) throw new UnknownShopError(shopId);
  }
  await setDoc(
    doc(db, HOUSEHOLD_SETTINGS_DOC_PATH),
    { recipeIngredientShopId: shopId === undefined ? deleteField() : shopId },
    { merge: true },
  );
}
