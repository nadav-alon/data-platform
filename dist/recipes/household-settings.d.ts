import { z } from "zod";
/** The Household's own settings, one doc shared by every Member; a missing doc means none are set. */
export declare const HOUSEHOLD_SETTINGS_DOC_PATH = "meta/settings";
export declare const householdSettingsSchema: z.ZodObject<{
    recipeIngredientShopId: z.ZodOptional<z.ZodString & z.ZodType<import("../catalogue/shop.ts").ShopId, string, z.core.$ZodTypeInternals<import("../catalogue/shop.ts").ShopId, string>>>;
}, z.core.$loose>;
export type HouseholdSettings = z.infer<typeof householdSettingsSchema>;
