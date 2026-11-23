import { z } from "zod";
import { shopIdSchema } from "../catalogue/shop.ts";

/** The Household's own settings, one doc shared by every Member; a missing doc means none are set. */
export const HOUSEHOLD_SETTINGS_DOC_PATH = "meta/settings";

export const householdSettingsSchema = z.looseObject({
  /**
   * The Shop a Recipe row on the Shopping list belongs to. Names a Shop of this Household; absent
   * means unset.
   */
  recipeIngredientShopId: shopIdSchema.optional(),
});

export type HouseholdSettings = z.infer<typeof householdSettingsSchema>;
