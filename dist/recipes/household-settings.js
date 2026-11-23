import { z } from "zod";
import { shopIdSchema } from "../catalogue/shop.js";
/** The Household's own settings, one doc shared by every Member; a missing doc means none are set. */
export const HOUSEHOLD_SETTINGS_DOC_PATH = "meta/settings";
export const householdSettingsSchema = z.looseObject({
    /**
     * The Shop the Recipe Ingredients a Household wants are bought at (see **Shop for Recipe Ingredients** in CONTEXT.md). Names a Shop of this Household; absent
     * means unset.
     */
    recipeIngredientShopId: shopIdSchema.optional(),
});
